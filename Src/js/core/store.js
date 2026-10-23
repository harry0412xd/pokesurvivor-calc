/* Tiny observable store shared by all MVC layers. */
window.PSC = window.PSC || {};

PSC.Store = (function () {
  const U = PSC.Utils;

  const DEFAULT_COLUMNS = [
    'dex', 'name', 'types', 'ability', 'variant',
    'pa', 'sa', 'df', 'sd', 'hp', 'spd', 'hit', 'bst',
    'hitbox', 'dodge', 'dr', 'ehp', 'offense', 'score', 'gen'
  ];
  const DEFAULT_AXES = {
    pa: false, sa: false, df: false, sd: false, hp: true, spd: true, hit: false,
    typeM: false, wxM: false, phyM: true, speM: true, phyDefM: true, speDefM: true,
    dr: false, dodge: true, ehp: false, score: false
  };

  function loadScoring() {
    const saved = U.storageJSON(POKE_SCORING_KEY, null);
    const s = Object.assign({}, DEFAULT_SCORING, saved || {});
    s.weights = Object.assign({}, DEFAULT_SCORING.weights, (saved && saved.weights) || {});
    return s;
  }

  function loadHiddenColumns() {
    const arr = U.storageJSON(POKE_COLS_KEY, null);
    return new Set(Array.isArray(arr) ? arr : []);
  }

  const state = {
    tab: 'dps',
    status: { text: 'Ready. Loading data…', cls: '' },
    progress: { msg: '', frac: 0 },
    data: { loaded: false, sha: '', counts: { moves: 0, dex: 0, rows: 0, abilities: 0, tms: 0 } },
    selectedDex: (() => {
      const n = parseInt(U.storageGet(POKE_SEL_KEY, ''), 10);
      return Number.isFinite(n) ? n : null;
    })(),
    scoring: loadScoring(),
    config: {
      typeMult: 1,
      weatherMult: 1,
      useWeatherAvg: true,
      coneHitCap: 3,
      trailTick: 0.5,
      refEnemyHp: 100,
      refPlayerLvl: 20
    },
    dps: {
      sortKey: 'lv5',
      sortDir: -1,
      search: '',
      cat: '',
      mobbing: false,
      projHitPct: 70,
      avgEnemyR: 12,
      useAvgType: true,
      usePoison: false,
      hideUnusable: true,
      types: new Set(),
      kinds: new Set()
    },
    pokedex: {
      sortKey: 'dex',
      sortDir: 1,
      search: '',
      gen: '',
      variant: 'all',
      bestAbility: false,
      typeSel: new Set(),
      abilitySel: new Set(),
      variantSel: new Set(),
      page: 0
    },
    calculator: {
      slots: [[], [], [], []],
      pick: null
    },
    combos: {
      bondSize: 4,
      preferSwitch: false,
      results: [],
      dirty: true
    },
    multipliers: {
      weakTypes: new Set()
    },
    radar: {
      axes: Object.assign({}, DEFAULT_AXES),
      nature: '',
      showAll: true,
      typeOn: {}
    },
    columns: {
      hidden: loadHiddenColumns()
    }
  };

  let listeners = [];
  let batchDepth = 0;
  let pending = null;

  function emit(reason) {
    if (batchDepth > 0) { pending = reason || pending; return; }
    for (const fn of listeners.slice()) {
      try { fn(state, reason); } catch (e) { console.error('[PSC.Store] listener failed', e); }
    }
  }

  function batch(fn) {
    batchDepth++;
    try { fn(); } finally {
      batchDepth--;
      if (batchDepth === 0 && pending) { const r = pending; pending = null; emit(r); }
    }
  }

  function on(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(x => x !== fn); };
  }

  function get(path) {
    if (!path) return state;
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
  }

  function set(path, value, reason) {
    const parts = path.split('.');
    let o = state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null) o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = value;
    emit(reason || path);
    return value;
  }

  function patch(obj, reason) {
    Object.assign(state, obj);
    emit(reason || 'patch');
  }

  function setTab(tab) {
    state.tab = tab;
    emit('tab');
  }

  function prefs() {
    return {
      weights: state.scoring.weights,
      natureMode: state.scoring.natureMode,
      medianMode: state.scoring.medianMode,
      curve: state.scoring.curve,
      config: state.config
    };
  }

  function config() {
    return Object.assign({}, state.config, {
      useAvgType: state.dps.useAvgType,
      usePoison: state.dps.usePoison,
      mobbing: state.dps.mobbing,
      projHitPct: state.dps.projHitPct,
      avgEnemyR: state.dps.avgEnemyR,
      bondSize: state.combos.bondSize
    });
  }

  function setScoring(next) {
    state.scoring = Object.assign({}, state.scoring, next);
    U.storageSet(POKE_SCORING_KEY, JSON.stringify(state.scoring));
    emit('scoring');
  }

  function resetScoring() {
    state.scoring = JSON.parse(JSON.stringify(DEFAULT_SCORING));
    U.storageSet(POKE_SCORING_KEY, JSON.stringify(state.scoring));
    emit('scoring');
  }

  function setSelectedDex(dex) {
    state.selectedDex = dex;
    if (dex == null) U.storageRemove(POKE_SEL_KEY);
    else U.storageSet(POKE_SEL_KEY, String(dex));
    emit('selected');
  }

  function toggleSet(path, value) {
    const cur = get(path);
    const next = new Set(cur || []);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    set(path, next);
    return next;
  }

  function setColumns(hiddenSet) {
    state.columns.hidden = new Set(hiddenSet);
    U.storageSet(POKE_COLS_KEY, JSON.stringify([...state.columns.hidden]));
    emit('columns');
  }

  function resetColumns() {
    setColumns(new Set());
  }

  function isColumnVisible(id) {
    return !state.columns.hidden.has(id);
  }

  function defaultAxes() {
    return Object.assign({}, DEFAULT_AXES);
  }

  return {
    state,
    on,
    emit,
    batch,
    get,
    set,
    patch,
    setTab,
    prefs,
    config,
    setScoring,
    resetScoring,
    setSelectedDex,
    toggleSet,
    setColumns,
    resetColumns,
    isColumnVisible,
    defaultAxes,
    DEFAULT_COLUMNS,
    DEFAULT_AXES
  };
})();
