let RAW = [];
    let ALL_MOVES = [];
    let DAMAGE_MOVES = [];
    let globalPoke = null; // shared selection across Calc / Size / Weakness
    let VALID_TYPE_SET = null; // Set of sorted type-combo keys from DEX

    let LADDERS = {};
    let EVO = {};
    let EVO_MODS = {};
    let DEX = [];
    let ITEMS = [];
    let SPRITE_META = {};
    let TM_OF = {}; // dex -> [moveId,...] from live tms.js
    let TM_MOVES = {}; // moveId -> [dex,...]
    let dpsResults = [];
    let pokeSortKey = 'dex';
    let pokeSortDir = 1;
    let pokeTypeSel = new Set();
    let pokeAbilitySel = new Set();
    let dpsTypeSel = new Set();
    let dpsKindSel = new Set();
    let dpsCatSel = new Set(); // physical | special
    let sizeTypeSel = new Set();
    let weakAtkSel = new Set();
    let radarAxes = {
      // raw
      pa: false, sa: false, df: false, sd: false, hp: true, spd: true, hit: false,
      // calculated — 4 multis + dodge
      typeM: false, wxM: false, phyM: true, speM: true, phyDefM: true, speDefM: true, dr: false, eva: true, ehp: false, score: false
    };
    let sortKey = 'lv5';
    let sortDir = -1;
    let TYPE_CHART = null;
    let ENEMY_WEIGHTS = [];
    let TIERS_BST = (typeof DEFAULT_TIERS_BST !== 'undefined' ? DEFAULT_TIERS_BST.map(t => Object.assign({}, t, { bst: t.bst.slice() })) : []);
    let SPAWN_DENSITY = 0.24;
    let SPAWN_RATE_FN = null;
    let ENEMY_PHY_WEIGHT = 0.5;
    let ENEMY_SPE_WEIGHT = 0.5;
    let POKE_CACHE_DIRTY = true;
    let POKE_CACHE_GEN = 1;
    let SCORE_MED_OFF = 1;
    let SCORE_MED_DEF = 1; // [{key, types, weight, pct, examples}]
    let AVG_TYPE_MULT = {}; // attackType -> average mult
    let calcPoke = null; // selected mon
    let calcPickCell = null; // {slot, row}
    let tipPinned = false;

    let ABIL_NAMES = {};   // id -> English name
    let DEX_ABIL = {};     // dex -> [ab1, ab2|0, hidden|0]
    let ABILITY_FX = null; // { byId, of(id, mon) }
    let DEX_ROWS = [];     // expanded (pokemon, ability) rows for pokedex
    let bestAbilityOnly = false;

    function abilityIdsForDex(dex) {
      const raw = DEX_ABIL[dex] || DEX_ABIL[String(dex)] || [];
      const out = [];
      const seen = new Set();
      for (const a of raw) {
        if (!a || a === 0 || a === '0') continue;
        const id = String(a);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
      }
      return out;
    }

    function abilityName(id) {
      if (!id) return '—';
      return ABIL_NAMES[id] || id;
    }

    function abilityFxOf(id, mon) {
      if (!ABILITY_FX || typeof ABILITY_FX.of !== 'function') return null;
      try {
        return ABILITY_FX.of(id, mon || { types: ['normal'] });
      } catch (e) {
        return null;
      }
    }

    function abilityDesc(id, mon) {
      const fx = abilityFxOf(id, mon);
      if (!fx) return '';
      let d = fx.d || '';
      if (fx.d2) d = d + (d ? ' ' : '') + fx.d2;
      return d;
    }

    /** Probe ability out() with a mock move; returns multiplier or 1. */
    function probeAbilityOut(fx, mon, moveStub) {
      if (!fx || typeof fx.out !== 'function') return 1;
      try {
        const pl = { mon: mon, hp: mon.hp || 100, maxHp: mon.hp || 100, item: null, slowT: 0 };
        // Full HP for multiscale-type; no pinch
        pl.hp = pl.maxHp;
        const v = fx.out(pl, moveStub, null);
        const n = +v;
        return (isFinite(n) && n > 0) ? n : 1;
      } catch (e) {
        return 1;
      }
    }

    function probeAbilityIn(fx, mon, atkType, cls) {
      if (!fx || typeof fx.inMul !== 'function') return 1;
      try {
        const pl = { mon: mon, hp: mon.hp || 100, maxHp: mon.hp || 100, item: null, slowT: 0 };
        pl.hp = pl.maxHp;
        const v = fx.inMul(pl, atkType, cls);
        const n = +v;
        return (isFinite(n) && n > 0) ? n : 1;
      } catch (e) {
        return 1;
      }
    }

    function probeAbilitySpeed(fx, mon) {
      if (!fx || typeof fx.speed !== 'function') return 1;
      try {
        const pl = { mon: mon, hp: mon.hp || 100, maxHp: mon.hp || 100, slowT: 0 };
        const v = fx.speed(pl);
        const n = +v;
        return (isFinite(n) && n > 0) ? n : 1;
      } catch (e) {
        return 1;
      }
    }

    /**
     * Static ability contribution for scoring (simple probes, full HP, no weather/enemy).
     * Returns { outPhy, outSpe, outAny, inPhy, inSpe, speedMul, flags }
     */
    function abilityCombatMul(id, mon) {
      const base = { outPhy: 1, outSpe: 1, outAny: 1, inPhy: 1, inSpe: 1, speedMul: 1, flags: [] };
      if (!id) return base;
      const fx = abilityFxOf(id, mon);
      if (!fx) return base;
      // Probe representative physical/special neutral moves
      const phyMv = { type: 'normal', cat: 'physical', kind: 'projectile', dmg: 20, def: { dmg: 20 } };
      const speMv = { type: 'normal', cat: 'special', kind: 'projectile', dmg: 20, def: { dmg: 20 } };
      // STAB-type probes for type-boost abilities
      const t0 = (mon.types && mon.types[0]) || 'normal';
      const phyStab = { type: t0, cat: 'physical', kind: 'projectile', dmg: 20, def: { dmg: 20 } };
      const speStab = { type: t0, cat: 'special', kind: 'projectile', dmg: 20, def: { dmg: 20 } };

      const oPhy = probeAbilityOut(fx, mon, phyMv);
      const oSpe = probeAbilityOut(fx, mon, speMv);
      const oPhyS = probeAbilityOut(fx, mon, phyStab);
      const oSpeS = probeAbilityOut(fx, mon, speStab);
      // Use max of neutral vs STAB probe as "effective" side multi (conservative for type boosts when using that type)
      base.outPhy = Math.max(oPhy, oPhyS);
      base.outSpe = Math.max(oSpe, oSpeS);
      base.outAny = Math.max(base.outPhy, base.outSpe);

      // Defense: probe with normal attack type
      base.inPhy = probeAbilityIn(fx, mon, 'normal', 'p');
      base.inSpe = probeAbilityIn(fx, mon, 'normal', 's');
      // Also probe fire for water-bubble style
      const inFire = probeAbilityIn(fx, mon, 'fire', 's');
      if (inFire !== 1 && inFire < base.inSpe) base.inSpe = Math.min(base.inSpe, inFire);

      base.speedMul = probeAbilitySpeed(fx, mon);

      if (fx.levitate) base.flags.push('levitate');
      if (fx.sturdy) base.flags.push('sturdy');
      if (fx.sheer) base.flags.push('sheer');
      if (fx.serene) base.flags.push('serene');
      if (fx.absorb) base.flags.push('absorb:' + fx.absorb);
      if (fx.summon) base.flags.push('weather:' + fx.summon);
      if (fx.generic) base.flags.push('generic');
      return base;
    }

    function rebuildDexRows() {
      DEX_ROWS = [];
      for (const p of DEX) {
        const abs = abilityIdsForDex(p.dex);
        const list = abs.length ? abs : [null];
        for (const ab of list) {
          const row = Object.assign({}, p, {
            abilityId: ab,
            abilityName: abilityName(ab),
            _rowKey: p.dex + '|' + (ab || ''),
            _comboCoefs: null,
            _cacheGen: -1,
            dmgV2: undefined,
            _dmgV2Dirty: true,
            _bestNatureV1: undefined,
            _bestNatureV2: undefined
          });
          DEX_ROWS.push(row);
        }
      }
    }

    function abilTd(p, key, className, text, baseTip, styleExtra) {
      const af = p.abilAffected && p.abilAffected[key];
      let cls = className || '';
      let tip = baseTip || '';
      if (af && p.abilityId && typeof ABILITIES !== 'undefined' && ABILITIES[p.abilityId]) {
        if (af.multi > 1.0001) cls += ' abil-up';
        else if (af.multi < 0.9999) cls += ' abil-down';
        const a = ABILITIES[p.abilityId];
        tip = (a.desc || '') + ' — ' + (a.calcDesc || '') + ' (' + (+af.multi).toFixed(3) + '× on ' + key + ')';
      }
      return '<td class="' + cls + '"' + (styleExtra ? ' style="' + styleExtra + '"' : '') + ' title="' + escTip(tip) + '">' + text + '</td>';
    }

    function abilityDescEn(id, mon) {
      if (typeof ABILITIES !== 'undefined' && ABILITIES[id]) return ABILITIES[id].desc || '';
      return '';
    }

    /** Classify static implementation status for toolkit scoring. */
    function abilityImplInfo(id) {
      const mon = { types: ['normal'], hp: 100, name: '?' };
      const fx = abilityFxOf(id, mon);
      if (!fx) return { status: 'no', how: 'No FX entry (generic +8% primary type via of())' };

      const hard = [];
      if (typeof fx.hit === 'function') hard.push('hit');
      if (typeof fx.hurt === 'function') hard.push('hurt');
      if (typeof fx.contact === 'function') hard.push('contact');
      if (typeof fx.tick === 'function') hard.push('tick');
      if (typeof fx.kill === 'function') hard.push('kill');
      if (typeof fx.dodge === 'function') hard.push('dodge');
      if (fx.critMul != null) hard.push('critMul');
      if (fx.healMul != null) hard.push('healMul');
      if (fx.statusCd != null || fx.cdMul != null) hard.push('cd');
      if (fx.summon) hard.push('summon');
      if (fx.absorb) hard.push('absorb');
      if (fx.sturdy) hard.push('sturdy');
      if (fx.levitate) hard.push('levitate');
      if (fx.sheer) hard.push('sheer');
      if (fx.serene) hard.push('serene');

      const ab = abilityCombatMul(id, mon);
      // Also probe with grass type for boost-style
      const ab2 = abilityCombatMul(id, { types: ['grass', 'fire'], hp: 100 });
      const staticHit =
        ab.outPhy !== 1 || ab.outSpe !== 1 || ab.inPhy !== 1 || ab.inSpe !== 1 || ab.speedMul !== 1 ||
        ab2.outPhy !== 1 || ab2.outSpe !== 1 || ab2.inPhy !== 1 || ab2.inSpe !== 1;

      if (staticHit && hard.length === 0) {
        const bits = [];
        if (ab.outPhy !== 1 || ab.outSpe !== 1 || ab2.outPhy !== 1 || ab2.outSpe !== 1) bits.push('out→phy/spe multi');
        if (ab.inPhy !== 1 || ab.inSpe !== 1 || ab2.inPhy !== 1 || ab2.inSpe !== 1) bits.push('inMul→DR/ehp');
        if (ab.speedMul !== 1) bits.push('speed');
        return { status: 'yes', how: 'Static probe (full HP, no weather/enemy): ' + bits.join(', ') };
      }
      if (staticHit && hard.length) {
        return {
          status: 'partial',
          how: 'Static out/inMul/speed probed; not simulated: ' + hard.join(', ')
        };
      }
      if (hard.length) {
        return { status: 'no', how: 'Needs runtime: ' + hard.join(', ') };
      }
      if (typeof fx.out === 'function') {
        return { status: 'partial', how: 'Has out() but probe is 1× under full-HP / no-weather assumptions' };
      }
      return { status: 'no', how: 'No quantitative static multi' };
    }

    function allAbilityIds() {
      const s = new Set();
      if (typeof ABILITIES === 'object') Object.keys(ABILITIES).forEach(id => s.add(id));
      for (const arr of Object.values(DEX_ABIL || {})) {
        for (const a of arr || []) if (a && a !== 0 && a !== '0') s.add(String(a));
      }
      return [...s].sort((a, b) => abilityName(a).localeCompare(abilityName(b)));
    }

    function renderAbilities() {
      const body = document.getElementById('abilBody');
      if (!body) return;
      const q = ((document.getElementById('searchAbility') || {}).value || '').trim().toLowerCase();
      const implOnly = !!(document.getElementById('abilImplOnly') && document.getElementById('abilImplOnly').checked);
      const ids = typeof ABILITIES === 'object' ? Object.keys(ABILITIES) : [];
      ids.sort((a, b) => abilityName(a).localeCompare(abilityName(b)));
      const rows = [];
      for (const id of ids) {
        const meta = abilityMeta(id);
        const name = abilityName(id);
        if (implOnly && !meta.implemented) continue;
        if (q) {
          const blob = (name + ' ' + id + ' ' + meta.desc + ' ' + meta.calcDesc).toLowerCase();
          if (!blob.includes(q)) continue;
        }
        let stLab, stClass;
        if (meta.implemented) { stLab = 'Yes'; stClass = 'mult-good'; }
        else if (meta.willNot) { stLab = 'Will not implement'; stClass = 'mult-bad'; }
        else { stLab = 'No'; stClass = 'mult-bad'; }
        rows.push(
          '<tr>' +
          '<td class="text-left"><a href="#" class="abil-link" data-abil="' + id + '" onclick="event.preventDefault();goPokedexAbility(\'' + id.replace(/'/g, "\\'") + '\')">' +
          name + '</a><div class="note" style="font-size:0.68rem;margin:0">' + id + '</div></td>' +
          '<td class="text-left" style="font-size:0.8rem">' + (meta.desc || '—').replace(/</g, '&lt;') + '</td>' +
          '<td class="text-left"><span class="' + stClass + '">' + stLab + '</span>' +
          '<div class="note" style="font-size:0.72rem;margin:0.15rem 0 0">' + (meta.calcDesc || '').replace(/</g, '&lt;') + '</div></td>' +
          '</tr>'
        );
      }
      body.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="3" class="note">ABILITIES dict not loaded.</td></tr>';
    }

    function goPokedexAbility(id) {
      pokeAbilitySel.clear();
      if (id) pokeAbilitySel.add(id);
      buildPokeAbilityChips();
      // switch tab
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'pokedex'));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-pokedex'));
      if (typeof renderPokedex === 'function') renderPokedex();
    }

    function clearPokeAbilities() {
      pokeAbilitySel.clear();
      buildPokeAbilityChips();
      if (typeof renderPokedex === 'function') renderPokedex();
    }

    function buildPokeAbilityChips() {
      const box = document.getElementById('pokeAbilityChips');
      if (!box) return;
      const ids = allAbilityIds();
      if (!ids.length) {
        box.innerHTML = '<span class="note">Load data first</span>';
        return;
      }
      // Only show selected + search would be heavy; show all as compact chips (may be many)
      // Use a scrollable chip row of used abilities only (from DEX_ABIL)
      const used = new Set();
      for (const arr of Object.values(DEX_ABIL || {})) {
        for (const a of arr || []) if (a && a !== 0 && a !== '0') used.add(String(a));
      }
      const list = [...used].sort((a, b) => abilityName(a).localeCompare(abilityName(b)));
      box.innerHTML = list.map(id => {
        const on = pokeAbilitySel.has(id);
        return '<span class="type-chip' + (on ? ' on' : '') + '" data-abil="' + id + '" title="' + id + '">' +
          abilityName(id) + '</span>';
      }).join('');
      box.querySelectorAll('.type-chip').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.abil;
          if (pokeAbilitySel.has(id)) pokeAbilitySel.delete(id);
          else pokeAbilitySel.add(id);
          el.classList.toggle('on', pokeAbilitySel.has(id));
          if (typeof renderPokedex === 'function') renderPokedex();
        });
      });
    }



    function setBestAbilityOnly(on) {
      bestAbilityOnly = !!on;
      try { localStorage.setItem('pstk_best_abil', bestAbilityOnly ? '1' : '0'); } catch (e) {}
      if (typeof renderPokedex === 'function') renderPokedex();
    }


    /** 'best' = nature that maxes score for each mon (default). 'neutral' = no nature. */
    
    const POKE_COL_DEFS = [
      { id: 'dex', lab: '#', def: true },
      { id: 'name', lab: 'Pokémon', def: true, locked: true },
      { id: 'types', lab: 'Types', def: true },
      { id: 'ability', lab: 'Ability', def: true },
      { id: 'pa', lab: 'PA', def: false },
      { id: 'sa', lab: 'SA', def: false },
      { id: 'paNat', lab: 'PA★', def: true },
      { id: 'saNat', lab: 'SA★', def: true },
      { id: 'df', lab: 'DF', def: false },
      { id: 'sd', lab: 'SD', def: false },
      { id: 'hp', lab: 'HP', def: true },
      { id: 'spd', lab: 'SPD', def: true },
      { id: 'hit', lab: 'r', def: false },
      { id: 'typeM', lab: 'weak', def: false },
      { id: 'wxM', lab: 'wx', def: false },
      { id: 'phyM', lab: 'phy multi', def: true },
      { id: 'speM', lab: 'spe multi', def: true },
      { id: 'phyDefM', lab: 'pDef', def: false },
      { id: 'speDefM', lab: 'sDef', def: false },
      { id: 'dr', lab: 'dr', def: false },
      { id: 'eva', lab: 'eva', def: false },
      { id: 'ehp', lab: 'ehp', def: true },
      { id: 'score', lab: 'score', def: false },
      { id: 'scoreV1', lab: 'score v1', def: true },
      { id: 'scoreV2', lab: 'score v2', def: true },
      { id: 'dmgV2', lab: 'dmg v2', def: true },
      { id: 'gen', lab: 'Gen', def: false }
    ];
    let pokeColVis = null;
    const POKE_COLS_KEY = 'pstk_poke_cols_v6';
    function defaultPokeCols() {
      const o = {};
      POKE_COL_DEFS.forEach(c => { o[c.id] = c.locked ? true : !!c.def; });
      return o;
    }
    function loadPokeCols() {
      pokeColVis = defaultPokeCols();
      try {
        const raw = localStorage.getItem(POKE_COLS_KEY);
        if (!raw) return;
        const o = JSON.parse(raw);
        if (!o || typeof o !== 'object') return;
        POKE_COL_DEFS.forEach(c => {
          if (c.locked) { pokeColVis[c.id] = true; return; }
          if (Object.prototype.hasOwnProperty.call(o, c.id)) pokeColVis[c.id] = !!o[c.id];
        });
      } catch (e) {}
    }
    loadPokeCols();
    function isPokeColOn(id) {
      if (!pokeColVis) loadPokeCols();
      const def = POKE_COL_DEFS.find(c => c.id === id);
      if (def && def.locked) return true;
      return pokeColVis[id] === true;
    }
    function openPokeColsModal() {
      const box = document.getElementById('pokeColsList');
      const m = document.getElementById('pokeColsModal');
      if (!box || !m) return;
      box.innerHTML = POKE_COL_DEFS.map(c => {
        if (c.locked) {
          return '<label class="col-locked"><input type="checkbox" checked disabled data-col="' + c.id + '"/> ' + c.lab + ' <span style="color:var(--muted);font-size:0.7rem">(always)</span></label>';
        }
        return '<label><input type="checkbox" data-col="' + c.id + '"' + (isPokeColOn(c.id) ? ' checked' : '') + '/> ' + c.lab + '</label>';
      }).join('');
      m.style.display = 'flex';
    }
    function closePokeColsModal() {
      const m = document.getElementById('pokeColsModal');
      if (m) m.style.display = 'none';
    }
    function resetPokeCols() {
      pokeColVis = defaultPokeCols();
      try { localStorage.setItem(POKE_COLS_KEY, JSON.stringify(pokeColVis)); } catch (e) {}
      openPokeColsModal();
    }
    function applyPokeCols() {
      const box = document.getElementById('pokeColsList');
      if (box) {
        const next = defaultPokeCols();
        box.querySelectorAll('input[data-col]').forEach(inp => {
          const id = inp.dataset.col;
          const def = POKE_COL_DEFS.find(c => c.id === id);
          if (def && def.locked) next[id] = true;
          else next[id] = !!inp.checked;
        });
        pokeColVis = next;
        try { localStorage.setItem(POKE_COLS_KEY, JSON.stringify(pokeColVis)); } catch (e) {}
      }
      closePokeColsModal();
      applyPokeColVisibility();
    }
    function applyPokeColVisibility() {
      let el = document.getElementById('pokeColStyle');
      if (!el) {
        el = document.createElement('style');
        el.id = 'pokeColStyle';
        (document.head || document.documentElement).appendChild(el);
      }
      const rules = [];
      POKE_COL_DEFS.forEach(c => {
        if (isPokeColOn(c.id)) return;
        rules.push(
          '#panel-pokedex table th[data-col="' + c.id + '"],' +
          '#panel-pokedex table td[data-col="' + c.id + '"]{display:none!important}'
        );
      });
      el.textContent = rules.join('\n');
    }

    let natureMode = 'best_v1'; // modest | best_v1 | best_v2
    let scoreAlgo = 'v1'; // v1 = max(phy,spe multi); v2 = dmg v2
    (function loadNatureScorePrefs() {
      try {
        const nm = localStorage.getItem('pstk_nature_mode');
        if (nm === 'modest' || nm === 'best_v1' || nm === 'best_v2' || nm === 'neutral') natureMode = nm;
        else if (nm === 'best') natureMode = 'best_v1';
        const sa = localStorage.getItem('pstk_score_algo');
        if (sa === 'v1' || sa === 'v2') scoreAlgo = sa;
      } catch (e) {}
    })();
    let scoreW = { off: 1, def: 1, spd: 0.25 };
    (function loadScoreW() {
      try {
        const raw = localStorage.getItem(typeof SCORE_W_KEY !== 'undefined' ? SCORE_W_KEY : 'pstk_score_weights');
        if (!raw) return;
        const o = JSON.parse(raw);
        if (o && typeof o.off === 'number') scoreW = { off: +o.off, def: +o.def, spd: +o.spd };
      } catch (e) {}
    })();
    /** Radar popup: override nature id for the viewed mon, or null = follow mode. */
    let radarNatureId = null;
    let radarShowAllAvg = true;
    let radarShowTypeAvg = new Set(); // type names enabled in legend

    function applyNatureToMon(base, natureId) {
      if (!base) return base;
      const n = natureId ? NATURE_BY[natureId] : null;
      const m = Object.assign({}, base);
      // reset from base numeric fields
      ['pa','sa','df','sd','spd'].forEach(k => {
        if (base[k] != null) m[k] = +base[k];
      });
      if (n && n.up && m[n.up] != null) m[n.up] = +base[n.up] * 1.1;
      if (n && n.down && m[n.down] != null) m[n.down] = +base[n.down] * 0.9;
      m.atk = Math.max(m.pa != null ? +m.pa : 0, m.sa != null ? +m.sa : 0) || base.atk;
      m.nature = n ? n.id : null;
      return m;
    }

    /** Score for a mon under a specific nature (does not mutate cache). */
    function scoreUnderNature(base, natureId, algo) {
      algo = algo || scoreAlgo || 'v1';
      const m = applyNatureToMon(base, natureId);
      const d = pokeDefenseMults(m);
      let off;
      if (algo === 'v2') {
        if (!base._comboCoefs) base._comboCoefs = learnableComboCoefs(base);
        off = dmgV2FromCoefs(m.pa, m.sa, base._comboCoefs);
      } else {
        const o = pokeOffenseMults(m);
        off = Math.max(o.phyM || 0, o.speM || 0);
      }
      const def = d.ehp || 0;
      const spd = m.spd != null ? +m.spd : 0;
      const wo = scoreW.off, wd = scoreW.def, ws = scoreW.spd;
      return Math.pow(Math.max(1e-9, off), wo) * Math.pow(Math.max(1e-9, def), wd) * Math.pow(Math.max(1e-9, spd), ws);
    }

    // === recovered core ===
