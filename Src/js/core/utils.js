/* Core helpers shared by models, views and controllers. */
window.PSC = window.PSC || {};

PSC.Utils = (function () {
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function num(v, fallback) {
    const n = +v;
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }
  function fmt(n, digits) {
    if (n == null || !Number.isFinite(+n)) return '—';
    const d = digits == null ? 2 : digits;
    return (+n).toFixed(d).replace(/\.?0+$/, '') || '0';
  }
  function sig4(x) {
    if (x == null || x === '' || !Number.isFinite(+x)) return '—';
    const n = +x;
    if (n === 0) return '0';
    return String(Number(n.toPrecision(4)));
  }
  function pct(n, digits) {
    if (n == null || !Number.isFinite(+n)) return '—';
    return (+n * 100).toFixed(digits == null ? 1 : digits) + '%';
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escTip(s) { return esc(s); }
  function median(values) {
    const arr = (values || []).filter(v => Number.isFinite(+v)).map(Number).sort((a, b) => a - b);
    if (!arr.length) return 1;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }
  function mean(values) {
    const arr = (values || []).filter(v => Number.isFinite(+v));
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }
  /** Strict prefix search; a leading ~ means contains. */
  function matchSearch(text, query) {
    const t = String(text == null ? '' : text).toLowerCase();
    const q = String(query == null ? '' : query).trim().toLowerCase();
    if (!q) return true;
    return q.charAt(0) === '~' ? t.includes(q.slice(1).trim()) : t.startsWith(q);
  }
  function storageGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : raw;
    } catch (e) { return fallback; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* quota */ }
  }
  function storageJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function sizeClass(hit) {
    if (hit < 18) return 'small';
    if (hit < 28) return 'medium';
    return 'big';
  }
  function spriteUrl(dex) {
    return 'https://raw.githubusercontent.com/JPTER78/pokesurvivor/main/assets/pokemon/' + dex + '/Idle.png';
  }
  function spriteStyle(dex, boxPx, spriteMeta) {
    const m = (spriteMeta || {})[dex];
    const a = (m && m.a && m.a.Idle) || {};
    const w = a.w || 32, h = a.h || 32, n = a.n || 3;
    const box = boxPx || 40;
    const scale = box / Math.max(w, h);
    const fw = w * scale, fh = h * scale;
    const bgW = n * w * scale, bgH = 8 * h * scale;
    const ox = (box - fw) / 2, oy = (box - fh) / 2;
    return 'width:' + box + 'px;height:' + box + 'px;' +
      'background-image:url(\'' + spriteUrl(dex) + '\');' +
      'background-size:' + bgW.toFixed(1) + 'px ' + bgH.toFixed(1) + 'px;' +
      'background-position:' + ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px;' +
      'background-repeat:no-repeat;';
  }
  function bodyRadius(dex, spriteMeta) {
    const m = (spriteMeta || {})[dex];
    const w = (m && m.a && m.a.Idle && m.a.Idle.w) ? m.a.Idle.w : 32;
    const base = clamp(w * 0.22, 5, 26);
    return Math.round(base * 2 * 10) / 10;
  }
  function typeBadge(type, extraClass) {
    const c = TYPE_COLORS[type] || '#888';
    return '<span class="type-badge ' + (extraClass || '') + '" style="background:' + c +
      '33;color:' + c + '">' + esc(type) + '</span>';
  }
  function typeStack(types) {
    return '<div class="type-stack">' + (types || []).map(t => typeBadge(t)).join('') + '</div>';
  }
  function relativeLuminance(hex) {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return 0;
    const rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function sortedTypes(types) { return [...new Set(types || [])].sort(); }
  function comboKey(types) { return sortedTypes(types).join('+'); }
  function pctOf(part, whole) { return whole ? (part / whole) * 100 : 0; }
  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }
  return {
    clamp, num, fmt, sig4, pct, esc, escTip, median, mean, matchSearch,
    storageGet, storageSet, storageJSON, storageRemove,
    sizeClass, spriteUrl, spriteStyle, bodyRadius,
    typeBadge, typeStack, relativeLuminance, sortedTypes, comboKey, pctOf, chunk
  };
})();

