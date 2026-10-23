/* Type chart + spawn-weighted enemy distribution. */
window.PSC = window.PSC || {};

PSC.TypeChart = (function () {
  const RUN_END_SEC = 1800;
  const U = PSC.Utils;

  function softValue(raw) {
    if (raw == null || raw === 1) return 1;
    return SOFT[raw] != null ? SOFT[raw] : raw;
  }

  /** Final game type multiplier (already soft, clamped). */
  function multiplier(atkType, defTypes) {
    const row = RAW_CHART[atkType];
    if (!row || !defTypes || !defTypes.length) return 1;
    let m = 1;
    for (const t of defTypes) {
      if (row[t] != null) m *= softValue(row[t]);
    }
    return U.clamp(m, 0.3, 2.4);
  }

  /** Step-by-step type multiplier, for matrices and tooltips. */
  function steps(atkType, defTypes) {
    const row = RAW_CHART[atkType] || {};
    const parts = [];
    let m = 1;
    for (const t of defTypes || []) {
      const raw = row[t] != null ? row[t] : 1;
      const soft = softValue(raw);
      if (soft !== 1) parts.push({ defType: t, raw, soft });
      m *= soft;
    }
    return { atkType, defTypes: defTypes || [], parts, beforeClamp: m, value: U.clamp(m, 0.3, 2.4) };
  }

  function spawnRate(t, ctx) {
    if (ctx && typeof ctx.spawnRateFn === 'function') {
      try {
        const v = +ctx.spawnRateFn(t);
        if (Number.isFinite(v) && v > 0) return v;
      } catch (e) { /* fall through */ }
    }
    const density = (ctx && ctx.spawnDensity) || 0.24;
    return (1.6 + t * 0.028 + Math.pow(t / 60, 1.6) * 0.5) * density;
  }

  function tierSpawnWeight(tier, ctx) {
    const step = 2;
    const t0 = +tier.from || 0;
    const t1 = tier.to != null ? +tier.to : RUN_END_SEC;
    let w = 0;
    for (let t = t0; t < t1; t += step) w += spawnRate(t, ctx) * step;
    return w;
  }

  function tierPool(dex, tier) {
    return dex.filter(p => (p.rarity == null || p.rarity < 5) && !p.leg &&
      p.bst >= tier.bst[0] && p.bst <= tier.bst[1]);
  }

  /** Distinct enemy type combos weighted by spawn intensity and tier pool size. */
  function buildEnemyWeights(dex, tiers, ctx) {
    const comboW = new Map();
    for (const tier of (tiers && tiers.length ? tiers : DEFAULT_TIERS_BST)) {
      const tw = tierSpawnWeight(tier, ctx);
      const cands = tierPool(dex, tier);
      if (!cands.length) continue;
      const per = tw / cands.length;
      for (const p of cands) {
        const types = U.sortedTypes(p.types);
        const key = types.join('+');
        if (!comboW.has(key)) comboW.set(key, { types, weight: 0, examples: new Set(), dexes: [] });
        const e = comboW.get(key);
        e.weight += per;
        if (e.examples.size < 4) e.examples.add(p.name);
        e.dexes.push(p.dex);
      }
    }
    const total = [...comboW.values()].reduce((a, x) => a + x.weight, 0) || 1;
    return [...comboW.values()]
      .map(x => ({
        key: x.types.join('+'),
        types: x.types,
        weight: x.weight,
        pct: (x.weight / total) * 100,
        examples: [...x.examples],
        dexes: [...new Set(x.dexes)]
      }))
      .sort((a, b) => b.pct - a.pct);
  }

  /** Per-species enemy attack profile: type + physical/special side. */
  function buildEnemyAttackProfile(dex, tiers, ctx) {
    const rows = [];
    for (const tier of (tiers && tiers.length ? tiers : DEFAULT_TIERS_BST)) {
      const tw = tierSpawnWeight(tier, ctx);
      const cands = tierPool(dex, tier);
      if (!cands.length) continue;
      const per = tw / cands.length;
      for (const mon of cands) {
        const cat = (mon.sa != null && mon.pa != null && mon.sa > mon.pa) ? 'special' : 'physical';
        const atkType = (mon.types && mon.types[0]) || 'normal';
        rows.push({ weight: per, atkType, cat, name: mon.name, dex: mon.dex, types: mon.types });
      }
    }
    let phy = 0, spe = 0;
    for (const e of rows) {
      if (e.cat === 'special') spe += e.weight;
      else phy += e.weight;
    }
    const total = phy + spe || 1;

    // Collapse the per-species profile into (attack type, category) buckets.
    // DR only depends on these two fields, and this keeps row metrics cheap.
    const groupMap = new Map();
    for (const e of rows) {
      const key = e.atkType + '|' + e.cat;
      if (!groupMap.has(key)) groupMap.set(key, { atkType: e.atkType, cat: e.cat, weight: 0, pct: 0 });
      groupMap.get(key).weight += e.weight;
    }
    const groups = [...groupMap.values()]
      .map(g => Object.assign(g, { pct: (g.weight / total) * 100 }))
      .sort((a, b) => b.pct - a.pct);

    return { rows, groups, phyWeight: phy / total, speWeight: spe / total };
  }

  /** AVG_TYPE_MULT: spawn-weighted type multiplier for every attack type. */
  function buildAvgTypeMultipliers(enemyWeights) {
    const out = {};
    const totalPct = enemyWeights.reduce((a, e) => a + e.pct, 0) || 100;
    for (const at of TYPE_LIST) {
      let sum = 0;
      for (const e of enemyWeights) sum += (e.pct / totalPct) * multiplier(at, e.types);
      out[at] = sum;
    }
    return out;
  }

  /** Equal-split spawn-weighted coverage of a set of attack types. */
  function coverageScore(attackTypes, enemyWeights) {
    if (!attackTypes || !attackTypes.length || !enemyWeights || !enemyWeights.length) return 1;
    const total = enemyWeights.reduce((a, e) => a + e.pct, 0) || 100;
    let sum = 0;
    for (const e of enemyWeights) {
      const mults = attackTypes.map(t => multiplier(t, e.types));
      sum += (e.pct / total) * (mults.reduce((a, b) => a + b, 0) / mults.length);
    }
    return sum;
  }

  /** Spawn-weighted incoming type multiplier if the defender has defTypes. */
  function defenseTypeScore(defTypes, enemyWeights) {
    if (!defTypes || !defTypes.length || !enemyWeights || !enemyWeights.length) return 1;
    let sum = 0, wsum = 0;
    for (const e of enemyWeights) {
      const atkTypes = e.types && e.types.length ? e.types : ['normal'];
      const m = atkTypes.reduce((a, t) => a + multiplier(t, defTypes), 0) / atkTypes.length;
      sum += e.pct * m;
      wsum += e.pct;
    }
    return wsum ? sum / wsum : 1;
  }

  function offenseWeatherScore(types) {
    if (!types || !types.length) return 1;
    let s = 0, n = 0;
    for (const t of types) {
      if (WEATHER_AVG_MULT[t] != null) { s += WEATHER_AVG_MULT[t]; n++; }
    }
    return n ? s / n : 1;
  }

  function defenseWeatherScore(enemyWeights) {
    if (!enemyWeights || !enemyWeights.length) return 1;
    let sum = 0, wsum = 0;
    for (const e of enemyWeights) {
      const atkTypes = e.types && e.types.length ? e.types : ['normal'];
      const m = atkTypes.reduce((a, t) => a + (WEATHER_AVG_MULT[t] != null ? WEATHER_AVG_MULT[t] : 1), 0) / atkTypes.length;
      sum += e.pct * m;
      wsum += e.pct;
    }
    return wsum ? sum / wsum : 1;
  }

  return {
    RUN_END_SEC,
    multiplier,
    steps,
    spawnRate,
    tierSpawnWeight,
    buildEnemyWeights,
    buildEnemyAttackProfile,
    buildAvgTypeMultipliers,
    coverageScore,
    defenseTypeScore,
    offenseWeatherScore,
    defenseWeatherScore
  };
})();