function typeMult(atk, defTypes) {
      const row = RAW_CHART[atk];
      if (!row || !defTypes) return 1;
      let m = 1;
      for (const t of defTypes) if (row[t] != null) m *= SOFT[row[t]];
      return Math.max(0.3, Math.min(2.4, m));
    }

function spawnRate(t) {
      if (typeof SPAWN_RATE_FN === 'function') {
        try { return SPAWN_RATE_FN(t); } catch (e) { /* fall through */ }
      }
      return (1.6 + t * 0.028 + Math.pow(t / 60, 1.6) * 0.5) * SPAWN_DENSITY;
    }

function tierSpawnWeight(tier) {
      let w = 0;
      const step = 2;
      const t0 = +tier.from || 0;
      const t1 = tier.to != null ? +tier.to : RUN_END_SEC;
      for (let t = t0; t < t1; t += step) w += spawnRate(t) * step;
      return w;
    }

function parseEnemyTiers(src) {
      if (!src) return null;
      const m = src.match(/const TIERS\s*=\s*(\[[\s\S]*?\n  \]);/);
      if (!m) return null;
      try {
        const raw = (0, eval)(m[1]);
        if (!Array.isArray(raw) || !raw.length) return null;
        return raw.map((tr, i) => ({
          from: tr.from | 0,
          to: i + 1 < raw.length ? (raw[i + 1].from | 0) : RUN_END_SEC,
          bst: tr.bst,
          cast: tr.cast != null ? tr.cast : 7
        }));
      } catch (e) {
        console.warn('parseEnemyTiers', e);
        return null;
      }
    }

function parseSpawnRate(src) {
      if (!src) return false;
      const dM = src.match(/const DENSITY\s*=\s*([0-9.]+)/);
      if (dM) SPAWN_DENSITY = parseFloat(dM[1]) || SPAWN_DENSITY;
      const rM = src.match(/function rate\(t\)\s*\{\s*return\s*([^;]+);/);
      if (rM) {
        const expr = rM[1].replace(/DENSITY/g, String(SPAWN_DENSITY));
        try {
          const fn = new Function('t', 'return (' + expr + ');');
          if (fn(0) > 0) { SPAWN_RATE_FN = fn; return true; }
        } catch (e) { console.warn('parseSpawnRate', e); }
      }
      return false;
    }

    function applyLiveSpawnData(enemiesSrc, spawnerSrc) {
      const tiers = parseEnemyTiers(enemiesSrc);
      if (tiers && tiers.length) TIERS_BST = tiers;
      parseSpawnRate(spawnerSrc);
    }

    function sizeClass(hit) {
      if (hit < 18) return 'small';
      if (hit < 28) return 'medium';
      return 'big';
    }

    /** Strict prefix search; leading ~ = contains. */
    function matchSearch(text, query) {
      if (!query) return true;
      const t = String(text || '').toLowerCase();
      const q = String(query).trim().toLowerCase();
      if (!q) return true;
      if (q.startsWith('~')) return t.includes(q.slice(1).trim());
      return t.startsWith(q);
    }

    /** Selection is valid if some Pokémon has all selected types. */
    function typesSelectionOk(selSet) {
      if (!selSet.size) return true;
      if (!VALID_TYPE_SET || !VALID_TYPE_SET.size) {
        return DEX.some(p => [...selSet].every(t => p.types.includes(t)));
      }
      return VALID_TYPE_SET.has([...selSet].sort().join('+'));
    }

    function canToggleType(selSet, type) {
      const next = new Set(selSet);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return typesSelectionOk(next);
    }


    // Spanish → English (from lang-en.js). Fallback: title-case the move id.
    let MOVE_EN = {};
    function enName(spanishOrId, id) {
      if (spanishOrId && MOVE_EN[spanishOrId]) return MOVE_EN[spanishOrId];
      if (id && MOVE_EN[id]) return MOVE_EN[id];
      if (id) return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return spanishOrId || '?';
    }

    /** Collision radius (px world): clamp(Idle.w * 0.22, 5, 26) * PX(2) */
    function bodyRadius(dex) {
      const m = SPRITE_META[dex];
      const w = (m && m.a && m.a.Idle && m.a.Idle.w) ? m.a.Idle.w : 32;
      const base = Math.max(5, Math.min(26, w * 0.22));
      return Math.round(base * 2 * 10) / 10; // one decimal
    }

    /** Hitbox radius for a dex entry (prefers cached p.hit). */
    function pokeHit(p) {
      if (p.hit != null) return p.hit;
      return bodyRadius(p.dex);
    }

    /** Median hitbox radius across the loaded dex. */
    function getDodgeMedianMode() {
      const el = document.getElementById('dodgeMedianMode');
      return (el && el.value) || 'pokemon';
    }
    function getDodgeCurve() {
      const el = document.getElementById('dodgeCurve');
      return (el && el.value) || 'power15';
    }

    function medianHitRadius() {
      if (!DEX.length) return 1;
      let rs = DEX.map(pokeHit).filter(r => r > 0);
      if (getDodgeMedianMode() === 'distinct') {
        rs = [...new Set(rs.map(r => +Number(r).toFixed(4)))];
      }
      rs.sort((a, b) => a - b);
      if (!rs.length) return 1;
      const mid = Math.floor(rs.length / 2);
      return rs.length % 2 ? rs[mid] : (rs[mid - 1] + rs[mid]) / 2;
    }

    /**
     * Dodge factor: higher = smaller hitbox = better.
     * Curve options: area (med/r)², linear med/r, soft blend, (med/r)^1.5
     */
    function hitMulti(p) {
      const med = medianHitRadius();
      const r = pokeHit(p);
      if (!med || !r) return 1;
      const ratio = med / r;
      const curve = getDodgeCurve();
      if (curve === 'linear') return ratio;
      if (curve === 'power15') return Math.pow(ratio, 1.5);
      if (curve === 'soft') return 0.5 * ratio + 0.5 * ratio * ratio;
      return ratio * ratio; // area
    }

    /** Exposure = 1/dodge (higher = more likely hit). */
    function hitExposure(p) {
      const d = hitMulti(p);
      return d ? 1 / d : 1;
    }

    function onDodgeOptionsChange() {
      invalidatePokeCache();
      const med = medianHitRadius();
      const hint = document.getElementById('dodgeOptionsHint');
      if (hint) hint.textContent = 'baseline = ' + med.toFixed(2);
      const sel = document.getElementById('dodgeMedianMode');
      if (sel) {
        const optP = sel.querySelector('option[value="pokemon"]');
        const optD = sel.querySelector('option[value="distinct"]');
        // temporary switch to compute both medians for labels
        const mode = sel.value;
        if (optP) {
          sel.value = 'pokemon';
          optP.textContent = 'All Pokémon r (' + medianHitRadius().toFixed(1) + ')';
        }
        if (optD) {
          sel.value = 'distinct';
          optD.textContent = 'Distinct r (' + medianHitRadius().toFixed(1) + ')';
        }
        sel.value = mode;
      }
      renderPokedex();
      if (typeof drawPokeRadar === 'function') drawPokeRadar();
      if (typeof renderMultipliers === 'function') renderMultipliers();
    }

    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const panel = document.getElementById('panel-' + t.dataset.tab);
        if (panel) panel.classList.add('active');
        if (t.dataset.tab === 'abilities' && typeof renderAbilities === 'function') renderAbilities();
        if (t.dataset.tab === 'mechanics' && typeof renderMechanics === 'function') renderMechanics();
        if (t.dataset.tab === 'combos' && typeof calcCombos === 'function') calcCombos();
      });
    });

    // Species/upgrade ATK ignored — presets removed

    function applyMods(s, m) {
      for (const k in m) {
        if (MULT_KEYS.includes(k) && s[k] != null) s[k] *= m[k];
        else if (ADD_KEYS.includes(k)) s[k] = (s[k] || 0) + m[k];
        else s[k] = m[k];
      }
    }

    function instance(def, lvl, evolved) {
      const s = Object.assign({}, def, { lvl, evolved: false, cat: def.cat || (def.kind === 'buff' ? null : moveCat(def)) });
      const ups = LADDERS[def.kind] || [];
      for (let i = 0; i < lvl - 1 && i < ups.length; i++) applyMods(s, ups[i].m);
      if (evolved && EVO[def.id] && EVO_MODS[def.kind] && lvl >= 5) {
        applyMods(s, EVO_MODS[def.kind].m);
        s.evolved = true;
        s.preName = def.name;
        s.name = EVO[def.id][0];
      }
      return s;
    }

    /**
     * Pure single-target DPS approximation + a one-line expression string.
     * Turret: max concurrent count × dmg / fire-rate (summon CD is not the attack interval).
     * Orbit: each orb rehits every max(0.12, cd) → count × dmg / rehit.
     * Aura: pulse every cd → dmg / cd.
     * Trail patch: ticks every 0.5s while enemy stands in it → dmg / 0.5 (one patch).
     */
    // Weather avg multipliers (30 min game, biome every 240s, weather from 2:00 @ 18%/60s, ~65s dur → ~18% uptime)
    // Derived from BIOME_W weights in weather.js; overall = (1-p_on) + p_on * E[mult|on]
    // WEATHER_AVG_MULT → constants.js


    
    /**
     * Mobbing hit estimate.
     * - projectile/beam/dash/melee: hitPct × count × (1+pierce); chain: hitPct × count (all jumps if primary hits)
     * - aura: half-disk area / enemy footprint
     * - orbit: ring (R+size)²−(R−size)² × π / footprint
     * - meteor/nova/mine: full disk / footprint (× count for multi-meteor)
     */
    function estimateMobHits(s, cfg) {
      const kind = s.kind;
      const p = (cfg.projHitPct != null ? cfg.projHitPct : 70) / 100;
      const rE = cfg.avgEnemyR || 12;
      const foot = Math.PI * rE * rE;
      const count = Math.max(1, s.count | 0);
      const pierce = Math.max(0, s.pierce | 0);
      let n = 1;
      let detail = '1 target';

      if (kind === 'projectile' || kind === 'homing' || kind === 'beam' || kind === 'dash' || kind === 'melee') {
        n = p * count * (1 + pierce);
        detail = (cfg.projHitPct || 70) + '% hit × ' + count + ' proj × (1+' + pierce + ' pierce) = ' + n.toFixed(2);
      } else if (kind === 'boomerang') {
        n = p * count * 2 * (1 + pierce);
        detail = (cfg.projHitPct || 70) + '% × ' + count + ' × 2 passes × (1+' + pierce + ' pierce) = ' + n.toFixed(2);
      } else if (kind === 'bounce') {
        const bounces = Math.max(0, s.bounce | 0);
        n = p * count * (1 + bounces);
        detail = (cfg.projHitPct || 70) + '% × ' + count + ' × (1+' + bounces + ' bounce) = ' + n.toFixed(2);
      } else if (kind === 'chain') {
        n = p * count;
        detail = (cfg.projHitPct || 70) + '% primary × ' + count + ' chain (all jumps if primary hits) = ' + n.toFixed(2);
      } else if (kind === 'aura') {
        const R = +(s.radius || 50);
        const rSelf = selfRadius();
        const R2 = Math.max(0, R * R - rSelf * rSelf);
        const area = 0.5 * Math.PI * R2; // half-disk minus self body
        n = Math.max(1, area / foot);
        detail = '½π(R²−r_self²) R=' + R + ' r_self=' + rSelf.toFixed(1) + ' → ' + n.toFixed(2) + ' foes';
      } else if (kind === 'orbit') {
        const R = +(s.radius || 60);
        const sz = +(s.size || 8);
        const Rout = R + sz, Rin = Math.max(0, R - sz);
        const area = Math.PI * (Rout * Rout - Rin * Rin);
        n = Math.max(1, area / foot);
        detail = 'ring π(' + Rout.toFixed(0) + '²−' + Rin.toFixed(0) + '²) / πr² → ' + n.toFixed(2) + ' foes';
      } else if (kind === 'meteor') {
        // Game: queryCircle(player, reach=340), shuffle, assign 1 meteor per enemy up to count.
        // Leftover meteors if fewer foes land randomly (often miss). Splash blast(r) at impact.
        const reach = 340;
        const R = +(s.radius || 50);
        // Engaged density: only a fraction of the full reach disk is occupied in real fights
        const capacity = (Math.PI * reach * reach) / foot;
        const engaged = Math.max(1, capacity * 0.08); // ~8% fill of reach disk
        const primaries = Math.min(count, engaged);
        // Splash extras: theoretical πR²/foot − 1, but targets are distinct + jitter → low realized overlap
        const splashIdeal = Math.max(0, (Math.PI * R * R) / foot - 1);
        const splashFactor = 0.25; // overlaps / same-target waste
        n = primaries * (1 + splashIdeal * splashFactor);
        detail = 'meteor aim: min(' + count + ', ~' + engaged.toFixed(1) + ' near) × (1+' +
          (splashIdeal * splashFactor).toFixed(2) + ' splash) = ' + n.toFixed(2) +
          ' (game: 1 meteor/enemy, reach 340, random if short)';
      } else if (kind === 'nova' || kind === 'mine' || kind === 'shove' || kind === 'spin' || kind === 'quake' || kind === 'vortex' || kind === 'stun') {
        const R = +(s.radius || 50);
        const area = Math.PI * R * R;
        n = Math.max(1, area / foot);
        detail = 'πR²(' + R + ') / πr² → ' + n.toFixed(2) + ' foes';
      } else if (kind === 'cone') {
        n = Math.min(count, cfg.coneHitCap || 3);
        detail = 'cone cap ' + n + ' hits';
      } else if (kind === 'turret') {
        n = p;
        detail = 'turret × ' + (cfg.projHitPct || 70) + '% hit = ' + n.toFixed(2) + '× vs ST';
      } else if (kind === 'trail') {
        const R = +(s.radius || s.width || 40);
        const area = Math.PI * R * R * 0.5;
        n = Math.max(1, area / foot);
        detail = 'trail ~' + n.toFixed(2) + ' foes';
      } else {
        n = 1;
        detail = '1 target (no mob model)';
      }
      return { n: Math.max(0.05, n), detail };
    }

