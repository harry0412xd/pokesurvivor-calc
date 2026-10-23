/* Multipliers tab model: type-chart matrix, spawn weights and hitbox summary. */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Multipliers = (function () {
  const U = PSC.Utils;

  function selectedTypes() {
    const sel = PSC.Store.state.multipliers.weakTypes;
    const types = sel && sel.size ? [...sel].sort() : ['normal'];
    return types;
  }

  function enemyWeights() {
    return PSC.Data.state.enemyWeights || [];
  }

  function weakMatrix() {
    const yourTypes = selectedTypes();
    const rows = enemyWeights().map(e => {
      const mults = yourTypes.map(t => PSC.TypeChart.multiplier(t, e.types));
      const atkTypes = e.types && e.types.length ? e.types : ['normal'];
      const defM = atkTypes.reduce((a, t) => a + PSC.TypeChart.multiplier(t, yourTypes), 0) / atkTypes.length;
      return {
        key: e.key,
        types: e.types,
        pct: e.pct,
        examples: e.examples || [],
        mults,
        best: Math.max(...mults),
        avg: mults.reduce((a, b) => a + b, 0) / mults.length,
        defM
      };
    });
    const tot = rows.reduce((a, e) => a + e.pct, 0) || 100;
    const avgCells = yourTypes.map(t => {
      let sum = 0;
      for (const e of rows) sum += (e.pct / tot) * PSC.TypeChart.multiplier(t, e.types);
      return sum;
    });
    let avgBest = 0, avgSplit = 0, avgDef = 0;
    for (const e of rows) {
      avgBest += (e.pct / tot) * e.best;
      avgSplit += (e.pct / tot) * e.avg;
      avgDef += (e.pct / tot) * e.defM;
    }
    return { yourTypes, rows, multi: yourTypes.length >= 2, avgCells, avgBest, avgSplit, avgDef, total: tot };
  }

  function coverage(types) {
    return PSC.TypeChart.coverageScore(types, enemyWeights());
  }

  function bestOf(types) {
    const list = enemyWeights();
    const tot = list.reduce((a, e) => a + e.pct, 0) || 100;
    let sum = 0;
    for (const e of list) {
      const mults = types.map(t => PSC.TypeChart.multiplier(t, e.types));
      sum += (e.pct / tot) * Math.max(...mults);
    }
    return sum;
  }

  function offenseTypes() {
    return TYPE_LIST.map(t => {
      const typeM = PSC.Data.state.avgTypeMult[t] != null ? PSC.Data.state.avgTypeMult[t] : 1;
      const wxM = WEATHER_AVG_MULT[t] != null ? WEATHER_AVG_MULT[t] : 1;
      return { type: t, typeM, wxM, comb: typeM * wxM };
    }).sort((a, b) => b.comb - a.comb);
  }

  function defenseTypes() {
    const weights = enemyWeights();
    const wxDef = PSC.TypeChart.defenseWeatherScore(weights);
    return TYPE_LIST.map(t => {
      const typeDef = PSC.TypeChart.defenseTypeScore([t], weights);
      return { type: t, typeDef, wxDef, comb: typeDef * wxDef };
    }).sort((a, b) => a.comb - b.comb);
  }

  function hitboxSummary() {
    const prefs = PSC.Store.prefs();
    const dex = PSC.Data.state.dex;
    if (!dex.length) return null;
    const med = PSC.Calc.medianHitRadius(prefs);
    const rs = dex.map(p => p.hit).filter(r => r > 0).sort((a, b) => a - b);
    return {
      med,
      min: rs[0] || 0,
      max: rs[rs.length - 1] || 0,
      count: rs.length,
      medianMode: prefs.medianMode,
      curve: prefs.curve
    };
  }

  return { selectedTypes, enemyWeights, weakMatrix, coverage, bestOf, offenseTypes, defenseTypes, hitboxSummary };
})();
