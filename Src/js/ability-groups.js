/* Ability taxonomy: condition groups and effect groups.
 *
 * Every ability can belong to more than one group. Conditions describe when
 * an ability matters; effects describe what it changes in the calculator.
 * The groups are derived from the explicit ABILITIES model in abilities.js,
 * so they stay aligned with the numbers used by the Pokédex/DPS tabs.
 */
window.PSC = window.PSC || {};

PSC.AbilityGroups = (function () {
  const CONDITIONS = [
    { key: 'always', label: 'Always' },
    { key: 'low-hp', label: 'Low HP' },
    { key: 'high-hp', label: 'High HP' },
    { key: 'weather', label: 'Weather' },
    { key: 'summon', label: 'Sets weather' },
    { key: 'on-hit', label: 'When hit' },
    { key: 'on-ko', label: 'On KO' },
    { key: 'slowed', label: 'While slowed' },
    { key: 'target-hp', label: 'Target HP' },
    { key: 'target-type', label: 'Target type' },
    { key: 'move-type', label: 'Move type' },
    { key: 'move-kind', label: 'Move kind' },
    { key: 'crit', label: 'Crit' },
    { key: 'once', label: 'Once / cooldown' },
    { key: 'item', label: 'No held item' },
    { key: 'time', label: 'Time / ramp' },
    { key: 'boss', label: 'Boss' }
  ];

  const EFFECTS = [
    { key: 'damage', label: 'Damage' },
    { key: 'physical', label: 'Physical' },
    { key: 'special', label: 'Special' },
    { key: 'type-damage', label: 'Type damage' },
    { key: 'move-damage', label: 'Move-specific' },
    { key: 'crit', label: 'Crit' },
    { key: 'defense', label: 'Defense' },
    { key: 'physical-defense', label: 'Phys. def' },
    { key: 'special-defense', label: 'Spec. def' },
    { key: 'type-defense', label: 'Type defense' },
    { key: 'absorb', label: 'Absorb' },
    { key: 'sustain', label: 'Sustain' },
    { key: 'speed', label: 'Speed' },
    { key: 'stats', label: 'Stats' },
    { key: 'hp', label: 'HP / EHP' },
    { key: 'dodge', label: 'Dodge' },
    { key: 'drawback', label: 'Drawback' },
    { key: 'utility', label: 'Utility' }
  ];

  const CONDITION_BY_KEY = toMap(CONDITIONS);
  const EFFECT_BY_KEY = toMap(EFFECTS);

  // These are explicit because the same words can describe the player or the
  // target (e.g. Analytic boosts damage vs targets below half HP).
  const LOW_HP_IDS = new Set([
    'aftermath', 'anger-point', 'blaze', 'guts', 'overgrow', 'swarm', 'torrent', 'zen-mode'
  ]);
  const HIGH_HP_IDS = new Set([
    'defeatist', 'multiscale', 'schooling', 'shadow-shield'
  ]);
  const SUMMON_IDS = new Set([
    'drizzle', 'drought', 'orichalcum-pulse', 'sand-stream', 'snow-warning'
  ]);
  const ON_HIT_IDS = new Set([
    'cursed-body', 'cute-charm', 'effect-spore', 'flame-body', 'iron-barbs',
    'pickpocket', 'poison-point', 'rattled', 'rough-skin', 'stamina', 'static',
    'steadfast', 'synchronize', 'weak-armor'
  ]);
  const ON_KO_IDS = new Set(['beast-boost', 'chilling-neigh', 'grim-neigh', 'moxie']);
  const SLOWED_IDS = new Set(['competitive', 'contrary', 'defiant', 'quick-feet', 'tangled-feet']);
  const ONCE_IDS = new Set(['aftermath', 'anger-point', 'sturdy']);
  const ITEM_IDS = new Set(['klutz', 'unburden']);
  const TIME_IDS = new Set(['moody', 'shed-skin', 'slow-start', 'speed-boost', 'stance-change', 'truant']);
  const BOSS_IDS = new Set(['mold-breaker']);
  const TARGET_TYPE_IDS = new Set(['justified', 'rivalry', 'scrappy', 'tinted-lens']);
  const DRAWBACK_IDS = new Set(['dry-skin', 'hustle', 'no-guard', 'slow-start', 'solar-power', 'truant', 'wonder-guard']);

  function toMap(list) {
    const out = {};
    for (const item of list) out[item.key] = item;
    return out;
  }

  function probeMods(id) {
    const ability = (typeof ABILITIES !== 'undefined') ? ABILITIES[id] : null;
    if (!ability || typeof ability.fn !== 'function') return null;
    try {
      return ability.fn({
        abilityId: id,
        dex: 1,
        types: ['normal', 'fire'],
        hp: 100,
        maxHp: 100,
        pa: 1,
        sa: 1,
        df: 50,
        sd: 50,
        spd: 100,
        bst: 300
      }) || {};
    } catch (e) {
      return {};
    }
  }

  function has(obj, key) {
    return obj && obj[key] != null;
  }

  function values(obj) {
    return obj ? Object.keys(obj).map(k => +obj[k]).filter(v => isFinite(v)) : [];
  }

  function classify(id) {
    const ability = (typeof ABILITIES !== 'undefined') ? ABILITIES[id] : null;
    const conditions = new Set();
    const effects = new Set();

    if (!ability) {
      // Game fallback: +8% with the primary type.
      conditions.add('always');
      effects.add('type-damage');
      return { conditions: [...conditions], effects: [...effects] };
    }

    const text = ((ability.desc || '') + ' ' + (ability.calcDesc || '')).toLowerCase();
    const mods = probeMods(id) || {};

    if (LOW_HP_IDS.has(id)) conditions.add('low-hp');
    if (HIGH_HP_IDS.has(id)) conditions.add('high-hp');
    if (SUMMON_IDS.has(id) || /extra [a-z]+ uptime assumed 25%/.test(text)) conditions.add('summon');
    if (/\b(weather|rain|sun|snow|sandstorm|hail|fog)\b/.test(text)) conditions.add('weather');
    if (ON_HIT_IDS.has(id) || /when hit|hit buffs|each melee hit it takes/.test(text)) conditions.add('on-hit');
    if (ON_KO_IDS.has(id) || /enemy.*defeated|each enem.*kill|half of the \+15% cap/.test(text)) conditions.add('on-ko');
    if (SLOWED_IDS.has(id) || /slowed uptime|when slowed|while slowed|if it is slowed/.test(text)) conditions.add('slowed');
    if (id === 'analytic' || /targets below half|enemies below half/.test(text)) conditions.add('target-hp');
    if (TARGET_TYPE_IDS.has(id) || typeof mods.targetOut === 'function') conditions.add('target-type');
    if (mods.typeMulti || /moves of its own types/.test(text)) conditions.add('move-type');
    if (typeof mods.moveOut === 'function') conditions.add('move-kind');
    if (/critical hit|\bcrits?\b|\+\d+% crit/.test(text)) conditions.add('crit');
    if (ONCE_IDS.has(id)) conditions.add('once');
    if (ITEM_IDS.has(id)) conditions.add('item');
    if (TIME_IDS.has(id)) conditions.add('time');
    if (BOSS_IDS.has(id)) conditions.add('boss');

    if (!conditions.size) conditions.add('always');

    if (has(mods, 'out') || has(mods, 'outPhy') || has(mods, 'outSpe')) effects.add('damage');
    if (has(mods, 'outPhy')) effects.add('physical');
    if (has(mods, 'outSpe')) effects.add('special');
    if (mods.typeMulti && Object.keys(mods.typeMulti).length) effects.add('type-damage');
    if (typeof mods.moveOut === 'function' || typeof mods.targetOut === 'function') effects.add('move-damage');
    if (has(mods, 'in') && +mods.in < 1) effects.add('defense');
    if (has(mods, 'inPhy') && +mods.inPhy < 1) effects.add('physical-defense');
    if (has(mods, 'inSpe') && +mods.inSpe < 1) effects.add('special-defense');
    if ((mods.typeDefMulti && values(mods.typeDefMulti).some(v => v < 1)) ||
        (has(mods, 'inSuper') && +mods.inSuper < 1) ||
        (has(mods, 'inNotSuper') && +mods.inNotSuper < 1)) {
      effects.add('type-defense');
    }
    if (mods.typeDefMulti && values(mods.typeDefMulti).some(v => v === 0)) effects.add('absorb');
    if (has(mods, 'spd')) effects.add('speed');
    if (has(mods, 'df') || has(mods, 'sd') || has(mods, 'pa') || has(mods, 'sa')) effects.add('stats');
    if (has(mods, 'hp')) effects.add('hp');
    if (has(mods, 'dodge') || has(mods, 'dodgeSpecial')) effects.add('dodge');
    if (has(mods, 'in') && /healing|recovers|per second|sustain|from .*healing/.test(text)) effects.add('sustain');
    if (effects.has('damage') && conditions.has('crit')) effects.add('crit');

    if (DRAWBACK_IDS.has(id) ||
        (has(mods, 'in') && +mods.in > 1) ||
        (has(mods, 'out') && +mods.out < 1) ||
        (mods.typeDefMulti && values(mods.typeDefMulti).some(v => v > 1)) ||
        (has(mods, 'inSuper') && +mods.inSuper > 1)) {
      effects.add('drawback');
    }

    if (!effects.size) effects.add('utility');

    return { conditions: [...conditions], effects: [...effects] };
  }

  function label(key) {
    return (CONDITION_BY_KEY[key] || EFFECT_BY_KEY[key] || {}).label || key;
  }

  function def(key) {
    return CONDITION_BY_KEY[key] || EFFECT_BY_KEY[key] || null;
  }

  function groups() {
    return { conditions: CONDITIONS, effects: EFFECTS };
  }

  return { CONDITIONS, EFFECTS, classify, label, def, groups };
})();
