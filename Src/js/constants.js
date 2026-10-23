/* PokéSurvivor Toolkit — static constants
 * Shared by every MVC layer. Keep this file dependency-free.
 */

const APP_DATA_VERSION = 3;
const CACHE_KEY = 'pstk_data_v3';
const POKE_SEL_KEY = 'pstk_selected_dex';
const SCORE_W_KEY = 'pstk_score_weights';
const POKE_COLS_KEY = 'pstk_poke_cols_v7';
const POKE_SCORING_KEY = 'pstk_scoring_v2';
const CACHE_TTL_MS = 60 * 60 * 1000;
const POKE_PAGE_SIZE = 150;

const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', grass: '#78C850',
  electric: '#F8D030', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC'
};

const TYPE_LIST = Object.keys(TYPE_COLORS);

/** Soft type multipliers (game types.js): 2→1.6, 0.5→0.6, 0→0.3 */
const SOFT = { 2: 1.6, 0.5: 0.6, 0: 0.3 };

const EFFECT_HELP = {
  poison: 'DoT ≈ % of ref enemy HP per tick (config Ref enemy HP).',
  burn: 'DoT scales with player level (config Ref player level).',
  slow: 'Reduces enemy move speed while active.',
  knock: 'Knockback on hit; higher values push farther.',
  homing: 'Projectiles track targets; improves hit reliability.',
  hex: 'Extra damage multiplier vs affected targets.'
};

const MULT_KEYS = ['dmg', 'cd', 'speed', 'radius', 'dur', 'amount', 'arc', 'width', 'spread', 'life', 'size', 'rate'];
const ADD_KEYS = ['count', 'pierce', 'stacks'];

/** Gen-9-style attack chart (before SOFT remap). */
const RAW_CHART = {
  normal:   { rock: .5, ghost: 0, steel: .5 },
  fire:     { fire: .5, water: .5, grass: 2, ice: 2, bug: 2, rock: .5, dragon: .5, steel: 2 },
  water:    { fire: 2, water: .5, grass: .5, ground: 2, rock: 2, dragon: .5 },
  electric: { water: 2, electric: .5, grass: .5, ground: 0, flying: 2, dragon: .5 },
  grass:    { fire: .5, water: 2, grass: .5, poison: .5, ground: 2, flying: .5, bug: .5, rock: 2, dragon: .5, steel: .5 },
  ice:      { fire: .5, water: .5, grass: 2, ice: .5, ground: 2, flying: 2, dragon: 2, steel: .5 },
  fighting: { normal: 2, ice: 2, poison: .5, flying: .5, psychic: .5, bug: .5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: .5 },
  poison:   { grass: 2, poison: .5, ground: .5, rock: .5, ghost: .5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: .5, poison: 2, flying: 0, bug: .5, rock: 2, steel: 2 },
  flying:   { electric: .5, grass: 2, fighting: 2, bug: 2, rock: .5, steel: .5 },
  psychic:  { fighting: 2, poison: 2, psychic: .5, dark: 0, steel: .5 },
  bug:      { fire: .5, grass: 2, fighting: .5, poison: .5, flying: .5, psychic: 2, ghost: .5, dark: 2, steel: .5, fairy: .5 },
  rock:     { fire: 2, ice: 2, fighting: .5, ground: .5, flying: 2, bug: 2, steel: .5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: .5 },
  dragon:   { dragon: 2, steel: .5, fairy: 0 },
  dark:     { fighting: .5, psychic: 2, ghost: 2, dark: .5, fairy: .5 },
  steel:    { fire: .5, water: .5, electric: .5, ice: 2, rock: 2, steel: .5, fairy: 2 },
  fairy:    { fire: .5, fighting: 2, poison: .5, dragon: 2, dark: 2, steel: .5 }
};

