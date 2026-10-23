/* Data service: fetch, cache, parse and expand game data.
 *
 * The game ships plain scripts that write into a global `G`. We evaluate the
 * downloaded source in a private G object (never in the page global), then
 * shape the data into calculator rows:
 *
 *   one row per (Pokémon, available ability, distinct damaging move type)
 *
 * Natural variants are Normal + the Pokémon's own types. TM variants are the
 * distinct damaging types the Pokémon can learn through a TM but does not
 * already have naturally. Status TMs (buffs) never create a row.
 */
window.PSC = window.PSC || {};

PSC.Data = (function () {
  const U = PSC.Utils;
  const BASE = 'https://raw.githubusercontent.com/JPTER78/pokesurvivor/main/';
  const FILES = {
    moves: 'js/data/moves.js',
    dex: 'js/data/pokedex.js',
    lang: 'js/data/lang-en.js',
    items: 'js/data/items.js',
    sprites: 'js/data/sprites-meta.js',
    enemies: 'js/data/enemies.js',
    spawner: 'js/systems/spawner.js',
    tms: 'js/data/tms.js',
    abilities: 'js/data/abilities.js'
  };

  const state = {
    loaded: false,
    loading: false,
    error: null,
    sha: '',
    fetchedAt: 0,
    moves: [],
    movesById: {},
    dex: [],
    dexBy: {},
    rows: [],
    spriteMeta: {},
    items: [],
    abilityNames: {},
    dexAbil: {},
    tmMoves: {},
    tmOf: {},
    tiers: [],
    enemyWeights: [],
    enemyAttackProfile: { rows: [], phyWeight: 0.5, speWeight: 0.5 },
    avgTypeMult: {},
    spawnRateFn: null,
    evoMods: {},
    evo: {},
    moveEn: {},
    counts: { moves: 0, dex: 0, rows: 0, abilities: 0, tms: 0 }
  };

  let progressCb = null;
  function progress(msg, frac) {
    if (typeof progressCb === 'function') {
      try { progressCb(msg, frac); } catch (e) { /* ignore */ }
    }
  }

  function titleCase(id) {
    return String(id || '').split('-').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
  }

  function evalWithG(src) {
    const G = {};
    // eslint-disable-next-line no-new-func
    new Function('G', src)(G);
    return G;
  }

  function parseLang(src) {
    const out = {};
    if (!src) return out;
    const re = /'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      out[m[1]] = m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    }
    return out;
  }

  function parseJsonConst(src, name) {
    if (!src) return null;
    const re = new RegExp('const\\s+' + name + '\\s*=\\s*(\\{[\\s\\S]*?\\n\\s{2}\\});');
    const m = src.match(re);
    if (!m) return null;
    try { return (0, eval)('(' + m[1] + ')'); } catch (e) { return null; }
  }

  function parseSpawnRate(src) {
    if (!src) return null;
    const m = src.match(/function rate\(t\)\s*\{\s*return\s*([^;]+);/);
    if (!m) return null;
    try {
      // eslint-disable-next-line no-new-func
      return new Function('t', 'return ' + m[1] + ';');
    } catch (e) { return null; }
  }

  function parseSources(sources) {
    const G = {};
    const order = ['moves', 'dex', 'lang', 'items', 'sprites', 'enemies', 'tms', 'abilities'];
    for (const key of order) {
      const src = sources[key];
      if (!src) continue;
      if (key === 'lang') continue;
      try {
        // eslint-disable-next-line no-new-func
        new Function('G', src)(G);
      } catch (e) {
        console.warn('[PSC.Data] failed to evaluate ' + key + ':', e.message);
      }
    }

    const moveEn = parseLang(sources.lang);
    const spriteMeta = G.SPRITE_META || {};
    const evoMods = parseJsonConst(sources.moves, 'EVO_MODS') || {};
    const evo = parseJsonConst(sources.moves, 'EVO') || {};

    const moves = (G.Moves && Array.isArray(G.Moves.ALL) ? G.Moves.ALL : []).map(def => {
      const m = Object.assign({}, def);
      if (m.kind === 'melee') {
        m.dmg = Math.round((+m.dmg || 0) * 1.2);
        if (m.radius) m.radius = Math.round(m.radius * 1.25);
        if (m.arc) m.arc = Math.min(3, +(m.arc * 1.25).toFixed(2));
      }
      m.cat = m.kind === 'buff' ? null : (m.cat || 'special');
      m.nameEn = moveEn[m.name] || titleCase(m.id);
      return m;
    }).filter(m => m && m.id);

    const movesById = {};
    for (const m of moves) movesById[m.id] = m;

    const dex = (G.DEX || []).map(p => {
      const row = Object.assign({}, p);
      row.types = [...new Set(row.types || [])];
      ['pa', 'sa', 'df', 'sd', 'spd', 'hp', 'bst', 'gen'].forEach(k => {
        if (row[k] != null) row[k] = +row[k];
      });
      row.hit = U.bodyRadius(row.dex, spriteMeta);
      row.size = U.sizeClass(row.hit);
      return row;
    });
    const dexBy = {};
    for (const p of dex) dexBy[p.dex] = p;

    const abilityNames = {};
    const abilRaw = G.ABIL || {};
    for (const [id, arr] of Object.entries(abilRaw)) {
      abilityNames[id] = Array.isArray(arr) ? (arr[1] || arr[0] || id) : String(arr);
    }

    const tmMoves = G.TM_MOVES || {};
    const tmOf = typeof G.TM_OF === 'function'
      ? (dexId => { try { return G.TM_OF(dexId) || []; } catch (e) { return []; } })
      : (dexId => {
        const out = [];
        for (const [mid, list] of Object.entries(tmMoves)) {
          if ((list || []).indexOf(dexId) >= 0) out.push(mid);
        }
        return out;
      });

    const tiers = (G.Enemies && Array.isArray(G.Enemies.TIERS) ? G.Enemies.TIERS : DEFAULT_TIERS_BST)
      .map(t => Object.assign({}, t, { bst: (t.bst || [0, 9999]).slice() }));

    return {
      moves,
      movesById,
      dex,
      dexBy,
      spriteMeta,
      items: (G.Items && Array.isArray(G.Items.LIST)) ? G.Items.LIST : [],
      abilityNames,
      dexAbil: G.DEX_ABIL || {},
      tmMoves,
      tmOf,
      tiers,
      evoMods,
      evo,
      moveEn,
      spawnRateFn: parseSpawnRate(sources.spawner)
    };
  }

  /** Every damaging move this Pokémon can use (natural pool + learnable TMs). */
  function learnableMoves(p, data) {
    const natural = new Set(['normal', ...(p.types || [])]);
    const out = new Map();
    for (const m of data.moves) {
      if (m.kind === 'buff' || m.dmg == null) continue;
      if (natural.has(m.type)) out.set(m.id, m);
    }
    const tmIds = data.tmOf(p.dex) || [];
    for (const id of tmIds) {
      const m = data.movesById[id];
      if (m && m.kind !== 'buff' && m.dmg != null) out.set(m.id, m);
    }
    return [...out.values()];
  }

  function buildRows(data) {
    const rows = [];
    const naturalOf = p => [...new Set(['normal', ...(p.types || [])])];

    for (const p of data.dex) {
      const abilities = PSC.Abilities.idsForDex(data.dexAbil, p.dex);
      const abilityList = abilities.length ? abilities : [null];
      const learnable = learnableMoves(p, data);
      const naturalTypes = naturalOf(p);
      const naturalSet = new Set(naturalTypes);
      const tmLearnable = learnable.filter(m => !naturalSet.has(m.type) || data.tmOf(p.dex).indexOf(m.id) >= 0);

      const variants = naturalTypes.map(type => ({ type, source: 'natural' }));
      const seenTypes = new Set(naturalTypes);
      for (const m of tmLearnable) {
        if (seenTypes.has(m.type)) continue;
        seenTypes.add(m.type);
        variants.push({ type: m.type, source: 'tm' });
      }

      for (const abilityId of abilityList) {
        for (const variant of variants) {
          const moveIds = learnable.filter(m => m.type === variant.type).map(m => m.id);
          if (!moveIds.length) continue;
          const row = Object.assign({}, p, {
            abilityId,
            abilityName: abilityId ? PSC.Abilities.name(data.abilityNames, abilityId) : '—',
            variantType: variant.type,
            variantSource: variant.source,
            naturalTypes,
            tmTypes: variants.filter(v => v.source === 'tm').map(v => v.type),
            moveIds,
            rowKey: p.dex + '|' + (abilityId || '') + '|' + variant.type
          });
          rows.push(row);
        }
      }
    }
    return rows;
  }

  function rebuildDerived(data) {
    const ctx = { spawnRateFn: data.spawnRateFn, spawnDensity: 0.24 };
    data.enemyWeights = PSC.TypeChart.buildEnemyWeights(data.dex, data.tiers, ctx);
    data.enemyAttackProfile = PSC.TypeChart.buildEnemyAttackProfile(data.dex, data.tiers, ctx);
    data.avgTypeMult = PSC.TypeChart.buildAvgTypeMultipliers(data.enemyWeights);
    data.rows = buildRows(data);
    data.counts = {
      moves: data.moves.length,
      dex: data.dex.length,
      rows: data.rows.length,
      abilities: Object.keys(data.abilityNames).length,
      tms: Object.keys(data.tmMoves).length
    };
    return data;
  }

  function applyData(data) {
    Object.assign(state, data);
    rebuildDerived(state);
    state.loaded = true;
    state.loading = false;
    state.error = null;
    state.fetchedAt = Date.now();
  }

  function loadCache() {
    const cached = U.storageJSON(CACHE_KEY, null);
    if (!cached || !cached.ts || !cached.sources || !cached.sources.moves || !cached.sources.dex) return null;
    return cached;
  }

  function saveCache(sources, sha) {
    try {
      U.storageSet(CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        sha: sha || '',
        sources
      }));
    } catch (e) {
      // Quota exceeded: drop the biggest optional payload and try once more.
      try { delete sources.sprites; } catch (e2) {}
      try {
        U.storageSet(CACHE_KEY, JSON.stringify({ ts: Date.now(), sha: sha || '', sources }));
      } catch (e3) { /* give up, data still works in memory */ }
    }
  }

  async function fetchText(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      return r && r.ok ? await r.text() : '';
    } catch (e) { return ''; }
  }

  async function fetchAll(force) {
    if (state.loading) return { ok: false, reason: 'busy' };
    state.loading = true;
    state.error = null;
    progress('Checking cache…', 0.02);

    const cached = force ? null : loadCache();
    const fresh = cached && (Date.now() - cached.ts) < CACHE_TTL_MS;

    let remoteSha = '';
    if (!fresh) {
      progress('Checking game repository…', 0.05);
      try {
        const meta = await fetch('https://api.github.com/repos/JPTER78/pokesurvivor/commits/main', {
          headers: { Accept: 'application/vnd.github.v3+json' },
          cache: 'no-store'
        });
        if (meta && meta.ok) {
          const j = await meta.json();
          remoteSha = j.sha || '';
        }
      } catch (e) { /* offline: cache or direct fetch still works */ }
    }

    let sources;
    if (fresh) {
      sources = cached.sources;
      state.sha = cached.sha || remoteSha || '';
      progress('Loaded from local cache.', 0.55);
    } else {
      progress('Fetching game data…', 0.1);
      const ts = Date.now();
      const keys = Object.keys(FILES);
      const texts = await Promise.all(keys.map((k, i) => {
        progress('Fetching ' + FILES[k] + '…', 0.1 + (i / keys.length) * 0.45);
        return fetchText(BASE + FILES[k] + '?' + ts);
      }));
      sources = {};
      keys.forEach((k, i) => { sources[k] = texts[i]; });
      if (!sources.moves || !sources.dex) {
        if (cached && cached.sources && cached.sources.moves) {
          sources = cached.sources;
          progress('GitHub unavailable — using stale cache.', 0.55);
        } else {
          state.loading = false;
          state.error = 'Could not fetch moves.js or pokedex.js from GitHub.';
          progress(state.error, 1);
          return { ok: false, reason: state.error };
        }
      } else {
        state.sha = remoteSha || ('local-' + ts);
        saveCache(sources, state.sha);
      }
    }

    progress('Parsing game data…', 0.62);
    const parsed = parseSources(sources);
    if (!parsed.moves.length || !parsed.dex.length) {
      state.loading = false;
      state.error = 'Game data parsed empty (moves or Pokédex missing).';
      progress(state.error, 1);
      return { ok: false, reason: state.error };
    }

    progress('Building Pokédex rows…', 0.78);
    applyData(parsed);
    state.sha = state.sha || '';
    progress('Loaded ' + state.counts.rows + ' build rows.', 1);
    return { ok: true, counts: state.counts };
  }

  function findMove(id) { return state.movesById[id] || null; }
  function findDex(dex) { return state.dexBy[dex] || null; }
  function moveName(m) {
    if (!m) return '—';
    return m.nameEn || titleCase(m.id);
  }
  function abilityName(id) {
    return PSC.Abilities.name(state.abilityNames, id);
  }
  function rowsForDex(dex) {
    return state.rows.filter(r => r.dex === dex);
  }
  function setProgressHandler(fn) { progressCb = fn; }

  return {
    FILES,
    state,
    load: fetchAll,
    fetchAll,
    findMove,
    findDex,
    moveName,
    abilityName,
    rowsForDex,
    setProgressHandler,
    get moves() { return state.moves; },
    get dex() { return state.dex; },
    get rows() { return state.rows; },
    get loaded() { return state.loaded; },
    get sha() { return state.sha; },
    get counts() { return state.counts; }
  };
})();
