/* Ability modelling assumptions, shared with calc.js and the Mechanics tab.
 * These are deliberately explicit: the calculator is static, so conditional
 * effects are folded in as expected uptimes instead of being ignored.
 */
const ABILITY_ASSUME = {
  // Below-HP conditions are never assumed; one-time triggers are handled
  // directly in their ability definitions instead (see Anger Point).
  "lowHp": 0,
  "halfHp": 0,
  "nearFullHp": 0.5,
  "weather": 0.18,
  "summon": 0.25,
  "slowed": 0.25,
  "lowTarget": 0.5,
  "bossShare": 0.1,
  "killCapShare": 0.5,
  "speedCapShare": 0.5,
  "sustainWindow": 10,
  "runSec": 1800
};
const BASE_CRIT_CHANCE = 0.10;
const BASE_CRIT_MUL = 1.5;

/* Toolkit ability definitions — numeric effects derived from the game's
 * data/ability-fx.js, adapted to the calculator's static/spawn-weighted model.
 * fn(pokemon) receives a Pokédex row and returns multipliers:
 *   pa, sa, df, sd, spd, hp  — stat / EHP multis
 *   out, outPhy, outSpe      — outgoing damage multis
 *   typeMulti                — outgoing by move type
 *   moveOut(move)            — outgoing for a concrete move definition
 *   targetOut(move, enemy)   — outgoing vs a spawn-weighted enemy type group
 *   in, inPhy, inSpe         — incoming damage multis (lower = tankier)
 *   inSuper, inNotSuper      — incoming by effective type multiplier
 *   typeDefMulti             — incoming by attack type (0 = absorbed)
 *   dodge, dodgeSpecial      — expected dodge chance
 * Empty return {} = no numeric effect in this calculator (utility only).
 */
