/* Pokédex tab model: filtering, sorting, pagination, ranks, radar stats. */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Pokedex = (function () {
  const U = PSC.Utils;
  let sortedCache = { sig: '', list: [] };

  function prefs() { return PSC.Store.prefs(); }

  function ensureAll() {
    const rows = PSC.Data.state.rows;
    if (!rows.length) return { medOff: 1, medEhp: 1, medSpd: 1 };
    const meds = PSC.Calc.ensureMetrics(rows, prefs());
    PSC.Store.state.pokedex.meds = meds;
    return meds;
  }

  function sig() {
    const p = PSC.Store.state.pokedex;
    return [
      PSC.Data.counts.rows,
      PSC.Calc.prefsSignature(prefs()),
      p.search, p.gen, p.variant, p.bestAbility,
      [...p.typeSel].sort().join(','),
      [...p.abilitySel].sort().join(','),
      [...p.variantSel].sort().join(','),
      p.sortKey, p.sortDir
    ].join('|');
  }

  function matches(row, p) {
    if (p.gen && String(row.gen) !== p.gen) return false;
    if (p.typeSel.size) {
      for (const t of p.typeSel) if (!(row.types || []).includes(t)) return false;
    }
    if (p.abilitySel.size && !p.abilitySel.has(row.abilityId || '')) return false;
    if (p.variantSel.size && !p.variantSel.has(row.variantType)) return false;
    if (p.variant === 'tm' && row.variantSource !== 'tm') return false;
    if (p.variant === 'natural' && row.variantSource !== 'natural') return false;
    if (p.search) {
      const q = p.search;
      const ok = U.matchSearch(row.name, q) || U.matchSearch(String(row.dex), q) ||
        U.matchSearch(row.abilityName || '', q) || U.matchSearch(row.abilityId || '', q) ||
        U.matchSearch(row.variantType, q) || (row.types || []).some(t => U.matchSearch(t, q));
      if (!ok) return false;
    }
    return true;
  }

  function sortValue(row, key) {
    const m = row._m || {};
    switch (key) {
      case 'name': return row.name;
      case 'types': return (row.types || []).join('+');
      case 'ability': return row.abilityName || '';
      case 'variant': return row.variantType || '';
      case 'hitbox': return m.hitMulti || 0;
      case 'dodge': return (m.dodge && m.dodge.factor) || 1;
      case 'dr': return (m.dr && m.dr.dr) || 1;
      case 'ehp': return m.ehp || 0;
      case 'offense': return m.offense || 0;
      case 'score': return m.score || 0;
      case 'hit': return row.hit || 0;
      default: return row[key] != null ? row[key] : 0;
    }
  }

  function list() {
    if (!PSC.Data.loaded) return [];
    const s = sig();
    if (sortedCache.sig === s) return sortedCache.list;
    ensureAll();
    const p = PSC.Store.state.pokedex;
    let list = PSC.Data.state.rows.filter(r => matches(r, p));

    if (p.bestAbility && list.length) {
      const byDex = new Map();
      for (const r of list) {
        const score = r._m ? r._m.score : 0;
        const g = byDex.get(r.dex);
        if (!g || score > g.best + 1e-12) byDex.set(r.dex, { best: score, rows: [r] });
        else if (Math.abs(score - g.best) <= 1e-12) g.rows.push(r);
      }
      list = [];
      for (const g of byDex.values()) list.push(...g.rows);
    }

    const key = p.sortKey, dir = p.sortDir;
    list.sort((a, b) => {
      const av = sortValue(a, key), bv = sortValue(b, key);
      let cmp;
      if (typeof av === 'string' || typeof bv === 'string') cmp = String(av).localeCompare(String(bv));
      else cmp = (av || 0) - (bv || 0);
      if (cmp === 0) cmp = a.dex - b.dex || String(a.variantType).localeCompare(String(b.variantType));
      return dir * cmp;
    });
    sortedCache = { sig: s, list };
    return list;
  }

  function page() {
    const all = list();
    const p = PSC.Store.state.pokedex;
    const pages = Math.max(1, Math.ceil(all.length / POKE_PAGE_SIZE));
    const pg = Math.min(Math.max(0, p.page), pages - 1);
    if (pg !== p.page) PSC.Store.state.pokedex.page = pg;
    return {
      all,
      rows: all.slice(pg * POKE_PAGE_SIZE, (pg + 1) * POKE_PAGE_SIZE),
      page: pg,
      pages,
      total: all.length
    };
  }

  function gens() {
    return [...new Set(PSC.Data.state.dex.map(p => p.gen))].filter(x => x != null).sort((a, b) => a - b);
  }

  function abilityOptions() {
    const ids = new Set();
    for (const r of PSC.Data.state.rows) if (r.abilityId) ids.add(r.abilityId);
    return [...ids].sort((a, b) => PSC.Data.abilityName(a).localeCompare(PSC.Data.abilityName(b)));
  }

  function variantTypes() {
    return [...new Set(PSC.Data.state.rows.map(r => r.variantType))].sort();
  }

  function metricsFor(row) {
    PSC.Calc.ensureRow(row, prefs());
    return row._m;
  }

  function selectedRow() {
    const dex = PSC.Store.state.selectedDex;
    if (dex == null) return null;
    const all = list();
    return all.find(r => r.dex === dex) || PSC.Data.state.rows.find(r => r.dex === dex) || null;
  }

  function rowForDex(dex) {
    const all = list();
    return all.find(r => r.dex === dex) || PSC.Data.state.rows.find(r => r.dex === dex) || null;
  }

  function radarStats(row) {
    const m = metricsFor(row);
    return {
      pa: row.pa != null ? +row.pa : row.atk,
      sa: row.sa != null ? +row.sa : row.atk,
      df: row.df != null ? +row.df : 75,
      sd: row.sd != null ? +row.sd : 75,
      hp: row.hp || 0,
      spd: row.spd || 0,
      hit: row.hit || 0,
      bst: row.bst || 0,
      hitbox: m.hitMulti,
      dodge: m.dodge.factor,
      dr: m.dr.dr,
      ehp: m.ehp,
      offense: m.offense,
      score: m.score,
      raw: row
    };
  }

  function radarPool(types) {
    const all = PSC.Data.state.rows;
    if (!types || !types.length) return all;
    return all.filter(r => r.types.some(t => types.includes(t)));
  }

  function invalidate() { sortedCache.sig = ''; }

  return {
    list,
    page,
    gens,
    abilityOptions,
    variantTypes,
    metricsFor,
    selectedRow,
    rowForDex,
    radarStats,
    radarPool,
    ensureAll,
    invalidate
  };
})();
