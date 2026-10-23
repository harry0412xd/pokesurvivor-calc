/* UI label dictionary: full names to the abbreviations used in tables,
 * radar axes and the column picker. Keep this as the single source of truth.
 */
window.PSC = window.PSC || {};

PSC.Labels = (function () {
  /**
   * full = spelled-out name (tooltips, docs, column picker)
   * abbr = short label shown in the Pokédex table and radar
   *
   * Order here is the table/radar numeric-stat order. # and Gen are kept
   * separate because they are identifiers, not radar axes.
   */
  const DEFINITIONS = [
    { key: 'dex',     full: 'Pokédex number',    abbr: '#' },
    { key: 'gen',     full: 'Generation',        abbr: 'Gen' },
    { key: 'name',    full: 'Pokémon',           abbr: 'Pokémon' },
    { key: 'types',   full: 'Types',             abbr: 'Types' },
    { key: 'ability', full: 'Ability',           abbr: 'Ability' },
    { key: 'variant', full: 'Tm type',           abbr: 'Tm type' },
    { key: 'pa',      full: 'Physical attack',   abbr: 'PA' },
    { key: 'sa',      full: 'Special attack',    abbr: 'SA' },
    { key: 'df',      full: 'Defense',           abbr: 'DF' },
    { key: 'sd',      full: 'Special defense',   abbr: 'SD' },
    { key: 'hp',      full: 'Hit points',        abbr: 'HP' },
    { key: 'spd',     full: 'Speed',             abbr: 'SPD' },
    { key: 'hit',     full: 'Hitbox radius',     abbr: 'r' },
    { key: 'bst',     full: 'Base stat total',   abbr: 'BST' },
    { key: 'hitbox',  full: 'Hitbox multiplier', abbr: 'hb' },
    { key: 'dodge',   full: 'Dodge',             abbr: 'dodg' },
    { key: 'dr',      full: 'Damage reduction',  abbr: 'dr' },
    { key: 'ehp',     full: 'Effective HP',      abbr: 'EHP' },
    { key: 'offense', full: 'Offensive rating',  abbr: 'OR' },
    { key: 'score',   full: 'Overall score',     abbr: 'Scr' }
  ];

  const byKey = {};
  const ABBR_BY_FULL = {};
  const FULL_BY_ABBR = {};
  for (const def of DEFINITIONS) {
    byKey[def.key] = def;
    ABBR_BY_FULL[def.full] = def.abbr;
    FULL_BY_ABBR[def.abbr] = def.full;
  }

  const COLUMN_LABELS = {};
  for (const def of DEFINITIONS) COLUMN_LABELS[def.key] = def.abbr;

  const RADAR_KEYS = [
    'pa', 'sa', 'df', 'sd', 'hp', 'spd', 'hit', 'bst',
    'hitbox', 'dodge', 'dr', 'ehp', 'offense', 'score'
  ];
  const RADAR_LABELS = {};
  for (const key of RADAR_KEYS) RADAR_LABELS[key] = byKey[key].abbr;

  function abbr(full, fallback) {
    return ABBR_BY_FULL[full] || fallback || full;
  }

  function full(abbrText, fallback) {
    return FULL_BY_ABBR[abbrText] || fallback || abbrText;
  }

  function syncTableHeaders(table) {
    if (!table) return;
    table.querySelectorAll('th [data-label-key]').forEach(el => {
      const def = byKey[el.dataset.labelKey];
      if (def) el.textContent = def.abbr;
    });
  }

  return {
    DEFINITIONS,
    byKey,
    ABBR_BY_FULL,
    FULL_BY_ABBR,
    COLUMN_LABELS,
    RADAR_KEYS,
    RADAR_LABELS,
    abbr,
    full,
    syncTableHeaders
  };
})();