/** Fallback enemy tiers if enemies.js parse fails (overwritten live). */
const DEFAULT_TIERS_BST = [
  { from: 0,   to: 70,  bst: [180, 330], cast: 7 },
  { from: 70,  to: 160, bst: [300, 405], cast: 7 },
  { from: 160, to: 260, bst: [385, 465], cast: 7 },
  { from: 260, to: 380, bst: [445, 515], cast: 7 },
  { from: 380, to: 500, bst: [495, 560], cast: 7 },
  { from: 500, to: 1800, bst: [530, 620], cast: 7 }
];

/** Precomputed weather uptime averages per type (biome-weighted). */
const WEATHER_AVG_MULT = {
  normal: 1.000, fire: 1.003, water: 0.997, electric: 1.006, grass: 1.000,
  ice: 1.012, fighting: 1.000, poison: 1.000, ground: 1.011, flying: 1.000,
  psychic: 1.015, bug: 1.000, rock: 1.011, ghost: 1.015, dragon: 1.000,
  dark: 1.000, steel: 1.011, fairy: 1.015
};

/**
 * Static ability dodge. Only unconditional dodges are folded into the
 * "dodge (ability)" multiplier by default; conditional ones are surfaced in
 * the matrix and tooltip so the calculation stays honest.
 */
const ABILITY_DODGE = {
  anticipation: { chance: 0.06, note: 'Dodges 6% of hits.' },
  forewarn:     { chance: 0.06, note: 'Dodges 6% of hits.' },
  telepathy:    { chance: 0.08, note: 'Dodges 8% of hits.' },
  'magic-bounce': { chance: 0.10, note: 'Dodges 10% of special hits.', specialOnly: true },
  'sand-veil':  { chance: 0.15, conditional: 'sandstorm', note: 'Dodges 15% of hits in a sandstorm.' },
  'snow-cloak': { chance: 0.15, conditional: 'snow', note: 'Dodges 15% of hits in snow.' },
  'tangled-feet': { chance: 0.20, conditional: 'slowed', note: 'Dodges 20% of hits while slowed.' }
};

const DEFAULT_SCORING = {
  weights: { off: 1, def: 1, spd: 0.25 },
  natureMode: 'neutral',
  medianMode: 'pokemon',
  curve: 'power15'
};

const MECHANICS_GROUPS = [
  {
    title: 'Damage (combat.js)',
    items: [
      'Hit pipeline: <code>dmg × typeK × (crit ? CRIT_MUL : 1)</code>',
      '<code>typeK</code> = soft type chart vs target types × weather mult for attack type',
      'Crit multiplier: <code>CRIT_MUL = 1.5</code>',
      'Move flags can apply poison / burn / slow / knock on hit'
    ]
  },
  {
    title: 'Type chart (soft)',
    items: [
      'Super-effective ×1.6 · resist ×0.6 · immune ×0.3',
      'Dual types multiply; result clamped to [0.3, 2.4]',
      'Spawn-weighted values feed offense rating and damage reduction'
    ]
  },
  {
    title: 'Weather (weather.js)',
    items: [
      'Starts after <code>FROM = 120</code>s; every <code>CHECK = 60</code>s has <code>CHANCE = 0.18</code> to roll',
      'Duration ~55–75s; intensity fades in/out over 3s',
      'Sun: Fire ×1.5, Water ×0.5 · Rain: Water ×1.5, Electric ×1.2, Fire ×0.5',
      'Sand: Rock/Ground/Steel ×1.3 · Snow: Ice ×1.5 · Fog: Ghost/Fairy/Psychic ×1.3',
      'Toolkit folds ~18% uptime into a per-type overall multiplier'
    ]
  },
  {
    title: 'Nature & TM (Kecleon update)',
    items: [
      'Nature: +10% one of PA/SA/DF/SD/SPD, −10% another (5 neutrals).',
      'TM: teaches official off-type moves into the level-up / start pool.',
      'Pokédex rows are expanded per available ability and per distinct damaging TM type.',
      'Natural move pool = Normal + the Pokémon types; TM adds compatible off-type moves.'
    ]
  },
  {
    title: 'Move slots & buffs',
    items: [
      '4 move slots; only the <strong>active</strong> slot fires; bonded moves in a slot all tick',
      'Buffs share the same slots as damage moves',
      'Buff in active slot: always on, uses one bond seat',
      'Buff in another slot: switch to refresh — uptime ≈ dur / (dur + cd)'
    ]
  },
  {
    title: 'Hitbox & EHP',
    items: [
      'Collision radius: <code>clamp(Idle.w × 0.22, 5, 26) × PX</code> with <code>PX = 2</code>',
      'Hitbox multi = (median r / r)^curve — smaller body is better',
      'Damage reduction = spawn-weighted incoming multiplier after type, weather, DF/SD guard and ability',
      'EHP = hitbox multi × ability dodge ÷ damage reduction'
    ]
  },
  {
    title: 'DoT approximations (toolkit)',
    items: [
      'Poison DoT uses config Ref enemy HP',
      'Burn DoT uses config Ref player level',
      'Toggle Include DoT on the DPS table to fold these into listed DPS'
    ]
  }
];

