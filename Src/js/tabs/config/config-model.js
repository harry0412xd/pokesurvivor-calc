/* Config tab model. */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Config = (function () {
  const FIELDS = [
    { key: 'typeMult', id: 'typeMult', kind: 'number', min: 0.3, max: 2.4, step: 0.1 },
    { key: 'weatherMult', id: 'weatherMult', kind: 'number', min: 0.5, max: 1.5, step: 0.1 },
    { key: 'useWeatherAvg', id: 'useWeatherAvg', kind: 'bool' },
    { key: 'coneHitCap', id: 'coneHitCap', kind: 'int', min: 1, max: 20 },
    { key: 'trailTick', id: 'trailTick', kind: 'number', min: 0.1, max: 2, step: 0.05 },
    { key: 'refEnemyHp', id: 'refEnemyHp', kind: 'number', min: 10, max: 5000, step: 10 },
    { key: 'refPlayerLvl', id: 'refPlayerLvl', kind: 'int', min: 1, max: 100 }
  ];

  function values() { return PSC.Store.state.config; }

  function set(key, value) {
    PSC.Store.set('config.' + key, value);
  }

  function invalidateAll() {
    if (PSC.Models.Dps) PSC.Models.Dps.invalidate();
    if (PSC.Models.Pokedex) PSC.Models.Pokedex.invalidate();
    if (PSC.Models.Combos) PSC.Models.Combos.invalidate();
  }

  function recalc() {
    invalidateAll();
    PSC.Store.emit('config');
  }

  return { FIELDS, values, set, invalidateAll, recalc };
})();
