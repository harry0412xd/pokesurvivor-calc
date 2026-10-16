# PokéSurvivor Toolkit

Interactive DPS / Pokédex / weakness / calculator for [PokéSurvivor](https://github.com/JPTER78/pokesurvivor).

**Site:** https://harry0412xd.github.io/pokesurvivor-toolkit/  
**Version:** 1.4.0 (MVC)

## Structure (MVC)

```
index.html          # shell + panels
css/style.css
js/model.js         # data, cache, fetch, DPS / type / weather math
js/view.js          # all render* / tooltips / chips
js/controller.js    # events, getConfig, tabs, boot
js/app.js           # version badge
```

## Features

- Live data from official game repo (no hard-coded moves/Pokédex)
- Client cache (localStorage, 1 h recheck)
- DPS table + Mult column (ATK × type × weather) + Buffs table
- Weather avg multipliers (~18% uptime, biome-weighted)
- Calculator 4×4; buffs share move slots
- Combo ranker + prefer-switch toggle (iOS-style)
- Pokédex, weakness matrix, size compare, items

## Deploy

Upload `index.html`, `css/`, and `js/` to the repo root.

Pages: Settings → Pages → branch **main** / **(root)**