const ABILITIES = (() => {
  const cond = (uptime, mult) => 1 + (mult - 1) * uptime;
  const tm = (type, mult) => ({ typeMulti: { [type]: mult } });
  const tmMulti = (types, mult) => {
    const out = {};
    for (const t of types) out[t] = mult;
    return { typeMulti: out };
  };
  const absorb = (type) => ({ typeDefMulti: { [type]: 0 } });
  const sustainIn = (ratePerSec, uptime) =>
    1 / (1 + ratePerSec * ABILITY_ASSUME.sustainWindow * (uptime == null ? 1 : uptime));
  const critGain = (chance, mul) => {
    const base = 1 + BASE_CRIT_CHANCE * (BASE_CRIT_MUL - 1);
    const withAbility = 1 + (BASE_CRIT_CHANCE + (chance || 0)) * ((mul || BASE_CRIT_MUL) - 1);
    return withAbility / base;
  };

  return {
    "adaptability": {
      desc: "+25% damage with moves of its own types.",
      calcDesc: "typeMulti ×1.25 for each of the Pokémon's types (STAB path / matrix).",
      fn: (pokemon) => { const tm = {}; (pokemon.types||[]).forEach(t => tm[t] = 1.25); return { typeMulti: tm }; }
    },
    "aftermath": {
      desc: "Once per run, when low on HP, it explodes and hurts everything around.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "analytic": {
      desc: "+15% damage to enemies below half HP.",
      calcDesc: "Outgoing ×1.075 (assumes half of targets below half HP).",
      fn: () => ({ out: 1 + 0.15 * ABILITY_ASSUME.lowTarget })
    },
    "anger-point": {
      desc: "The first time it drops below half HP it gets angry: +25% damage for the rest of the run.",
      calcDesc: "Outgoing ×1.25 (trigger assumed once; full effect afterwards).",
      fn: () => ({ out: 1.25 })
    },
    "anticipation": {
      desc: "Senses danger: dodges 6% of hits.",
      calcDesc: "Dodges 6% of hits.",
      fn: () => ({ dodge: 0.06, dodgeNote: 'Dodges 6% of hits.' })
    },
    "battle-armor": {
      desc: "Takes 8% less damage.",
      calcDesc: "Incoming ×0.92.",
      fn: () => ({ in: 0.92 })
    },
    "beast-boost": {
      desc: "Beast Boost (no description).",
      calcDesc: "Outgoing ×1.075 (assumes half of the +15% cap on average).",
      fn: () => ({ out: 1 + 0.15 * ABILITY_ASSUME.killCapShare })
    },
    "big-pecks": {
      desc: "Takes 8% less physical damage.",
      calcDesc: "Physical incoming ×0.92.",
      fn: () => ({ inPhy: 0.92 })
    },
    "blaze": {
      desc: "Blaze (no description).",
      calcDesc: "Fire moves ×1.00 (below-1/3-HP condition treated as 0% uptime).",
      fn: () => ({ typeMulti: { fire: cond(ABILITY_ASSUME.lowHp, 1.35) } })
    },
    "bulletproof": {
      desc: "Takes 15% less special damage.",
      calcDesc: "Special incoming ×0.85.",
      fn: () => ({ inSpe: 0.85 })
    },
    "chilling-neigh": {
      desc: "Chilling Neigh (no description).",
      calcDesc: "Outgoing ×1.075 (assumes half of the +15% cap on average).",
      fn: () => ({ out: 1 + 0.15 * ABILITY_ASSUME.killCapShare })
    },
    "chlorophyll": {
      desc: "Chlorophyll (no description).",
      calcDesc: "Speed ×1.09 (18% sun uptime assumed).",
      fn: () => ({ spd: cond(ABILITY_ASSUME.weather, 1.5) })
    },
    "clear-body": {
      desc: "Clear Body (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "competitive": {
      desc: "If it is slowed it fights back: +20% special damage while it lasts.",
      calcDesc: "Special ×1.05 (25% slowed uptime assumed).",
      fn: () => ({ outSpe: cond(ABILITY_ASSUME.slowed, 1.2) })
    },
    "compound-eyes": {
      desc: "+6% critical hit chance.",
      calcDesc: "Expected ×1.029 (+6% crit; assumes 10% base crit from upgrades).",
      fn: () => ({ out: critGain(0.06) })
    },
    "contrary": {
      desc: "The other way round: when slowed, it goes faster.",
      calcDesc: "Speed ×1.35 (25% slowed uptime assumed, reversed).",
      fn: () => ({ spd: 1 + (2.4 - 1) * ABILITY_ASSUME.slowed })
    },
    "cursed-body": {
      desc: "Cursed Body (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "cute-charm": {
      desc: "Cute Charm (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "damp": {
      desc: "Explosions from kamikaze Pokémon do not hurt it.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "defeatist": {
      desc: "Glass cannon: +15% damage above half HP; below it, −25%.",
      calcDesc: "Outgoing ×1.15 (above-half HP assumed; below-half penalty treated as 0% uptime).",
      fn: () => ({ out: 1.15 })
    },
    "defiant": {
      desc: "If it is slowed it fights back: +20% physical damage while it lasts.",
      calcDesc: "Physical ×1.05 (25% slowed uptime assumed).",
      fn: () => ({ outPhy: cond(ABILITY_ASSUME.slowed, 1.2) })
    },
    "dragons-maw": {
      desc: "+20% damage with Dragon moves.",
      calcDesc: "typeMulti.dragon ×1.2.",
      fn: (pokemon) => { return { typeMulti: { dragon: 1.2 } }; }
    },
    "drizzle": {
      desc: "Drizzle (no description).",
      calcDesc: "Extra rain uptime assumed 25%: Water ×1.125, Electric ×1.05, Fire ×0.875.",
      fn: () => ({ typeMulti: { water: cond(ABILITY_ASSUME.summon, 1.5), electric: cond(ABILITY_ASSUME.summon, 1.2), fire: cond(ABILITY_ASSUME.summon, 0.5) } })
    },
    "drought": {
      desc: "Drought (no description).",
      calcDesc: "Extra sun uptime assumed 25%: Fire ×1.125, Water ×0.875.",
      fn: () => ({ typeMulti: { fire: cond(ABILITY_ASSUME.summon, 1.5), water: cond(ABILITY_ASSUME.summon, 0.5) } })
    },
    "dry-skin": {
      desc: "Water heals it and rain restores HP, but Fire deals 25% more.",
      calcDesc: "Water incoming ×0, Fire ×1.25; rain sustain ≈ ×0.979.",
      fn: () => ({ typeDefMulti: { water: 0, fire: 1.25 }, in: sustainIn(0.012, ABILITY_ASSUME.weather) })
    },
    "early-bird": {
      desc: "Early Bird (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "earth-eater": {
      desc: "Earth Eater (no description).",
      calcDesc: "Ground incoming ×0 (absorbed).",
      fn: () => absorb('ground')
    },
    "effect-spore": {
      desc: "Effect Spore (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "filter": {
      desc: "Super-effective attacks deal 25% less.",
      calcDesc: "Super-effective incoming ×0.75.",
      fn: () => ({ inSuper: 0.75 })
    },
    "flame-body": {
      desc: "Flame Body (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "flash-fire": {
      desc: "Flash Fire (no description).",
      calcDesc: "Fire incoming ×0 (absorbed).",
      fn: () => absorb('fire')
    },
    "fluffy": {
      desc: "Takes 30% less physical damage.",
      calcDesc: "Physical incoming ×0.7.",
      fn: () => ({ inPhy: 0.7 })
    },
    "forewarn": {
      desc: "Senses danger: dodges 6% of hits.",
      calcDesc: "Dodges 6% of hits.",
      fn: () => ({ dodge: 0.06, dodgeNote: 'Dodges 6% of hits.' })
    },
    "friend-guard": {
      desc: "Takes 6% less damage.",
      calcDesc: "Incoming ×0.94.",
      fn: (pokemon) => { return { in: 0.94 }; }
    },
    "frisk": {
      desc: "Pulls items from farther away (+20% magnet).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "full-metal-body": {
      desc: "Full Metal Body (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "fur-coat": {
      desc: "Takes 40% less physical damage.",
      calcDesc: "Physical incoming ×0.6.",
      fn: () => ({ inPhy: 0.6 })
    },
    "gluttony": {
      desc: "Healing heals it 40% more.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "grim-neigh": {
      desc: "Grim Neigh (no description).",
      calcDesc: "Outgoing ×1.075 (assumes half of the +15% cap on average).",
      fn: () => ({ out: 1 + 0.15 * ABILITY_ASSUME.killCapShare })
    },
    "guts": {
      desc: "+30% physical damage under half HP.",
      calcDesc: "Physical ×1.00 (below-half-HP condition treated as 0% uptime).",
      fn: () => ({ outPhy: cond(ABILITY_ASSUME.halfHp, 1.3) })
    },
    "harvest": {
      desc: "Healing heals it 30% more.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "healer": {
      desc: "Recovers 0.3% of its HP per second.",
      calcDesc: "Incoming ×0.971 from 0.3%/s healing over a 10 s window.",
      fn: () => ({ in: sustainIn(0.003) })
    },
    "heatproof": {
      desc: "Takes half damage from Fire.",
      calcDesc: "typeDefMulti.fire ×0.5.",
      fn: (pokemon) => { return { typeDefMulti: { fire: 0.5 } }; }
    },
    "honey-gather": {
      desc: "+15% PokéCoins in the run.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "huge-power": {
      desc: "+50% damage with physical moves.",
      calcDesc: "Physical outgoing ×1.5.",
      fn: () => ({ outPhy: 1.5 })
    },
    "hustle": {
      desc: "+25% damage with physical moves, but 1 in 6 physical hits comes out weak.",
      calcDesc: "Physical expected ×1.092 (5/6 hits ×1.25, 1/6 ×0.3).",
      fn: () => ({ outPhy: (1.25 * 5 + 0.3) / 6 })
    },
    "hydration": {
      desc: "In rain it recovers 1% HP per second and nothing slows it.",
      calcDesc: "Incoming ×0.982 from 1%/s rain healing (18% uptime).",
      fn: () => ({ in: sustainIn(0.01, ABILITY_ASSUME.weather) })
    },
    "hyper-cutter": {
      desc: "+6% damage with physical moves.",
      calcDesc: "Physical outgoing ×1.06.",
      fn: (pokemon) => { return { outPhy: 1.06 }; }
    },
    "ice-body": {
      desc: "Recovers 1.5% HP per second in snow.",
      calcDesc: "Incoming ×0.974 from 1.5%/s snow healing (18% uptime).",
      fn: () => ({ in: sustainIn(0.015, ABILITY_ASSUME.weather) })
    },
    "ice-scales": {
      desc: "Takes 40% less special damage.",
      calcDesc: "Special incoming ×0.6.",
      fn: () => ({ inSpe: 0.6 })
    },
    "illuminate": {
      desc: "Pulls items from farther away (+10% magnet).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "imposter": {
      desc: "Transforms: hits and endures like a balanced Pokémon.",
      calcDesc: "Stats become atk = max(atk, 1.12), DF/SD at least 72.",
      fn: (pokemon) => {
      const atk = Math.max(+pokemon.atk || 1, 1.12);
      const pa = +pokemon.pa || +pokemon.atk || 1;
      const sa = +pokemon.sa || +pokemon.atk || 1;
      const df = +pokemon.df || 75;
      const sd = +pokemon.sd || 75;
      return { pa: atk / pa, sa: atk / sa, df: Math.max(df, 72) / df, sd: Math.max(sd, 72) / sd };
    }
    },
    "infiltrator": {
      desc: "Its hits break enemy shields.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "inner-focus": {
      desc: "Inner Focus (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "insomnia": {
      desc: "Insomnia (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "intimidate": {
      desc: "Enemies deal 12% less physical damage to it.",
      calcDesc: "Physical incoming ×0.88.",
      fn: (pokemon) => { return { inPhy: 0.88 }; }
    },
    "iron-barbs": {
      desc: "Iron Barbs (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "iron-fist": {
      desc: "Iron Fist (no description).",
      calcDesc: "Move ids matching punch ×1.25.",
      fn: () => ({ moveOut: (m) => (m && /punch/.test(m.id) ? 1.25 : 1) })
    },
    "justified": {
      desc: "+15% damage to Dark-type enemies.",
      calcDesc: "Spawn-weighted +15% vs Dark-type enemies.",
      fn: () => ({ targetOut: (move, enemy) => ((enemy && enemy.types || []).includes('dark') ? 1.15 : 1) })
    },
    "keen-eye": {
      desc: "+5% critical hit chance.",
      calcDesc: "Expected ×1.024 (+5% crit; assumes 10% base crit from upgrades).",
      fn: () => ({ out: critGain(0.05) })
    },
    "klutz": {
      desc: "Without an item, +12% damage.",
      calcDesc: "Outgoing ×1.12 (assumes no held item).",
      fn: () => ({ out: 1.12 })
    },
    "leaf-guard": {
      desc: "In sun nothing slows it and it takes 15% less damage.",
      calcDesc: "Incoming ×0.973 (18% sun uptime assumed).",
      fn: () => ({ in: cond(ABILITY_ASSUME.weather, 0.85) })
    },
    "levitate": {
      desc: "Floats: unaffected by water, lava and traps, and Ground barely hurts it.",
      calcDesc: "Incoming Ground ×0.3 (lava/trap immunity not scored).",
      fn: () => ({ typeDefMulti: { ground: 0.3 } })
    },
    "libero": {
      desc: "+12% damage with all its moves.",
      calcDesc: "All outgoing damage ×1.12.",
      fn: (pokemon) => { return { out: 1.12 }; }
    },
    "lightning-rod": {
      desc: "Lightning Rod (no description).",
      calcDesc: "Electric incoming ×0 (absorbed).",
      fn: () => absorb('electric')
    },
    "limber": {
      desc: "Limber (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "magic-bounce": {
      desc: "Takes 15% less special damage and dodges 10% of those hits.",
      calcDesc: "Special incoming ×0.85; 10% special dodge.",
      fn: () => ({ inSpe: 0.85, dodgeSpecial: 0.1, dodgeNote: 'Dodges 10% of special hits.' })
    },
    "magic-guard": {
      desc: "Only attacks hurt it: not lava or traps.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "magnet-pull": {
      desc: "Pulls items from farther away (+20% magnet).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "mega-launcher": {
      desc: "Mega Launcher (no description).",
      calcDesc: "Pulse moves and aura-sphere ×1.3.",
      fn: () => ({ moveOut: (m) => (m && /pulse|aura-sphere/.test(m.id) ? 1.3 : 1) })
    },
    "minus": {
      desc: "+10% damage with special moves.",
      calcDesc: "Special outgoing ×1.1.",
      fn: (pokemon) => { return { outSpe: 1.1 }; }
    },
    "mold-breaker": {
      desc: "+12% damage to bosses.",
      calcDesc: "Outgoing ×1.012 (boss share ×12% bonus).",
      fn: () => ({ out: 1 + 0.12 * ABILITY_ASSUME.bossShare })
    },
    "moody": {
      desc: "Every 10 s, +10% to something at random: attack, special attack, speed or defense.",
      calcDesc: "Expected +10% to one random stat: outgoing/speed ×1.025, incoming ×0.975.",
      fn: () => ({ out: 1.025, spd: 1.025, in: 0.975 })
    },
    "motor-drive": {
      desc: "Motor Drive (no description).",
      calcDesc: "Electric incoming ×0 (absorbed).",
      fn: () => absorb('electric')
    },
    "moxie": {
      desc: "Moxie (no description).",
      calcDesc: "Outgoing ×1.075 (assumes half of the +15% cap on average).",
      fn: () => ({ out: 1 + 0.15 * ABILITY_ASSUME.killCapShare })
    },
    "multiscale": {
      desc: "Takes half damage while at (nearly) full HP.",
      calcDesc: "Incoming ×0.75 (near-full HP 50% uptime assumed).",
      fn: () => ({ in: cond(ABILITY_ASSUME.nearFullHp, 0.5) })
    },
    "natural-cure": {
      desc: "Recovers 0.3% of its HP per second.",
      calcDesc: "Incoming ×0.971 from 0.3%/s healing over a 10 s window.",
      fn: () => ({ in: sustainIn(0.003) })
    },
    "no-guard": {
      desc: "Everything hits: +15% damage dealt, but takes 10% more.",
      calcDesc: "Outgoing ×1.15, incoming ×1.1.",
      fn: (pokemon) => { return { out: 1.15, in: 1.1 }; }
    },
    "oblivious": {
      desc: "Oblivious (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "orichalcum-pulse": {
      desc: "Orichalcum Pulse (no description).",
      calcDesc: "Extra sun uptime assumed 25%: Fire ×1.125, Water ×0.875.",
      fn: () => ({ typeMulti: { fire: cond(ABILITY_ASSUME.summon, 1.5), water: cond(ABILITY_ASSUME.summon, 0.5) } })
    },
    "overcoat": {
      desc: "Takes 5% less special damage.",
      calcDesc: "Special incoming ×0.95.",
      fn: () => ({ inSpe: 0.95 })
    },
    "overgrow": {
      desc: "Overgrow (no description).",
      calcDesc: "Grass moves ×1.00 (below-1/3-HP condition treated as 0% uptime).",
      fn: () => ({ typeMulti: { grass: cond(ABILITY_ASSUME.lowHp, 1.35) } })
    },
    "own-tempo": {
      desc: "Own Tempo (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "pickpocket": {
      desc: "When hit, it sometimes snatches a coin.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "pickup": {
      desc: "+15% PokéCoins in the run.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "plus": {
      desc: "+10% damage with special moves.",
      calcDesc: "Special outgoing ×1.1.",
      fn: (pokemon) => { return { outSpe: 1.1 }; }
    },
    "poison-point": {
      desc: "Poison Point (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "poison-touch": {
      desc: "Its melee attacks and dashes poison.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "prankster": {
      desc: "Its boosting moves recharge 30% faster.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "pressure": {
      desc: "Takes 8% less damage.",
      calcDesc: "Incoming ×0.92.",
      fn: () => ({ in: 0.92 })
    },
    "prism-armor": {
      desc: "Super-effective attacks deal 25% less.",
      calcDesc: "Super-effective incoming ×0.75.",
      fn: () => ({ inSuper: 0.75 })
    },
    "protean": {
      desc: "+12% damage with all its moves.",
      calcDesc: "All outgoing damage ×1.12.",
      fn: (pokemon) => { return { out: 1.12 }; }
    },
    "protosynthesis": {
      desc: "In sun, +20% damage.",
      calcDesc: "All outgoing ×1.036 (18% sun uptime assumed).",
      fn: () => ({ out: cond(ABILITY_ASSUME.weather, 1.2) })
    },
    "punk-rock": {
      desc: "Punk Rock (no description).",
      calcDesc: "Voice/buzz/boom/noise/sing/echo/uproar/snarl ids ×1.3.",
      fn: () => ({ moveOut: (m) => (m && /voice|buzz|boom|noise|sing|echo|uproar|snarl/.test(m.id) ? 1.3 : 1) })
    },
    "pure-power": {
      desc: "+50% damage with physical moves.",
      calcDesc: "Alias of Huge Power: physical outgoing ×1.5.",
      fn: () => ({ outPhy: 1.5 })
    },
    "quick-feet": {
      desc: "When slowed, it goes faster (instead of slower).",
      calcDesc: "Speed ×1.375 (25% slowed uptime assumed, reversed).",
      fn: () => ({ spd: 1 + (2.5 - 1) * ABILITY_ASSUME.slowed })
    },
    "rain-dish": {
      desc: "Recovers 1.5% HP per second in rain.",
      calcDesc: "Incoming ×0.974 from 1.5%/s rain healing (18% uptime).",
      fn: () => ({ in: sustainIn(0.015, ABILITY_ASSUME.weather) })
    },
    "rattled": {
      desc: "Bug, Ghost or Dark hits scare it: +25% speed for a moment.",
      calcDesc: "Speed ×1.08 from Bug/Ghost/Dark hit buffs.",
      fn: () => ({ spd: 1.08 })
    },
    "reckless": {
      desc: "+25% damage with dashes.",
      calcDesc: "Dash moves ×1.25.",
      fn: () => ({ moveOut: (m) => (m && m.kind === 'dash' ? 1.25 : 1) })
    },
    "regenerator": {
      desc: "Recovers 0.6% of its HP per second.",
      calcDesc: "Incoming ×0.943 from 0.6%/s healing over a 10 s window.",
      fn: () => ({ in: sustainIn(0.006) })
    },
    "rivalry": {
      desc: "+15% damage to enemies that share a type with it.",
      calcDesc: "Spawn-weighted +15% vs enemies sharing a type.",
      fn: (pokemon) => ({ targetOut: (move, enemy) => ((enemy && enemy.types || []).some(t => (pokemon.types || []).includes(t)) ? 1.15 : 1) })
    },
    "rough-skin": {
      desc: "Rough Skin (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "run-away": {
      desc: "+8% speed.",
      calcDesc: "Speed ×1.08.",
      fn: () => ({ spd: 1.08 })
    },
    "sand-force": {
      desc: "+30% Rock, Ground and Steel damage in a sandstorm.",
      calcDesc: "Rock/Ground/Steel ×1.054 (18% sandstorm uptime assumed).",
      fn: () => ({ typeMulti: { rock: cond(ABILITY_ASSUME.weather, 1.3), ground: cond(ABILITY_ASSUME.weather, 1.3), steel: cond(ABILITY_ASSUME.weather, 1.3) } })
    },
    "sand-rush": {
      desc: "Sand Rush (no description).",
      calcDesc: "Speed ×1.09 (18% sandstorm uptime assumed).",
      fn: () => ({ spd: cond(ABILITY_ASSUME.weather, 1.5) })
    },
    "sand-stream": {
      desc: "Sand Stream (no description).",
      calcDesc: "Extra sandstorm uptime assumed 25%: Rock/Ground/Steel ×1.075.",
      fn: () => ({ typeMulti: { rock: cond(ABILITY_ASSUME.summon, 1.3), ground: cond(ABILITY_ASSUME.summon, 1.3), steel: cond(ABILITY_ASSUME.summon, 1.3) } })
    },
    "sand-veil": {
      desc: "In a sandstorm it dodges 15% of hits.",
      calcDesc: "Dodges ≈2.7% of hits (15% in sand × 18% uptime).",
      fn: () => ({ dodge: 0.15 * ABILITY_ASSUME.weather, dodgeNote: 'Dodges ≈2.7% of hits (15% during sandstorm).' })
    },
    "sap-sipper": {
      desc: "Sap Sipper (no description).",
      calcDesc: "Grass incoming ×0 (absorbed).",
      fn: () => absorb('grass')
    },
    "schooling": {
      desc: "School form: +25% HP and, above 1/4 HP, +50% damage.",
      calcDesc: "Max HP ×1.25; outgoing ×1.45 (assumes above 1/4 HP 90% of the time).",
      fn: () => ({ hp: 1.25, out: cond(0.9, 1.5) })
    },
    "scrappy": {
      desc: "Its Normal and Fighting moves fully hit Ghost types.",
      calcDesc: "Spawn-weighted: Normal/Fighting hits fully damage Ghost targets.",
      fn: () => ({ targetOut: (move, enemy) => ((move.type === 'normal' || move.type === 'fighting') && (enemy && enemy.types || []).includes('ghost') ? 1 / Math.max(0.3, PSC.TypeChart.multiplier(move.type, enemy.types)) : 1) })
    },
    "serene-grace": {
      desc: "Burns, poisons and slows from its moves are twice as strong.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "shadow-shield": {
      desc: "Takes half damage while at (nearly) full HP.",
      calcDesc: "Incoming ×0.75 (near-full HP 50% uptime assumed).",
      fn: () => ({ in: cond(ABILITY_ASSUME.nearFullHp, 0.5) })
    },
    "sharpness": {
      desc: "Sharpness (no description).",
      calcDesc: "Cut/slash/blade/razor/scissor/sword ids ×1.3.",
      fn: () => ({ moveOut: (m) => (m && /cut|slash|blade|razor|scissor|sword/.test(m.id) ? 1.3 : 1) })
    },
    "shed-skin": {
      desc: "Every 5 s it sheds: removes slows and recovers 2% HP.",
      calcDesc: "Incoming ×0.962 from 2% healing every 5 s.",
      fn: () => ({ in: sustainIn(0.004) })
    },
    "sheer-force": {
      desc: "+25% damage with moves that burn, poison, slow or push, but they lose that effect.",
      calcDesc: "Moves that burn/poison/slow/knock ×1.25 (secondary effect ignored).",
      fn: () => ({ moveOut: (m) => (m && (m.burn || m.poison || m.slow || m.knock) ? 1.25 : 1) })
    },
    "shell-armor": {
      desc: "Takes 8% less damage.",
      calcDesc: "Incoming ×0.92.",
      fn: () => ({ in: 0.92 })
    },
    "shield-dust": {
      desc: "Shield Dust (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "skill-link": {
      desc: "+25% damage with multi-hit moves.",
      calcDesc: "Multi-hit (count > 2) and bounce moves ×1.25.",
      fn: () => ({ moveOut: (m) => (m && ((+m.count || 1) > 2 || m.bounce) ? 1.25 : 1) })
    },
    "slow-start": {
      desc: "Slow start: for the first minute it deals −40% damage and moves slower; after that, full power.",
      calcDesc: "Outgoing ×0.987 and speed ×0.993 (first 60 s averaged over 1,800 s).",
      fn: () => ({ out: 1 - 0.4 * 60 / ABILITY_ASSUME.runSec, spd: 1 - 0.2 * 60 / ABILITY_ASSUME.runSec })
    },
    "slush-rush": {
      desc: "Slush Rush (no description).",
      calcDesc: "Speed ×1.09 (18% snow uptime assumed).",
      fn: () => ({ spd: cond(ABILITY_ASSUME.weather, 1.5) })
    },
    "sniper": {
      desc: "Its critical hits deal ×2 damage (instead of ×1.5).",
      calcDesc: "Expected ×1.048 (crits ×2; assumes 10% base crit from upgrades).",
      fn: () => ({ out: critGain(0, 2) })
    },
    "snow-cloak": {
      desc: "In snow it dodges 15% of hits.",
      calcDesc: "Dodges ≈2.7% of hits (15% in snow × 18% uptime).",
      fn: () => ({ dodge: 0.15 * ABILITY_ASSUME.weather, dodgeNote: 'Dodges ≈2.7% of hits (15% during snow).' })
    },
    "snow-warning": {
      desc: "Snow Warning (no description).",
      calcDesc: "Extra snow uptime assumed 25%: Ice ×1.125.",
      fn: () => ({ typeMulti: { ice: cond(ABILITY_ASSUME.summon, 1.5) } })
    },
    "solar-power": {
      desc: "+40% special damage in sun, but the sun drains some HP.",
      calcDesc: "Special ×1.072 (18% sun uptime assumed); HP drain ignored.",
      fn: () => ({ outSpe: cond(ABILITY_ASSUME.weather, 1.4) })
    },
    "solid-rock": {
      desc: "Super-effective attacks deal 25% less.",
      calcDesc: "Super-effective incoming ×0.75.",
      fn: () => ({ inSuper: 0.75 })
    },
    "soundproof": {
      desc: "Takes 10% less special damage.",
      calcDesc: "Special incoming ×0.9.",
      fn: () => ({ inSpe: 0.9 })
    },
    "speed-boost": {
      desc: "Every 10 seconds it gets 1.5% faster (up to +30%).",
      calcDesc: "Speed ×1.15 (assumes half of the +30% cap on average).",
      fn: () => ({ spd: 1 + 0.3 * ABILITY_ASSUME.speedCapShare })
    },
    "stamina": {
      desc: "Each melee hit it takes raises its defense a little.",
      calcDesc: "Contact defense buffs approximated as DF ×1.15.",
      fn: () => ({ df: 1.15 })
    },
    "stance-change": {
      desc: "Switches every 8 s between blade (+20% damage) and shield (−20% damage taken).",
      calcDesc: "Outgoing ×1.1 and incoming ×0.9 (half time in each stance).",
      fn: () => ({ out: cond(0.5, 1.2), in: cond(0.5, 0.8) })
    },
    "static": {
      desc: "Static (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "steadfast": {
      desc: "When hit, +10% speed for a moment (stacks).",
      calcDesc: "Speed ×1.10 from repeated hit buffs.",
      fn: () => ({ spd: 1.10 })
    },
    "steelworker": {
      desc: "+20% damage with Steel moves.",
      calcDesc: "typeMulti.steel ×1.2.",
      fn: (pokemon) => { return { typeMulti: { steel: 1.2 } }; }
    },
    "steely-spirit": {
      desc: "+20% damage with Steel moves.",
      calcDesc: "typeMulti.steel ×1.2.",
      fn: (pokemon) => { return { typeMulti: { steel: 1.2 } }; }
    },
    "stench": {
      desc: "Its hits sometimes slow (1 in 10).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "sticky-hold": {
      desc: "Pulls items from farther away (+20% magnet).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "storm-drain": {
      desc: "Storm Drain (no description).",
      calcDesc: "Water incoming ×0 (absorbed).",
      fn: () => absorb('water')
    },
    "strong-jaw": {
      desc: "Strong Jaw (no description).",
      calcDesc: "Move ids matching bite/fang/crunch/jaw ×1.3.",
      fn: () => ({ moveOut: (m) => (m && /bite|fang|crunch|jaw/.test(m.id) ? 1.3 : 1) })
    },
    "sturdy": {
      desc: "A hit that would KO it leaves it with 1 HP (every 90 s).",
      calcDesc: "Incoming ×0.95 (approximate value of the 90 s anti-KO safeguard).",
      fn: () => ({ in: 0.95 })
    },
    "super-luck": {
      desc: "+10% critical hit chance.",
      calcDesc: "Expected ×1.048 (+10% crit; assumes 10% base crit from upgrades).",
      fn: () => ({ out: critGain(0.1) })
    },
    "swarm": {
      desc: "Swarm (no description).",
      calcDesc: "Bug moves ×1.00 (below-1/3-HP condition treated as 0% uptime).",
      fn: () => ({ typeMulti: { bug: cond(ABILITY_ASSUME.lowHp, 1.35) } })
    },
    "sweet-veil": {
      desc: "Sweet Veil (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "swift-swim": {
      desc: "Swift Swim (no description).",
      calcDesc: "Speed ×1.09 (18% rain uptime assumed).",
      fn: () => ({ spd: cond(ABILITY_ASSUME.weather, 1.5) })
    },
    "synchronize": {
      desc: "Whoever hits it in melee takes part of the hit back.",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "tangled-feet": {
      desc: "When slowed, it dodges 20% of hits.",
      calcDesc: "Dodges ≈5% of hits (20% while slowed × 25% uptime).",
      fn: () => ({ dodge: 0.2 * ABILITY_ASSUME.slowed, dodgeNote: 'Dodges ≈5% of hits (20% while slowed).' })
    },
    "technician": {
      desc: "+35% damage with weak-hitting moves.",
      calcDesc: "Moves with ≤12 listed damage ×1.35.",
      fn: () => ({ moveOut: (m) => (m && +m.dmg <= 12 ? 1.35 : 1) })
    },
    "telepathy": {
      desc: "Reads intentions: dodges 8% of hits.",
      calcDesc: "Dodges 8% of hits.",
      fn: () => ({ dodge: 0.08, dodgeNote: 'Dodges 8% of hits.' })
    },
    "thick-fat": {
      desc: "Takes half damage from Fire and Ice.",
      calcDesc: "typeDefMulti fire/ice ×0.5.",
      fn: (pokemon) => { return { typeDefMulti: { fire: 0.5, ice: 0.5 } }; }
    },
    "tinted-lens": {
      desc: "Its not very effective moves deal normal damage.",
      calcDesc: "Spawn-weighted: resisted hits become neutral (immune 0.3 is also lifted, as in-game).",
      fn: () => ({ targetOut: (move, enemy) => { const k = PSC.TypeChart.multiplier(move.type, (enemy && enemy.types) || []); return k > 0 && k < 1 ? 1 / k : 1; } })
    },
    "torrent": {
      desc: "Torrent (no description).",
      calcDesc: "Water moves ×1.00 (below-1/3-HP condition treated as 0% uptime).",
      fn: () => ({ typeMulti: { water: cond(ABILITY_ASSUME.lowHp, 1.35) } })
    },
    "tough-claws": {
      desc: "+25% damage with melee attacks and dashes.",
      calcDesc: "Melee and dash moves ×1.25.",
      fn: () => ({ moveOut: (m) => (m && (m.kind === 'melee' || m.kind === 'dash') ? 1.25 : 1) })
    },
    "transistor": {
      desc: "+20% damage with Electric moves.",
      calcDesc: "typeMulti.electric ×1.2.",
      fn: (pokemon) => { return { typeMulti: { electric: 1.2 } }; }
    },
    "truant": {
      desc: "Slow but heavy: recharges take 60% longer, but each hit deals +35%.",
      calcDesc: "DPS ×0.844 = ×1.35 damage ÷ 1.6 cooldown.",
      fn: () => ({ out: 1.35 / 1.6 })
    },
    "unaware": {
      desc: "Unimpressed: takes 8% less damage.",
      calcDesc: "Incoming ×0.92.",
      fn: () => ({ in: 0.92 })
    },
    "unburden": {
      desc: "Without an item it is 15% faster.",
      calcDesc: "Speed ×1.15 (assumes no held item).",
      fn: () => ({ spd: 1.15 })
    },
    "unnerve": {
      desc: "Makes enemies nervous: they deal 6% less damage to it.",
      calcDesc: "Incoming ×0.94.",
      fn: () => ({ in: 0.94 })
    },
    "vital-spirit": {
      desc: "Vital Spirit (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "volt-absorb": {
      desc: "Volt Absorb (no description).",
      calcDesc: "Electric incoming ×0 (absorbed).",
      fn: () => absorb('electric')
    },
    "water-absorb": {
      desc: "Water Absorb (no description).",
      calcDesc: "Water incoming ×0 (absorbed).",
      fn: () => absorb('water')
    },
    "water-bubble": {
      desc: "+40% Water damage and takes half damage from Fire.",
      calcDesc: "typeMulti.water ×1.4; typeDefMulti.fire ×0.5.",
      fn: (pokemon) => { return { typeMulti: { water: 1.4 }, typeDefMulti: { fire: 0.5 } }; }
    },
    "water-veil": {
      desc: "Lava does not burn it and it takes half damage from Fire.",
      calcDesc: "Fire incoming ×0.5 (lava burn immunity not scored).",
      fn: () => ({ typeDefMulti: { fire: 0.5 } })
    },
    "weak-armor": {
      desc: "When hit physically it gets lighter: +20% speed for a moment.",
      calcDesc: "Speed ×1.05 from repeated physical-hit buffs.",
      fn: () => ({ spd: 1.05 })
    },
    "well-baked-body": {
      desc: "Well-Baked Body (no description).",
      calcDesc: "Fire incoming ×0 (absorbed).",
      fn: () => absorb('fire')
    },
    "white-smoke": {
      desc: "White Smoke (no description).",
      calcDesc: "Utility only (no damage, EHP or score effect).",
      fn: () => ({})
    },
    "wonder-guard": {
      desc: "Anything not super effective barely hurts it (35%); super effective hits deal 50% more.",
      calcDesc: "Super-effective incoming ×1.5; everything else ×0.35.",
      fn: () => ({ inSuper: 1.5, inNotSuper: 0.35 })
    },
    "zen-mode": {
      desc: "Below half HP it enters Zen Mode: +30% special damage.",
      calcDesc: "Special ×1.00 (below-half-HP condition treated as 0% uptime).",
      fn: () => ({ outSpe: cond(ABILITY_ASSUME.halfHp, 1.3) })
    }
  };
})();

/* Aliases kept from the game data. */
ABILITIES['libero'] = ABILITIES['protean'];

/* Expose the assumption set for calc.js (crit) and the Mechanics tab. */
if (typeof window !== 'undefined') {
  window.PSC = window.PSC || {};
  window.PSC.AbilityAssumptions = ABILITY_ASSUME;
  window.PSC.BASE_CRIT = { chance: BASE_CRIT_CHANCE, mul: BASE_CRIT_MUL };
}
