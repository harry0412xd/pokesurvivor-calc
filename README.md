# PokéSurvivor Toolkit

Interactive DPS / Pokédex / weakness / calculator for [PokéSurvivor](https://github.com/JPTER78/pokesurvivor).

**Site:** https://harry0412xd.github.io/pokesurvivor-toolkit/

**Current version:** 1.3.0

## Features

- Live data from the official game repo (no hard-coded moves/Pokédex)
- **Client cache** (localStorage, 1 h recheck) — does not fetch the repo on every refresh
- DPS table (Lv1→5) with poison/burn DoT, avg type mult, **weather avg mult**
- Calculator with 4×4 move grid, ATK buff stacking, bond support
- Pokédex with coverage, ranks, radar
- Best type combos ranker
- Weakness matrix (Best / Avg-split)
- Size compare
- Items list
- Config for hit-cap approximations, weather, DoT refs
- Type multi-select (real species combos only)

## Weather model (from weather.js)

- Starts at 2:00, every 60 s has 18% chance to roll weather
- Duration ~55–75 s; biome switches every 4 min
- ~18% of a 30-min run has weather active
- Per-type average multipliers applied when “Use weather avg” is checked

## Deploy

Upload `pokesurvivor-toolkit-full.html` (from project artifacts) as `index.html` to the repo root.

Settings → Pages → Deploy from branch → main / (root)
