/* Toolkit ability definitions — not the game AbilityFX runtime.
 * fn(pokemon) receives a Pokédex row and returns multipliers:
 *   pa, sa, df, sd, spd  — stat multis
 *   out, outPhy, outSpe  — outgoing damage multis
 *   in, inPhy, inSpe     — incoming damage multis (lower = tankier)
 *   typeMulti: { type: m }     — outgoing by move type
 *   typeDefMulti: { type: m }  — incoming by attack type
 * Empty return {} = no numeric effect in this calculator.
 */
const ABILITIES = {
  'adaptability': {
    desc: "+25% damage with moves of its own types.",
    calcDesc: "typeMulti ×1.25 for each of the Pokémon's types (STAB path / matrix).",
    fn: (pokemon) => { const tm = {}; (pokemon.types||[]).forEach(t => tm[t] = 1.25); return { typeMulti: tm }; }
  },
  'aftermath': {
    desc: "Once per run, when low on HP, it explodes and hurts everything around.",
    calcDesc: "Will not implement (once-per-run explosion on low HP).",
    fn: (pokemon) => ({})
  },
  'analytic': {
    desc: "+15% damage to enemies below half HP.",
    calcDesc: "Will not implement (requires target <50% HP).",
    fn: (pokemon) => ({})
  },
  'anger-point': {
    desc: "The first time it drops below half HP it gets angry: +25% damage for the rest of the run.",
    calcDesc: "Will not implement (first time below half HP).",
    fn: (pokemon) => ({})
  },
  'anticipation': {
    desc: "Senses danger: dodges 6% of hits.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'battle-armor': {
    desc: "Takes 8% less damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'beast-boost': {
    desc: "Beast Boost (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'big-pecks': {
    desc: "Takes 8% less physical damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'blaze': {
    desc: "Blaze (no description).",
    calcDesc: "Will not implement (requires <1/3 HP).",
    fn: (pokemon) => ({})
  },
  'bulletproof': {
    desc: "Takes 15% less special damage.",
    calcDesc: "Special incoming ×0.85.",
    fn: (pokemon) => { return { inSpe: 0.85 }; }
  },
  'chilling-neigh': {
    desc: "Chilling Neigh (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'chlorophyll': {
    desc: "Chlorophyll (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'clear-body': {
    desc: "Clear Body (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'competitive': {
    desc: "If it is slowed it fights back: +20% special damage while it lasts.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'compound-eyes': {
    desc: "+6% critical hit chance.",
    calcDesc: "Will not implement (accuracy / non-damage).",
    fn: (pokemon) => ({})
  },
  'contrary': {
    desc: "The other way round: when slowed, it goes faster.",
    calcDesc: "Will not implement (speed while slowed).",
    fn: (pokemon) => ({})
  },
  'cursed-body': {
    desc: "Cursed Body (no description).",
    calcDesc: "Will not implement (contact slow RNG).",
    fn: (pokemon) => ({})
  },
  'cute-charm': {
    desc: "Cute Charm (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'damp': {
    desc: "Explosions from kamikaze Pokémon do not hurt it.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'defeatist': {
    desc: "Glass cannon: +15% damage above half HP; below it, −25%.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'defiant': {
    desc: "If it is slowed it fights back: +20% physical damage while it lasts.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'dragons-maw': {
    desc: "+20% damage with Dragon moves.",
    calcDesc: "typeMulti.dragon ×1.2.",
    fn: (pokemon) => { return { typeMulti: { dragon: 1.2 } }; }
  },
  'drizzle': {
    desc: "Drizzle (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'drought': {
    desc: "Drought (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'dry-skin': {
    desc: "Water heals it and rain restores HP, but Fire deals 25% more.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'early-bird': {
    desc: "Early Bird (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'earth-eater': {
    desc: "Earth Eater (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'effect-spore': {
    desc: "Effect Spore (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'filter': {
    desc: "Super-effective attacks deal 25% less.",
    calcDesc: "Incoming ×0.9 as a static average SE mitigation (approx).",
    fn: (pokemon) => { return { in: 0.9 }; }
  },
  'flame-body': {
    desc: "Flame Body (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'flash-fire': {
    desc: "Flash Fire (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'fluffy': {
    desc: "Takes 30% less physical damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'forewarn': {
    desc: "Senses danger: dodges 6% of hits.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'friend-guard': {
    desc: "Takes 6% less damage.",
    calcDesc: "Incoming ×0.94.",
    fn: (pokemon) => { return { in: 0.94 }; }
  },
  'frisk': {
    desc: "Pulls items from farther away (+20% magnet).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'full-metal-body': {
    desc: "Full Metal Body (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'fur-coat': {
    desc: "Takes 40% less physical damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'gluttony': {
    desc: "Healing heals it 40% more.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'grim-neigh': {
    desc: "Grim Neigh (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'guts': {
    desc: "+30% physical damage under half HP.",
    calcDesc: "Will not implement (requires <50% HP).",
    fn: (pokemon) => ({})
  },
  'harvest': {
    desc: "Healing heals it 30% more.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'healer': {
    desc: "Recovers 0.3% of its HP per second.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'heatproof': {
    desc: "Takes half damage from Fire.",
    calcDesc: "typeDefMulti.fire ×0.5.",
    fn: (pokemon) => { return { typeDefMulti: { fire: 0.5 } }; }
  },
  'honey-gather': {
    desc: "+15% PokéCoins in the run.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'huge-power': {
    desc: "+50% damage with physical moves.",
    calcDesc: "PA / physical outgoing ×1.5.",
    fn: (pokemon) => { return { pa: 1.5, outPhy: 1.5 }; }
  },
  'hustle': {
    desc: "+25% damage with physical moves, but 1 in 6 physical hits comes out weak.",
    calcDesc: "Will not implement (RNG physical damage).",
    fn: (pokemon) => ({})
  },
  'hydration': {
    desc: "In rain it recovers 1% HP per second and nothing slows it.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'hyper-cutter': {
    desc: "+6% damage with physical moves.",
    calcDesc: "Physical outgoing ×1.06.",
    fn: (pokemon) => { return { outPhy: 1.06 }; }
  },
  'ice-body': {
    desc: "Recovers 1.5% HP per second in snow.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'ice-scales': {
    desc: "Takes 40% less special damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'illuminate': {
    desc: "Pulls items from farther away (+10% magnet).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'imposter': {
    desc: "Transforms: hits and endures like a balanced Pokémon.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'infiltrator': {
    desc: "Its hits break enemy shields.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'inner-focus': {
    desc: "Inner Focus (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'insomnia': {
    desc: "Insomnia (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'intimidate': {
    desc: "Enemies deal 12% less physical damage to it.",
    calcDesc: "Physical incoming ×0.88.",
    fn: (pokemon) => { return { inPhy: 0.88 }; }
  },
  'iron-barbs': {
    desc: "Iron Barbs (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'iron-fist': {
    desc: "Iron Fist (no description).",
    calcDesc: "Will not implement (depends on move name/id pattern).",
    fn: (pokemon) => ({})
  },
  'justified': {
    desc: "+15 % damage a los Pokémon de tipo Siniestro.",
    calcDesc: "Will not implement (requires Dark-type target).",
    fn: (pokemon) => ({})
  },
  'keen-eye': {
    desc: "+5% critical hit chance.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'klutz': {
    desc: "Without an item, +12% damage.",
    calcDesc: "Will not implement (depends on held item state).",
    fn: (pokemon) => ({})
  },
  'leaf-guard': {
    desc: "In sun nothing slows it and it takes 15% less damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'levitate': {
    desc: "Floats: unaffected by water, lava and traps, and Ground barely hurts it.",
    calcDesc: "Will not implement (ground immunity mark, not a flat multi).",
    fn: (pokemon) => ({})
  },
  'libero': {
    desc: "+12% damage with all its moves.",
    calcDesc: "Alias of Protean: all outgoing ×1.12.",
    fn: (pokemon) => { return { out: 1.12 }; }
  },
  'lightning-rod': {
    desc: "Lightning Rod (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'limber': {
    desc: "Limber (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'magic-bounce': {
    desc: "Takes 15% less special damage and dodges 10% of those hits.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'magic-guard': {
    desc: "Only attacks hurt it: not lava or traps.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'magnet-pull': {
    desc: "Pulls items from farther away (+20% magnet).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'mega-launcher': {
    desc: "Mega Launcher (no description).",
    calcDesc: "Will not implement (depends on move name/id pattern).",
    fn: (pokemon) => ({})
  },
  'minus': {
    desc: "+10% damage with special moves.",
    calcDesc: "Special outgoing ×1.1.",
    fn: (pokemon) => { return { outSpe: 1.1 }; }
  },
  'mold-breaker': {
    desc: "+12% damage to bosses.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'moody': {
    desc: "Every 10 s, +10% to something at random: attack, special attack, speed or defense.",
    calcDesc: "Will not implement (random rotating buff via tick).",
    fn: (pokemon) => ({})
  },
  'motor-drive': {
    desc: "Motor Drive (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'moxie': {
    desc: "Moxie (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'multiscale': {
    desc: "Takes half damage while at (nearly) full HP.",
    calcDesc: "Will not implement (requires near-full HP).",
    fn: (pokemon) => ({})
  },
  'natural-cure': {
    desc: "Recovers 0.3% of its HP per second.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'no-guard': {
    desc: "Everything hits: +15% damage dealt, but takes 10% more.",
    calcDesc: "Outgoing ×1.15, incoming ×1.1.",
    fn: (pokemon) => { return { out: 1.15, in: 1.1 }; }
  },
  'oblivious': {
    desc: "Oblivious (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'orichalcum-pulse': {
    desc: "Orichalcum Pulse (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'overcoat': {
    desc: "Takes 5% less special damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'overgrow': {
    desc: "Overgrow (no description).",
    calcDesc: "Will not implement (requires <1/3 HP).",
    fn: (pokemon) => ({})
  },
  'own-tempo': {
    desc: "Own Tempo (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'pickpocket': {
    desc: "When hit, it sometimes snatches a coin.",
    calcDesc: "Will not implement (coin drop on hurt).",
    fn: (pokemon) => ({})
  },
  'pickup': {
    desc: "+15% PokéCoins in the run.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'plus': {
    desc: "+10% damage with special moves.",
    calcDesc: "Special outgoing ×1.1.",
    fn: (pokemon) => { return { outSpe: 1.1 }; }
  },
  'poison-point': {
    desc: "Poison Point (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'poison-touch': {
    desc: "Its melee attacks and dashes poison.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'prankster': {
    desc: "Its boosting moves recharge 30% faster.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'pressure': {
    desc: "Takes 8% less damage.",
    calcDesc: "Incoming ×0.92.",
    fn: (pokemon) => { return { in: 0.92 }; }
  },
  'prism-armor': {
    desc: "Super-effective attacks deal 25% less.",
    calcDesc: "Incoming ×0.9 as a static average SE mitigation (approx).",
    fn: (pokemon) => { return { in: 0.9 }; }
  },
  'protean': {
    desc: "+12% damage with all its moves.",
    calcDesc: "All outgoing damage ×1.12.",
    fn: (pokemon) => { return { out: 1.12 }; }
  },
  'protosynthesis': {
    desc: "In sun, +20% damage.",
    calcDesc: "Will not implement (requires sun).",
    fn: (pokemon) => ({})
  },
  'punk-rock': {
    desc: "Punk Rock (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'pure-power': {
    desc: "+50% damage with physical moves.",
    calcDesc: "Alias of Huge Power: PA / physical outgoing ×1.5.",
    fn: (pokemon) => { return { pa: 1.5, outPhy: 1.5 }; }
  },
  'quick-feet': {
    desc: "When slowed, it goes faster (instead of slower).",
    calcDesc: "Will not implement (speed only while slowed).",
    fn: (pokemon) => ({})
  },
  'rain-dish': {
    desc: "Recovers 1.5% HP per second in rain.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'rattled': {
    desc: "Bug, Ghost or Dark hits scare it: +25% speed for a moment.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'reckless': {
    desc: "+25% damage with dashes.",
    calcDesc: "Will not implement (depends on dash kind).",
    fn: (pokemon) => ({})
  },
  'regenerator': {
    desc: "Recovers 0.6% of its HP per second.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'rivalry': {
    desc: "+15% damage to enemies that share a type with it.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'rough-skin': {
    desc: "Rough Skin (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'run-away': {
    desc: "+8% speed.",
    calcDesc: "Will not implement (utility only).",
    fn: (pokemon) => ({})
  },
  'sand-force': {
    desc: "+30% Rock, Ground and Steel damage in a sandstorm.",
    calcDesc: "Will not implement (requires sandstorm).",
    fn: (pokemon) => ({})
  },
  'sand-rush': {
    desc: "Sand Rush (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'sand-stream': {
    desc: "Sand Stream (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'sand-veil': {
    desc: "In a sandstorm it dodges 15% of hits.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'sap-sipper': {
    desc: "Sap Sipper (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'schooling': {
    desc: "School form: +25% HP and, above 1/4 HP, +50% damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'scrappy': {
    desc: "Its Normal and Fighting moves fully hit Ghost types.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'serene-grace': {
    desc: "Burns, poisons and slows from its moves are twice as strong.",
    calcDesc: "Will not implement (status strength only, not damage).",
    fn: (pokemon) => ({})
  },
  'shadow-shield': {
    desc: "Takes half damage while at (nearly) full HP.",
    calcDesc: "Will not implement (requires near-full HP).",
    fn: (pokemon) => ({})
  },
  'sharpness': {
    desc: "Sharpness (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'shed-skin': {
    desc: "Every 5 s it sheds: removes slows and recovers 2% HP.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'sheer-force': {
    desc: "+25% damage with moves that burn, poison, slow or push, but they lose that effect.",
    calcDesc: "Will not implement (depends on move secondary effects).",
    fn: (pokemon) => ({})
  },
  'shell-armor': {
    desc: "Takes 8% less damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'shield-dust': {
    desc: "Shield Dust (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'skill-link': {
    desc: "+25% damage with multi-hit moves.",
    calcDesc: "Will not implement (depends on multi-hit moves).",
    fn: (pokemon) => ({})
  },
  'slow-start': {
    desc: "Slow start: for the first minute it deals −40% damage and moves slower; after that, full power.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'slush-rush': {
    desc: "Slush Rush (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'sniper': {
    desc: "Its critical hits deal ×2 damage (instead of ×1.5).",
    calcDesc: "Will not implement (crit damage only).",
    fn: (pokemon) => ({})
  },
  'snow-cloak': {
    desc: "In snow it dodges 15% of hits.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'snow-warning': {
    desc: "Snow Warning (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'solar-power': {
    desc: "+40% special damage in sun, but the sun drains some HP.",
    calcDesc: "Will not implement (requires sun + HP drain).",
    fn: (pokemon) => ({})
  },
  'solid-rock': {
    desc: "Super-effective attacks deal 25% less.",
    calcDesc: "Incoming ×0.9 as a static average SE mitigation (approx).",
    fn: (pokemon) => { return { in: 0.9 }; }
  },
  'soundproof': {
    desc: "Takes 10% less special damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'spa': {
    desc: "spa (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'speed-boost': {
    desc: "Every 10 seconds it gets 1.5% faster (up to +30%).",
    calcDesc: "Will not implement (speed over time / non-damage table).",
    fn: (pokemon) => ({})
  },
  'stamina': {
    desc: "Each melee hit it takes raises its defense a little.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'stance-change': {
    desc: "Switches every 8 s between blade (+20% damage) and shield (−20% damage taken).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'static': {
    desc: "Static (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'steadfast': {
    desc: "When hit, +10% speed for a moment (stacks).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'steelworker': {
    desc: "+20% damage with Steel moves.",
    calcDesc: "typeMulti.steel ×1.2.",
    fn: (pokemon) => { return { typeMulti: { steel: 1.2 } }; }
  },
  'steely-spirit': {
    desc: "+20% damage with Steel moves.",
    calcDesc: "typeMulti.steel ×1.2.",
    fn: (pokemon) => { return { typeMulti: { steel: 1.2 } }; }
  },
  'stench': {
    desc: "Its hits sometimes slow (1 in 10).",
    calcDesc: "Will not implement (on-hit slow RNG only).",
    fn: (pokemon) => ({})
  },
  'sticky-hold': {
    desc: "Pulls items from farther away (+20% magnet).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'storm-drain': {
    desc: "Storm Drain (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'strong-jaw': {
    desc: "Strong Jaw (no description).",
    calcDesc: "Will not implement (depends on move name/id pattern).",
    fn: (pokemon) => ({})
  },
  'sturdy': {
    desc: "A hit that would KO it leaves it with 1 HP (every 90 s).",
    calcDesc: "Will not implement (survive KO once / timed).",
    fn: (pokemon) => ({})
  },
  'super-luck': {
    desc: "+10% critical hit chance.",
    calcDesc: "Will not implement (crit rate only).",
    fn: (pokemon) => ({})
  },
  'swarm': {
    desc: "Swarm (no description).",
    calcDesc: "Will not implement (requires <1/3 HP).",
    fn: (pokemon) => ({})
  },
  'sweet-veil': {
    desc: "Sweet Veil (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'swift-swim': {
    desc: "Swift Swim (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'synchronize': {
    desc: "Whoever hits it in melee takes part of the hit back.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'tangled-feet': {
    desc: "When slowed, it dodges 20% of hits.",
    calcDesc: "Will not implement (conditional dodge while slowed).",
    fn: (pokemon) => ({})
  },
  'technician': {
    desc: "+35% damage with weak-hitting moves.",
    calcDesc: "Will not implement (depends on move power ≤12).",
    fn: (pokemon) => ({})
  },
  'telepathy': {
    desc: "Reads intentions: dodges 8% of hits.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'thick-fat': {
    desc: "Takes half damage from Fire and Ice.",
    calcDesc: "typeDefMulti fire/ice ×0.5.",
    fn: (pokemon) => { return { typeDefMulti: { fire: 0.5, ice: 0.5 } }; }
  },
  'tinted-lens': {
    desc: "Its not very effective moves deal normal damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'torrent': {
    desc: "Torrent (no description).",
    calcDesc: "Will not implement (requires <1/3 HP).",
    fn: (pokemon) => ({})
  },
  'tough-claws': {
    desc: "+25% damage with melee attacks and dashes.",
    calcDesc: "Will not implement (depends on melee/dash kind).",
    fn: (pokemon) => ({})
  },
  'transistor': {
    desc: "+20% damage with Electric moves.",
    calcDesc: "typeMulti.electric ×1.2.",
    fn: (pokemon) => { return { typeMulti: { electric: 1.2 } }; }
  },
  'truant': {
    desc: "Slow but heavy: recharges take 60% longer, but each hit deals +35%.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'unaware': {
    desc: "Unimpressed: takes 8% less damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'unburden': {
    desc: "Without an item it is 15% faster.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'unnerve': {
    desc: "Makes enemies nervous: they deal 6% less damage to it.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'vital-spirit': {
    desc: "Vital Spirit (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'volt-absorb': {
    desc: "Volt Absorb (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'water-absorb': {
    desc: "Water Absorb (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'water-bubble': {
    desc: "+40% Water damage and takes half damage from Fire.",
    calcDesc: "typeMulti.water ×1.4; typeDefMulti.fire ×0.5.",
    fn: (pokemon) => { return { typeMulti: { water: 1.4 }, typeDefMulti: { fire: 0.5 } }; }
  },
  'water-veil': {
    desc: "Lava does not burn it and it takes half damage from Fire.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'weak-armor': {
    desc: "When hit physically it gets lighter: +20% speed for a moment.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'well-baked-body': {
    desc: "Well-Baked Body (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'white-smoke': {
    desc: "White Smoke (no description).",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'wonder-guard': {
    desc: "Anything not super effective barely hurts it (35%); super effective hits deal 50% more.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
  'zen-mode': {
    desc: "Below half HP it enters Zen Mode: +30% special damage.",
    calcDesc: "Will not implement (no stable damage dealt/taken multi under static assumptions).",
    fn: (pokemon) => ({})
  },
};

/** Resolve ability mods for a Pokédex row. */
function getAbilityMods(pokemon) {
  const id = pokemon && pokemon.abilityId;
  if (!id || !ABILITIES[id] || typeof ABILITIES[id].fn !== 'function') return {};
  try {
    const r = ABILITIES[id].fn(pokemon) || {};
    return (r && typeof r === 'object') ? r : {};
  } catch (e) { return {}; }
}

function abilityMeta(id) {
  const a = ABILITIES[id];
  if (!a) return { desc: '', calcDesc: 'Unknown ability', implemented: false };
  const mods = (() => { try { return a.fn({ types: [], abilityId: id }) || {}; } catch (e) { return {}; } })();
  const has = mods && Object.keys(mods).length > 0;
  const wni = (a.calcDesc || "").indexOf("Will not implement") === 0;
  return { desc: a.desc || "", calcDesc: a.calcDesc || "", implemented: has, willNot: wni };
}
