/* Best combos model: rank type combos (or the selected Pokémon) by the best
 * 4-slot bonded loadout. Shares the DPS tab's Single/Mobbing settings.
 */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Combos = (function () {
  const U = PSC.Utils;
  let cache = { sig: '', list: [] };

  function mon() {
    const dex = PSC.Store.state.selectedDex;
    return dex == null ? null : PSC.Data.findDex(dex);
  }

  function cfg() {
    const m = mon();
    const d = PSC.Store.state.dps;
    return Object.assign({}, PSC.Store.config(), {
      atk: m ? Math.max(m.pa != null ? m.pa : m.atk || 1, m.sa != null ? m.sa : m.atk || 1) : 1,
      mon: m,
      selfR: m ? m.hit : 12,
      mobbing: d.mobbing,
      projHitPct: d.projHitPct,
      avgEnemyR: d.avgEnemyR,
      useAvgType: d.useAvgType,
      usePoison: d.usePoison
    });
  }

  function signature() {
    const c = cfg();
    return [
      PSC.Data.counts.rows, PSC.Store.state.selectedDex,
      c.mobbing, c.projHitPct, c.avgEnemyR, c.useAvgType, c.usePoison,
      c.bondSize, PSC.Store.state.combos.preferSwitch,
      c.typeMult, c.weatherMult, c.useWeatherAvg, c.coneHitCap, c.trailTick,
      c.refEnemyHp, c.refPlayerLvl
    ].join('|');
  }

  /** All damaging + buff moves learnable by a mon, or matching a type set. */
  function poolForTypes(types, m) {
    const d = PSC.Data.state;
    const set = new Set(['normal', ...(types || [])]);
    let defs;
    if (m) {
      const ids = new Set();
      for (const r of PSC.Data.rowsForDex(m.dex)) for (const id of r.moveIds || []) ids.add(id);
      for (const id of d.tmOf(m.dex) || []) ids.add(id);
      defs = [...ids].map(id => d.movesById[id]).filter(Boolean);
    } else {
      defs = d.moves.slice();
    }
    return defs.filter(def => {
      if (!def || !set.has(def.type)) return false;
      if (def.kind === 'buff') return true;
      return def.dmg != null;
    });
  }

  function sideAtk(def, m) {
    if (!m) return 1;
    const atk = m.atk || 1;
    if (def.cat === 'special') return m.sa != null ? m.sa : atk;
    return m.pa != null ? m.pa : atk;
  }

  function bestDamageMoves(types, c) {
    const m = c.mon;
    const out = [];
    for (const def of poolForTypes(types, m)) {
      if (def.kind === 'buff' || def.dmg == null) continue;
      if (!def.cat) def.cat = 'special';
      const b = dpsFor(def, false, c);
      let best = b;
      if (PSC.Data.state.evo[def.id] && PSC.Data.state.evoMods[def.kind]) {
        const e = dpsFor(def, true, c);
        if (e.dps > best.dps) best = e;
      }
      out.push({
        id: def.id,
        name: PSC.Data.moveName(def),
        type: def.type,
        cat: def.cat,
        dps: Math.round(best.dps),
        evolved: best.evolved,
        tier: best.evolved ? 'Evo' : 'Lv5'
      });
    }
    return out.sort((a, b) => b.dps - a.dps);
  }

  function dpsFor(def, evolved, c) {
    const inst = PSC.Calc.instance(def, 5, evolved);
    const b = PSC.Calc.dpsBreakdown(inst, Object.assign({}, c, { atk: sideAtk(def, c.mon) }));
    return { dps: b.dps, evolved, breakdown: b };
  }

  function isAtkBuff(def) {
    return def && def.kind === 'buff' && ['atk', 'patk', 'satk'].includes(def.stat);
  }

  function buffOf(def) {
    return {
      id: def.id,
      name: PSC.Data.moveName(def),
      amount: +def.amount || 0,
      stacks: def.stacks || 5,
      cd: +def.cd || 1,
      dur: +def.dur || 7,
      stat: def.stat,
      type: def.type,
      side: def.stat === 'satk' ? 'special' : (def.stat === 'patk' || def.stat === 'atk' ? 'physical' : null)
    };
  }

  function listAtkBuffs(types, c) {
    const out = [];
    const seen = new Set();
    for (const def of poolForTypes(types, c.mon)) {
      if (!isAtkBuff(def) || seen.has(def.id)) continue;
      seen.add(def.id);
      out.push(buffOf(def));
    }
    return out.sort((a, b) => (b.amount * b.stacks) - (a.amount * a.stacks));
  }

  /** Steady-state loadout score with optional ATK buff placement. */
  function scoreLoadout(mainMoves, buff, placement) {
    const base = mainMoves.reduce((a, m) => a + m.dps, 0);
    const steps = [];
    steps.push('Main damage: ' + (mainMoves.map(m => m.name + '(' + m.tier + ')=' + m.dps).join(' + ') || '0'));
    steps.push('Base sum = ' + base);
    let mult = 1, uptime = 1;
    if (buff && placement === 'bond') {
      const peak = buff.amount * buff.stacks;
      mult = 1 + peak;
      steps.push(buff.name + ' in active slot → max ' + buff.stacks + ' × ' + Math.round(buff.amount * 100) + '% = +' + Math.round(peak * 100) + '%');
      steps.push('ATK mult = ×' + mult.toFixed(2) + ' (always up)');
    } else if (buff && placement === 'slot') {
      const peak = buff.amount * buff.stacks;
      mult = 1 + peak;
      uptime = buff.dur / (buff.dur + buff.cd);
      steps.push(buff.name + ' in side slot → peak +' + Math.round(peak * 100) + '%');
      steps.push('uptime = ' + buff.dur + '/(' + buff.dur + '+' + buff.cd + ') = ' + (uptime * 100).toFixed(1) + '%');
    } else {
      steps.push('No ATK buff');
    }
    const effective = Math.round(base * mult * uptime);
    steps.push('Effective DPS = ' + base + ' × ' + mult.toFixed(2) + ' × ' + uptime.toFixed(3) + ' = ' + effective);
    return { best: effective, mainMoves, buff, buffPlacement: placement, mult, uptime, steps, base };
  }

  function bestDpsForTypes(types, c) {
    const damage = bestDamageMoves(types, c);
    const bondN = Math.min(c.bondSize || 4, 4, Math.max(1, damage.length));
    const buffs = listAtkBuffs(types, c);
    const preferSwitch = !!PSC.Store.state.combos.preferSwitch;
    const candidates = [scoreLoadout(damage.slice(0, bondN), null, null)];
    for (const buff of buffs) {
      const dmgN = Math.max(1, bondN - 1);
      candidates.push(scoreLoadout(damage.slice(0, dmgN), buff, 'bond'));
      if (preferSwitch) candidates.push(scoreLoadout(damage.slice(0, bondN), buff, 'slot'));
    }
    candidates.sort((a, b) => b.best - a.best);
    return candidates[0];
  }

  function compute() {
    const c = cfg();
    const m = mon();
    const ranked = [];
    if (m) {
      const types = [...new Set(m.types || [])].sort();
      ranked.push(Object.assign({
        key: types.join('+'),
        types,
        count: 1,
        examples: [m.name],
        monName: m.name,
        monDex: m.dex
      }, bestDpsForTypes(types, c)));
    } else {
      const groups = new Map();
      for (const p of PSC.Data.state.dex) {
        const types = [...new Set(p.types || [])].sort();
        const key = types.join('+');
        if (!groups.has(key)) groups.set(key, { types, count: 0, examples: [] });
        const g = groups.get(key);
        g.count++;
        if (g.examples.length < 3) g.examples.push(p.name);
      }
      for (const [key, info] of groups) {
        ranked.push(Object.assign({ key }, info, bestDpsForTypes(info.types, c)));
      }
      ranked.sort((a, b) => b.best - a.best);
    }
    return ranked.slice(0, 40);
  }

  function results(force) {
    const sig = signature();
    if (!force && cache.sig === sig) return cache.list;
    cache = { sig, list: compute() };
    return cache.list;
  }

  function invalidate() { cache.sig = ''; }

  return { signature, results, invalidate, cfg, mon, poolForTypes, bestDamageMoves, listAtkBuffs, bestDpsForTypes };
})();