const MECHANICS_DROPS = [
  { src: 'Normal chest (breakable)', item: '8%', t1: '—', t10: '—', other: '4–7 coins · heal or magnet 50% · XP 20' },
  { src: 'Locked chest (stand 3.5s)', item: '50%', t1: '1–3 guaranteed', t10: '15%', other: '9× coins · full level XP' },
  { src: 'Boss (non-legend)', item: '100% (1 item)', t1: '—', t10: '1/3 (33%)', other: '10 coin bursts · heal + magnet · big XP' },
  { src: 'Crack legendary', item: '—', t1: '3 guaranteed', t10: '50% via boss XP path', other: '10 coin bursts' },
  { src: 'Normal wild faint', item: '—', t1: '1/400 (0.25%)', t10: '—', other: 'heal 1.2% · magnet 0.8% · bomb 0.6%' },
  { src: 'Treasure goblin (Meowth / Gholdengo)', item: '—', t1: '—', t10: 'Gholdengo always', other: 'Many coins; Gholdengo also ticket ×10' }
];

/** Game natures (natures.js): +10% up, −10% down; empty = neutral. */
const NATURES = [{"id":"hardy","en":"Hardy","up":"","down":""},{"id":"bold","en":"Bold","up":"df","down":"pa"},{"id":"modest","en":"Modest","up":"sa","down":"pa"},{"id":"calm","en":"Calm","up":"sd","down":"pa"},{"id":"timid","en":"Timid","up":"spd","down":"pa"},{"id":"lonely","en":"Lonely","up":"pa","down":"df"},{"id":"docile","en":"Docile","up":"","down":""},{"id":"mild","en":"Mild","up":"sa","down":"df"},{"id":"gentle","en":"Gentle","up":"sd","down":"df"},{"id":"hasty","en":"Hasty","up":"spd","down":"df"},{"id":"adamant","en":"Adamant","up":"pa","down":"sa"},{"id":"impish","en":"Impish","up":"df","down":"sa"},{"id":"bashful","en":"Bashful","up":"","down":""},{"id":"careful","en":"Careful","up":"sd","down":"sa"},{"id":"rash","en":"Rash","up":"sa","down":"sd"},{"id":"jolly","en":"Jolly","up":"spd","down":"sa"},{"id":"naughty","en":"Naughty","up":"pa","down":"sd"},{"id":"lax","en":"Lax","up":"df","down":"sd"},{"id":"quirky","en":"Quirky","up":"","down":""},{"id":"naive","en":"Naive","up":"spd","down":"sd"},{"id":"brave","en":"Brave","up":"pa","down":"spd"},{"id":"relaxed","en":"Relaxed","up":"df","down":"spd"},{"id":"quiet","en":"Quiet","up":"sa","down":"spd"},{"id":"sassy","en":"Sassy","up":"sd","down":"spd"},{"id":"serious","en":"Serious","up":"","down":""}];
const NATURE_BY = Object.fromEntries(NATURES.map(n => [n.id, n]));