/* Ability helpers (uses the static ABILITIES dictionary loaded from abilities.js). */
PSC.Abilities = (function () {
  const U = PSC.Utils;

  function idsForDex(dexAbil, dex) {
    const raw = dexAbil[dex] || dexAbil[String(dex)] || [];
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

  function name(abilityNames, id) {
    if (!id) return '—';
    return (abilityNames && abilityNames[id]) || id;
  }

  /** Game fallback for abilities not described by data/ability-fx.js: +8% with the primary type. */
  function genericMods(row) {
    const type = row && row.types && row.types[0];
    return type ? { typeMulti: { [type]: 1.08 }, generic: true } : {};
  }

  function mods(row) {
    const id = row && row.abilityId;
    if (!id) return {};
    if (typeof ABILITIES === 'undefined' || !ABILITIES[id] || typeof ABILITIES[id].fn !== 'function') {
      return genericMods(row);
    }
    try {
      const r = ABILITIES[id].fn(row) || {};
      return (r && typeof r === 'object') ? r : {};
    } catch (e) { return {}; }
  }

  function groupsFor(id) {
    return (PSC.AbilityGroups && PSC.AbilityGroups.classify)
      ? PSC.AbilityGroups.classify(id)
      : { conditions: [], effects: [] };
  }

  function meta(id) {
    const a = (typeof ABILITIES !== 'undefined') ? ABILITIES[id] : null;
    if (!a) {
      return {
        desc: 'Generic primary-type passive (the game has no specific effect for this ability).',
        calcDesc: 'Game fallback: +8% damage with its primary type.',
        implemented: true,
        willNot: false,
        groups: groupsFor(id)
      };
    }
    // Decide from the declared model, not from fn({types: []}): several effects
    // depend on the Pokémon's types and return {} when given an empty stub.
    const calcDesc = String(a.calcDesc || '');
    const wni = calcDesc.indexOf('Will not implement') === 0;
    const utility = calcDesc.indexOf('Utility only') === 0;
    return {
      desc: a.desc || '',
      calcDesc,
      implemented: !!calcDesc && !wni && !utility,
      willNot: wni,
      groups: groupsFor(id)
    };
  }

  function dodge(rowOrId) {
    const isRow = rowOrId && typeof rowOrId === 'object';
    const id = isRow ? rowOrId.abilityId : rowOrId;
    const meta = (id && ABILITY_DODGE[id]) || null;
    if (!id) return { chance: 0, factor: 1, applied: false, conditional: null, note: '', specialOnly: false };

    let m = {};
    try {
      m = isRow ? mods(rowOrId) : (ABILITIES[id] && typeof ABILITIES[id].fn === 'function'
        ? (ABILITIES[id].fn({ types: [], abilityId: id }) || {})
        : {});
    } catch (e) { m = {}; }

    const hasNormal = m.dodge != null && +m.dodge > 0;
    const hasSpecial = m.dodgeSpecial != null && +m.dodgeSpecial > 0;
    const chance = hasNormal ? +m.dodge : (hasSpecial ? +m.dodgeSpecial : 0);
    if (chance > 0 || meta) {
      const applied = chance > 0;
      return {
        chance,
        factor: applied ? 1 / Math.max(0.01, 1 - chance) : 1,
        applied,
        conditional: null,
        note: m.dodgeNote || (meta && meta.note) || '',
        specialOnly: !hasNormal && hasSpecial
      };
    }
    return { chance: 0, factor: 1, applied: false, conditional: null, note: '', specialOnly: false };
  }

  function allIds(dexAbil) {
    const s = new Set();
    if (typeof ABILITIES === 'object') Object.keys(ABILITIES).forEach(id => s.add(id));
    for (const arr of Object.values(dexAbil || {})) {
      for (const a of arr || []) if (a && a !== 0 && a !== '0') s.add(String(a));
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }

  return { idsForDex, name, mods, meta, dodge, allIds };
})();