function dpsBreakdown(s, cfg) {
      cfg = cfg || getConfig();
      // typeM: manual; if useAvgType, multiply by AVG_TYPE_MULT[moveType]
      let typeFactor = cfg.typeM;
      if (cfg.useAvgType && s.type && AVG_TYPE_MULT[s.type] != null) {
        typeFactor = cfg.typeM * AVG_TYPE_MULT[s.type];
      }
      let weatherFactor = cfg.weatherM;
      if (cfg.useWeatherAvg && s.type && WEATHER_AVG_MULT[s.type] != null) {
        weatherFactor = WEATHER_AVG_MULT[s.type];
      }
      let atkUse = cfg.atk;
      if (cfg.mon && s.cat) {
        atkUse = (s.cat === 'special' ? (cfg.mon.sa != null ? cfg.mon.sa : cfg.mon.atk) : (cfg.mon.pa != null ? cfg.mon.pa : cfg.mon.atk)) || cfg.atk;
      }
      const mult = atkUse * typeFactor * weatherFactor * (1 + cfg.powerBonus);
      const dmg = +s.dmg;
      const cd = +s.cd;
      const kind = s.kind;
      const count = Math.max(1, s.count | 0);
      const parts = [];
      let dps = 0;
      let poisonDps = 0;

      function push(val, label) {
        parts.push(fmt(val) + ' ' + label);
      }
      function expr() {
        return parts.join(' × ').replace(' × / ', ' / ');
      }

      if (kind === 'turret') {
        const rate = +(s.rate || 0.6);
        dps = (count * dmg * mult) / rate;
        push(dmg, 'dmg');
        if (count > 1) push(count, 'turrets');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(rate) + ' rate');
      } else if (kind === 'orbit') {
        // Angular speed (rad/s). Stationary enemy on the ring: orbs pass sequentially.
        // Hit interval ≈ 2π / (count × speed). One orb contributes at a time.
        const speed = +(s.speed || 2.5);
        const interval = (2 * Math.PI) / (count * speed);
        dps = (dmg * mult) / interval;
        push(dmg, 'dmg');
        push(count, 'orbs');
        push(speed, 'rad/s');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ 2π');
        // rewrite cleaner expr
        parts.length = 0;
        push(dmg, 'dmg');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(interval) + 's (2π/(n·ω))');
      } else if (kind === 'aura') {
        dps = (dmg * mult) / cd;
        push(dmg, 'dmg');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      } else if (kind === 'trail') {
        const tick = cfg.trailTick || 0.5;
        dps = (dmg * mult) / tick;
        push(dmg, 'dmg');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(tick) + ' tick');
      } else if (kind === 'boomerang') {
        const hits = 2 * count;
        dps = (dmg * hits * mult) / cd;
        push(dmg, 'dmg');
        push(count, 'count');
        push(2, 'hit');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      } else if (kind === 'cone' || kind === 'nova') {
        const hits = Math.min(count, cfg.coneHitCap || 3);
        dps = (dmg * hits * mult) / cd;
        push(dmg, 'dmg');
        push(hits, 'hit');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      } else if (kind === 'chain' || kind === 'meteor' || kind === 'mine') {
        dps = (dmg * mult) / cd;
        push(dmg, 'dmg');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      } else if (kind === 'homing') {
        dps = (dmg * count * mult) / cd;
        push(dmg, 'dmg');
        if (count > 1) push(count, 'count');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      } else if (kind === 'bounce') {
        const bounces = Math.max(0, s.bounce | 0);
        const hits = count * (1 + bounces);
        dps = (dmg * hits * mult) / cd;
        push(dmg, 'dmg');
        push(hits, 'hits');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      } else if (kind === 'charge') {
        const ch = +(s.charge || 0);
        const cycle = Math.max(0.05, cd + ch);
        dps = (dmg * mult) / cycle;
        push(dmg, 'dmg');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cycle) + 's (cd+charge)');
      } else if (kind === 'spin' || kind === 'quake') {
        dps = (dmg * count * mult) / cd;
        push(dmg, 'dmg');
        push(count, kind === 'spin' ? 'spins' : 'waves');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      } else if (kind === 'vortex' || kind === 'shove' || kind === 'stun') {
        // AoE pulse around self / zone: treat as dmg/cd (one proc per cast)
        dps = (dmg * mult) / cd;
        push(dmg, 'dmg');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      } else {
        // projectile, dash, melee, beam
        dps = (dmg * count * mult) / cd;
        push(dmg, 'dmg');
        if (count > 1) push(count, 'count');
        if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + fmt(cd) + ' cd');
      }

      // Mobbing: apply estimated hits (absolute for proj/chain; ×n for per-target AoE)
      let mobInfo = { n: 1, detail: 'single target' };
      if (cfg.mobbing && kind !== 'buff') {
        mobInfo = estimateMobHits(s, cfg);
        const hits = mobInfo.n;
        if (kind === 'projectile' || kind === 'homing' || kind === 'bounce' || kind === 'beam' || kind === 'dash' || kind === 'melee' || kind === 'chain') {
          // ST used count as hits; replace with mob estimate (includes hit% × count × pierce)
          dps = (dmg * hits * mult) / Math.max(0.05, cd);
          parts.length = 0;
          push(dmg, 'dmg');
          push(hits, 'hits');
          if (mult !== 1) push(mult, 'mult');
          parts.push('/ ' + fmt(cd) + ' cd');
        } else if (kind === 'boomerang') {
          dps = (dmg * hits * mult) / Math.max(0.05, cd);
          parts.length = 0;
          push(dmg, 'dmg');
          push(hits, 'hits');
          if (mult !== 1) push(mult, 'mult');
          parts.push('/ ' + fmt(cd) + ' cd');
        } else if (kind === 'turret') {
          const rate = +(s.rate || 0.6);
          // hits is hit% scale; still × turret count / rate
          dps = (count * dmg * mult * hits) / rate;
          parts.length = 0;
          push(dmg, 'dmg');
          if (count > 1) push(count, 'turrets');
          push(hits, 'hit%');
          if (mult !== 1) push(mult, 'mult');
          parts.push('/ ' + fmt(rate) + ' rate');
        } else if (kind === 'orbit' || kind === 'aura' || kind === 'trail') {
          // ST was per one enemy in range — multiply by estimated foes
          dps *= hits;
          parts.push('× ' + fmt(hits) + ' foes');
        } else if (kind === 'meteor' || kind === 'nova' || kind === 'mine') {
          dps = (dmg * hits * mult) / Math.max(0.05, cd);
          parts.length = 0;
          push(dmg, 'dmg');
          push(hits, 'hits');
          if (mult !== 1) push(mult, 'mult');
          parts.push('/ ' + fmt(cd) + ' cd');
        } else if (kind === 'cone') {
          dps = (dmg * hits * mult) / Math.max(0.05, cd);
          parts.length = 0;
          push(dmg, 'dmg');
          push(hits, 'hits');
          if (mult !== 1) push(mult, 'mult');
          parts.push('/ ' + fmt(cd) + ' cd');
        } else {
          dps *= hits;
          parts.push('× ' + fmt(hits) + ' mob');
        }
      }

      // Apps/sec helper for DoT stack building
      function appsPerSec() {
        let a = 1 / Math.max(0.05, cd);
        if (kind === 'orbit') {
          const speed = +(s.speed || 2.5);
          a = (count * speed) / (2 * Math.PI);
        } else if (kind === 'boomerang') a = (2 * count) / cd;
        else if (kind === 'cone' || kind === 'nova') a = Math.min(count, cfg.coneHitCap || 3) / cd;
        else if (kind === 'turret') a = count / (s.rate || 0.6);
        else if (kind === 'projectile' || kind === 'melee' || kind === 'dash' || kind === 'beam') a = count / cd;
        return a;
      }

      // Poison DoT: stacks max 8, dur 4s, tick 0.6s → maxHp*0.012*stacks + 1
      let burnDps = 0;
      const poisonStacks = +(s.poison || 0);
      if (cfg.usePoison && poisonStacks > 0 && kind !== 'buff') {
        const refHp = cfg.refEnemyHp || 100;
        const sustained = Math.min(8, Math.max(poisonStacks, Math.floor(appsPerSec() * 4) * poisonStacks));
        poisonDps = (refHp * 0.012 * sustained + 1) / 0.6;
        dps += poisonDps;
      }
      // Burn DoT: stacks max 8, dur 3s, tick 0.5s → 1.6 * stacks * (1 + level*0.06)
      const burnStacks = +(s.burn || 0);
      if (cfg.usePoison && burnStacks > 0 && kind !== 'buff') {
        const lvl = cfg.refPlayerLvl || 20;
        const sustained = Math.min(8, Math.max(burnStacks, Math.floor(appsPerSec() * 3) * burnStacks));
        burnDps = (1.6 * sustained * (1 + lvl * 0.06)) / 0.5;
        dps += burnDps;
      }

      let e = expr();
      if (poisonDps > 0) e += ' + poison ' + Math.round(poisonDps);
      if (burnDps > 0) e += ' + burn ' + Math.round(burnDps);
      return {
        dps, expr: e, poisonDps, burnDps, radius: s.radius, mobHits: mobInfo.n, mobDetail: mobInfo.detail,
        effects: {
          poison: poisonStacks, burn: burnStacks,
          slow: s.slow || 0, knock: s.knock || 0,
          homing: s.homing || 0, hex: s.hex || 0
        }
      };
    }

    function singleTargetDPS(s, cfg) {
      return dpsBreakdown(s, cfg).dps;
    }

    /** Compact props line: count, pierce, rate, dur, etc. */
    function propsLine(s) {
      const bits = [];
      if (s.count != null && s.count > 0) bits.push('count ' + s.count);
      if (s.pierce != null && s.pierce > 0) bits.push('pierce ' + s.pierce);
      if (s.rate != null) bits.push('rate ' + fmt(s.rate) + 's');
      if (s.dur != null) bits.push('dur ' + fmt(s.dur) + 's');
      if (s.radius != null && ['melee','aura','orbit','dash','mine','meteor','trail'].includes(s.kind))
        bits.push('r ' + Math.round(s.radius));
      if (s.width != null) bits.push('w ' + Math.round(s.width));
      if (s.arc != null && s.kind === 'melee') bits.push('arc ' + fmt(s.arc));
      return bits.length ? bits.join(' · ') : '';
    }

    function ladderText(kind, index) {
      const ups = LADDERS[kind] || [];
      if (index < 0 || index >= ups.length) return null;
      const t = ups[index].t;
      return MOVE_EN[t] || t;
    }

    function buildLevelTooltip(def, lvl, cfg) {
      if (!def) return '';
      const s = instance(def, lvl, false);
      if (!s) return '';
      let bd;
      try { bd = dpsBreakdown(s, cfg); } catch (err) { return '<div class="tt-title">Error</div><div class="tt-muted">' + err.message + '</div>'; }
      const lines = [];
      lines.push('<div class="tt-title">' + enName(def.name, def.id) + ' · Lv' + lvl + '</div>');
      const props = propsLine(s);
      if (props) lines.push('<div class="tt-muted">' + props + '</div>');
      if (lvl > 1) {
        const txt = ladderText(def.kind, lvl - 2);
        if (txt) lines.push('<div class="tt-step">Lv' + lvl + ': ' + txt + '</div>');
      }
      lines.push('<div class="tt-result">' + bd.expr + ' = ' + Math.round(bd.dps) + '</div>');
      if (bd.mobDetail && cfg.mobbing) {
        lines.push('<div class="tt-muted">Mob hits: ' + bd.mobDetail + '</div>');
      }
      // Effect explanations
      const eff = bd.effects || {};
      const notes = [];
      if (eff.poison) notes.push('<b>poison ' + eff.poison + '</b>: ' + EFFECT_HELP.poison);
      if (eff.burn) notes.push('<b>burn ' + eff.burn + '</b>: ' + EFFECT_HELP.burn);
      if (eff.slow) notes.push('<b>slow ' + eff.slow + '</b>: ' + EFFECT_HELP.slow);
      if (eff.knock) notes.push('<b>knock ' + eff.knock + '</b>: ' + EFFECT_HELP.knock);
      if (eff.homing) notes.push('<b>homing ' + eff.homing + '</b>: ' + EFFECT_HELP.homing);
      if (eff.hex) notes.push('<b>hex ×' + eff.hex + '</b>: ' + EFFECT_HELP.hex);
      if (notes.length) {
        lines.push('<div class="tt-muted" style="margin-top:0.35rem;border-top:1px solid #1e2836;padding-top:0.3rem">' +
          notes.map(n => '<div style="margin:0.15rem 0">' + n + '</div>').join('') + '</div>');
      }
      lines.push('<div class="tt-muted" style="margin-top:0.25rem;font-size:0.65rem">Hold Alt to pin · Esc to close</div>');
      return lines.join('');
    }


    function buildEvoTooltip(def, cfg) {
      if (!EVO[def.id] || !EVO_MODS[def.kind]) return '';
      const evoName = enName(EVO[def.id][0], def.id);
      const s = instance(def, 5, true);
      const bd = dpsBreakdown(s, cfg);
      const evoTxt = MOVE_EN[EVO_MODS[def.kind].t] || EVO_MODS[def.kind].t;
      const lines = [];
      lines.push('<div class="tt-title tt-pink">' + evoName + '</div>');
      const props = propsLine(s);
      if (props) lines.push('<div class="tt-muted">' + props + '</div>');
      lines.push('<div class="tt-step">' + evoTxt + '</div>');
      lines.push('<div class="tt-result">' + bd.expr + ' = ' + Math.round(bd.dps) + '</div>');
      if (bd.mobDetail && cfg.mobbing) {
        lines.push('<div class="tt-muted">Mob hits: ' + bd.mobDetail + '</div>');
      }
      return lines.join('');
    }

    function sig4(x) {
      if (x == null || x === '' || isNaN(+x)) return '—';
      const n = +x;
      if (n === 0) return '0';
      const s = Number(n.toPrecision(4));
      return String(s);
    }

    function fmt(n) {
      if (n == null || isNaN(n)) return '?';
      return (Math.round(n * 100) / 100).toString();
    }

    // Tooltip positioning
    const ttEl = () => document.getElementById('tt');
    function showTip(html, x, y) {
      const el = ttEl();
      el.innerHTML = html;
      el.style.display = 'block';
      if (tipPinned) return; // keep pinned screen position
      const pad = 12;
      let left = x + pad, top = y + pad;
      requestAnimationFrame(() => {
        if (tipPinned) return;
        const r = el.getBoundingClientRect();
        if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
        if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
        if (left < 8) left = 8;
        if (top < 8) top = 8;
        el.style.left = left + 'px';
        el.style.top = top + 'px';
      });
    }
    function hideTip(force) {
      if (tipPinned && !force) return;
      tipPinned = false;
      const el = ttEl();
      el.style.display = 'none';
      el.classList.remove('pinned');
    }
    document.addEventListener('scroll', () => hideTip(true), true);
    document.addEventListener('keydown', e => {
      if (e.key === 'Alt') {
        tipPinned = true;
        const el = ttEl();
        if (el.style.display === 'block') el.classList.add('pinned');
      }
      if (e.key === 'Escape') hideTip(true);
    });
    document.addEventListener('click', e => {
      if (tipPinned && !ttEl().contains(e.target)) hideTip(true);
      else if (!tipPinned) hideTip(true);
    });

    function getConfig() {
      const bondEl = document.getElementById('bondSize');
      const bondSize = Math.max(1, Math.min(4, parseInt(bondEl && bondEl.value, 10) || 4));
      const useAvg = document.getElementById('useAvgType');
      const usePoi = document.getElementById('usePoison');
      const refHp = document.getElementById('refEnemyHp');
      const mon = (typeof globalPoke !== 'undefined' && globalPoke) || (typeof calcPoke !== 'undefined' && calcPoke) || null;
      // atk fallback = max(PA, SA); dpsBreakdown picks PA or SA by move cat
      let atkFallback = 1;
      if (mon) {
        const pa = mon.pa != null ? +mon.pa : (mon.atk || 1);
        const sa = mon.sa != null ? +mon.sa : (mon.atk || 1);
        atkFallback = Math.max(pa, sa) || 1;
      }
      return {
        atk: atkFallback,
        mon: mon,
        typeM: parseFloat(document.getElementById('typeMult').value) || 1,
        weatherM: parseFloat(document.getElementById('weatherMult').value) || 1,
        powerBonus: 0,
        coneHitCap: Math.max(1, parseInt(document.getElementById('coneHitCap').value, 10) || 3),
        trailTick: Math.max(0.05, parseFloat(document.getElementById('trailTick').value) || 0.5),
        bondSize,
        numSlots: 4,
        useAvgType: !!(useAvg && useAvg.checked),
        usePoison: !!(usePoi && usePoi.checked),
        useWeatherAvg: !!(document.getElementById('useWeatherAvg') && document.getElementById('useWeatherAvg').checked),
        refEnemyHp: refHp ? (parseFloat(refHp.value) || 100) : 100,
        refPlayerLvl: parseFloat((document.getElementById('refPlayerLvl') || {}).value) || 20,
        mobbing: !!(document.getElementById('dpsMobbing') && document.getElementById('dpsMobbing').checked),
        projHitPct: Math.max(1, Math.min(100, parseFloat((document.getElementById('projHitPct') || {}).value) || 70)),
        avgEnemyR: Math.max(1, parseFloat((document.getElementById('avgEnemyR') || {}).value) || 12)
      };
    }

    function onDpsModeChange() {
      const mob = document.getElementById('dpsMobbing');
      const on = !!(mob && mob.checked);
      const opts = document.getElementById('mobbingOpts');
      if (opts) opts.style.display = on ? 'block' : 'none';
      if (on) prefillAvgEnemyR();
      recalcAll();
    }

    /** Spawn-weighted mean hitbox of dex mons matching each enemy type combo. */
    function prefillAvgEnemyR() {
      const el = document.getElementById('avgEnemyR');
      if (!el || !DEX.length) return;
      let sum = 0, wsum = 0;
      const weights = ENEMY_WEIGHTS.length ? ENEMY_WEIGHTS : [{ types: ['normal'], pct: 100 }];
      for (const e of weights) {
        const types = e.types || [];
        const mons = DEX.filter(p => {
          if (!types.length) return true;
          // match if mon shares any type with the spawn combo
          return types.some(t => (p.types || []).includes(t));
        });
        const rs = mons.map(pokeHit).filter(r => r > 0);
        if (!rs.length) continue;
        const avg = rs.reduce((a, b) => a + b, 0) / rs.length;
        const w = e.pct || 1;
        sum += w * avg;
        wsum += w;
      }
      if (!wsum) {
        const all = DEX.map(pokeHit).filter(r => r > 0);
        if (all.length) {
          sum = all.reduce((a, b) => a + b, 0);
          wsum = all.length;
        }
      }
      if (wsum) el.value = (sum / wsum).toFixed(1);
    }

    function meanPokeRadius() {
      if (!DEX.length) return 12;
      const rs = DEX.map(pokeHit).filter(r => r > 0);
      return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 12;
    }

    function selfRadius() {
      const p = globalPoke || calcPoke;
      if (p) return pokeHit(p);
      return meanPokeRadius();
    }

    // Calculator state: 4 slots, each an array of {id, evolved}
    let calcSlotsState = [[], [], [], []];

    // Client-side cache (localStorage) with recheck interval — avoids refetching the repo on every refresh
    // 1 hour

    function loadCache() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || !obj.ts || !obj.movesSrc || !obj.dexSrc) return null;
        return obj;
      } catch (e) { return null; }
    }
    function saveCache(data) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
      } catch (e) { /* quota */ }
    }

            function populateFilters() {
      const types = [...new Set(RAW.map(m => m.type))].sort();
      const kinds = [...new Set((DAMAGE_MOVES.length ? DAMAGE_MOVES : RAW).map(m => m.kind).filter(k => k !== 'buff'))].sort();
      const gens = [...new Set(DEX.map(p => p.gen))].sort((a,b)=>a-b);
      const allTypes = [...new Set(DEX.flatMap(p => p.types))].sort();

      function fill(id, opts, allLabel) {
        const sel = document.getElementById(id);
        sel.innerHTML = '<option value="">' + allLabel + '</option>';
        opts.forEach(v => {
          const o = document.createElement('option');
          o.value = v; o.textContent = v;
          sel.appendChild(o);
        });
      }
      buildDpsKindChips(kinds);
      fill('pokeGen', gens, 'All gens');
      buildPokeTypeChips(allTypes);
      buildDpsTypeChips(types);
      buildSizeTypeChips(allTypes);
    
      if (typeof buildPokeAbilityChips === 'function') buildPokeAbilityChips();
      if (typeof renderAbilities === 'function') renderAbilities();
    }

    function styleTypeChip(el, t, selected) {
      const c = TYPE_COLORS[t] || '#888';
      el.style.setProperty('--tc', c);
      if (selected) {
        el.classList.add('on');
        el.style.background = c;
        el.style.color = '#111';
        el.style.borderColor = c;
      } else {
        el.classList.remove('on');
        el.style.background = c + '33';
        el.style.color = c;
        el.style.borderColor = c + '66';
      }
    }

    function refreshChipDisabled(box, selSet) {
      if (!box) return;
      box.querySelectorAll('.type-chip').forEach(el => {
        const t = el.dataset.type;
        const ok = canToggleType(selSet, t);
        el.classList.toggle('disabled', !ok && !selSet.has(t));
      });
    }

    function buildPokeTypeChips(allTypes) {
      const box = document.getElementById('pokeTypeChips');
      if (!box) return;
      if (!allTypes || !allTypes.length) allTypes = Object.keys(TYPE_COLORS || {});
      box.innerHTML = allTypes.map(t => {
        const c = TYPE_COLORS[t] || '#888';
        return '<span class="type-chip" data-type="' + t + '">' + t + '</span>';
      }).join('');
      box.querySelectorAll('.type-chip').forEach(el => {
        const t = el.dataset.type;
        styleTypeChip(el, t, pokeTypeSel.has(t));
        el.addEventListener('click', () => {
          if (!canToggleType(pokeTypeSel, t) && !pokeTypeSel.has(t)) return;
          if (pokeTypeSel.has(t)) pokeTypeSel.delete(t);
          else pokeTypeSel.add(t);
          styleTypeChip(el, t, pokeTypeSel.has(t));
          refreshChipDisabled(box, pokeTypeSel);
          renderPokedex();
        });
      });
      refreshChipDisabled(box, pokeTypeSel);
    }

    function clearPokeTypes() {
      pokeTypeSel.clear();
      document.querySelectorAll('#pokeTypeChips .type-chip').forEach(el => {
        el.classList.remove('on');
        el.style.background = '';
        el.style.color = '';
      });
      renderPokedex();
    }

    function buildDpsTypeChips(types) {
      const box = document.getElementById('dpsTypeChips');
      if (!box) return;
      if (!types || !types.length) types = Object.keys(TYPE_COLORS || {});
      box.innerHTML = types.map(t => '<span class="type-chip" data-type="' + t + '">' + t + '</span>').join('');
      box.querySelectorAll('.type-chip').forEach(el => {
        const t = el.dataset.type;
        styleTypeChip(el, t, dpsTypeSel.has(t));
        el.addEventListener('click', () => {
          // Move types are independent — no combo restriction on DPS filter
          if (dpsTypeSel.has(t)) dpsTypeSel.delete(t);
          else dpsTypeSel.add(t);
          styleTypeChip(el, t, dpsTypeSel.has(t));
          renderDps();
        });
      });
    }

    function buildDpsKindChips(kinds) {
      const box = document.getElementById('dpsKindChips');
      if (!box) return;
      let list = Array.isArray(kinds) ? kinds.filter(Boolean) : [];
      if (!list.length && typeof RAW !== 'undefined' && RAW.length) {
        list = [...new Set(RAW.map(m => m.kind).filter(k => k && k !== 'buff'))].sort();
      }
      box.innerHTML = '';
      list.forEach(k => {
        const el = document.createElement('span');
        el.className = 'kind-chip' + (dpsKindSel.has(k) ? ' on' : '');
        el.dataset.kind = k;
        el.textContent = k;
        el.addEventListener('click', () => {
          if (dpsKindSel.has(k)) dpsKindSel.delete(k); else dpsKindSel.add(k);
          el.classList.toggle('on', dpsKindSel.has(k));
          renderDps();
        });
        box.appendChild(el);
      });
    }

    function clearDpsTypes() {
      dpsTypeSel.clear();
      document.querySelectorAll('#dpsTypeChips .type-chip').forEach(el => {
        el.classList.remove('on');
        el.style.background = '';
        el.style.color = '';
      });
      renderDps();
    }

    function buildSizeTypeChips(allTypes) {
      const box = document.getElementById('sizeTypeChips');
      if (!box) return;
      if (!allTypes || !allTypes.length) allTypes = Object.keys(TYPE_COLORS || {});
      box.innerHTML = '';
      allTypes.forEach(t => {
        const el = document.createElement('span');
        el.className = 'type-chip';
        el.textContent = t;
        el.dataset.type = t;
        styleTypeChip(el, t, sizeTypeSel.has(t));
        el.addEventListener('click', () => {
          if (!canToggleType(sizeTypeSel, t) && !sizeTypeSel.has(t)) return;
          if (sizeTypeSel.has(t)) sizeTypeSel.delete(t);
          else sizeTypeSel.add(t);
          styleTypeChip(el, t, sizeTypeSel.has(t));
          refreshChipDisabled(box, sizeTypeSel);
          renderSizeView();
        });
        box.appendChild(el);
      });
      refreshChipDisabled(box, sizeTypeSel);
    }

    function clearSizeTypes() {
      sizeTypeSel.clear();
      document.querySelectorAll('#sizeTypeChips .type-chip').forEach(el => {
        el.classList.remove('on');
        el.style.background = '';
        el.style.color = '';
      });
      const box = document.getElementById('sizeTypeChips');
      if (box) refreshChipDisabled(box, sizeTypeSel);
      renderSizeView();
    }

    function spriteUrl(dex) {
      return 'https://raw.githubusercontent.com/JPTER78/pokesurvivor/main/assets/pokemon/' + dex + '/Idle.png';
    }

    function spriteStyle(dex, boxPx) {
      const m = SPRITE_META[dex];
      const w = (m && m.a && m.a.Idle && m.a.Idle.w) ? m.a.Idle.w : 32;
      const h = (m && m.a && m.a.Idle && m.a.Idle.h) ? m.a.Idle.h : 32;
      const n = (m && m.a && m.a.Idle && m.a.Idle.n) ? m.a.Idle.n : 3;
      const box = boxPx || 40;
      // Scale so the larger frame dimension fits in the box; crop to frame 0, row 0 (Down)
      const scale = box / Math.max(w, h);
      const fw = w * scale, fh = h * scale;
      const bgW = n * w * scale;
      const bgH = 8 * h * scale;
      // Center the frame in the box
      const ox = (box - fw) / 2;
      const oy = (box - fh) / 2;
      return 'width:' + box + 'px;height:' + box + 'px;' +
        'background-image:url(\'' + spriteUrl(dex) + '\');' +
        'background-size:' + bgW.toFixed(1) + 'px ' + bgH.toFixed(1) + 'px;' +
        'background-position:' + ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px;' +
        'background-repeat:no-repeat;';
    }

    function buildEnemyWeights() {
      // Live expected distribution over many runs:
      // each tier is active [from, next.from); spawn intensity = ∫ rate(t) dt (from spawner.js).
      // Each run picks `cast` mons from the tier pool; long-run each candidate gets
      // equal share → weight = tierIntensity / |candidates|.
      const comboW = new Map();
      for (const tier of TIERS_BST) {
        const tw = tierSpawnWeight(tier);
        const cands = DEX.filter(p => (p.rarity == null || p.rarity < 5) && !p.leg &&
          p.bst >= tier.bst[0] && p.bst <= tier.bst[1]);
        if (!cands.length) continue;
        const per = tw / cands.length;
        for (const p of cands) {
          const types = [...p.types].sort();
          const key = types.join('+');
          if (!comboW.has(key)) comboW.set(key, { types, weight: 0, examples: new Set() });
          const e = comboW.get(key);
          e.weight += per;
          if (e.examples.size < 4) e.examples.add(p.name);
        }
      }
      const total = [...comboW.values()].reduce((a, x) => a + x.weight, 0) || 1;
      ENEMY_WEIGHTS = [...comboW.values()]
        .map(x => ({
          key: x.types.join('+'),
          types: x.types,
          weight: x.weight,
          pct: (x.weight / total) * 100,
          examples: [...x.examples]
        }))
        .sort((a, b) => b.pct - a.pct);

      // Average type multi for each attack type
      const atkTypes = Object.keys(TYPE_COLORS);
      AVG_TYPE_MULT = {};
      for (const at of atkTypes) {
        let sum = 0;
        for (const e of ENEMY_WEIGHTS) sum += (e.pct / 100) * typeMult(at, e.types);
        AVG_TYPE_MULT[at] = sum;
      }
    }

    /** Offense: high mult = green (beneficial). */
    function multClass(m) {
      if (m > 1.05) return 'mult-super';
      if (m < 0.95) return 'mult-weak';
      return 'mult-neutral';
    }
    /** Defense / incoming: low mult = green (take less damage). */
    function multClassDef(m) {
      if (m < 0.95) return 'mult-super';
      if (m > 1.05) return 'mult-weak';
      return 'mult-neutral';
    }

    function buildWeakAtkChips() {
      const box = document.getElementById('weakAtkChips');
      if (!box) return;
      const types = Object.keys(TYPE_COLORS);
      box.innerHTML = types.map(t => '<span class="type-chip" data-type="' + t + '">' + t + '</span>').join('');
      box.querySelectorAll('.type-chip').forEach(el => {
        const t = el.dataset.type;
        styleTypeChip(el, t, weakAtkSel.has(t));
        el.addEventListener('click', () => {
          if (!canToggleType(weakAtkSel, t) && !weakAtkSel.has(t)) return;
          if (weakAtkSel.has(t)) weakAtkSel.delete(t);
          else weakAtkSel.add(t);
          styleTypeChip(el, t, weakAtkSel.has(t));
          refreshChipDisabled(box, weakAtkSel);
          renderWeakMatrix();
          // refresh multi summary via renderEnemies partial
          const sumEl = document.getElementById('weakMultiSummary');
          if (sumEl) {
            const sel = [...weakAtkSel];
            if (sel.length >= 2) {
              const split = coverageScore(sel);
              let sumBest = 0;
              const tot = ENEMY_WEIGHTS.reduce((a, e) => a + e.pct, 0) || 100;
              for (const e of ENEMY_WEIGHTS) {
                sumBest += (e.pct / 100) * Math.max(...sel.map(tt => typeMult(tt, e.types)));
              }
              sumEl.innerHTML = 'Selection <b>' + sel.join('+') + '</b>: equal-split ×' +
                split.toFixed(3) + ' · best-of ×' + (sumBest * 100 / tot).toFixed(3);
            } else sumEl.textContent = '';
          }
        });
      });
      refreshChipDisabled(box, weakAtkSel);
    }

    function clearWeakAtk() {
      weakAtkSel.clear();
      buildWeakAtkChips();
      renderWeakMatrix();
    }

    function renderWeakMatrix() {
      const head = document.getElementById('weakMatrixHead');
      const body = document.getElementById('weakMatrixBody');
      if (!head || !body) return;
      // Selected types = your mon's types (offense columns per type; one shared def column)
      let yourTypes = [...weakAtkSel];
      if (!yourTypes.length) yourTypes = ['normal'];
      yourTypes.sort();
      const multi = yourTypes.length >= 2;

      // Defense vs one enemy row: equal-split over enemy attack types into your types
      function rowDefMult(enemyTypes) {
        const atkTypes = enemyTypes && enemyTypes.length ? enemyTypes : ['normal'];
        return atkTypes.reduce((a, t) => a + typeMult(t, yourTypes), 0) / atkTypes.length;
      }

      head.innerHTML = '<tr><th class="text-left">Enemy types</th><th>%</th>' +
        yourTypes.map(t => {
          const c = TYPE_COLORS[t] || '#888';
          return '<th title="Offense: you attack as ' + t + '">off ' +
            '<span class="type-badge" style="background:' + c + '33;color:' + c + '">' + t + '</span></th>';
        }).join('') +
        (multi
          ? '<th title="max offense among your types">Best off</th><th title="mean offense (equal split)">Avg off</th>'
          : '') +
        '<th title="Defense: damage taken from this enemy (equal-split their types → you)">def</th>' +
        '</tr>';

      const rows = ENEMY_WEIGHTS.slice();
      const tot = rows.reduce((a, e) => a + e.pct, 0) || 100;

      body.innerHTML = rows.map(e => {
        const badges = e.types.map(t => {
          const c = TYPE_COLORS[t] || '#888';
          return '<span class="type-badge" style="background:' + c + '33;color:' + c + '">' + t + '</span>';
        }).join(' ');
        const mults = yourTypes.map(at => typeMult(at, e.types));
        const cells = mults.map(m =>
          '<td class="' + multClass(m) + '">×' + m.toFixed(2) + '</td>'
        ).join('');
        let extra = '';
        if (multi) {
          const best = Math.max(...mults);
          const avg = mults.reduce((a, b) => a + b, 0) / mults.length;
          extra = '<td class="' + multClass(best) + '">×' + best.toFixed(2) + '</td>' +
                  '<td class="' + multClass(avg) + '">×' + avg.toFixed(2) + '</td>';
        }
        const defM = rowDefMult(e.types);
        const defCell = '<td class="' + multClassDef(defM) + '">×' + defM.toFixed(2) + '</td>';
        return '<tr><td class="text-left">' + badges + '</td><td>' + e.pct.toFixed(2) + '%</td>' + cells + extra + defCell + '</tr>';
      }).join('');

      // Spawn-weighted averages
      const avgCells = yourTypes.map(at => {
        let sum = 0;
        for (const e of rows) sum += (e.pct / 100) * typeMult(at, e.types);
        const avg = sum * (100 / tot);
        return '<td class="' + multClass(avg) + '">×' + avg.toFixed(3) + '</td>';
      }).join('');
      let avgExtra = '';
      if (multi) {
        let sumBest = 0, sumSplit = 0;
        for (const e of rows) {
          const mults = yourTypes.map(at => typeMult(at, e.types));
          sumBest += (e.pct / 100) * Math.max(...mults);
          sumSplit += (e.pct / 100) * (mults.reduce((a, b) => a + b, 0) / mults.length);
        }
        const b = sumBest * (100 / tot), s = sumSplit * (100 / tot);
        avgExtra = '<td class="' + multClass(b) + '">×' + b.toFixed(3) + '</td>' +
                   '<td class="' + multClass(s) + '">×' + s.toFixed(3) + '</td>';
      }
      let sumDef = 0;
      for (const e of rows) sumDef += (e.pct / 100) * rowDefMult(e.types);
      const avgDef = sumDef * (100 / tot);
      const avgDefCell = '<td class="' + multClassDef(avgDef) + '">×' + avgDef.toFixed(3) + '</td>';
      body.innerHTML += '<tr class="avg-row"><td class="text-left">Average (spawn-weighted)</td><td>100%</td>' + avgCells + avgExtra + avgDefCell + '</tr>';
    }

    /** Spawn-weighted equal-split coverage for a list of attack types. */
    function coverageScore(types) {
      if (!types || !types.length || !ENEMY_WEIGHTS.length) return 1;
      const tot = ENEMY_WEIGHTS.reduce((a, e) => a + e.pct, 0) || 100;
      let sum = 0;
      for (const e of ENEMY_WEIGHTS) {
        const mults = types.map(t => typeMult(t, e.types));
        const avg = mults.reduce((a, b) => a + b, 0) / mults.length;
        sum += (e.pct / 100) * avg;
      }
      return sum * (100 / tot);
    }

    /** Offense weather multi: mean WEATHER_AVG_MULT for types as attacker. */
    function weatherScore(types) {
      if (!types || !types.length) return 1;
      let s = 0, n = 0;
      for (const t of types) {
        if (WEATHER_AVG_MULT[t] != null) { s += WEATHER_AVG_MULT[t]; n++; }
      }
      return n ? s / n : 1;
    }

    /** Relative ATK vs dex mean (1.0 = average). */
    function atkRel(p) {
      if (!DEX.length) return 1;
      const mean = DEX.reduce((a, x) => a + (x.atk || 0), 0) / DEX.length;
      if (!mean) return 1;
      return (p.atk || 0) / mean;
    }

    /**
     * Defense type multii: spawn-weighted avg of typeMult(enemyAtkType → you).
     * Game: player.hurt applies Types.mult(atkType, mon.types). Lower = tankier.
     */
    function typeDefScore(defTypes) {
      if (!defTypes || !defTypes.length || !ENEMY_WEIGHTS.length) return 1;
      let sum = 0, wsum = 0;
      for (const e of ENEMY_WEIGHTS) {
        const atkTypes = e.types && e.types.length ? e.types : ['normal'];
        // equal-split over enemy types as possible attack types
        const m = atkTypes.reduce((a, t) => a + typeMult(t, defTypes), 0) / atkTypes.length;
        sum += e.pct * m;
        wsum += e.pct;
      }
      return wsum ? sum / wsum : 1;
    }

    /**
     * Defense weather multi: spawn-weighted avg of weather avg on enemy attack types.
     * Game: amount *= Weather.mult(atkType) on hurt.
     */
    function weatherDefScore() {
      if (!ENEMY_WEIGHTS.length) return 1;
      let sum = 0, wsum = 0;
      for (const e of ENEMY_WEIGHTS) {
        const atkTypes = e.types && e.types.length ? e.types : ['normal'];
        const m = atkTypes.reduce((a, t) => a + (WEATHER_AVG_MULT[t] != null ? WEATHER_AVG_MULT[t] : 1), 0) / atkTypes.length;
        sum += e.pct * m;
        wsum += e.pct;
      }
      return wsum ? sum / wsum : 1;
    }

    /** Combined incoming multi ≈ typeDef × weatherDef (before reduction/melee). */
    function defMulti(p) {
      const td = typeDefScore(p.types);
      const wd = weatherDefScore();
      return td * wd;
    }

    
    /** Soft defense mult from base DF/SD (game Stats.guard). REF=75, EXP=0.35, clamp [0.78, 1.25]. */
    function guardDef(def) {
      const REF = 75, EXP = 0.35, LO = 0.78, HI = 1.25;
      const d = (def != null && def !== '' && !isNaN(+def)) ? +def : REF;
      const g = Math.pow(REF / Math.max(5, d), EXP);
      return Math.min(HI, Math.max(LO, g));
    }
    /** Move category: physical | special | null (buff). Mirrors moves.js PHYSICAL set. */
    function moveCat(m) {
      if (!m || m.kind === 'buff') return null;
      if (m.cat) return m.cat;
      return 'special';
    }
    /** Species fit for a move category (pa or sa / atk). */
    function fitAtk(p, cat) {
      if (!p || !cat) return 1;
      const atk = p.atk > 0 ? p.atk : 1;
      if (cat === 'special') return (p.sa != null ? p.sa : atk) / atk;
      return (p.pa != null ? p.pa : atk) / atk;
    }

    function pokeOffenseMults(p) {
      // atk = max(pa, sa); pa/sa are physical/special attack mults from pokedex.
      const atkM = (p.atk != null && p.atk > 0) ? p.atk : 1;
      const paM = (p.pa != null && p.pa > 0) ? p.pa : atkM;
      const saM = (p.sa != null && p.sa > 0) ? p.sa : atkM;
      const typeM = p.cov != null ? p.cov : coverageScore(p.types);
      const wxM = weatherScore(p.types);
      const dmgM = atkM * typeM * wxM;           // legacy: strongest side
      const phyM = paM * typeM * wxM;             // physical dmg multi
      const speM = saM * typeM * wxM;             // special dmg multi
      return { typeM, wxM, atkM, paM, saM, dmgM, phyM, speM };
    }

    function pokeDefenseMults(p) {
      const typeDefM = typeDefScore(p.types);
      const wxDefM = weatherDefScore();
      const dodge = hitMulti(p);
      const exposure = hitExposure(p);
      const dfG = guardDef(p.df);
      const sdG = guardDef(p.sd);
      const defM = typeDefM * wxDefM;
      const phyDefM = typeDefM * wxDefM * dfG;
      const speDefM = typeDefM * wxDefM * sdG;
      // Damage reduction (dr): spawn-weighted incoming factor.
      // Each enemy uses sideOf (sa > pa → special else physical) and atkType = types[0].
      const dr = damageReductionScore(p);
      const ehp = dr > 0 ? dodge / dr : dodge;
      return {
        typeDefM, wxDefM, hitM: dodge, defM, phyDefM, speDefM, dfG, sdG,
        dr, tankM: ehp, dodge, ehp, exposure
      };
    }

    /**
     * Spawn-weighted expected incoming damage multi vs this mon.
     * Per enemy candidate (same tier weights as ENEMY_WEIGHTS):
     *   typeMult(atkType→you) × weather(atkType) × guard(df|sd by enemy side)
     */
    function damageReductionScore(p) {
      if (!p || !DEX.length) return 1;
      ensureEnemyAttackProfile();
      if (!ENEMY_ATK_PROFILE.length) {
        // fallback: equal phy/spe mix of type×weather×guards
        const typeDefM = typeDefScore(p.types);
        const wxDefM = weatherDefScore();
        return typeDefM * wxDefM * (guardDef(p.df) + guardDef(p.sd)) / 2;
      }
      let sum = 0, wsum = 0;
      for (const e of ENEMY_ATK_PROFILE) {
        const tMult = typeMult(e.atkType, p.types);
        const wMult = (typeof WEATHER_AVG_MULT !== 'undefined' && WEATHER_AVG_MULT[e.atkType] != null)
          ? WEATHER_AVG_MULT[e.atkType] : 1;
        const g = e.cat === 'special' ? guardDef(p.sd) : guardDef(p.df);
        sum += e.weight * tMult * wMult * g;
        wsum += e.weight;
      }
      return wsum > 0 ? sum / wsum : 1;
    }

    /** [{ weight, atkType, cat, name }] spawn-intensity weighted enemy attackers. */
    let ENEMY_ATK_PROFILE = [];

    function ensureEnemyAttackProfile(force) {
      if (!force && ENEMY_ATK_PROFILE.length) return;
      if (!DEX.length) return;
      ENEMY_ATK_PROFILE = [];
      // Mirror buildEnemyWeights tier share, but keep each species (for pa/sa side)
      const rows = [];
      if (typeof TIERS_BST === 'undefined' || !TIERS_BST.length) {
        // flat fallback
        for (const mon of DEX) {
          if (mon.rarity >= 5 || mon.leg) continue;
          const cat = (mon.sa != null && mon.pa != null && mon.sa > mon.pa) ? 'special' : 'physical';
          const atkType = (mon.types && mon.types[0]) || 'normal';
          rows.push({ weight: 1, atkType, cat, name: mon.name });
        }
      } else {
        for (const tier of TIERS_BST) {
          const tw = tierSpawnWeight(tier);
          const cands = DEX.filter(mon => (mon.rarity == null || mon.rarity < 5) && !mon.leg &&
            mon.bst >= tier.bst[0] && mon.bst <= tier.bst[1]);
          if (!cands.length) continue;
          const per = tw / cands.length;
          for (const mon of cands) {
            const cat = (mon.sa != null && mon.pa != null && mon.sa > mon.pa) ? 'special' : 'physical';
            const atkType = (mon.types && mon.types[0]) || 'normal';
            rows.push({ weight: per, atkType, cat, name: mon.name, dex: mon.dex });
          }
        }
      }
      ENEMY_ATK_PROFILE = rows;
      let phy = 0, spe = 0;
      for (const e of rows) {
        if (e.cat === 'special') spe += e.weight;
        else phy += e.weight;
      }
      const t = phy + spe || 1;
      ENEMY_PHY_WEIGHT = phy / t;
      ENEMY_SPE_WEIGHT = spe / t;
    }


    /** Format: {n} ({desc}) * {n} ({desc}) = {n} */
    function fmtStep(parts, result) {
      // parts: [{n, desc}, ...]
      const left = parts.map(p => Number(p.n).toFixed(3) + ' (' + p.desc + ')').join(' * ');
      return left + ' = ' + Number(result).toFixed(3);
    }

    /** Steps for dmg multi (uses species ATK mult, not mean-relative). */
    function multStepsOffense(p) {
      const o = pokeOffenseMults(p);
      return fmtStep(
        [{ n: o.atkM, desc: 'ATK' }, { n: o.typeM, desc: 'type multii' }, { n: o.wxM, desc: 'weather multi' }],
        o.dmgM
      );
    }
    function multStepsDefense(p) {
      const d = pokeDefenseMults(p);
      return fmtStep(
        [{ n: d.typeDefM, desc: 'type def' }, { n: d.wxDefM, desc: 'weather def' }],
        d.defM
      );
    }
    function multStepsTank(p) {
      const d = pokeDefenseMults(p);
      return Number(d.dodge).toFixed(3) + ' (dodge factor) / (' +
        Number(d.typeDefM).toFixed(3) + ' (type def) * ' +
        Number(d.wxDefM).toFixed(3) + ' (weather def)) = ' +
        Number(d.ehp).toFixed(3);
    }
    function multStepsHit(p) {
      const r = pokeHit(p);
      const med = medianHitRadius();
      const dodge = hitMulti(p);
      const ratio = med / r;
      const curve = getDodgeCurve();
      if (curve === 'linear') {
        return Number(med).toFixed(3) + ' (median r) / ' + Number(r).toFixed(3) + ' (r) = ' + Number(dodge).toFixed(3);
      }
      if (curve === 'power15') {
        return '(' + Number(med).toFixed(3) + '/' + Number(r).toFixed(3) + ')^1.5 = ' + Number(dodge).toFixed(3);
      }
      if (curve === 'soft') {
        return '0.5×' + ratio.toFixed(3) + ' + 0.5×' + (ratio*ratio).toFixed(3) + ' = ' + Number(dodge).toFixed(3);
      }
      return Number(med*med).toFixed(3) + ' (median r²) / ' + Number(r*r).toFixed(3) + ' (r²) = ' + Number(dodge).toFixed(3);
    }
    function multStepsOffenseType(t) {
      const typeM = AVG_TYPE_MULT[t] != null ? AVG_TYPE_MULT[t] : 1;
      const wxM = WEATHER_AVG_MULT[t] != null ? WEATHER_AVG_MULT[t] : 1;
      const comb = typeM * wxM;
      return {
        typeM, wxM, comb,
        steps: fmtStep([{ n: typeM, desc: 'type multii' }, { n: wxM, desc: 'weather multi' }], comb)
      };
    }
    function multStepsDefenseType(t) {
      const td = typeDefScore([t]);
      const wd = weatherDefScore();
      const defM = td * wd;
      return {
        td, wd, defM,
        steps: fmtStep([{ n: td, desc: 'type def' }, { n: wd, desc: 'weather def' }], defM)
      };
    }

    function renderEnemies() { renderMultipliers(); }

        function renderMultipliers() {
      if (typeof renderWeakMatrix === 'function') renderWeakMatrix();

      // --- Section: Offense (per attack type) ---
      const offBody = document.getElementById('offenseTypeBody');
      if (offBody) {
        const rows = Object.keys(TYPE_COLORS).map(t => {
          const r = multStepsOffenseType(t);
          return { t, ...r };
        }).sort((a, b) => b.comb - a.comb);
        offBody.innerHTML = rows.map(r => {
          const c = TYPE_COLORS[r.t];
          const tipType = r.typeM.toFixed(3) + ' (type multii) = spawn-weighted soft chart as ' + r.t + ' attacker';
          const tipWx = r.wxM.toFixed(3) + ' (weather multi) = long-run weather avg for ' + r.t;
          const tipComb = r.steps;
          return '<tr><td class="text-left"><span class="type-badge" style="background:' + c + '33;color:' + c + '">' +
            r.t + '</span></td>' +
            '<td style="cursor:help" title="' + tipType + '">' + r.typeM.toFixed(3) + '</td>' +
            '<td style="cursor:help" title="' + tipWx + '">' + r.wxM.toFixed(3) + '</td>' +
            '<td class="' + multClass(r.comb) + '" style="font-weight:600;cursor:help" title="' + tipComb + '">' + r.comb.toFixed(3) + '</td></tr>';
        }).join('');
      }

      // --- Section: Defense (per your type) ---
      const defBody = document.getElementById('defenseTypeBody');
      if (defBody) {
        const rows = Object.keys(TYPE_COLORS).map(t => {
          const r = multStepsDefenseType(t);
          return { t, ...r };
        }).sort((a, b) => a.defM - b.defM);
        defBody.innerHTML = rows.map(r => {
          const c = TYPE_COLORS[r.t];
          const tipTd = r.td.toFixed(3) + ' (type def) = spawn-weighted incoming type multi if you are ' + r.t;
          const tipWd = r.wd.toFixed(3) + ' (weather def) = spawn-weighted weather avg on enemy attack types';
          const tipDef = r.steps;
          return '<tr><td class="text-left"><span class="type-badge" style="background:' + c + '33;color:' + c + '">' +
            r.t + '</span></td>' +
            '<td class="' + multClassDef(r.td) + '" style="cursor:help" title="' + tipTd + '">' + r.td.toFixed(3) + '</td>' +
            '<td class="' + multClassDef(r.wd) + '" style="cursor:help" title="' + tipWd + '">' + r.wd.toFixed(3) + '</td>' +
            '<td class="' + multClassDef(r.defM) + '" style="font-weight:600;cursor:help" title="' + tipDef + '">' + r.defM.toFixed(3) + '</td></tr>';
        }).join('');
      }

      // --- Section: Enemy spawn weights ---
      const body = document.getElementById('enemyTypeBody');
      if (body) {
        body.innerHTML = ENEMY_WEIGHTS.slice().sort((a, b) => b.pct - a.pct).map(e => {
          const badges = e.types.map(t => {
            const c = TYPE_COLORS[t] || '#888';
            return '<span class="type-badge" style="background:' + c + '33;color:' + c + '">' + t + '</span>';
          }).join(' ');
          const ex = (e.examples || []).slice(0, 3).join(', ');
          return '<tr><td class="text-left">' + badges + '</td><td>' + e.pct.toFixed(1) +
            '</td><td class="text-left" style="color:var(--muted)">' + (ex || '—') + '</td></tr>';
        }).join('');
      }

      const avgBody = document.getElementById('avgTypeBody');
      if (avgBody) avgBody.innerHTML = '';

      const hs = document.getElementById('hitboxSummary');
      if (hs && DEX.length) {
        const med = medianHitRadius();
        const rs = DEX.map(pokeHit).sort((a,b)=>a-b);
        hs.innerHTML = 'Median hitbox r = <strong>' + med.toFixed(2) + '</strong> · range ' +
          rs[0].toFixed(1) + '–' + rs[rs.length-1].toFixed(1) +
          ' · dodge factor = median r² / r² · ehp = dodge / (type def × weather def) (higher better)';
      }
    }

    /** Game poolFor: Normal + the mon's types. */
    function monCanLearn(mon, move) {
      if (!mon || !move) return true;
      if (move.type === 'normal') return true;
      return (mon.types || []).indexOf(move.type) >= 0;
    }

    function recalcDps() {
      if (!RAW.length) return;
      const cfg = getConfig();
      dpsResults = (DAMAGE_MOVES.length ? DAMAGE_MOVES : RAW.filter(m => m.kind !== 'buff' && m.dmg != null)).map(def => {
        const cat = def.cat || (def.kind === 'buff' ? null : 'special');
        const mon = globalPoke || calcPoke;
        // PA for physical moves, SA for special; pure move DPS uses 1 when no mon
        let sideAtk = 1;
        if (mon && cat) {
          sideAtk = (cat === 'special'
            ? (mon.sa != null ? mon.sa : mon.atk)
            : (mon.pa != null ? mon.pa : mon.atk)) || 1;
        }
        const cfgMove = Object.assign({}, cfg, { atk: sideAtk, mon: mon || null });
        const dps = [];
        for (let lvl = 1; lvl <= 5; lvl++) {
          const s = instance(def, lvl, false);
          dps.push(Math.round(singleTargetDPS(s, cfgMove)));
        }
        let evoDps = null, evoName = null;
        if (EVO[def.id] && EVO_MODS[def.kind]) {
          const se = instance(def, 5, true);
          evoDps = Math.round(singleTargetDPS(se, cfgMove));
          evoName = EVO[def.id][0];
        }
        const atkM = sideAtk;
        const covM = (def.type && AVG_TYPE_MULT[def.type] != null) ? AVG_TYPE_MULT[def.type] : 1;
        const wxM = (def.type && WEATHER_AVG_MULT[def.type] != null) ? WEATHER_AVG_MULT[def.type] : 1;
        const mult = +(atkM * covM * wxM).toFixed(4);
        return {
          id: def.id,
          name: enName(def.name, def.id),
          type: def.type, kind: def.kind, cat,
          mult, atkM, covM, wxM,
          lv1: dps[0], lv2: dps[1], lv3: dps[2], lv4: dps[3], lv5: dps[4],
          evo: evoDps,
          evoName: evoName ? enName(evoName, def.id) : null,
          rawName: def.name
        };
      });
      renderDps();
      renderBuffsTable();
    }

    function renderDps() {
      /* kind multi-select via dpsKindSel */
      const search = document.getElementById('searchMove').value.trim().toLowerCase();
      const cfg = getConfig();

      let rows = dpsResults.filter(r => {
        if (dpsTypeSel.size && !dpsTypeSel.has(r.type)) return false;
        if (dpsKindSel.size && !dpsKindSel.has(r.kind)) return false;
        if (search) {
          const ok = matchSearch(r.name, search) || matchSearch(r.id, search) || matchSearch(r.evoName || '', search);
          if (!ok) return false;
        }
        return true;
      });

      rows.sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (sortKey === 'evo') { av = av ?? -1; bv = bv ?? -1; }
        if (typeof av === 'string') return sortDir * av.localeCompare(bv);
        return sortDir * ((av||0) - (bv||0));
      });

      // Thresholds for pure move DPS (atk=1)
      const cls = v => v >= 150 ? 'dps-high' : v >= 70 ? 'dps-mid' : '';
      const mon = globalPoke || calcPoke;
      document.getElementById('dpsBody').innerHTML = rows.map(r => {
        const color = TYPE_COLORS[r.type] || '#888';
        const def = RAW.find(m => m.id === r.id);
        const usable = !mon || monCanLearn(mon, def || r);
        const evoCell = r.evo != null
          ? '<span class="evolved tip" data-tip="evo" data-id="' + r.id + '">' + r.evo + '</span>'
          : '—';
        const lv = (n, v) => '<td class="tip ' + cls(v) + '" data-tip="lv" data-id="' + r.id + '" data-lv="' + n + '">' + v + '</td>';
        const catLabel = r.cat === 'physical' ? 'PHY' : (r.cat === 'special' ? 'SPE' : '—');
        const catCls = r.cat === 'physical' ? 'cat-phy' : (r.cat === 'special' ? 'cat-spe' : '');
        return '<tr data-move-id="' + r.id + '" class="' + (usable ? '' : 'dps-unusable') + '" title="' +
          (usable ? '' : 'Not learnable by selected Pokémon (pool = Normal + its types)') + '">' +
          '<td class="text-left">' + r.name + '</td>' +
          '<td class="text-left"><span class="type-badge" style="background:' + color + '33;color:' + color + '">' + r.type + '</span></td>' +
          '<td class="text-left"><span class="kind-badge">' + r.kind + '</span></td>' +
          '<td class="text-left"><span class="cat-badge ' + catCls + '">' + catLabel + '</span></td>' +
          '<td class="tip" data-tip="mult" data-id="' + r.id + '" style="font-weight:600;color:var(--accent2);cursor:help">' + (r.mult != null ? r.mult.toFixed(3) : '—') + '</td>' +
          lv(1, r.lv1) + lv(2, r.lv2) + lv(3, r.lv3) + lv(4, r.lv4) + lv(5, r.lv5) +
          '<td class="' + cls(r.evo||0) + '">' + evoCell + '</td>' +
          '</tr>';
      }).join('');

      // Bind tooltips
      document.querySelectorAll('#dpsBody .tip').forEach(el => {
        el.addEventListener('mouseenter', e => {
          const id = el.dataset.id;
          const def = RAW.find(m => m.id === id);
          if (!def) return;
          const cfg2 = getConfig();
          let htmlTip = '';
          if (el.dataset.tip === 'evo') {
            htmlTip = buildEvoTooltip(def, cfg2);
          } else if (el.dataset.tip === 'mult') {
            const row = dpsResults.find(x => x.id === id);
            const atk = row && row.atkM != null ? row.atkM : 1;
            const cov = row && row.covM != null ? row.covM : 1;
            const wx = row && row.wxM != null ? row.wxM : 1;
            const mult = row && row.mult != null ? row.mult : atk * cov * wx;
            htmlTip = '<div class="tt-title">dmg multi</div>' +
              '<div class="tt-result">' +
              atk.toFixed(3) + ' (ATK) * ' + cov.toFixed(3) + ' (type multii) * ' +
              wx.toFixed(3) + ' (weather multi) = ' + Number(mult).toFixed(3) +
              '</div>';
          } else {
            htmlTip = buildLevelTooltip(def, parseInt(el.dataset.lv, 10), cfg2);
          }
          if (htmlTip) showTip(htmlTip, e.clientX, e.clientY);
        });
        el.addEventListener('mousemove', e => {
          if (tipPinned) return; // Alt-pin: freeze position
          const eltt = ttEl();
          if (eltt.style.display === 'block') {
            const r = eltt.getBoundingClientRect();
            let left = e.clientX + 12, top = e.clientY + 12;
            if (left + r.width > window.innerWidth - 8) left = e.clientX - r.width - 12;
            if (top + r.height > window.innerHeight - 8) top = e.clientY - r.height - 12;
            eltt.style.left = Math.max(8, left) + 'px';
            eltt.style.top = Math.max(8, top) + 'px';
          }
        });
        el.addEventListener('mouseleave', () => { if (!tipPinned) hideTip(true); });
      });
    }

    /** Buffs table: list buff moves with per-level upgrade text and max-stage summary. */
    const STAT_LABEL = { atk: 'ATK', spd: 'SPD', def: 'DEF', regen: 'regen' };

    function describeBuffLevel(def, lvl) {
      const s = instance(def, lvl, false);
      const prev = lvl > 1 ? instance(def, lvl - 1, false) : null;
      const stat = s.stat || def.stat;
      const statName = STAT_LABEL[stat] || stat || 'stat';
      const amount = s.amount != null ? s.amount : def.amount;
      const stacks = s.stacks != null ? s.stacks : def.stacks;
      const dur = s.dur != null ? s.dur : def.dur;
      const cd = s.cd != null ? s.cd : def.cd;

      if (lvl === 1) {
        // Base: what the buff does
        const bits = [];
        if (amount != null && stat) {
          if (stat === 'regen') bits.push('+' + Number(amount).toFixed(1) + ' ' + statName + '/stack');
          else bits.push('+' + Math.round(amount * 100) + '% ' + statName + '/stack');
        }
        if (stacks != null) bits.push('max ' + stacks + ' stacks');
        if (dur != null) bits.push(dur + 's duration');
        if (cd != null) bits.push(cd + 's CD');
        return bits.join(' · ') || 'buff';
      }

      // Level-up: show what improved vs previous level
      const changes = [];
      const ups = LADDERS[def.kind] || [];
      const mod = ups[lvl - 2] && ups[lvl - 2].m;
      if (mod) {
        for (const k of Object.keys(mod)) {
          const v = mod[k];
          if (k === 'amount' && typeof v === 'number') {
            if (stat === 'regen') changes.push('stack strength +' + Number(v).toFixed(2));
            else if (v > 0 && v < 1) changes.push('stack strength +' + Math.round(v * 100) + '%');
            else changes.push('stack strength ×' + v);
          } else if (k === 'stacks' && typeof v === 'number') {
            changes.push(v > 0 ? '+' + v + ' max stacks' : 'stacks ' + v);
          } else if (k === 'dur' && typeof v === 'number') {
            changes.push(v > 0 && v < 5 ? '+' + v + 's duration' : 'duration ×' + v);
          } else if (k === 'cd' && typeof v === 'number') {
            changes.push(v < 1 ? 'CD ×' + v : 'CD ' + v + 's');
          } else if (typeof v === 'number') {
            changes.push(k + ' ' + v);
          }
        }
      }
      // Fallback: diff prev vs current key fields
      if (!changes.length && prev) {
        if (amount != null && prev.amount != null && amount !== prev.amount) {
          if (stat === 'regen') changes.push('+' + Number(amount).toFixed(1) + ' ' + statName + '/stack (was ' + Number(prev.amount).toFixed(1) + ')');
          else changes.push('+' + Math.round(amount * 100) + '% ' + statName + '/stack (was ' + Math.round(prev.amount * 100) + '%)');
        }
        if (stacks != null && prev.stacks != null && stacks !== prev.stacks) changes.push('max ' + stacks + ' stacks (was ' + prev.stacks + ')');
        if (dur != null && prev.dur != null && dur !== prev.dur) changes.push(dur + 's duration (was ' + prev.dur + 's)');
        if (cd != null && prev.cd != null && cd !== prev.cd) changes.push(cd + 's CD (was ' + prev.cd + 's)');
      }
      return changes.join(' · ') || '—';
    }

    function describeBuffMax(def) {
      const s = instance(def, 5, false);
      const stat = s.stat || def.stat;
      const statName = STAT_LABEL[stat] || stat || 'stat';
      const amount = s.amount != null ? s.amount : 0;
      const stacks = s.stacks != null ? s.stacks : 1;
      const dur = s.dur;
      const total = amount * stacks;
      const bits = [];
      if (stat === 'regen') {
        bits.push('+' + Number(total).toFixed(1) + ' ' + statName + ' at full stacks');
      } else if (stat) {
        // additive stack model as in move data: amount per stack
        bits.push('+' + Math.round(total * 100) + '% ' + statName + ' at full stacks (' + stacks + '×' + Math.round(amount * 100) + '%)');
      }
      if (dur != null) bits.push(dur + 's duration');
      if (s.cd != null) bits.push(s.cd + 's CD');
      return bits.join(' · ') || 'Lv5';
    }

    function renderBuffsTable() {
      const body = document.getElementById('buffsBody');
      if (!body) return;
      const buffs = RAW.filter(m => m.kind === 'buff');
      if (!buffs.length) {
        body.innerHTML = '<tr><td colspan="8" class="note">No buffs loaded.</td></tr>';
        return;
      }
      body.innerHTML = buffs.map(def => {
        const color = TYPE_COLORS[def.type] || '#888';
        const name = enName(def.name, def.id);
        const cells = [];
        for (let lvl = 1; lvl <= 5; lvl++) {
          cells.push('<td style="font-size:0.72rem;white-space:normal;max-width:9rem">' + describeBuffLevel(def, lvl) + '</td>');
        }
        return '<tr>' +
          '<td class="text-left">' + name + '</td>' +
          '<td><span class="type-badge" style="background:' + color + '33;color:' + color + '">' + (def.type || '—') + '</span></td>' +
          cells.join('') +
          '<td class="text-left" style="font-weight:600;color:var(--warn);white-space:normal">' + describeBuffMax(def) + '</td>' +
          '</tr>';
      }).join('');
    }

    
    

    /**
     * Competition ranking ("1224" style): ties share the min rank;
     * next distinct rank skips by group size → 1,1,1,4,5,5,7,8.
     */
        function rankByTied(list, key, higherBetter) {
      const sorted = [...list].sort((a, b) => {
        const av = a[key] != null ? +a[key] : 0;
        const bv = b[key] != null ? +b[key] : 0;
        if (av === bv) return 0;
        return higherBetter ? (bv - av) : (av - bv);
      });
      const map = new Map();
      let rank = 1, prev = null;
      for (let i = 0; i < sorted.length; i++) {
        const v = sorted[i][key] != null ? +sorted[i][key] : 0;
        if (i === 0) { rank = 1; prev = v; }
        else if (v !== prev) { rank = i + 1; prev = v; }
        const id = sorted[i]._rowKey || sorted[i].dex;
        map.set(id, rank);
      }
      return map;
    }


    function invalidatePokeCache() {
      POKE_CACHE_DIRTY = true;
      POKE_CACHE_GEN++;
    }

    function escTip(s) {
      if (!s) return '';
      return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
    function fmtMultStep(parts, result) {
      // parts: [{n, label}, ...] → "n (label) * n (label) = result"
      const left = parts.map(p => {
        const n = typeof p.n === 'number' ? (+p.n).toFixed(3) : String(p.n);
        return n + ' (' + p.label + ')';
      }).join(' * ');
      const r = typeof result === 'number' ? (+result).toFixed(3) : String(result);
      return left + ' = ' + r;
    }

    function ensurePokeMults(p) {
      if (!p) return p;
      const abKey = p.abilityId || '';
      if (p._cacheGen === POKE_CACHE_GEN && p.dr != null && p.phyM != null && p._cachedAbilityId === abKey) return p;

      let mon = p;
      if (typeof monWithNature === 'function' && typeof natureIdForMon === 'function') {
        try {
          const natId = natureIdForMon(p);
          mon = monWithNature(p, natId);
          p._natId = natId;
          p._natPa = mon.pa; p._natSa = mon.sa; p._natDf = mon.df; p._natSd = mon.sd; p._natSpd = mon.spd;
          p.paNat = mon.pa; p.saNat = mon.sa;
        } catch (e) { mon = p; }
      }

      const o = pokeOffenseMults(mon);
      const d = pokeDefenseMults(mon);

      // Ability mods from toolkit ABILITIES dict (fn receives full row)
      const rowForAbil = Object.assign({}, mon, { abilityId: p.abilityId, types: p.types || mon.types });
      const am = (typeof getAbilityMods === 'function') ? getAbilityMods(rowForAbil) : {};
      p.abilMods = am;
      p.abilAffected = {}; // key -> { before, after, multi } for UI highlight

      function mark(key, before, multi) {
        if (multi == null || multi === 1) return before;
        const after = before * multi;
        p.abilAffected[key] = { before: before, after: after, multi: multi };
        return after;
      }

      let phyM = o.phyM, speM = o.speM;
      let paNat = (p.paNat != null ? p.paNat : (mon.pa != null ? mon.pa : o.paM));
      let saNat = (p.saNat != null ? p.saNat : (mon.sa != null ? mon.sa : o.saM));
      let spd = (p._natSpd != null ? p._natSpd : mon.spd);

      if (am.pa != null) { paNat = mark('pa', paNat, am.pa); phyM = mark('phyM', phyM, am.pa); }
      if (am.sa != null) { saNat = mark('sa', saNat, am.sa); speM = mark('speM', speM, am.sa); }
      if (am.outPhy != null) phyM = mark('phyM', phyM, am.outPhy);
      if (am.outSpe != null) speM = mark('speM', speM, am.outSpe);
      if (am.out != null) {
        phyM = mark('phyM', phyM, am.out);
        speM = mark('speM', speM, am.out);
      }
      // typeMulti: if it hits the mon's own types, fold max into overall as STAB-path boost
      if (am.typeMulti && typeof am.typeMulti === 'object') {
        let tm = 1;
        for (const t of (p.types || [])) {
          if (am.typeMulti[t] != null) tm = Math.max(tm, +am.typeMulti[t] || 1);
        }
        // pure type-boosters (e.g. transistor) with no overlap: do not fold into overall phyM/speM
        if (tm !== 1) {
          phyM = mark('phyM', phyM, tm);
          speM = mark('speM', speM, tm);
        }
        p.abilTypeMulti = am.typeMulti;
      } else p.abilTypeMulti = null;

      if (am.spd != null) spd = mark('spd', spd, am.spd);
      p.paNat = paNat; p.saNat = saNat; p._natSpd = spd;

      let phyDefM = d.phyDefM, speDefM = d.speDefM, dr = d.dr;
      if (am.inPhy != null) phyDefM = mark('phyDefM', phyDefM, am.inPhy);
      if (am.inSpe != null) speDefM = mark('speDefM', speDefM, am.inSpe);
      if (am.in != null) {
        phyDefM = mark('phyDefM', phyDefM, am.in);
        speDefM = mark('speDefM', speDefM, am.in);
        dr = mark('dr', dr, am.in);
      } else {
        // rebuild dr from phy/spe if only side-specific
        if (am.inPhy != null || am.inSpe != null) {
          const abInAvg = 0.5 * ((am.inPhy != null ? am.inPhy : 1) * (d.phyDefM || 1) / (d.phyDefM || 1) +
            (am.inSpe != null ? am.inSpe : 1));
          // simpler: scale base dr by average of provided in* 
          const parts = [];
          if (am.inPhy != null) parts.push(am.inPhy);
          if (am.inSpe != null) parts.push(am.inSpe);
          const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
          dr = mark('dr', d.dr, avg);
        }
      }
      if (am.typeDefMulti && typeof am.typeDefMulti === 'object') {
        p.abilTypeDefMulti = am.typeDefMulti;
        // fold geometric mean of typeDef multis into dr as mild overall (optional conservative)
        const vals = Object.values(am.typeDefMulti).map(Number).filter(x => x > 0);
        if (vals.length) {
          const geo = Math.exp(vals.reduce((s, x) => s + Math.log(x), 0) / vals.length);
          // only annotate, light fold
          dr = mark('dr', dr, Math.pow(geo, 0.35));
        }
      } else p.abilTypeDefMulti = null;

      p.typeM = o.typeM; p.wxM = o.wxM;
      p.phyM = phyM; p.speM = speM;
      p.dmgM = Math.max(phyM, speM);
      p.defM = d.defM;
      p.phyDefM = phyDefM; p.speDefM = speDefM;
      p.dfG = d.dfG; p.sdG = d.sdG; p.typeDefM = d.typeDefM; p.wxDefM = d.wxDefM;
      p.dr = dr;
      p.hitM = d.hitM; p.tankM = d.tankM;
      p.dodge = d.dodge; p.eva = d.dodge;
      p.ehp = (d.dodge || 1) / (p.dr || 1);
      if (p.abilAffected.dr || p.abilAffected.phyDefM || p.abilAffected.speDefM) {
        p.abilAffected.ehp = { before: (d.dodge || 1) / (d.dr || 1), after: p.ehp, multi: p.ehp / ((d.dodge || 1) / (d.dr || 1) || 1) };
      }
      p.cov = o.typeM; p.wx = o.wxM; p.mult = p.dmgM;
      if (p.hit == null) p.hit = bodyRadius(p.dex);

      try {
        if (p.dmgV2 == null || p._dmgV2Dirty) {
          let base = (typeof computeDmgScoreV2 === 'function') ? computeDmgScoreV2(p) : 0;
          // Apply ability outgoing on top of dmg v2
          let outScale = (am.out != null ? am.out : 1);
          const coefs = p._comboCoefs;
          if (coefs && (coefs.phyCoef + coefs.speCoef) > 0) {
            const wPhy = coefs.phyCoef / (coefs.phyCoef + coefs.speCoef);
            const wSpe = 1 - wPhy;
            const op = (am.outPhy != null ? am.outPhy : 1) * (am.pa != null ? am.pa : 1);
            const os = (am.outSpe != null ? am.outSpe : 1) * (am.sa != null ? am.sa : 1);
            outScale *= wPhy * op + wSpe * os;
          } else {
            outScale *= Math.max(am.outPhy || 1, am.outSpe || 1) * Math.max(am.pa || 1, am.sa || 1);
          }
          // typeMulti kit: average over typeMulti keys if present
          if (am.typeMulti) {
            const vals = Object.values(am.typeMulti).map(Number).filter(x => x > 0);
            if (vals.length) outScale *= vals.reduce((a, b) => a + b, 0) / vals.length;
          }
          const before = base;
          base = base * outScale;
          if (outScale !== 1) p.abilAffected.dmgV2 = { before: before, after: base, multi: outScale };
          p.dmgV2 = base;
          p._dmgV2Dirty = false;
        }
      } catch (e) { p.dmgV2 = p.dmgV2 || 0; }

      p._tip = p._tip || {};
      const meta = (typeof abilityMeta === 'function') ? abilityMeta(p.abilityId) : null;
      p._tip.ability = meta ? (meta.desc + (meta.calcDesc ? ' — ' + meta.calcDesc : '')) : '';
      p._cachedAbilityId = abKey;
      p._cacheGen = POKE_CACHE_GEN;
      return p;
    }



    /**
     * One-shot: fill mults, score, ranks for all DEX. Skip if still valid.
     */
    


    
    function bindPokeColHelp() {
      document.querySelectorAll('.poke-table th[data-col-help]').forEach(th => {
        th.style.cursor = 'help';
        th.addEventListener('mouseenter', e => {
          showTip('<div class="tt-title">' + th.textContent.replace(/[▲▼]/g, '').trim() + '</div><div class="tt-muted">' + th.dataset.colHelp + '</div>', e.clientX, e.clientY);
        });
        th.addEventListener('mousemove', e => { if (!tipPinned) showTip(document.getElementById('tt') ? document.getElementById('tt').innerHTML : '', e.clientX, e.clientY); });
        th.addEventListener('mouseleave', () => { if (!tipPinned) hideTip(); });
      });
    }

    function renderPokedex() {
      recomputeCompositeScores();
      const genF = document.getElementById('pokeGen').value;
      const search = document.getElementById('searchPoke').value.trim().toLowerCase();
      const bestOnly = !!(document.getElementById('bestAbilityOnly') && document.getElementById('bestAbilityOnly').checked);
      bestAbilityOnly = bestOnly;

      const src = (DEX_ROWS && DEX_ROWS.length) ? DEX_ROWS : DEX;
      let list = src.filter(p => {
        if (pokeTypeSel.size) {
          for (const t of pokeTypeSel) if (!p.types.includes(t)) return false;
        }
        if (genF && String(p.gen) !== genF) return false;
        if (pokeAbilitySel && pokeAbilitySel.size) {
          if (!p.abilityId || !pokeAbilitySel.has(p.abilityId)) return false;
        }
        if (search) {
          const ok = matchSearch(p.name, search) || matchSearch(String(p.dex), search) ||
            matchSearch(p.abilityName || '', search) || matchSearch(p.abilityId || '', search);
          if (!ok) return false;
        }
        return true;
      });
      // Best ability only (by active score); ties kept
      if (bestOnly && list.length) {
        const byDex = new Map();
        for (const p of list) {
          ensurePokeMults(p);
          const sc = scoreAlgo === 'v2' ? (p.scoreV2 != null ? p.scoreV2 : p.score) : (p.scoreV1 != null ? p.scoreV1 : p.score);
          const s = sc != null ? +sc : 0;
          if (!byDex.has(p.dex)) byDex.set(p.dex, { best: s, rows: [p] });
          else {
            const g = byDex.get(p.dex);
            if (s > g.best + 1e-12) { g.best = s; g.rows = [p]; }
            else if (Math.abs(s - g.best) <= 1e-12) g.rows.push(p);
          }
        }
        list = [];
        for (const g of byDex.values()) list.push(...g.rows);
      }

      list.sort((a, b) => {
        const dir = pokeSortDir;
        if (pokeSortKey === 'name') return dir * a.name.localeCompare(b.name);
        if (pokeSortKey === 'dex') return dir * (a.dex - b.dex);
        if (pokeSortKey === 'gen') return dir * ((a.gen || 0) - (b.gen || 0));
        if (pokeSortKey === 'hit') return dir * ((a.hit || 0) - (b.hit || 0));
        if (pokeSortKey === 'size') {
          const order = { small: 0, medium: 1, big: 2 };
          return dir * ((order[a.size] || 0) - (order[b.size] || 0));
        }
        if (pokeSortKey === 'typeM' || pokeSortKey === 'cov') return dir * ((a.typeM ?? a.cov ?? 0) - (b.typeM ?? b.cov ?? 0));
        if (pokeSortKey === 'wxM' || pokeSortKey === 'wx') return dir * ((a.wxM ?? a.wx ?? 0) - (b.wxM ?? b.wx ?? 0));
        if (pokeSortKey === 'dmgM' || pokeSortKey === 'mult') return dir * ((a.dmgM ?? a.mult ?? 0) - (b.dmgM ?? b.mult ?? 0));
        if (pokeSortKey === 'defM') return dir * ((a.defM ?? 0) - (b.defM ?? 0));
        if (pokeSortKey === 'dodge' || pokeSortKey === 'hitM') return dir * ((a.dodge ?? a.hitM ?? 0) - (b.dodge ?? b.hitM ?? 0));
        if (pokeSortKey === 'ehp' || pokeSortKey === 'tankM') return dir * ((a.ehp ?? a.tankM ?? 0) - (b.ehp ?? b.tankM ?? 0));
        if (pokeSortKey === 'score') return dir * ((a.score ?? 0) - (b.score ?? 0));
        if (['pa','sa','df','sd','phyM','speM','phyDefM','speDefM','dr'].includes(pokeSortKey))
          return dir * ((a[pokeSortKey] ?? 0) - (b[pokeSortKey] ?? 0));
        return dir * ((a[pokeSortKey] || 0) - (b[pokeSortKey] || 0));
      });

      // Header arrows
      document.querySelectorAll('.poke-table th.sortable').forEach(th => {
        const k = th.dataset.pokeSort;
        const arrow = th.querySelector('.arrow');
        if (!arrow) return;
        arrow.textContent = k === pokeSortKey ? (pokeSortDir > 0 ? '▲' : '▼') : '';
      });

      const countEl = document.getElementById('pokeCount');
      if (countEl) countEl.textContent = '(' + list.length + ')';
      bindPokeColHelp();
      const body = document.getElementById('pokeBody');
      if (!body) return;
      body.innerHTML = list.map(p => {
        const badges = p.types.map(t => {
          const c = TYPE_COLORS[t] || '#888';
          return '<span class="type-badge" style="background:' + c + '33;color:' + c + '">' + t + '</span>';
        }).join(' ');
        ensurePokeMults(p);
        const hit = p.hit != null ? p.hit : bodyRadius(p.dex);
        const o = { typeM: p.typeM, wxM: p.wxM, phyM: p.phyM, speM: p.speM, paM: p.pa != null ? p.pa : p.atk, saM: p.sa != null ? p.sa : p.atk, dmgM: p.dmgM };
        const d = { phyDefM: p.phyDefM, speDefM: p.speDefM, dr: p.dr, dodge: p.dodge, ehp: p.ehp, typeDefM: p.typeM, wxDefM: p.wxM, dfG: p.dfG, sdG: p.sdG };
        const rk = p.ranks || {};
        function st(val, rank, digits) {
          const v = typeof val === 'number' ? (digits != null ? val.toFixed(digits) : val) : val;
          return v + (rank ? ' <span style="color:var(--muted);font-size:0.7rem">#' + rank + '</span>' : '');
        }
        const score = p.score != null ? p.score : 0;
        return '<tr data-dex="' + p.dex + '" onclick="selectPokeDetail(' + p.dex + ')" style="cursor:pointer">' +
          '<td class="text-left">' + p.dex + '</td>' +
          '<td class="text-left"><div class="poke-name-cell">' +
            '<div class="poke-spr poke-spr-btn" style="' + spriteStyle(p.dex, 40) + '" onclick="event.stopPropagation();useGlobalPoke(' + p.dex + ')" title="Select ' + p.name + '"></div>' +
            '<div><div class="pname">' + p.name + '</div></div></div></td>' +
          '<td class="text-left">' + badges + '</td>' +
          '<td class="text-left col-ability" title="' + escTip(abilityDescEn(p.abilityId, p) || abilityDesc(p.abilityId, p)) + '">' +
            (p.abilityName || abilityName(p.abilityId) || '—') + '</td>' +
          '<td>' + st(o.paM != null ? (p.paNat != null ? p.paNat : o.paM) : o.paM, rk.pa, 2) + '</td>' +
          '<td>' + st(o.saM, rk.sa, 2) + '</td>' +
          '<td>' + st(p.df != null ? p.df : '—', rk.df) + '</td>' +
          '<td>' + st(p.sd != null ? p.sd : '—', rk.sd) + '</td>' +
          '<td>' + st(p.hp, rk.hp) + '</td>' +
          '<td>' + st(p.spd, rk.spd) + '</td>' +
          '<td>' + st(Number(hit).toFixed(1), rk.hit) + '</td>' +
          '<td class="' + multClass(o.typeM) + '" title="' + escTip(p._tip && p._tip.typeM) + '">' + o.typeM.toFixed(3) + '</td>' +
          '<td title="' + escTip(p._tip && p._tip.wxM) + '">' + o.wxM.toFixed(3) + '</td>' +
          abilTd(p, 'phyM', multClass(p.phyM), (p.phyM||0).toFixed(3), p._tip && p._tip.phyM, 'font-weight:600') +
          abilTd(p, 'speM', multClass(p.speM), (p.speM||0).toFixed(3), p._tip && p._tip.speM, 'font-weight:600') +
          '<td class="' + multClassDef(d.phyDefM) + '" title="' + escTip(p._tip && p._tip.phyDefM) + '">' + d.phyDefM.toFixed(3) + '</td>' +
          '<td class="' + multClassDef(d.speDefM) + '" title="' + escTip(p._tip && p._tip.speDefM) + '">' + d.speDefM.toFixed(3) + '</td>' +
          abilTd(p, 'dr', multClassDef(p.dr), (p.dr||0).toFixed(3), p._tip && p._tip.dr, 'font-weight:600') +
          '<td class="' + multClass(p.dodge != null ? p.dodge : d.dodge) + '" title="' + escTip(p._tip && p._tip.dodge) + '">' + d.dodge.toFixed(3) + '</td>' +
          abilTd(p, 'ehp', multClass(p.ehp), (p.ehp||0).toFixed(3), p._tip && p._tip.ehp, 'font-weight:600') +
          '<td style="font-weight:600;color:var(--accent2)">' + st(score, rk.score, 3) + '</td>' +
          '<td>' + (p.gen || '—') + '</td>' +
          '</tr>';
      }).join('');
    }

    let selectedPokeDex = null;

    function selectPokeDetail(dex) {
      selectedPokeDex = dex;
      document.querySelectorAll('#pokeBody tr').forEach(tr => {
        tr.classList.toggle('poke-sel', +tr.dataset.dex === dex);
      });
      const p = DEX.find(x => x.dex === dex);
      if (!p) return;
      const modal = document.getElementById('radarModal');
      if (modal) modal.style.display = 'flex';
      document.getElementById('pokeDetailTitle').innerHTML =
        '<div class="poke-spr" style="display:inline-block;vertical-align:middle;margin-right:0.45rem;' + spriteStyle(p.dex, 48) + '"></div>' +
        p.name + ' <span style="color:var(--muted);font-weight:400">#' + p.dex + ' · ' + p.types.join('/') + '</span>';
      drawPokeRadar();
    }

    function closeRadarModal() {
      const modal = document.getElementById('radarModal');
      if (modal) modal.style.display = 'none';
    }

    function avgStats(list) {
      if (!list || !list.length) {
        return {
          pa: 0, sa: 0, df: 75, sd: 75, hp: 0, spd: 0, hit: 0,
          typeM: 1, wxM: 1, phyM: 1, speM: 1, phyDefM: 1, speDefM: 1,
          dr: 1, dodge: 1, ehp: 1, score: 0
        };
      }
      recomputeCompositeScores();
      const n = list.length;
      const avg = (fn) => list.reduce((a, p) => a + fn(p), 0) / n;
      return {
        pa: avg(p => p.pa != null ? p.pa : (p.atk || 0)),
        sa: avg(p => p.sa != null ? p.sa : (p.atk || 0)),
        df: avg(p => p.df != null ? p.df : 75),
        sd: avg(p => p.sd != null ? p.sd : 75),
        hp: avg(p => p.hp || 0),
        spd: avg(p => p.spd || 0),
        hit: avg(p => p.hit || pokeHit(p) || 0),
        typeM: avg(p => p.typeM != null ? p.typeM : 1),
        wxM: avg(p => p.wxM != null ? p.wxM : 1),
        phyM: avg(p => p.phyM != null ? p.phyM : 1),
        speM: avg(p => p.speM != null ? p.speM : 1),
        phyDefM: avg(p => p.phyDefM != null ? p.phyDefM : 1),
        speDefM: avg(p => p.speDefM != null ? p.speDefM : 1),
        dr: avg(p => p.dr != null ? p.dr : 1),
        dodge: avg(p => p.dodge != null ? p.dodge : 1),
        ehp: avg(p => p.ehp != null ? p.ehp : 1),
        score: avg(p => p.score != null ? p.score : 0)
      };
    }

    function ensureRadarAxisToggles() {
      const box = document.getElementById('radarAxisToggles');
      if (!box) return;
      // Always rebuild so new axes appear after updates
      const rawLabs = [
        ['pa', 'PA'], ['sa', 'SA'], ['df', 'DF'], ['sd', 'SD'],
        ['hp', 'HP'], ['spd', 'SPD'], ['hit', 'r']
      ];
      const calcLabs = [
        ['typeM', 'weakness multi'], ['wxM', 'weather multi'],
        ['phyM', 'phy multi'], ['speM', 'spe multi'],
        ['phyDefM', 'phy def multi'], ['speDefM', 'spe def multi'],
        ['dr', 'dr'], ['dodge', 'dodge'], ['ehp', 'ehp'], ['score', 'score']
      ];
      function row(labs) {
        return labs.map(([k, lab]) =>
          '<label><input type="checkbox" data-axis="' + k + '"' +
          (radarAxes[k] ? ' checked' : '') +
          ' onchange="radarAxes[this.dataset.axis]=this.checked;drawPokeRadar()" /> ' + lab + '</label>'
        ).join('');
      }
      box.innerHTML =
        '<div class="radar-axes-row"><span class="radar-axes-label">Raw</span>' + row(rawLabs) + '</div>' +
        '<div class="radar-axes-row"><span class="radar-axes-label">Multi</span>' + row(calcLabs) + '</div>';
    }

    
    function radarStatsFor(p) {
      ensurePokeMults(p);
      return {
        pa: p.pa != null ? +p.pa : (p.atk || 0),
        sa: p.sa != null ? +p.sa : (p.atk || 0),
        df: p.df != null ? +p.df : 75,
        sd: p.sd != null ? +p.sd : 75,
        hp: p.hp || 0,
        spd: p.spd || 0,
        hit: p.hit != null ? +p.hit : pokeHit(p),
        typeM: p.typeM != null ? p.typeM : 1,
        wxM: p.wxM != null ? p.wxM : 1,
        phyM: p.phyM != null ? p.phyM : 1,
        speM: p.speM != null ? p.speM : 1,
        phyDefM: p.phyDefM != null ? p.phyDefM : 1,
        speDefM: p.speDefM != null ? p.speDefM : 1,
        dr: p.dr != null ? p.dr : 1,
        dodge: p.dodge != null ? p.dodge : 1,
        ehp: p.ehp != null ? p.ehp : 1,
        score: p.score != null ? p.score : 0,
        cov: p.typeM || 1, dmgM: p.dmgM || 1, defM: p.defM || 1
      };
    }

    function drawPokeRadar() {
      const canvas = document.getElementById('pokeRadar');
      const listEl = document.getElementById('pokeStatList');
      if (!canvas || selectedPokeDex == null) return;
      const p = DEX.find(x => x.dex === selectedPokeDex);
      if (!p) return;
      ensureRadarAxisToggles();
      // ensure mults for scale
      DEX.forEach(ensurePokeMults);
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, R = 95;
      ctx.clearRect(0, 0, W, H);

      const allKeys = ['pa', 'sa', 'df', 'sd', 'hp', 'spd', 'hit',
        'typeM', 'wxM', 'phyM', 'speM', 'phyDefM', 'speDefM', 'dr', 'dodge', 'ehp', 'score'];
      const allLabels = {
        pa: 'PA', sa: 'SA', df: 'DF', sd: 'SD', hp: 'HP', spd: 'SPD', hit: 'r',
        typeM: 'weakness', wxM: 'weather', phyM: 'phy multi', speM: 'spe multi',
        phyDefM: 'phy def', speDefM: 'spe def', dr: 'dr', dodge: 'dodge', ehp: 'ehp', score: 'score'
      };
      // lower-is-better on radar → invert so outer = better
      const invertKeys = new Set(['hit', 'phyDefM', 'speDefM', 'dr', 'defM']);
      const keys = allKeys.filter(k => radarAxes[k]);
      const labels = keys.map(k => allLabels[k]);
      if (keys.length < 3) {
        ctx.fillStyle = '#9aa4b2';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Select at least 3 axes', cx, cy);
        return;
      }
      // Min–max scale: rank-last (min) → 0, rank-first (max) → 1
      const mins = {}, maxes = {};
      recomputeCompositeScores(); // no-op if cache warm
      for (const k of keys) {
        const vals = [];
        for (const x of DEX) {
          const s = radarStatsFor(x);
          const v = s[k];
          if (v != null && !isNaN(+v)) vals.push(+v);
        }
        if (!vals.length) { mins[k] = 0; maxes[k] = 1; }
        else { mins[k] = Math.min(...vals); maxes[k] = Math.max(...vals); }
      }
      function norm(stats, k) {
        const lo = mins[k], hi = maxes[k];
        if (hi <= lo) return 0.5;
        const raw = stats[k] != null ? +stats[k] : lo;
        let t = (raw - lo) / (hi - lo);
        if (invertKeys.has(k)) t = 1 - t; // outer = better (low dr / small r / low def multi)
        return Math.max(0, Math.min(1, t));
      }
      function poly(stats, color, fill, width) {
        ctx.beginPath();
        keys.forEach((k, i) => {
          const ang = -Math.PI / 2 + i * (2 * Math.PI / keys.length);
          const v = norm(stats, k);
          const x = cx + Math.cos(ang) * R * v;
          const y = cy + Math.sin(ang) * R * v;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        ctx.strokeStyle = color; ctx.lineWidth = width || 2; ctx.stroke();
      }

      ctx.strokeStyle = '#1e2836'; ctx.lineWidth = 1;
      for (let g = 1; g <= 4; g++) {
        ctx.beginPath();
        for (let i = 0; i < keys.length; i++) {
          const ang = -Math.PI / 2 + i * (2 * Math.PI / keys.length);
          const x = cx + Math.cos(ang) * R * (g / 4);
          const y = cy + Math.sin(ang) * R * (g / 4);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
      keys.forEach((k, i) => {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / keys.length);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
        ctx.stroke();
        ctx.fillStyle = '#9aa4b2';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], cx + Math.cos(ang) * (R + 16), cy + Math.sin(ang) * (R + 16) + 3);
      });

      const TYPE_LINE = ['#ffb74d', '#ce93d8', '#80cbc4', '#ef9a9a', '#90caf9'];
      const showAll = document.getElementById('radarAllAvg')?.checked;
      const showType = document.getElementById('radarTypeAvg')?.checked;
      if (showAll) poly(avgStats(DEX), '#78909c', 'rgba(120,144,156,0.12)', 1.5);
      const typeLegend = [];
      if (showType) {
        p.types.forEach((t, idx) => {
          const pool = DEX.filter(x => x.types.includes(t));
          const col = TYPE_COLORS[t] || TYPE_LINE[idx % TYPE_LINE.length];
          poly(avgStats(pool), col, null, 1.5);
          typeLegend.push({ t, col, n: pool.length });
        });
      }
      poly(radarStatsFor(p), '#4fc3f7', 'rgba(79,195,247,0.22)', 2.5);

      const rk = p.ranks || {};
      if (listEl) {
        let leg = '<div><span style="color:#4fc3f7">●</span> This Pokémon</div>';
        if (showAll) leg += '<div><span style="color:#78909c">●</span> All avg</div>';
        typeLegend.forEach(x => {
          leg += '<div><span style="color:' + x.col + '">●</span> ' + x.t + ' avg (' + x.n + ')</div>';
        });
        ensurePokeMults(p);
      recomputeCompositeScores();
      const fmtV = (k) => {
        const v = p[k];
        if (v == null) return '—';
        if (k === 'hp' || k === 'spd') return String(v);
        if (k === 'hit') return Number(v).toFixed(1);
        if (k === 'atk') return Number(v).toFixed(2);
        return Number(v).toFixed(3);
      };
      const rankOf = (k) => {
        const map = { atk: 'atk', hp: 'hp', spd: 'spd', hit: 'hit', cov: 'cov', typeM: 'cov', dmgM: 'dmgM', dodge: 'dodge', ehp: 'ehp', score: 'score' };
        const rkKey = map[k] || k;
        return (p.ranks && p.ranks[rkKey]) ? '#' + p.ranks[rkKey] : '';
      };
      const rows = keys.map(k =>
        '<div>' + labels[keys.indexOf(k)] + ' <b>' + fmtV(k) + '</b> <span style="color:var(--muted)">' + rankOf(k) + '</span></div>'
      ).join('');
      listEl.innerHTML = leg +
          '<hr style="border-color:var(--border);margin:0.45rem 0">' +
          rows +
          '<div style="margin-top:0.35rem">score <b>' + (p.score != null ? p.score.toFixed(3) : '—') + '</b> <span style="color:var(--muted)">' + rankOf('score') + '</span></div>' +
          '<div style="margin-top:0.4rem"><button class="btn-primary" style="padding:0.25rem 0.6rem;font-size:0.75rem" onclick="useGlobalPoke(' + p.dex + ');closeRadarModal()">Select</button></div>';
      }
    }

    function useGlobalPoke(dex) {
      const p = DEX.find(x => x.dex === dex);
      if (!p) return;
      globalPoke = p;
      const bar = document.getElementById('globalPokeBar');
      const nameEl = document.getElementById('globalPokeName');
      if (nameEl) nameEl.textContent = p.name + ' (#' + p.dex + ') · r ' + pokeHit(p).toFixed(1);

      // Calculator
      calcPoke = p;
      const cinp = document.getElementById('calcPoke');
      if (cinp) cinp.value = p.name;
      calcClear();
      renderCalc();

      // Size
      const sinp = document.getElementById('sizePoke');
      if (sinp) { sinp.value = p.name; renderSizeView(); }

      // Weakness: select this mon's types (+ normal stays optional)
      weakAtkSel = new Set(p.types);
      if (typeof buildWeakAtkChips === 'function') buildWeakAtkChips();
      if (typeof onDodgeOptionsChange === 'function' && DEX.length) { try { const med = medianHitRadius(); const hint = document.getElementById('dodgeOptionsHint'); if (hint) hint.textContent = 'baseline = ' + med.toFixed(2); } catch (e) {} }
      if (typeof renderWeakMatrix === 'function') renderWeakMatrix();
      if (typeof renderEnemies === 'function') {
        // refresh summary only
        const sumEl = document.getElementById('weakMultiSummary');
        if (sumEl && weakAtkSel.size >= 2) {
          const sel = [...weakAtkSel];
          const split = coverageScore(sel);
          sumEl.innerHTML = 'Using <b>' + p.name + '</b> types ' + sel.join('+') + ': equal-split ×' + split.toFixed(3);
        }
      }
      if (typeof recalcDps === 'function') recalcDps();
      if (typeof calcCombos === 'function') calcCombos();
    }

    function clearGlobalPoke() {
      globalPoke = null;
      calcPoke = null;
      const nameEl = document.getElementById('globalPokeName');
      if (nameEl) nameEl.textContent = 'None';
      const cinp = document.getElementById('calcPoke');
      if (cinp) cinp.value = '';
      if (typeof renderCalc === 'function') renderCalc();
      if (typeof recalcAll === 'function') recalcAll();
    }



    function renderItems() {
      const drops = MECHANICS_DROPS;

      const body = document.getElementById('dropBody');
      if (body) {
        body.innerHTML = drops.map(d =>
          '<tr class="drop-rate">' +
          '<td class="text-left">' + d.src + '</td>' +
          '<td class="text-left">' + d.item + '</td>' +
          '<td class="text-left">' + d.t1 + '</td>' +
          '<td class="text-left">' + d.t10 + '</td>' +
          '<td class="text-left" style="color:var(--muted);font-size:0.78rem">' + d.other + '</td>' +
          '</tr>'
        ).join('');
      }
      const list = document.getElementById('itemList');
      if (list) {
        list.innerHTML = (ITEMS.length ? ITEMS : []).map(it =>
          '<div class="item-row"><div class="iname">' + it.name +
          ' <span style="color:var(--muted);font-weight:400;font-size:0.75rem">(' + it.id + ')</span></div>' +
          '<div class="idesc">' + it.desc + '</div></div>'
        ).join('') || '<div class="status">No items loaded yet — open Config and Reload from GitHub.</div>';
      }
    }

    function selectPoke(dex) {
      const p = DEX.find(x => x.dex === dex);
      if (!p) return;
      document.querySelectorAll('.poke-card').forEach(c => c.classList.toggle('selected', +c.dataset.dex === dex));
      const hit = p.hit != null ? p.hit : bodyRadius(p.dex);
      document.getElementById('status').textContent = 'Selected ' + p.name + ' (ATK ×' + p.atk.toFixed(2) +
        ', HP ' + p.hp + ', SPD ' + p.spd + ', r ' + hit + ') — ATK not applied to DPS.';
      document.getElementById('status').className = 'status ok';
    }

    function poolForTypes(types, mon) {
      const ids = new Set(RAW.filter(m => m.type === 'normal').map(m => m.id));
      for (const t of types || []) {
        RAW.filter(m => m.type === t).forEach(m => ids.add(m.id));
      }
      let pool = [...ids].map(id => RAW.find(m => m.id === id)).filter(Boolean);
      // Selected mon: only moves it can actually learn (Normal + its types)
      if (mon) pool = pool.filter(m => monCanLearn(mon, m));
      return pool;
    }

    function bestDamageMoves(types, cfg) {
      const byId = new Map();
      const mon = cfg && cfg.mon;
      for (const def of poolForTypes(types, mon)) {
        if (def.kind === 'buff') continue;
        // Ensure cat for PA/SA side selection in dpsBreakdown
        if (!def.cat && def.kind !== 'buff') def.cat = moveCat(def);
        const pre = enName(def.name, def.id);
        const s5 = instance(def, 5, false);
        if (!s5.cat) s5.cat = def.cat;
        let best = { dps: Math.round(singleTargetDPS(s5, cfg)), pre, tier: 'Lv5', evolved: false, kind: def.kind, id: def.id, type: def.type, cat: def.cat };
        if (EVO[def.id] && EVO_MODS[def.kind]) {
          const se = instance(def, 5, true);
          if (!se.cat) se.cat = def.cat;
          const de = Math.round(singleTargetDPS(se, cfg));
          if (de > best.dps) best = { dps: de, pre, tier: 'Evo', evolved: true, kind: def.kind, id: def.id, type: def.type, cat: def.cat };
        }
        byId.set(def.id, best);
      }
      return [...byId.values()].sort((a, b) => b.dps - a.dps);
    }

    function bestAtkBuff(types, mon) {
      const pool = poolForTypes(types, mon);
      if (pool.some(m => m.id === 'dragon-dance')) {
        return { id: 'dragon-dance', pre: 'Dragon Dance', amount: 0.11, stacks: 5, cd: 0.7, dur: 7 };
      }
      if (pool.some(m => m.id === 'swords-dance')) {
        return { id: 'swords-dance', pre: 'Swords Dance', amount: 0.13, stacks: 5, cd: 0.85, dur: 7 };
      }
      return null;
    }

    function buffPeak(buff) {
      return buff ? buff.amount * buff.stacks : 0;
    }

    /** Steady-state uptime when buff is on a side slot: primary / (primary + buff refresh). */
    function buffUptime(buff) {
      if (!buff) return 1;
      return buff.dur / (buff.dur + buff.cd);
    }

    /**
     * Evaluate loadout:
     *  mainMoves[] damage, buffPlacement 'bond'|'slot'|null
     * Returns score + step lines for tooltips.
     */
    function scoreLoadout(mainMoves, buff, placement, cfg) {
      const base = mainMoves.reduce((a, m) => a + m.dps, 0);
      const steps = [];
      steps.push('Main damage: ' + mainMoves.map(m => m.pre + '(' + m.tier + ')=' + m.dps).join(' + ') + (mainMoves.length ? '' : '0'));
      steps.push('Sum = ' + base);

      let mult = 1, uptime = 1, peak = 0;
      if (buff && placement === 'bond') {
        peak = buffPeak(buff);
        mult = 1 + peak;
        steps.push('Buff ' + buff.pre + ' in active slot → max stacks ' + buff.stacks + ' × ' + buff.amount + ' = +' + Math.round(peak * 100) + '%');
        steps.push('ATK mult = ×' + mult.toFixed(2) + ' (always up)');
        steps.push('uptime = 100% (no slot switch)');
      } else if (buff && placement === 'slot') {
        peak = buffPeak(buff);
        mult = 1 + peak;
        uptime = buffUptime(buff);
        steps.push('Buff ' + buff.pre + ' in side slot → peak +' + Math.round(peak * 100) + '% but must refresh');
        steps.push('Refresh: 1 cast every ' + buff.dur + 's (dur), costs ~' + buff.cd + 's on buff slot');
        steps.push('uptime = primary/(primary+buff) = ' + buff.dur + '/(' + buff.dur + '+' + buff.cd + ') = ' + (uptime * 100).toFixed(1) + '%');
        steps.push('ATK mult = ×' + mult.toFixed(2) + ' while on main');
      } else {
        steps.push('No ATK buff');
      }

      const effective = Math.round(base * mult * uptime);
      steps.push('Effective DPS = ' + base + ' × ' + mult.toFixed(2) + ' × ' + uptime.toFixed(3) + ' = ' + effective);
      return { best: effective, mainMoves, buff, buffPlacement: placement, peak, uptime, mult, steps, base };
    }

    function bestDpsForTypes(types, cfg) {
      const damage = bestDamageMoves(types, cfg);
      const bondN = Math.min(cfg.bondSize || 4, 4, Math.max(1, damage.length));
      const buff = bestAtkBuff(types, cfg && cfg.mon);
      const preferSwitch = !!(document.getElementById('preferSwitchSlots') && document.getElementById('preferSwitchSlots').checked);

      // Candidate A: no buff, full bond of damage
      const pure = scoreLoadout(damage.slice(0, bondN), null, null, cfg);

      // Candidate B: buff in the active slot (shares bond seats with damage moves — always on)
      let bondedBuff = null;
      if (buff && bondN >= 1) {
        const dmgN = Math.max(1, bondN - 1);
        bondedBuff = scoreLoadout(damage.slice(0, dmgN), buff, 'bond', cfg);
      }

      // Candidate C: buff occupies a non-active slot; player switches to it (uptime cost)
      // Only considered when user prefers switching active slots
      let sideBuff = null;
      if (buff && preferSwitch) {
        sideBuff = scoreLoadout(damage.slice(0, bondN), buff, 'slot', cfg);
      }

      const candidates = [pure, bondedBuff, sideBuff].filter(Boolean);
      candidates.sort((a, b) => b.best - a.best);
      return candidates[0];
    }

    function moveLabel(m) {
      const lab = m.pre + '(' + m.tier + ')';
      const col = TYPE_COLORS[m.type] || '#ccc';
      const style = 'color:' + col + (m.evolved ? ';font-weight:700' : '');
      return '<span style="' + style + '">' + lab + '</span>';
    }

    function calcCombos() {
      if (!RAW.length || !DEX.length) return;
      const cfg = getConfig();
      const mon = cfg.mon;

      const ranked = [];
      if (mon) {
        // Selected Pokémon: only its learnable skills (Normal + types) + PA/SA DPS
        const types = [...(mon.types || [])].sort();
        const key = types.join('+');
        const res = bestDpsForTypes(types, cfg);
        ranked.push({
          key, types, count: 1, examples: [mon.name],
          monName: mon.name, monDex: mon.dex,
          ...res
        });
      } else {
        const comboMap = new Map();
        for (const p of DEX) {
          const key = [...p.types].sort().join('+');
          if (!comboMap.has(key)) {
            comboMap.set(key, { types: [...p.types].sort(), count: 0, examples: [] });
          }
          const c = comboMap.get(key);
          c.count++;
          if (c.examples.length < 3) c.examples.push(p.name);
        }
        for (const [key, info] of comboMap) {
          ranked.push({ key, ...info, ...bestDpsForTypes(info.types, cfg) });
        }
        ranked.sort((a, b) => b.best - a.best);
      }

      document.getElementById('comboList').innerHTML = ranked.slice(0, 40).map((c, i) => {
        const badges = c.types.map(t => {
          const col = TYPE_COLORS[t] || '#888';
          return '<span class="type-badge" style="background:' + col + '33;color:' + col + '">' + t + '</span>';
        }).join(' ');
        const rankCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';

        const mainStack = (c.mainMoves || []).map(m =>
          '<div class="slot-move" data-move-id="' + m.id + '">' + moveLabel(m) +
          ' <span class="slot-dps">' + m.dps + '</span></div>'
        ).join('');

        let buffStack = '';
        if (c.buff && c.buffPlacement === 'bond') {
          buffStack = '<div class="slot-move buff" data-move-id="' + c.buff.id + '">' +
            c.buff.pre + ' <span class="slot-dps">×' + (c.mult || 1).toFixed(2) + '</span></div>';
        }
        const slot1 = '<div class="slot-col main"><div class="slot-tag">Main (active)</div>' + mainStack + buffStack + '</div>';

        let otherSlots = '';
        if (c.buff && c.buffPlacement === 'slot') {
          otherSlots = '<div class="slot-col"><div class="slot-tag">Other slot (switch)</div>' +
            '<div class="slot-move buff" data-move-id="' + c.buff.id + '">' + c.buff.pre +
            ' <span class="slot-dps">' + Math.round((c.uptime || 0) * 100) + '% up</span></div></div>';
        }

        const meta = c.count + ' Pokémon · e.g. ' + c.examples.join(', ');
        const stepsAttr = (c.steps || []).join('\\n');
        return '<div class="combo-row tip-combo" data-steps="' + stepsAttr.replace(/"/g, '&quot;') + '">' +
          '<div class="left"><span class="rank ' + rankCls + '">' + (i + 1) + '</span> ' + badges +
          ' <span style="color:var(--muted);font-size:0.75rem">' + meta + '</span></div>' +
          '<div class="score">' + c.best + '</div>' +
          '<div class="slots-wrap">' + slot1 + otherSlots + '</div></div>';
      }).join('');

      document.querySelectorAll('#comboList .slot-move[data-move-id]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', e => { e.stopPropagation(); jumpToMove(el.dataset.moveId); });
      });
      document.querySelectorAll('#comboList .tip-combo').forEach(el => {
        el.addEventListener('mouseenter', e => {
          const steps = (el.dataset.steps || '').split('\\n').filter(Boolean);
          if (!steps.length) return;
          const htmlTip = '<div class="tt-title">Combo calculation</div>' +
            steps.map(s => '<div class="tt-step">' + s + '</div>').join('');
          showTip(htmlTip, e.clientX, e.clientY);
        });
        el.addEventListener('mousemove', e => {
          const eltt = ttEl();
          if (eltt.style.display !== 'block') return;
          let left = e.clientX + 12, top = e.clientY + 12;
          const r = eltt.getBoundingClientRect();
          if (left + r.width > window.innerWidth - 8) left = e.clientX - r.width - 12;
          if (top + r.height > window.innerHeight - 8) top = e.clientY - r.height - 12;
          eltt.style.left = Math.max(8, left) + 'px';
          eltt.style.top = Math.max(8, top) + 'px';
        });
        el.addEventListener('mouseleave', () => { if (!tipPinned) hideTip(true); });
      });
    }

    // ---------- Calculator (4×4 grid) ----------
    function movesForPoke(p) {
      if (!p) return [];
      const types = new Set(['normal', ...p.types]);
      return RAW.filter(m => types.has(m.type));
    }

    function populateCalcList() {
      const dl = document.getElementById('calcPokeList');
      if (!dl) return;
      dl.innerHTML = DEX.map(p => '<option value="' + p.name + '"></option>').join('');
      const sdl = document.getElementById('sizePokeList');
      if (sdl) sdl.innerHTML = DEX.map(p => '<option value="' + p.name + '"></option>').join('');
    }

    /**
     * Size compare: sprites scaled by Idle frame size (proportional), circles every 10 units.
     * Game: bodyRadius = clamp(Idle.w * 0.22, 5, 26) * 2 (PX).
     * We map 1 game unit → SCALE screen px so r=50 fits in the stage.
     */
    function renderSizeView() {
      const stage = document.getElementById('sizeView');
      const meta = document.getElementById('sizePokeMeta');
      if (!stage) return;
      // Refresh datalist with optional type filter
      const sdl = document.getElementById('sizePokeList');
      if (sdl && DEX.length) {
        let pool = DEX;
        if (sizeTypeSel.size) {
          pool = DEX.filter(p => {
            for (const t of sizeTypeSel) if (!p.types.includes(t)) return false;
            return true;
          });
        }
        sdl.innerHTML = pool.map(p => '<option value="' + p.name + '"></option>').join('');
      }
      const name = (document.getElementById('sizePoke').value || '').trim();
      const p = DEX.find(x => x.name.toLowerCase() === name.toLowerCase()) ||
                DEX.find(x => matchSearch(x.name, name));
      if (!p) {
        stage.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted)">Select a Pokémon' +
          (sizeTypeSel.size ? ' (type filter active)' : '') + '</div>';
        if (meta) meta.textContent = sizeTypeSel.size ? (sizeTypeSel.size + ' type filter') : '';
        return;
      }
      const hit = p.hit != null ? p.hit : bodyRadius(p.dex);
      const m = SPRITE_META[p.dex];
      const w = (m && m.a && m.a.Idle && m.a.Idle.w) ? m.a.Idle.w : 32;
      const h = (m && m.a && m.a.Idle && m.a.Idle.h) ? m.a.Idle.h : 32;
      const n = (m && m.a && m.a.Idle && m.a.Idle.n) ? m.a.Idle.n : 3;
      // Stage is 520px; max ring r=50 → diameter 100 units. Leave margin.
      const SCALE = 3.2; // screen px per game unit (sprite = 2×SCALE per source px)
      const maxR = 50;
      let rings = '';
      for (let r = 10; r <= maxR; r += 10) {
        const d = r * 2 * SCALE;
        rings += '<div class="ring" style="width:' + d + 'px;height:' + d + 'px"></div>';
        rings += '<div class="ring-label" style="top:calc(50% - ' + (r * SCALE) + 'px - 10px)">r=' + r + '</div>';
      }
      // Hitbox ring for this Pokémon (pink)
      const hd = hit * 2 * SCALE;
      rings += '<div class="hit-ring" style="width:' + hd + 'px;height:' + hd + 'px" title="hitbox r=' + hit + '"></div>';

      // Game draws sprites at PX=2 world units per source pixel.
      // bodyRadius = clamp(w*0.22, 5, 26) * PX — hitbox is much smaller than the sprite.
      // Screen: 1 world unit = SCALE px → 1 source pixel = 2 * SCALE screen px.
      const pxPerSrc = 2 * SCALE;
      const sprW = w * pxPerSrc;
      const sprH = h * pxPerSrc;
      const bgW = n * w * pxPerSrc;
      const bgH = 8 * h * pxPerSrc;
      // Anchor feet at center (bottom of Idle frame near center) — game uses feet at (x,y)
      const sprStyle =
        'width:' + sprW + 'px;height:' + sprH + 'px;' +
        'background-image:url(\'' + spriteUrl(p.dex) + '\');' +
        'background-size:' + bgW + 'px ' + bgH + 'px;' +
        'background-position:0 0;background-repeat:no-repeat;' +
        'left:50%;top:50%;transform:translate(-50%,-50%);position:absolute;';

      stage.innerHTML = rings + '<div class="spr-wrap" style="' + sprStyle + '"></div>';
      if (meta) {
        meta.innerHTML = '#' + p.dex + ' · hitbox r=<b>' + hit + '</b> · frame ' + w + '×' + h +
          ' · <span class="size-tag ' + (p.size || sizeClass(hit)) + '">' + (p.size || sizeClass(hit)) + '</span>';
      }
    }

    function onCalcPokeChange() {
      const name = (document.getElementById('calcPoke').value || '').trim();
      const p = DEX.find(x => x.name.toLowerCase() === name.toLowerCase()) ||
                DEX.find(x => matchSearch(x.name, name));
      calcPoke = p || null;
      const info = document.getElementById('calcPokeInfo');
      if (info) {
        if (p) {
          info.innerHTML = '#' + p.dex + ' · ' + p.types.join('/') +
            ' · <span class="size-tag ' + (p.size || sizeClass(p.hit)) + '">' + (p.size || sizeClass(p.hit)) + '</span>';
        } else info.textContent = '';
      }
      // Remove moves no longer in pool
      if (p) {
        const pool = new Set(movesForPoke(p).map(m => m.id));
        for (let s = 0; s < 4; s++) {
          calcSlotsState[s] = calcSlotsState[s].filter(e => pool.has(e.id));
        }
      }
      renderCalc();
    }

    function calcClear() {
      calcSlotsState = [[], [], [], []];
      calcPickCell = null;
      const pk = document.getElementById('calcPicker');
      if (pk) pk.style.display = 'none';
      renderCalc();
    }

    function calcCellClick(slot, row) {
      if (!calcPoke) {
        alert('Select a Pokémon first');
        return;
      }
      const cur = calcSlotsState[slot][row];
      if (cur) {
        // remove
        calcSlotsState[slot].splice(row, 1);
        renderCalc();
        return;
      }
      calcPickCell = { slot, row };
      showCalcPicker();
    }

    function showCalcPicker() {
      const box = document.getElementById('calcPicker');
      if (!box || !calcPoke) return;
      const used = new Set(calcSlotsState.flat().map(e => e.id));
      const pool = movesForPoke(calcPoke).filter(m => !used.has(m.id));
      box.style.display = 'flex';
      box.innerHTML = pool.length ? pool.map(m => {
        const n = enName(m.name, m.id);
        const c = TYPE_COLORS[m.type] || '#888';
        return '<span class="pick" style="color:' + c + '" data-id="' + m.id + '">' + n +
          (m.kind === 'buff' ? ' (buff)' : '') + '</span>';
      }).join('') : '<span style="color:var(--muted)">No remaining moves for this Pokémon.</span>';
      box.querySelectorAll('.pick').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          const def = RAW.find(m => m.id === id);
          if (!def || !calcPickCell) return;
          const { slot } = calcPickCell;
          if (calcSlotsState[slot].length >= 4) {
            alert('Max 4 bonded moves per slot');
            return;
          }
          calcSlotsState[slot].push({ id, evolved: !!EVO[id] });
          calcPickCell = null;
          box.style.display = 'none';
          renderCalc();
        });
      });
    }

    function scoreCalculator() {
      const cfg = getConfig();
      const steps = [];
      let base = 0;
      const mainLabels = [];
      let atkBuffInMain = null;
      let atkBuffSide = null;

      function resolveEntry(entry) {
        const def = RAW.find(m => m.id === entry.id);
        if (!def) return null;
        const pre = enName(def.name, def.id);
        if (def.kind === 'buff' && def.stat === 'atk') {
          return { kind: 'buff', id: def.id, pre, amount: def.amount, stacks: def.stacks || 5, cd: def.cd, dur: def.dur, type: def.type };
        }
        if (def.kind === 'buff') return { kind: 'buff-other', id: def.id, pre, dps: 0, type: def.type };
        const s = instance(def, 5, !!entry.evolved && !!EVO[def.id]);
        const dps = Math.round(singleTargetDPS(s, cfg));
        const tier = (entry.evolved && EVO[def.id]) ? 'Evo' : 'Lv5';
        return { kind: 'dmg', id: def.id, pre, dps, tier, type: def.type };
      }

      for (const e of calcSlotsState[0]) {
        const r = resolveEntry(e);
        if (!r) continue;
        if (r.kind === 'buff') atkBuffInMain = r;
        else if (r.kind === 'dmg') { base += r.dps; mainLabels.push(r.pre + '(' + r.tier + ')=' + r.dps); }
      }
      for (let si = 1; si < 4; si++) {
        for (const e of calcSlotsState[si]) {
          const r = resolveEntry(e);
          if (r && r.kind === 'buff' && !atkBuffSide) atkBuffSide = r;
        }
      }

      steps.push('Main damage: ' + (mainLabels.join(' + ') || '0'));
      steps.push('Base sum = ' + base);
      let mult = 1, uptime = 1;
      if (atkBuffInMain) {
        const peak = atkBuffInMain.amount * atkBuffInMain.stacks;
        mult = 1 + peak;
        steps.push(atkBuffInMain.pre + ' in main → max stacks (+' + Math.round(peak * 100) + '%)');
        steps.push('uptime 100%');
      } else if (atkBuffSide) {
        const peak = atkBuffSide.amount * atkBuffSide.stacks;
        mult = 1 + peak;
        uptime = atkBuffSide.dur / (atkBuffSide.dur + atkBuffSide.cd);
        steps.push(atkBuffSide.pre + ' in side → peak +' + Math.round(peak * 100) + '%');
        steps.push('uptime = ' + atkBuffSide.dur + '/(' + atkBuffSide.dur + '+' + atkBuffSide.cd + ') = ' + (uptime * 100).toFixed(1) + '%');
      } else steps.push('No ATK buff');

      const effective = Math.round(base * mult * uptime);
      steps.push('Effective DPS = ' + base + ' × ' + mult.toFixed(2) + ' × ' + uptime.toFixed(3) + ' = ' + effective);
      return { effective, steps };
    }

    function renderCalc() {
      const body = document.getElementById('calcGridBody');
      if (!body) return;
      // 4 rows × 4 columns
      let html = '';
      for (let row = 0; row < 4; row++) {
        html += '<tr><th>Bond ' + (row + 1) + '</th>';
        for (let slot = 0; slot < 4; slot++) {
          const entry = calcSlotsState[slot][row];
          if (entry) {
            const def = RAW.find(m => m.id === entry.id);
            const pre = def ? enName(def.name, def.id) : entry.id;
            const col = def ? (TYPE_COLORS[def.type] || '#ccc') : '#ccc';
            const tier = def && def.kind === 'buff' ? 'buff' : (entry.evolved && EVO[entry.id] ? 'Evo' : 'Lv5');
            html += '<td class="cell filled" onclick="calcCellClick(' + slot + ',' + row + ')">' +
              '<span class="cell-move" style="color:' + col + '">' + pre + '</span>' +
              '<div style="color:var(--muted);font-size:0.68rem">' + tier + '</div></td>';
          } else {
            html += '<td class="cell" onclick="calcCellClick(' + slot + ',' + row + ')" style="color:var(--muted)">+</td>';
          }
        }
        html += '</tr>';
      }
      body.innerHTML = html;
      const res = scoreCalculator();
      const box = document.getElementById('calcResult');
      if (box) {
        box.innerHTML = '<div class="iname">Effective DPS: ' + res.effective + '</div>' +
          '<div class="idesc">' + res.steps.join('<br>') + '</div>';
      }
      const info = document.getElementById('calcPokeInfo');
      if (info && calcPoke) {
        info.innerHTML = '#' + calcPoke.dex + ' · ' + calcPoke.types.join('/') +
          ' · <span class="size-tag ' + (calcPoke.size || '') + '">' + (calcPoke.size || '') + '</span>';
      }
    }

    function jumpToMove(id) {
      if (!id) return;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'dps'));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-dps'));
       clearDpsTypes();
      sortKey = 'lv5'; sortDir = -1;
      renderDps();
      requestAnimationFrame(() => {
        let target = document.querySelector('#dpsBody tr[data-move-id="' + id + '"]');
        if (!target) {
          const def = RAW.find(m => m.id === id);
          if (def && sm) {
            sm.value = enName(def.name, def.id);
            renderDps();
            target = document.querySelector('#dpsBody tr[data-move-id="' + id + '"]');
          }
        }
        if (target) {
          target.classList.add('highlight-row');
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortKey === key) sortDir *= -1;
        else {
          sortKey = key;
          sortDir = ['name','type','kind'].includes(key) ? 1 : -1;
        }
        renderDps();
      });
    });

    document.querySelectorAll('.poke-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.pokeSort;
        if (pokeSortKey === key) pokeSortDir *= -1;
        else {
          pokeSortKey = key;
          pokeSortDir = (key === 'name' || key === 'dex') ? 1 : -1;
        }
        renderPokedex();
      });
    });

    function renderChangelog() {
      const badge = document.getElementById('appVersionBadge');
      if (badge) badge.textContent = 'v' + APP_VERSION;
      const list = document.getElementById('changelogList');
      if (!list) return;
      list.innerHTML = CHANGELOG.map(c =>
        '<div class="changelog-item item-row"><div class="iname"><span class="ver">v' + c.v +
        '</span> · ' + c.date + '</div><ul>' +
        c.items.map(i => '<li>' + i + '</li>').join('') + '</ul></div>'
      ).join('');
    }

    function renderMechanics() {
      const el = document.getElementById('mechanicsBody');
      if (!el) return;
      const groups = MECHANICS_GROUPS;

      el.innerHTML = groups.map(g =>
        '<div class="mech-card"><h3>' + g.title + '</h3><ul>' +
        g.items.map(i => '<li>' + i + '</li>').join('') +
        '</ul></div>'
      ).join('');
    }

    function recalcAll() {
      const mob = document.getElementById('dpsMobbing');
      if (mob && mob.checked) prefillAvgEnemyR();
      if (typeof buildWeakAtkChips === 'function') buildWeakAtkChips();
      if (typeof onDodgeOptionsChange === 'function' && DEX.length) { try { const med = medianHitRadius(); const hint = document.getElementById('dodgeOptionsHint'); if (hint) hint.textContent = 'baseline = ' + med.toFixed(2); } catch (e) {} }
      if (typeof buildPokeTypeChips === 'function') buildPokeTypeChips();
      recalcDps();
      renderPokedex();
      calcCombos();
      renderItems();
      renderEnemies();
      populateCalcList();
      renderCalc();
      renderSizeView();
      renderMechanics();
      renderChangelog();
      document.querySelectorAll('.table-wrap table').forEach(t => t.classList.add('compact'));
    }


        async function fetchAll(force = false) {
      const status = document.getElementById('status');
      status.className = 'status loading';

      const cached = !force ? loadCache() : null;
      const age = cached ? (Date.now() - cached.ts) : Infinity;
      const useCache = cached && age < CACHE_TTL_MS;

      // Optional SHA check against game repo
      let remoteSha = null;
      try {
        const meta = await fetch('https://api.github.com/repos/JPTER78/pokesurvivor/commits/main', {
          headers: { Accept: 'application/vnd.github.v3+json' }
        });
        if (meta.ok) {
          const j = await meta.json();
          remoteSha = j.sha || null;
        }
      } catch (e) {}

      const shaMatch = !!(cached && remoteSha && cached.sha && cached.sha === remoteSha);
      if (useCache && shaMatch) {
        status.textContent = 'Cache up to date (commit ' + (remoteSha || '').slice(0, 7) + ')';
      } else if (useCache) {
        status.textContent = 'Loaded from cache (' + Math.round(age / 60000) + ' min old). Recheck every 1 h.';
      } else {
        status.textContent = force ? 'Force-refreshing from GitHub…' : 'Fetching game data…';
      }

      try {
        let movesSrc, dexSrc, langSrc, itemsSrc, metaSrc, enemiesSrc = '', spawnerSrc = '', tmsSrc = '', abilSrc = '', abilFxSrc = '';
        if (useCache && cached.movesSrc && cached.dexSrc) {
          movesSrc = cached.movesSrc;
          dexSrc = cached.dexSrc;
          langSrc = cached.langSrc || '';
          itemsSrc = cached.itemsSrc || '';
          metaSrc = cached.metaSrc || '';
          enemiesSrc = cached.enemiesSrc || '';
          spawnerSrc = cached.spawnerSrc || '';
          tmsSrc = cached.tmsSrc || '';
          abilSrc = cached.abilSrc || '';
          abilFxSrc = cached.abilFxSrc || '';
          if (cached.sha) GAME_DATA_SHA = cached.sha;
        } else {
          const ts = Date.now();
          const base = 'https://raw.githubusercontent.com/JPTER78/pokesurvivor/main/';
          const urls = [
            base + 'js/data/moves.js?' + ts,
            base + 'js/data/pokedex.js?' + ts,
            base + 'js/data/lang-en.js?' + ts,
            base + 'js/data/items.js?' + ts,
            base + 'js/data/sprites-meta.js?' + ts,
            base + 'js/data/enemies.js?' + ts,
            base + 'js/systems/spawner.js?' + ts,
            base + 'js/data/tms.js?' + ts,
            base + 'js/data/abilities.js?' + ts,
            base + 'js/data/ability-fx.js?' + ts
          ];
          const ress = await Promise.all(urls.map(u => fetch(u).catch(() => null)));
          const text = async (r) => (r && r.ok ? r.text() : '');
          movesSrc = await text(ress[0]);
          dexSrc = await text(ress[1]);
          langSrc = await text(ress[2]);
          itemsSrc = await text(ress[3]);
          metaSrc = await text(ress[4]);
          enemiesSrc = await text(ress[5]);
          spawnerSrc = await text(ress[6]);
          tmsSrc = await text(ress[7]);
          abilSrc = await text(ress[8]);
          abilFxSrc = await text(ress[9]);
          if (!movesSrc || !dexSrc) throw new Error('Failed to fetch moves.js or pokedex.js');
          GAME_DATA_SHA = remoteSha || ('local-' + ts);
          saveCache({
            movesSrc, dexSrc, langSrc, itemsSrc, metaSrc, enemiesSrc, spawnerSrc, tmsSrc, abilSrc, abilFxSrc,
            sha: GAME_DATA_SHA
          });
        }
        if (remoteSha) GAME_DATA_SHA = remoteSha;

        // Spanish → English from lang-en.js
        MOVE_EN = {};
        if (langSrc) {
          const re = /'([^'\\]*(?:\\.[^'\\]*)*)':\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g;
          let m;
          while ((m = re.exec(langSrc)) !== null) {
            MOVE_EN[m[1]] = m[2].replace(/\\'/g, "'");
          }
        }

        // Items (optional)
        ITEMS = [];
        if (itemsSrc) {
          const listMatch = itemsSrc.match(/const LIST\s*=\s*(\[[\s\S]*?\]);/);
          if (listMatch) {
            try {
              const cleaned = listMatch[1]
                .replace(/on:\s*[^,}]*(?:,|\})/g, '')
                .replace(/off:\s*[^,}]*(?:,|\})/g, '')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
              ITEMS = (0, eval)(cleaned);
            } catch (e) { console.warn('items parse', e); }
          }
        }

        // Sprites meta
        SPRITE_META = {};
        if (metaSrc) {
          try {
            const mm = metaSrc.match(/G\.SPRITE_META\s*=\s*(\{[\s\S]*?\n\});/);
            if (mm) SPRITE_META = (0, eval)('(' + mm[1] + ')');
          } catch (e) {}
        }

        if (typeof applyLiveSpawnData === 'function') applyLiveSpawnData(enemiesSrc, spawnerSrc);

        const laddersMatch = movesSrc.match(/const LADDERS\s*=\s*(\{[\s\S]*?\n  \});/);
        if (!laddersMatch) throw new Error('LADDERS not found');
        const rawStart = movesSrc.indexOf('const RAW = [');
        const rawEnd = movesSrc.indexOf('];', movesSrc.indexOf('hex:'));
        if (rawStart < 0 || rawEnd < 0) throw new Error('RAW not found');
        const rawStr = movesSrc.slice(rawStart + 'const RAW = '.length, rawEnd + 1);
        const evoMatch = movesSrc.match(/const EVO\s*=\s*(\{[\s\S]*?\n  \});/);
        const evoModsMatch = movesSrc.match(/const EVO_MODS\s*=\s*(\{[\s\S]*?\n  \});/);
        LADDERS = (0, eval)('(' + laddersMatch[1] + ')');
        const R = (0, eval)(rawStr);
        EVO = evoMatch ? (0, eval)('(' + evoMatch[1] + ')') : {};
        EVO_MODS = evoModsMatch ? (0, eval)('(' + evoModsMatch[1] + ')') : {};
        let PHYSICAL = new Set();
        const physMatch = movesSrc.match(/PHYSICAL\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
        if (physMatch) {
          const ids = physMatch[1].match(/'([^']+)'/g) || [];
          PHYSICAL = new Set(ids.map(s => s.slice(1, -1)));
        }
        for (const m of R) {
          m.cat = m.kind === 'buff' ? null : (PHYSICAL.has(m.id) ? 'physical' : 'special');
          if (m.kind !== 'melee') continue;
          m.dmg = Math.round(m.dmg * 1.2);
          if (m.radius) m.radius = Math.round(m.radius * 1.25);
          if (m.arc) m.arc = Math.min(3, +(m.arc * 1.25).toFixed(2));
        }
        RAW = R.filter(m => m && m.id);
        ALL_MOVES = RAW.slice();
        DAMAGE_MOVES = RAW.filter(m => m.kind !== 'buff' && m.dmg != null);

        const dexMatch = dexSrc.match(/G\.DEX\s*=\s*(\[[\s\S]*?\]);/);
        if (!dexMatch) throw new Error('G.DEX not found');
        DEX = (0, eval)(dexMatch[1]);
        for (const p of DEX) {
          p._comboCoefs = null;
          p.hit = bodyRadius(p.dex);
          p.size = sizeClass(p.hit);
          if (p.df != null) p.df = +p.df;
          if (p.sd != null) p.sd = +p.sd;
          if (p.pa != null) p.pa = +p.pa;
          if (p.sa != null) p.sa = +p.sa;
        }

        // TMs
        TM_OF = {}; TM_MOVES = {};
        if (tmsSrc) {
          try {
            const tmMatch = tmsSrc.match(/G\.TMS\s*=\s*(\{[\s\S]*?\n\});/) || tmsSrc.match(/(?:const|var|let)\s+TMS\s*=\s*(\{[\s\S]*?\n\});/);
            if (tmMatch) {
              const TMS = (0, eval)('(' + tmMatch[1] + ')');
              for (const [mid, dexes] of Object.entries(TMS)) {
                TM_MOVES[mid] = dexes;
                for (const d of dexes) {
                  if (!TM_OF[d]) TM_OF[d] = [];
                  TM_OF[d].push(mid);
                }
              }
            }
          } catch (e) { console.warn('tms', e); }
        }

        // Abilities names + dex slots
        ABIL_NAMES = {};
        DEX_ABIL = {};
        if (abilSrc) {
          try {
            const abilMatch = abilSrc.match(/G\.ABIL\s*=\s*(\{[\s\S]*?\n\});/);
            if (abilMatch) {
              const AB = (0, eval)('(' + abilMatch[1] + ')');
              for (const [id, arr] of Object.entries(AB)) {
                ABIL_NAMES[id] = Array.isArray(arr) ? (arr[1] || arr[0] || id) : String(arr);
              }
            }
            const dexAbMatch = abilSrc.match(/G\.DEX_ABIL\s*=\s*(\{[\s\S]*?\n\});/);
            if (dexAbMatch) {
              DEX_ABIL = (0, eval)('(' + dexAbMatch[1] + ')');
            }
          } catch (e) { console.warn('abilities', e); }
        }

        buildEnemyWeights();
        if (typeof ensureEnemyAttackProfile === 'function') ensureEnemyAttackProfile(true);

        // Expand (pokemon × ability) rows
        rebuildDexRows();

        const _mc = (typeof loadPokeMetricsCache === 'function') ? loadPokeMetricsCache() : null;
        if (_mc && typeof applyPokeMetricsCache === 'function') {
          applyPokeMetricsCache(_mc);
          for (const p of DEX_ROWS) { if (p.dmgV2 != null) p._dmgV2Dirty = false; }
        } else {
          for (const p of DEX_ROWS) { p.dmgV2 = undefined; p._dmgV2Dirty = true; }
        }
        if (typeof invalidatePokeCache === 'function') invalidatePokeCache();

        for (const p of DEX) p.cov = coverageScore(p.types);
        VALID_TYPE_SET = new Set();
        for (const p of DEX) {
          const ts = [...p.types].sort();
          const n = ts.length;
          for (let mask = 1; mask < (1 << n); mask++) {
            const sub = [];
            for (let i = 0; i < n; i++) if (mask & (1 << i)) sub.push(ts[i]);
            VALID_TYPE_SET.add(sub.join('+'));
          }
        }

        status.className = 'status ok';
        status.textContent = 'Loaded ' + RAW.length + ' moves · ' + DEX.length + ' Pokémon · ' +
          DEX_ROWS.length + ' ability rows · ' + Object.keys(DEX_ABIL).length + ' abil maps';

        if (typeof populateFilters === 'function') populateFilters();
        if (typeof buildPokeAbilityChips === 'function') buildPokeAbilityChips();
        if (typeof renderAbilities === 'function') renderAbilities();
        if (typeof recalcAll === 'function') recalcAll();
      } catch (err) {
        console.error(err);
        status.className = 'status err';
        status.textContent = 'Fetch failed: ' + err.message;
      }
    }


    /**
     * One-shot: fill mults, score, ranks for all DEX. Skip if still valid.
     */
        




    
    function finalizeScoresOnly() {
      const pool = (DEX_ROWS && DEX_ROWS.length) ? DEX_ROWS : DEX;
      if (!pool.length) return;
      if (typeof ensureEnemyAttackProfile === 'function') ensureEnemyAttackProfile();
      const wo = (typeof scoreW !== 'undefined' && scoreW) ? scoreW.off : 1;
      const wd = (typeof scoreW !== 'undefined' && scoreW) ? scoreW.def : 1;
      const ws = (typeof scoreW !== 'undefined' && scoreW) ? scoreW.spd : 0.25;
      function med(arr) {
        if (!arr.length) return 1;
        const m = Math.floor(arr.length / 2);
        return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
      }
      const offV1 = (p) => Math.max(p.phyM || 0, p.speM || 0);
      const offV2 = (p) => p.dmgV2 != null ? +p.dmgV2 : 0;
      const offs1 = pool.map(offV1).filter(x => x > 0).sort((a, b) => a - b);
      const offs2 = pool.map(offV2).filter(x => x > 0).sort((a, b) => a - b);
      const defs = pool.map(p => p.ehp || 0).filter(x => x > 0).sort((a, b) => a - b);
      const spds = pool.map(p => (p._natSpd != null ? p._natSpd : p.spd) || 0).filter(x => x > 0).sort((a, b) => a - b);
      const medOff1 = med(offs1) || 1, medOff2 = med(offs2) || 1, medDef = med(defs) || 1, medSpd = med(spds) || 1;
      function pack(off, medOff, def, spd) {
        return Math.pow(Math.max(1e-9, off / medOff), wo) *
          Math.pow(Math.max(1e-9, def / medDef), wd) *
          Math.pow(Math.max(1e-9, spd / medSpd), ws);
      }
      for (const p of pool) {
        const def = p.ehp || 0;
        const spd = (p._natSpd != null ? p._natSpd : p.spd) || 0;
        const o1 = offV1(p), o2 = offV2(p);
        p.scoreV1 = pack(o1, medOff1, def, spd);
        p.scoreV2 = pack(o2, medOff2, def, spd);
        p.score = (typeof scoreAlgo !== 'undefined' && scoreAlgo === 'v2') ? p.scoreV2 : p.scoreV1;
      }
      if (typeof rankByTied === 'function') {
        const keysHi = ['atk','pa','sa','paNat','saNat','df','sd','hp','spd','typeM','wxM','phyM','speM','dodge','eva','ehp','score','scoreV1','scoreV2','dmgV2','cov','dmgM'];
        const keysLo = ['hit','phyDefM','speDefM','dr','defM'];
        const maps = {};
        for (const k of keysHi) maps[k] = rankByTied(pool, k, true);
        for (const k of keysLo) maps[k] = rankByTied(pool, k, false);
        for (const p of pool) {
          p.ranks = p.ranks || {};
          const id = p._rowKey || p.dex;
          for (const k of Object.keys(maps)) p.ranks[k] = maps[k].get(id);
        }
      }
      POKE_CACHE_DIRTY = false;
      try { if (typeof savePokeMetricsCache === 'function') savePokeMetricsCache(); } catch (e) {}
    }

    let calcJobToken = 0;
    let calcJobActive = null;

    function sleep0() { return new Promise(r => setTimeout(r, 0)); }

    function showCalcProgress(frac, msg) {
      let el = document.getElementById('calcProgressOverlay');
      if (!el) {
        el = document.createElement('div');
        el.id = 'calcProgressOverlay';
        el.className = 'calc-progress-overlay';
        el.innerHTML = '<div class="calc-progress-card"><div class="calc-progress-title" id="calcProgressTitle">Calculating…</div><div class="calc-progress-bar"><div class="calc-progress-fill" id="calcProgressFill"></div></div><div class="calc-progress-meta" id="calcProgressMeta">0%</div><button type="button" class="btn-secondary" id="calcProgressStop" onclick="cancelHeavyRecalc()">Stop (keep progress)</button></div>';
        document.body.appendChild(el);
      }
      el.style.display = 'flex';
      const fill = document.getElementById('calcProgressFill');
      const meta = document.getElementById('calcProgressMeta');
      const title = document.getElementById('calcProgressTitle');
      if (fill) fill.style.width = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + '%';
      if (meta) meta.textContent = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%' + (msg ? ' · ' + msg : '');
      if (title && msg) title.textContent = msg;
    }
    function hideCalcProgress() {
      const el = document.getElementById('calcProgressOverlay');
      if (el) el.style.display = 'none';
    }
    function cancelHeavyRecalc() {
      if (calcJobActive) { calcJobActive.cancelled = true; calcJobActive.instantStop = true; }
      calcJobToken++;
      hideCalcProgress();
      try { finalizeScoresOnly(); if (typeof renderPokedex === 'function') renderPokedex(); } catch (e) {}
      calcJobActive = null;
    }

    async function runHeavyRecalc(label) {
      const pool = (DEX_ROWS && DEX_ROWS.length) ? DEX_ROWS : DEX;
      if (!pool.length) return;
      const token = ++calcJobToken;
      const job = { token: token, cancelled: false, instantStop: false, frac: 0 };
      calcJobActive = job;
      showCalcProgress(0, label || 'Calculating…');
      if (typeof ensureEnemyAttackProfile === 'function') ensureEnemyAttackProfile();
      const n = pool.length;
      for (let i = 0; i < n; i++) {
        if (job.cancelled || job.instantStop || token !== calcJobToken) {
          calcJobActive = null;
          return;
        }
        const p = pool[i];
        if (p._cacheGen === POKE_CACHE_GEN && p.dmgV2 != null && !p._dmgV2Dirty) {
          job.frac = (i + 1) / n;
          if (i % 25 === 0) { showCalcProgress(job.frac, (label || 'Calculating') + ' · ' + (i + 1) + '/' + n); await sleep0(); }
          continue;
        }
        p._cacheGen = -1;
        try { ensurePokeMults(p); } catch (e) {}
        job.frac = (i + 1) / n;
        showCalcProgress(job.frac, (label || 'Calculating') + ' · ' + (i + 1) + '/' + n);
        await sleep0();
      }
      if (job.cancelled || job.instantStop || token !== calcJobToken) { calcJobActive = null; return; }
      finalizeScoresOnly();
      hideCalcProgress();
      calcJobActive = null;
      if (typeof renderPokedex === 'function') renderPokedex();
    }

    function scheduleHeavyRecalc(label) {
      runHeavyRecalc(label).catch(e => { console.warn(e); hideCalcProgress(); calcJobActive = null; });
    }

    function recomputeCompositeScores(force) {
      const pool = (DEX_ROWS && DEX_ROWS.length) ? DEX_ROWS : DEX;
      if (!pool.length) return;
      if (!force && !POKE_CACHE_DIRTY) return;

      const needsHeavy = force || pool.some(p => p._dmgV2Dirty || p.dmgV2 == null);
      if (needsHeavy) {
        scheduleHeavyRecalc('Calculating dmg v2 & scores');
        return;
      }
      for (const p of pool) {
        if (p._cacheGen !== POKE_CACHE_GEN) {
          p._cacheGen = -1;
          ensurePokeMults(p);
        }
      }
      finalizeScoresOnly();
    }

