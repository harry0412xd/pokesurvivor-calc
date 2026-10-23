/* DPS tab model. */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Dps = (function () {
  const U = PSC.Utils;
  let cache = { sig: '', rows: [], buffs: [] };

  function mon() {
    const dex = PSC.Store.state.selectedDex;
    return dex == null ? null : PSC.Data.findDex(dex);
  }

  function cfg(lvl) {
    const d = PSC.Store.state;
    const m = mon();
    return Object.assign({}, PSC.Store.config(), {
      atk: m ? Math.max(m.pa != null ? m.pa : m.atk || 1, m.sa != null ? m.sa : m.atk || 1) : 1,
      mon: m,
      useAvgType: d.dps.useAvgType,
      usePoison: d.dps.usePoison,
      mobbing: d.dps.mobbing,
      projHitPct: d.dps.projHitPct,
      avgEnemyR: d.dps.avgEnemyR,
      selfR: m ? m.hit : 12
    });
  }

  function signature() {
    const d = PSC.Store.state;
    return [
      PSC.Data.counts.rows, d.selectedDex,
      d.dps.mobbing, d.dps.projHitPct, d.dps.avgEnemyR, d.dps.useAvgType, d.dps.usePoison,
      d.config.typeMult, d.config.weatherMult, d.config.useWeatherAvg,
      d.config.coneHitCap, d.config.trailTick, d.config.refEnemyHp, d.config.refPlayerLvl
    ].join('|');
  }

  function build() {
    const sig = signature();
    if (cache.sig === sig) return cache;
    const d = PSC.Data.state;
    const m = mon();
    const c = cfg();
    const rows = [];
    const buffs = [];

    for (const def of d.moves) {
      if (def.kind === 'buff') {
        buffs.push(def);
        continue;
      }
      if (def.dmg == null) continue;
      const cat = def.cat || 'special';
      const sideAtk = m ? (cat === 'special' ? (m.sa != null ? m.sa : m.atk) : (m.pa != null ? m.pa : m.atk)) : 1;
      const rowCfg = Object.assign({}, c, { atk: sideAtk || 1, mon: m });
      const levels = [];
      for (let lvl = 1; lvl <= 5; lvl++) {
        levels.push(PSC.Calc.dpsBreakdown(PSC.Calc.instance(def, lvl, false), rowCfg));
      }
      let evo = null, evoName = null;
      if (d.evo[def.id] && d.evoMods[def.kind]) {
        const evoB = PSC.Calc.dpsBreakdown(PSC.Calc.instance(def, 5, true), rowCfg);
        evo = Math.round(evoB.dps);
        evoName = d.evo[def.id][0];
      }
      const cov = d.avgTypeMult[def.type] != null ? d.avgTypeMult[def.type] : 1;
      const wx = WEATHER_AVG_MULT[def.type] != null ? WEATHER_AVG_MULT[def.type] : 1;
      rows.push({
        id: def.id,
        name: PSC.Data.moveName(def),
        type: def.type,
        kind: def.kind,
        cat,
        atkM: sideAtk,
        covM: cov,
        wxM: wx,
        mult: +(sideAtk * cov * wx).toFixed(4),
        lv1: Math.round(levels[0].dps),
        lv2: Math.round(levels[1].dps),
        lv3: Math.round(levels[2].dps),
        lv4: Math.round(levels[3].dps),
        lv5: Math.round(levels[4].dps),
        levels,
        evo,
        evoName,
        def,
        usable: !m || !def.type || def.type === 'normal' || (m.types || []).includes(def.type)
      });
    }
    cache = { sig, rows, buffs };
    return cache;
  }

  function filtered() {
    const d = PSC.Store.state.dps;
    const q = d.search.trim().toLowerCase();
    const selected = mon();
    let list = build().rows.filter(r => {
      if (d.types.size && !d.types.has(r.type)) return false;
      if (d.kinds.size && !d.kinds.has(r.kind)) return false;
      if (d.cat && r.cat !== d.cat) return false;
      if (d.hideUnusable && selected && !r.usable) return false;
      if (q && !(U.matchSearch(r.name, q) || U.matchSearch(r.id, q) || U.matchSearch(r.evoName || '', q))) return false;
      return true;
    });
    const key = d.sortKey, dir = d.sortDir;
    list.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === 'evo') { av = av == null ? -1 : av; bv = bv == null ? -1 : bv; }
      if (typeof av === 'string') return dir * av.localeCompare(String(bv == null ? '' : bv));
      return dir * ((av || 0) - (bv || 0));
    });
    return list;
  }

  function levelBreakdown(row, lvl) {
    return row.levels[lvl - 1] || null;
  }

  function multBreakdown(row) {
    return {
      atk: row.atkM,
      type: row.covM,
      weather: row.wxM,
      total: row.mult
    };
  }

  function evoBreakdown(row) {
    const d = PSC.Data.state;
    const m = mon();
    if (!row.evo || !d.evo[row.id]) return null;
    const def = d.movesById[row.id];
    const inst = PSC.Calc.instance(def, 5, true);
    return PSC.Calc.dpsBreakdown(inst, cfg());
  }

  function buffInfo(def, lvl) {
    const inst = PSC.Calc.instance(def, lvl, false);
    const stat = inst.stat || def.stat;
    const label = stat === 'regen' ? 'regen' : String(stat || 'stat').toUpperCase();
    const amount = inst.amount != null ? inst.amount : def.amount;
    const stacks = inst.stacks != null ? inst.stacks : def.stacks;
    const dur = inst.dur != null ? inst.dur : def.dur;
    const cd = inst.cd != null ? inst.cd : def.cd;
    if (lvl === 1) {
      const bits = [];
      if (amount != null && stat) bits.push(stat === 'regen' ? '+' + U.fmt(amount, 1) + ' ' + label + '/stack' : '+' + Math.round(amount * 100) + '% ' + label + '/stack');
      if (stacks != null) bits.push('max ' + stacks + ' stacks');
      if (dur != null) bits.push(dur + 's duration');
      if (cd != null) bits.push(cd + 's CD');
      return bits.join(' · ') || 'buff';
    }
    const ups = def.ups || [];
    const mod = ups[lvl - 2] && ups[lvl - 2].m;
    if (!mod) return '—';
    return Object.keys(mod).map(k => {
      const v = mod[k];
      if (k === 'amount') return stat === 'regen' ? 'stack strength +' + U.fmt(v, 2) : 'stack strength ' + (v > 0 && v < 1 ? '+' + Math.round(v * 100) + '%' : '×' + v);
      if (k === 'stacks') return 'max stacks ' + v;
      if (k === 'dur') return 'duration ' + (v > 0 && v < 5 ? '+' + v + 's' : '×' + v);
      if (k === 'cd') return 'CD ' + (v < 1 ? '×' + v : v + 's');
      return k + ' ' + v;
    }).join(' · ');
  }

  function buffMax(def) {
    const inst = PSC.Calc.instance(def, 5, false);
    const stat = inst.stat || def.stat;
    const label = String(stat || 'stat').toUpperCase();
    const amount = inst.amount || 0;
    const stacks = inst.stacks || 1;
    const total = amount * stacks;
    const bits = [];
    if (stat === 'regen') bits.push('+' + U.fmt(total, 1) + ' ' + label + ' at full stacks');
    else if (stat) bits.push('+' + Math.round(total * 100) + '% ' + label + ' at full stacks (' + stacks + '×' + Math.round(amount * 100) + '%)');
    if (inst.dur != null) bits.push(inst.dur + 's duration');
    if (inst.cd != null) bits.push(inst.cd + 's CD');
    return bits.join(' · ') || 'Lv5';
  }

  function invalidate() { cache.sig = ''; }

  return {
    mon,
    cfg,
    build,
    filtered,
    levelBreakdown,
    multBreakdown,
    evoBreakdown,
    buffInfo,
    buffMax,
    invalidate,
    get buffs() { return build().buffs; }
  };
})();
