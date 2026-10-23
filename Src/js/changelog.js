/* PokéSurvivor Toolkit — changelog */
const CHANGELOG = [
      { v: '2.2.29', date: '2026-10-23', items: [
        'Radar legend entries are now the toggles: all-rows average and each type average turn on/off independently',
        'Offensive rating now uses the spawn-weighted average DPS of all available moves, normalized by a neutral baseline (×); best-move skill DPS is no longer the score input',
        'The rating still favours specialty (higher-DPS moves pull the average harder) while rewarding flexibility (the whole move pool counts)',
        'Offense matrix now shows per-move baseline DPS, PA/SA, spawn type, weather, ability, adjusted DPS and factor, plus the spawn-weighted type breakdown'
      ]},
      { v: '2.2.28', date: '2026-10-23', items: [
        'Pokédex: clicking anywhere on a row reopens the radar/stats modal (multiplier cells still open their matrices)'
      ]},
      { v: '2.2.27', date: '2026-10-23', items: [
        'MVC rewrite: each tab now has its own model, view and controller; shared data, calc, store and UI modules',
        'Pokédex rows are one per (Pokémon, ability, move type): Normal + own types, plus distinct damaging TM types',
        'Fixed Pokédex column sorting (including multiplier headers); ▦ buttons open matrices without changing sort',
        'Restored the radar legend with clickable all-rows and per-type average toggles',
        'EHP = hitbox × ability dodge ÷ spawn-weighted damage reduction; every multiplier cell opens its matrix',
        'Calculator, Combos, Multipliers, Abilities, Items, Mechanics and Config now run on the shared MVC pipeline'
      ]},
      { v: '2.2.22', date: '2026-10-23', items: [
        'abilities.js: ABILITIES dict with desc, calcDesc, fn(pokemon)→multis',
        'Removed AbilityFX probe path; simple abilities re-implemented; WNI marked',
        'Pokédex cells affected by ability highlighted green/red with hover calcDesc'
      ]},
      { v: '2.2.21', date: '2026-10-23', items: [
        'Abilities tab: name, EN description, implementation status',
        'Pokédex ability multi-select filter; click ability name → filtered Pokédex'
      ]},
      { v: '2.2.20', date: '2026-10-23', items: [
        'Restored scheduleHeavyRecalc / finalizeScoresOnly (fix ReferenceError after load)'
      ]},
      { v: '2.2.19', date: '2026-10-23', items: [
        'Abilities: load abilities.js + ability-fx.js; Pokédex rows per (mon, ability)',
        'Ability column (hover = fx.d); Best ability only filter; simple out/inMul/speed probes in score'
      ]},
      { v: '2.2.18', date: '2026-10-23', items: [
        'Stop calculation: instant, keeps partial results (no full revert freeze)',
        'Cache learnset coefs with metrics; skip already-valid mons in heavy recalc'
      ]},
      { v: '2.2.17', date: '2026-10-22', items: [
        'Score v2 nature search: precompute (type,cat)×spawn coefs once per mon — no longer freezes',
        'Heavy recalc yields every Pokémon for progress/stop'
      ]},
      { v: '2.2.16', date: '2026-10-22', items: [
        'Progress bar for dmg v2 / score recalculation; Stop & revert restores previous settings'
      ]},
      { v: '2.2.15', date: '2026-10-22', items: [
        'Pokédex columns score v1 & score v2 (both always computed)',
        'Cache dmg v2 + scores in localStorage; reuse until game commit SHA or nature/weights/dodge change'
      ]},
      { v: '2.2.14', date: '2026-10-22', items: [
        'Scoring: toggle score v1 (phy/spe multi) vs v2 (dmg v2) for offense',
        'Nature button: Modest / Optimize score v1 / Optimize score v2'
      ]},
      { v: '2.2.13', date: '2026-10-22', items: [
        'dmg v2: (type,cat) multipliers weighted by move count/total — not per-move DPS; matrix updated'
      ]},
      { v: '2.2.12', date: '2026-10-22', items: [
        'Click dmg v2 to open full damage matrix (learnable moves × spawn type groups)'
      ]},
      { v: '2.2.11', date: '2026-10-22', items: [
        'Pokédex column dmg v2: spawn-weighted best learnable-move DPS (TM pool, nature PA/SA, type × enemy DF/SD guard)'
      ]},
      { v: '2.2.10', date: '2026-10-22', items: [
        'Combo pool includes TM moves (e.g. Dazzling Gleam on Xurkitree); show top 5 loadouts when a mon is selected',
        'Pokédex: PA★/SA★ nature-adjusted columns (default); base PA/SA optional'
      ]},
      { v: '2.2.9', date: '2026-10-22', items: [
        'Pokédex PA/SA/DF/SD/SPD columns show species base stats from pokedex.js; nature only affects derived multis and score'
      ]},
      { v: '2.2.8', date: '2026-10-22', items: [
        'Calc/Combo: buffs use patk (physical) / satk (special) — Swords Dance no longer boosts special moves',
        'Combo evaluates all learnable ATK buffs; shares DPS Single/Mobbing toggle'
      ]},
      { v: '2.2.7', date: '2026-10-22', items: [
        'Fix: column visibility applied on first load / every pokedex render',
        'Version badge reads latest CHANGELOG entry'
      ]},
      { v: '2.2.6', date: '2026-10-22', items: [
        'Radar legend: each type avg toggles independently',
        'Title: PokéSurvivor Calc + version from changelog; GitHub link in footer'
      ]},
      { v: '2.2.5', date: '2026-10-22', items: [
        'Pokémon modal: types between # and nature (no Nature label); axes above chart; legend below with clickable avgs'
      ]},
      { v: '2.2.4', date: '2026-10-22', items: [
        'Pokémon modal: type chips, axes+avg below radar, stats table name|value|rank',
        'Column hide via stylesheet so sort/re-render keeps visibility'
      ]},
      { v: '2.2.3', date: '2026-10-22', items: [
        'Pokédex columns: Pokémon always on; eva off by default; fixed header/body hide sync (v2 storage)',
        'Rankable cells: value on top, rank below'
      ]},
      { v: '2.2.2', date: '2026-10-22', items: [
        'Numbers: 4 significant figures, no trailing zeros (sig4)',
        'Merged Size into Calculator (size below grids; type filter removed)',
        'Pokédex type badges stacked, smaller'
      ]},
      { v: '2.2.1', date: '2026-10-22', items: [
        'Pokédex layout: Search + Scoring/Columns · types · table',
        'Scoring modal: weights + gen + nature + baseline r + eva formula',
        'Columns modal (table only; radar still full stats); compact raw stat cols',
        'Multiplier tables width: fit content'
      ]},
      { v: '2.2.0', date: '2026-10-22', items: [
        'DPS: learnable includes live TMs (tms.js); TM rows marked when mon selected',
        'Cache: GitHub main commit SHA check — skip re-fetch when up to date; TTL fallback',
        'Pokédex Score weights modal: off/def/spd (default 1 / 1 / 0.25, step 0.05)'
      ]},
      { v: '2.1.0', date: '2026-10-22', items: [
        'Natures: +10%/−10% on PA/SA/DF/SD/SPD; default Best-for-score (game has no species default — roll is per account+dex)',
        'Pokédex Nature mode select + radar Nature dropdown',
        'TM: off-type moves via compatibility list; no damage penalty for off-type'
      ]},
      { v: '2.0.7', date: '2026-10-20', items: [
        'Selected Pokémon cached in localStorage; search with sprites in top bar',
        'Calculator & Size use top selection only (local inputs removed)',
        'DPS levels × PA or SA by move category when mon selected'
      ]},
      { v: '2.0.6', date: '2026-10-20', items: [
        'Pokédex score cell tooltip: full off/def normalization steps'
      ]},
      { v: '2.0.5', date: '2026-10-20', items: [
        'DPS: PHY / SPE category filter chips'
      ]},
      { v: '2.0.4', date: '2026-10-20', items: [
        'Score offense uses better of PA/SA (max phy multi, spe multi), not legacy atk/dmg multi'
      ]},
      { v: '2.0.3', date: '2026-10-20', items: [
        'Selected Pokémon bar: sprite + PA + SA at top (shared across tabs)'
      ]},
      { v: '2.0.2', date: '2026-10-20', items: [
        'DPS: toggle Hide unusable skills (default on) when a Pokémon is selected'
      ]},
      { v: '2.0.1', date: '2026-10-20', items: [
        'Pokédex: generation filter labels (Gen N); # colored by rarity 1–5 / legendary',
        'Renamed dodge factor → eva (evasion)'
      ]},
      { v: '2.0.0', date: '2026-10-20', items: [
        'Split into index.html + css/app.css + js/constants.js + js/changelog.js + js/app.js',
        'Kept single-file 1.6.30 under versions/1.6.30/'
      ]},

      { v: '1.6.30', date: '2026-10-20', items: [
        'Combo tab: with mon selected, only its learnable skills; DPS uses PA/SA by move category',
        'DPS + Combo both use selected Pokémon PA (physical) / SA (special)'
      ]},
      { v: '1.6.29', date: '2026-10-20', items: [
        'Pokédex: multiplier cells show calculation-step tooltips (n (desc) * n (desc) = n)'
      ]},
      { v: '1.6.28', date: '2026-10-20', items: [
        'Ranks: competition style 1,1,1,4,5,5,7,8 (ties share min rank, then skip)'
      ]},
      { v: '1.6.27', date: '2026-10-20', items: [
        'Perf: cache all Pokédex mults/scores/ranks; recompute only when data or dodge options change',
        'Ranks: equal values share the same rank (dense ranking)'
      ]},
      { v: '1.6.26', date: '2026-10-20', items: [
        'Enemy distribution live from enemies.js TIERS + spawner.js rate/DENSITY (cached 1h)'
      ]},
      { v: '1.6.25', date: '2026-10-20', items: [
        'Fix radar: radarStatsFor omitted dr/phy/spe/def multis so those axes always sat at outer ring'
      ]},
      { v: '1.6.24', date: '2026-10-20', items: [
        'Pokédex: sprite click = select; row click = radar',
        'Radar defaults: HP, SPD, phy/spe multi, phy/spe def multi, dodge',
        'Fix def multis stale/missing DF/SD — always recompute; hover shows type×wx×guard(DF/SD)'
      ]},
      { v: '1.6.23', date: '2026-10-20', items: [
        'DPS: with mon selected, gray out non-learnable moves (Normal + its types)',
        'DPS uses mon PA for physical / SA for special moves'
      ]},
      { v: '1.6.22', date: '2026-10-20', items: [
        'Fix kinds multi-select: pill chips CSS + DOM build (no raw text concat)'
      ]},
      { v: '1.6.21', date: '2026-10-20', items: [
        'Radar axes: 2 rows (raw PA/SA/DF/SD/HP/SPD/r + calculated multis); each togglable',
        'Removed ATK from radar and Pokédex (use PA/SA; game uses side-specific attack)'
      ]},
      { v: '1.6.20', date: '2026-10-20', items: [
        'Fix: type/kind chip builders tolerate missing args (tabs no longer crash on load)'
      ]},
      { v: '1.6.19', date: '2026-10-20', items: [
        'Pokédex: dr column — spawn-weighted incoming (type × weather × guard by enemy phy/spe side)',
        'ehp = dodge / dr; enemy physical/special mix shown from sideOf(pa/sa)'
      ]},
      { v: '1.6.18', date: '2026-10-20', items: [
        'Moves: physical/special cat column; new kinds (homing, bounce, charge, spin, quake, vortex, shove, stun)',
        'Pokédex: PA/SA/DF/SD; phy/spe dmg multi; phy/spe def multi via Stats.guard',
        'DPS uses mon PA or SA when a Pokémon is selected'
      ]},
      { v: '1.6.17', date: '2026-10-19', items: [
        'Pokédex: score composite, baseline r + formula defaults, weakness multi rename, sprite select, col-header help, r rank smallest first',
        'DPS: Single/Mobbing row, search row, checkboxes row; kind multi-select pills; Alt-pin freezes tip',
        'Remove outside-table bullet notes; Multipliers type chips on load'
      ]},
      { v: '1.6.16', date: '2026-10-18', items: [
        'Notes: calculation meaning only, bullet lists (no UI control prose)'
      ]},
      { v: '1.6.15', date: '2026-10-18', items: [
        'Remove UI control hints; mobbing settings in sub-section row',
        'Projectile/chain/meteor DPS uses mob hit estimate directly (dmg × hits / cd)'
      ]},
      { v: '1.6.14', date: '2026-10-18', items: [
        'Mobbing configs only when Mobbing on; avg enemy r prefilled from spawn×hitbox',
        'Aura mobbing: ½-disk minus self r (selected mon or mean)',
        'Meteor: game aim = 1 meteor per nearby enemy (reach 340), limited splash; less overrated',
        'Selected Pokémon bar always above tabs'
      ]},
      { v: '1.6.13', date: '2026-10-18', items: [
        'DPS: Single/Mobbing toggle; proj hit %; pierce/chain if primary hits; aura ½-circle, orbit ring, meteor disk estimates',
        'DoT (poison/burn) off by default'
      ]},
      { v: '1.6.12', date: '2026-10-18', items: [
        'Pokédex: dodge median (all vs distinct r) + curve (area/linear/soft/1.5) live options'
      ]},
      { v: '1.6.11', date: '2026-10-18', items: [
        'Section B/C: hover steps on every mult column (type, weather, combined/def)'
      ]},
      { v: '1.6.10', date: '2026-10-18', items: [
        'Multipliers B/C: steps on combined/def multi hover; short explanations above tables'
      ]},
      { v: '1.6.9', date: '2026-10-18', items: [
        'ehp again higher-is-better: dodge / (type def × weather def)',
        'Green = beneficial (high offense / low defense mult / high ehp & dodge)'
      ]},
      { v: '1.6.8', date: '2026-10-18', items: [
        'Type matrix: per-type offense columns + one def column',
        'ehp = type def × weather def × exposure (product of 3 defensive mults)'
      ]},
      { v: '1.6.7', date: '2026-10-18', items: [
        'ehp = dodge / (type def × weather def) — no species HP (level HP is unbounded)'
      ]},
      { v: '1.6.6', date: '2026-10-18', items: [
        'ehp = HP / (type def × weather def × exposure) — higher when you dodge more',
        'Buff table: plain language (+% ATK/stack, max stacks, duration) instead of amt/digits'
      ]},
      { v: '1.6.5', date: '2026-10-18', items: [
        'Fix EFFECT_HELP missing (DPS level hover crash)',
        'dodge factor = median r² / r² (median=1; +10% r → 1/1.21)',
        'ehp = type def × weather def × (r/median)²'
      ]},
      { v: '1.6.4', date: '2026-10-18', items: [
        'dodge factor uses r² / median r² (area ratio)',
        'DPS table: dmg multi hover uses tip panel; harden level tooltips'
      ]},
      { v: '1.6.3', date: '2026-10-18', items: [
        'Rename hit multi → dodge factor, tank multi → ehp'
      ]},
      { v: '1.6.2', date: '2026-10-18', items: [
        'dodge factor = median r² / r²',
        'ehp = type def × weather def × dodge factor',
        'Radar defaults use ehp'
      ]},
      { v: '1.6.1', date: '2026-10-18', items: [
        'dmg multi uses species ATK mult (e.g. 1.61), not ATK/mean',
        'Step format: 1.610 (ATK) * 1.011 (type multii) * 1.092 (weather multi) = …',
        'Multipliers tab split into clear sections A–D'
      ]},
      { v: '1.6.0', date: '2026-10-16', items: [
        'Rename: type multii / weather multi / dmg multi; add def multi (incoming)',
        'Weakness tab → Multipliers with offense & defense tables + steps',
        'Radar defaults: HP, SPD, dmg multi, def multi, hitbox',
        'Defense model from player.hurt: Types.mult × Weather.mult'
      ]},
      { v: '1.5.1', date: '2026-10-16', items: [
        'Pokédex: Wx (weather avg) + Mult (ATK × Cov × Wx) columns',
        'DPS Mult always shows ATK × Cov × Wx with hover breakdown',
        'Single-file index.html only on GitHub Pages'
      ]},
      { v: '1.5.0', date: '2026-10-16', items: [
        'Mechanics tab (combat / weather / slots / hitbox from game source)',
        'Size tab type multii-select filter; radar axis toggles',
        'Compact tables; cleaned unused files; versions/latest snapshot'
      ]},
      { v: '1.4.0', date: '2026-10-16', items: [
        'MVC layout: js/model.js (data/calc), js/view.js (render), js/controller.js (events)',
        'Pre-MVC backup in versions/v1.3.1/',
        'Mult column, buffs table, prefer-switch combo toggle'
      ]},
      { v: '1.3.1', date: '2026-10-16', items: [
        'DPS Mult column (ATK × type × weather)',
        'Buffs table under DPS (per-level upgrades + max stage)',
        'Combo: buffs share move slots; prefer-switch toggle (iOS-style)',
        'Modern toggle component for A/B preferences'
      ]},
      { v: '1.3.0', date: '2026-10-16', items: [
        'Client cache (localStorage) with 1 h recheck interval — no fetch on every refresh',
        'Weather avg multipliers from biome weights + 30-min occupancy (config + column)',
        'Damage mult column (ATK × type × weather); compact tables',
        'README keeps current feature list only'
      ]},
      { v: '1.2.0', date: '2026-10-16', items: [
        'Radar: min–max scale (last rank → 0, best → max); per-type averages',
        'Pokédex radar moved to popup; Use button sets global Pokémon',
        'Type multi-select only allows real Pokémon type combos; chips always colored',
        'Size tab sprite centering fix; Changelog tab; version history'
      ]},
      { v: '1.1.0', date: '2026-10-16', items: [
        'Weakness matrix with Best / Avg-split columns',
        'Pokédex Cov stat, ranks, radar diagram',
        'Poison + burn DoT in DPS; special effects in tooltips',
        'Strict prefix search (~ for contains); Size Compare tab',
        'Calculator 4×4 grid; multi-select type filters'
      ]},
      { v: '1.0.0', date: '2026-10-15', items: [
        'Initial toolkit: live GitHub data, DPS table, Pokédex, combos, items, config'
      ]}
    ];

/** Latest version string from CHANGELOG (source of truth). */
function latestChangelogVersion() {
  if (typeof CHANGELOG !== 'undefined' && CHANGELOG && CHANGELOG.length && CHANGELOG[0] && CHANGELOG[0].v) {
    return String(CHANGELOG[0].v).replace(/^v/i, '');
  }
  return '0';
}
var APP_VERSION = latestChangelogVersion();