function fillRadarNatureSel(p) {
      const sel = document.getElementById('radarNatureSel');
      if (!sel || !p) return;
      const cur = radarNatureId || natureIdForMon(p) || '';
      sel.innerHTML = '<option value="">' + (natureMode === 'best' ? 'Best (' + (p._bestNature || bestNatureIdFor(p) || '—') + ')' : 'Neutral') + '</option>' +
        NATURES.map(n => {
          const up = n.up ? ('+' + n.up) : '±';
          const down = n.down ? ('−' + n.down) : '';
          return '<option value="' + n.id + '"' + (n.id === cur ? ' selected' : '') + '>' + n.en + ' (' + up + (down ? ' ' + down : '') + ')</option>';
        }).join('');
      if (cur) sel.value = cur;
    }
    function toggleRadarAvg(which, typeName) {
      if (which === 'all') {
        radarShowAllAvg = !radarShowAllAvg;
      } else if (which === 'type' && typeName) {
        if (radarShowTypeAvg.has(typeName)) radarShowTypeAvg.delete(typeName);
        else radarShowTypeAvg.add(typeName);
      }
      drawPokeRadar();
    }
    function onRadarNatureChange() {
      const sel = document.getElementById('radarNatureSel');
      radarNatureId = sel && sel.value ? sel.value : null;
      if (typeof drawPokeRadar === 'function') drawPokeRadar();
    }




    


    
    function updateGlobalPokeBar(p) {
      const nameEl = document.getElementById('globalPokeName');
      const statsEl = document.getElementById('globalPokeStats');
      const sprEl = document.getElementById('globalPokeSprite');
      if (!p) {
        if (nameEl) nameEl.textContent = 'None';
        if (statsEl) statsEl.innerHTML = '';
        if (sprEl) {
          sprEl.style.backgroundImage = '';
          sprEl.classList.add('empty');
        }
        return;
      }
      const pa = p.pa != null ? +p.pa : (p.atk != null ? +p.atk : null);
      const sa = p.sa != null ? +p.sa : (p.atk != null ? +p.atk : null);
      const r = (typeof pokeHit === 'function') ? pokeHit(p) : (p.hit != null ? p.hit : null);
      if (nameEl) nameEl.textContent = p.name + ' (#' + p.dex + ')';
      if (statsEl) {
        statsEl.innerHTML =
          '<span class="stat-pa">PA <b>' + (pa != null ? pa.toFixed(2) : '—') + '</b></span>' +
          '<span class="stat-sa">SA <b>' + (sa != null ? sa.toFixed(2) : '—') + '</b></span>' +
          (r != null ? '<span>r <b>' + (+r).toFixed(1) + '</b></span>' : '');
      }
      if (sprEl) {
        sprEl.classList.remove('empty');
        sprEl.style.cssText = (typeof spriteStyle === 'function' ? spriteStyle(p.dex, 48) : '') +
          ';width:48px;height:48px;flex-shrink:0;border-radius:8px;border:1px solid var(--border,#243044)';
      }
    }

    
    function saveSelectedPoke(dex) {
      try {
        if (dex == null) localStorage.removeItem(typeof POKE_SEL_KEY !== 'undefined' ? POKE_SEL_KEY : 'pstk_selected_dex');
        else localStorage.setItem(typeof POKE_SEL_KEY !== 'undefined' ? POKE_SEL_KEY : 'pstk_selected_dex', String(dex));
      } catch (e) {}
    }
    function loadSelectedPokeDex() {
      try {
        const key = typeof POKE_SEL_KEY !== 'undefined' ? POKE_SEL_KEY : 'pstk_selected_dex';
        const v = localStorage.getItem(key);
        if (v == null || v === '') return null;
        const n = parseInt(v, 10);
        return isNaN(n) ? null : n;
      } catch (e) { return null; }
    }
    function restoreSelectedPoke() {
      const dex = loadSelectedPokeDex();
      if (dex == null || !DEX.length) return;
      if (DEX.some(p => p.dex === dex)) useGlobalPoke(dex);
    }

    let globalPokeSearchIdx = -1;

    function onGlobalPokeSearch() {
      const inp = document.getElementById('globalPokeSearch');
      const box = document.getElementById('globalPokeResults');
      if (!inp || !box || !DEX.length) return;
      const q = inp.value.trim();
      if (!q) { box.style.display = 'none'; box.innerHTML = ''; globalPokeSearchIdx = -1; return; }
      const hits = DEX.filter(p => matchSearch(p.name, q) || matchSearch(String(p.dex), q)).slice(0, 12);
      if (!hits.length) {
        box.innerHTML = '<div class="global-poke-hit" style="cursor:default;color:var(--muted)">No matches</div>';
        box.style.display = 'block';
        globalPokeSearchIdx = -1;
        return;
      }
      globalPokeSearchIdx = 0;
      box.innerHTML = hits.map((p, i) =>
        '<div class="global-poke-hit' + (i === 0 ? ' active' : '') + '" data-dex="' + p.dex + '" onmousedown="event.preventDefault();useGlobalPoke(' + p.dex + ');closeGlobalPokeSearch()">' +
          '<div class="hit-spr" style="' + spriteStyle(p.dex, 32) + '"></div>' +
          '<div><div>' + p.name + '</div><div class="hit-meta">#' + p.dex + ' · ' + (p.types || []).join('/') +
          ' · PA ' + (p.pa != null ? (+p.pa).toFixed(2) : '—') + ' · SA ' + (p.sa != null ? (+p.sa).toFixed(2) : '—') + '</div></div></div>'
      ).join('');
      box.style.display = 'block';
    }
    function closeGlobalPokeSearch() {
      const box = document.getElementById('globalPokeResults');
      const inp = document.getElementById('globalPokeSearch');
      if (box) { box.style.display = 'none'; box.innerHTML = ''; }
      if (inp) inp.value = '';
      globalPokeSearchIdx = -1;
    }
    function onGlobalPokeSearchKey(ev) {
      const box = document.getElementById('globalPokeResults');
      if (!box || box.style.display === 'none') {
        if (ev.key === 'Escape') closeGlobalPokeSearch();
        return;
      }
      const hits = [...box.querySelectorAll('.global-poke-hit[data-dex]')];
      if (!hits.length) return;
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        globalPokeSearchIdx = Math.min(hits.length - 1, globalPokeSearchIdx + 1);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        globalPokeSearchIdx = Math.max(0, globalPokeSearchIdx - 1);
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        const el = hits[Math.max(0, globalPokeSearchIdx)];
        if (el) { useGlobalPoke(+el.dataset.dex); closeGlobalPokeSearch(); }
        return;
      } else if (ev.key === 'Escape') {
        closeGlobalPokeSearch();
        return;
      } else return;
      hits.forEach((el, i) => el.classList.toggle('active', i === globalPokeSearchIdx));
      hits[globalPokeSearchIdx].scrollIntoView({ block: 'nearest' });
    }









    function isAtkBuffMove(def) {
      if (!def || def.kind !== 'buff') return false;
      const st = def.stat;
      return st === 'patk' || st === 'satk' || st === 'atk';
    }

    function buffSideOf(defOrBuff) {
      if (!defOrBuff) return null;
      const st = defOrBuff.stat;
      if (st === 'satk') return 'special';
      if (st === 'patk' || st === 'atk') return 'physical';
      return defOrBuff.side || null;
    }

    function moveIsSpecial(m) {
      if (!m) return false;
      if (m.cat === 'special') return true;
      if (m.cat === 'physical') return false;
      const def = RAW.find(x => x.id === m.id);
      const cat = (def && def.cat) || (def && moveCat(def)) || m.cat;
      return cat === 'special';
    }

    function buffFromDef(def) {
      if (!isAtkBuffMove(def)) return null;
      return {
        id: def.id,
        pre: enName(def.name, def.id),
        amount: +def.amount || 0,
        stacks: def.stacks || 5,
        cd: +def.cd || 1,
        dur: +def.dur || 7,
        stat: def.stat,
        side: buffSideOf(def),
        type: def.type
      };
    }

    /** All learnable physical/special ATK buffs for a type pool. */
    function listAtkBuffs(types, mon) {
      const pool = poolForTypes(types, mon);
      const out = [];
      const seen = new Set();
      for (const def of pool) {
        if (!isAtkBuffMove(def) || seen.has(def.id)) continue;
        seen.add(def.id);
        const b = buffFromDef(def);
        if (b) out.push(b);
      }
      return out;
    }

    /** @deprecated single-pick — prefer listAtkBuffs + scoring */


    /** Steady-state uptime when buff is on a side slot: primary / (primary + buff refresh). */

    /**
     * Apply ATK buff only to matching side (patk→physical, satk→special).
     * placement: 'bond' always up; 'slot' uses refresh uptime.
     */




    // ---------- Calculator (4×4 grid) ----------


    /**
     * Size compare: sprites scaled by Idle frame size (proportional), circles every 10 units.
     * Game: bodyRadius = clamp(Idle.w * 0.22, 5, 26) * 2 (PX).
     * We map 1 game unit → SCALE screen px so r=50 fits in the stage.
     */








    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortKey === key) sortDir *= -1;
        else {
          sortKey = key;
          sortDir = ['name','type','kind'].includes(key) ? 1 : -1;
        }
        renderDps();
      });
    });

    document.querySelectorAll('.poke-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.pokeSort;
        if (pokeSortKey === key) pokeSortDir *= -1;
        else {
          pokeSortKey = key;
          pokeSortDir = (key === 'name' || key === 'dex') ? 1 : -1;
        }
        renderPokedex();
      });
    });




    try { syncAppVersion(); } catch (e) {}
    try { updateNatureBtnLabel(); } catch (e) {}
    try {
      const ba = document.getElementById('bestAbilityOnly');
      if (ba) ba.checked = !!bestAbilityOnly;
    } catch (e) {}
    try { applyPokeColVisibility(); } catch (e) {}
    fetchAll();
