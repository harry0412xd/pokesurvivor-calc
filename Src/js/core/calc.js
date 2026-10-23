/* Calculation core: move instances, DPS, hitbox, damage reduction, scores
 * and the matrices shown by the Pokédex header buttons.
 */
window.PSC = window.PSC || {};

PSC.Calc = (function () {
  const U = PSC.Utils;
  const MULT_KEYS = ['dmg', 'cd', 'speed', 'radius', 'dur', 'amount', 'arc', 'width', 'spread', 'life', 'size', 'rate'];
  const ADD_KEYS = ['count', 'pierce', 'stacks'];

  function data() { return PSC.Data.state; }

  function applyMods(s, m) {
    for (const k in m) {
      if (MULT_KEYS.includes(k) && s[k] != null) s[k] *= m[k];
      else if (ADD_KEYS.includes(k)) s[k] = (s[k] || 0) + m[k];
      else s[k] = m[k];
    }
  }

  /** Build a move instance at a level (and optionally evolved). */
  function instance(def, lvl, evolved) {
    if (!def) return null;
    const d = data();
    const s = Object.assign({}, def, {
      lvl: lvl == null ? 1 : lvl,
      evolved: false,
      cat: def.cat || (def.kind === 'buff' ? null : 'special')
    });
    const ups = def.ups || [];
    for (let i = 0; i < (s.lvl - 1) && i < ups.length; i++) applyMods(s, ups[i].m);
    if (evolved && d.evo && d.evo[def.id] && d.evoMods && d.evoMods[def.kind] && s.lvl >= 5) {
      applyMods(s, d.evoMods[def.kind].m);
      s.evolved = true;
      s.nameEn = d.evo[def.id][0];
    }
    return s;
  }

  /** Mobbing hit estimate (same model as the legacy calculator). */
  function estimateMobHits(s, cfg) {
    const p = (cfg.projHitPct != null ? cfg.projHitPct : 70) / 100;
    const rE = cfg.avgEnemyR || 12;
    const foot = Math.PI * rE * rE;
    const count = Math.max(1, s.count | 0);
    const pierce = Math.max(0, s.pierce | 0);
    const kind = s.kind;
    let n = 1;
    let detail = '1 target';

    if (kind === 'projectile' || kind === 'homing' || kind === 'beam' || kind === 'dash' || kind === 'melee') {
      n = p * count * (1 + pierce);
      detail = (cfg.projHitPct || 70) + '% hit × ' + count + ' proj × (1+' + pierce + ' pierce) = ' + n.toFixed(2);
    } else if (kind === 'boomerang') {
      n = p * count * 2 * (1 + pierce);
      detail = (cfg.projHitPct || 70) + '% × ' + count + ' × 2 passes × (1+' + pierce + ' pierce) = ' + n.toFixed(2);
    } else if (kind === 'bounce') {
      const bounces = Math.max(0, s.bounce | 0);
      n = p * count * (1 + bounces);
      detail = (cfg.projHitPct || 70) + '% × ' + count + ' × (1+' + bounces + ' bounce) = ' + n.toFixed(2);
    } else if (kind === 'chain') {
      n = p * count;
      detail = (cfg.projHitPct || 70) + '% primary × ' + count + ' chain = ' + n.toFixed(2);
    } else if (kind === 'aura') {
      const R = +(s.radius || 50);
      const rSelf = cfg.selfR || (cfg.avgEnemyR || 12);
      const area = 0.5 * Math.PI * Math.max(0, R * R - rSelf * rSelf);
      n = Math.max(1, area / foot);
      detail = '½π(R²−r_self²) R=' + R + ' → ' + n.toFixed(2) + ' foes';
    } else if (kind === 'orbit') {
      const R = +(s.radius || 60);
      const sz = +(s.size || 8);
      const Rout = R + sz, Rin = Math.max(0, R - sz);
      const area = Math.PI * (Rout * Rout - Rin * Rin);
      n = Math.max(1, area / foot);
      detail = 'ring π(' + Rout.toFixed(0) + '²−' + Rin.toFixed(0) + '²) / πr² → ' + n.toFixed(2) + ' foes';
    } else if (kind === 'meteor') {
      const reach = 340;
      const R = +(s.radius || 50);
      const capacity = (Math.PI * reach * reach) / foot;
      const engaged = Math.max(1, capacity * 0.08);
      const primaries = Math.min(count, engaged);
      const splashIdeal = Math.max(0, (Math.PI * R * R) / foot - 1);
      n = primaries * (1 + splashIdeal * 0.25);
      detail = 'meteor aim × splash → ' + n.toFixed(2);
    } else if (kind === 'nova' || kind === 'mine' || kind === 'shove' || kind === 'spin' || kind === 'quake' || kind === 'vortex' || kind === 'stun') {
      const R = +(s.radius || 50);
      n = Math.max(1, (Math.PI * R * R) / foot);
      detail = 'πR²(' + R + ') / πr² → ' + n.toFixed(2) + ' foes';
    } else if (kind === 'cone') {
      n = Math.min(count, cfg.coneHitCap || 3);
      detail = 'cone cap ' + n + ' hits';
    } else if (kind === 'turret') {
      n = p;
      detail = 'turret × ' + (cfg.projHitPct || 70) + '% hit = ' + n.toFixed(2) + '×';
    } else if (kind === 'trail') {
      const R = +(s.radius || s.width || 40);
      n = Math.max(1, (Math.PI * R * R * 0.5) / foot);
      detail = 'trail ~' + n.toFixed(2) + ' foes';
    }
    return { n: Math.max(0.05, n), detail };
  }

  /** Single-target (and optional mobbing) DPS breakdown. */
  function dpsBreakdown(s, cfg) {
    cfg = cfg || {};
    const d = data();
    let typeFactor = cfg.typeM != null ? cfg.typeM : 1;
    if (cfg.useAvgType && s.type && d.avgTypeMult[s.type] != null) {
      typeFactor = (cfg.typeM != null ? cfg.typeM : 1) * d.avgTypeMult[s.type];
    }
    let weatherFactor = cfg.weatherM != null ? cfg.weatherM : 1;
    if (cfg.useWeatherAvg !== false && s.type && WEATHER_AVG_MULT[s.type] != null) {
      weatherFactor = WEATHER_AVG_MULT[s.type];
    }
    let atkUse = cfg.atk != null ? cfg.atk : 1;
    if (cfg.mon && s.cat) {
      atkUse = (s.cat === 'special'
        ? (cfg.mon.sa != null ? cfg.mon.sa : cfg.mon.atk)
        : (cfg.mon.pa != null ? cfg.mon.pa : cfg.mon.atk)) || atkUse;
    }
    const mult = atkUse * typeFactor * weatherFactor;
    const dmg = +s.dmg;
    const cd = +s.cd;
    const kind = s.kind;
    const count = Math.max(1, s.count | 0);
    let dps = 0;
    const parts = [];
    function push(v, label) { parts.push(U.fmt(v) + ' ' + label); }

    if (kind === 'turret') {
      const rate = +(s.rate || 0.6);
      dps = (count * dmg * mult) / rate;
      push(dmg, 'dmg'); if (count > 1) push(count, 'turrets'); if (mult !== 1) push(mult, 'mult');
      parts.push('/ ' + U.fmt(rate) + ' rate');
    } else if (kind === 'orbit') {
      const speed = +(s.speed || 2.5);
      const interval = (2 * Math.PI) / (count * speed);
      dps = (dmg * mult) / interval;
      push(dmg, 'dmg'); if (mult !== 1) push(mult, 'mult');
      parts.push('/ ' + U.fmt(interval) + 's (2π/(n·ω))');
    } else if (kind === 'aura') {
      dps = (dmg * mult) / cd;
      push(dmg, 'dmg'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
    } else if (kind === 'trail') {
      const tick = cfg.trailTick || 0.5;
      dps = (dmg * mult) / tick;
      push(dmg, 'dmg'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(tick) + ' tick');
    } else if (kind === 'boomerang') {
      dps = (dmg * 2 * count * mult) / cd;
      push(dmg, 'dmg'); push(count, 'count'); push(2, 'hit'); if (mult !== 1) push(mult, 'mult');
      parts.push('/ ' + U.fmt(cd) + ' cd');
    } else if (kind === 'cone' || kind === 'nova') {
      const hits = Math.min(count, cfg.coneHitCap || 3);
      dps = (dmg * hits * mult) / cd;
      push(dmg, 'dmg'); push(hits, 'hit'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
    } else if (kind === 'chain' || kind === 'meteor' || kind === 'mine') {
      dps = (dmg * mult) / cd;
      push(dmg, 'dmg'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
    } else if (kind === 'homing') {
      dps = (dmg * count * mult) / cd;
      push(dmg, 'dmg'); if (count > 1) push(count, 'count'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
    } else if (kind === 'bounce') {
      const hits = count * (1 + Math.max(0, s.bounce | 0));
      dps = (dmg * hits * mult) / cd;
      push(dmg, 'dmg'); push(hits, 'hits'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
    } else if (kind === 'charge') {
      const cycle = Math.max(0.05, cd + (+s.charge || 0));
      dps = (dmg * mult) / cycle;
      push(dmg, 'dmg'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cycle) + 's (cd+charge)');
    } else if (kind === 'spin' || kind === 'quake') {
      dps = (dmg * count * mult) / cd;
      push(dmg, 'dmg'); push(count, kind === 'spin' ? 'spins' : 'waves'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
    } else if (kind === 'vortex' || kind === 'shove' || kind === 'stun') {
      dps = (dmg * mult) / cd;
      push(dmg, 'dmg'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
    } else {
      dps = (dmg * count * mult) / cd;
      push(dmg, 'dmg'); if (count > 1) push(count, 'count'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
    }

    let mobInfo = { n: 1, detail: 'single target' };
    if (cfg.mobbing && kind !== 'buff') {
      mobInfo = estimateMobHits(s, cfg);
      const hits = mobInfo.n;
      if (['projectile', 'homing', 'bounce', 'beam', 'dash', 'melee', 'chain', 'boomerang'].includes(kind)) {
        dps = (dmg * hits * mult) / Math.max(0.05, cd);
        parts.length = 0;
        push(dmg, 'dmg'); push(hits, 'hits'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
      } else if (kind === 'turret') {
        const rate = +(s.rate || 0.6);
        dps = (count * dmg * mult * hits) / rate;
        parts.length = 0;
        push(dmg, 'dmg'); if (count > 1) push(count, 'turrets'); push(hits, 'hit%'); if (mult !== 1) push(mult, 'mult');
        parts.push('/ ' + U.fmt(rate) + ' rate');
      } else if (kind === 'orbit' || kind === 'aura' || kind === 'trail') {
        dps *= hits;
        parts.push('× ' + U.fmt(hits) + ' foes');
      } else if (['meteor', 'nova', 'mine', 'cone'].includes(kind)) {
        dps = (dmg * hits * mult) / Math.max(0.05, cd);
        parts.length = 0;
        push(dmg, 'dmg'); push(hits, 'hits'); if (mult !== 1) push(mult, 'mult'); parts.push('/ ' + U.fmt(cd) + ' cd');
      } else {
        dps *= hits;
        parts.push('× ' + U.fmt(hits) + ' mob');
      }
    }

    function appsPerSec() {
      let a = 1 / Math.max(0.05, cd);
      if (kind === 'orbit') a = (count * (+(s.speed) || 2.5)) / (2 * Math.PI);
      else if (kind === 'boomerang') a = (2 * count) / cd;
      else if (kind === 'cone' || kind === 'nova') a = Math.min(count, cfg.coneHitCap || 3) / cd;
      else if (kind === 'turret') a = count / (s.rate || 0.6);
      else if (['projectile', 'melee', 'dash', 'beam'].includes(kind)) a = count / cd;
      return a;
    }

    let poisonDps = 0, burnDps = 0;
    if (cfg.usePoison && kind !== 'buff') {
      const poisonStacks = +(s.poison || 0);
      if (poisonStacks > 0) {
        const refHp = cfg.refEnemyHp || 100;
        const sustained = Math.min(8, Math.max(poisonStacks, Math.floor(appsPerSec() * 4) * poisonStacks));
        poisonDps = (refHp * 0.012 * sustained + 1) / 0.6;
        dps += poisonDps;
      }
      const burnStacks = +(s.burn || 0);
      if (burnStacks > 0) {
        const lvl = cfg.refPlayerLvl || 20;
        const sustained = Math.min(8, Math.max(burnStacks, Math.floor(appsPerSec() * 3) * burnStacks));
        burnDps = (1.6 * sustained * (1 + lvl * 0.06)) / 0.5;
        dps += burnDps;
      }
    }

    return {
      dps,
      expr: parts.join(' × ').replace(' × / ', ' / ') +
        (poisonDps ? ' + poison ' + Math.round(poisonDps) : '') +
        (burnDps ? ' + burn ' + Math.round(burnDps) : ''),
      poisonDps,
      burnDps,
      mobHits: mobInfo.n,
      mobDetail: mobInfo.detail,
      components: { atkUse, typeFactor, weatherFactor, mult, dmg, cd, count }
    };
  }

  /** Soft defense multiplier from DF/SD (game Stats.guard). */
  function guardDef(def) {
    const REF = 75, EXP = 0.35, LO = 0.78, HI = 1.25;
    const d = (def != null && def !== '' && !isNaN(+def)) ? +def : REF;
    return U.clamp(Math.pow(REF / Math.max(5, d), EXP), LO, HI);
  }

  function medianHitRadius(prefs) {
    const dex = data().dex;
    if (!dex.length) return 1;
    let rs = dex.map(p => p.hit).filter(r => r > 0);
    if ((prefs && prefs.medianMode) === 'distinct') {
      rs = [...new Set(rs.map(r => +Number(r).toFixed(4)))];
    }
    rs.sort((a, b) => a - b);
    return rs.length ? U.median(rs) : 1;
  }

  function hitMulti(mon, prefs) {
    const med = medianHitRadius(prefs);
    const r = mon.hit != null ? mon.hit : U.bodyRadius(mon.dex, data().spriteMeta);
    if (!med || !r) return 1;
    const ratio = med / r;
    const curve = (prefs && prefs.curve) || 'power15';
    if (curve === 'linear') return ratio;
    if (curve === 'soft') return 0.5 * ratio + 0.5 * ratio * ratio;
    if (curve === 'area') return ratio * ratio;
    return Math.pow(ratio, 1.5);
  }

  function hitSteps(mon, prefs) {
    const med = medianHitRadius(prefs);
    const r = mon.hit != null ? mon.hit : U.bodyRadius(mon.dex, data().spriteMeta);
    const ratio = med / (r || 1);
    const curve = (prefs && prefs.curve) || 'power15';
    let text;
    if (curve === 'linear') text = U.fmt(med, 2) + ' / ' + U.fmt(r, 1);
    else if (curve === 'soft') text = '½×' + U.fmt(ratio, 3) + ' + ½×' + U.fmt(ratio * ratio, 3);
    else if (curve === 'area') text = '(' + U.fmt(med, 2) + ' / ' + U.fmt(r, 1) + ')²';
    else text = '(' + U.fmt(med, 2) + ' / ' + U.fmt(r, 1) + ')^1.5';
    return { med, r, ratio, text, value: hitMulti(mon, prefs) };
  }

  /** Apply a nature to a stat block. */
  function withNature(mon, natureId) {
    if (!natureId || natureId === 'neutral' || natureId === 'best') return mon;
    const n = NATURE_BY[natureId];
    if (!n) return mon;
    const out = Object.assign({}, mon);
    if (n.up && out[n.up] != null) out[n.up] = +(out[n.up] * 1.1).toFixed(4);
    if (n.down && out[n.down] != null) out[n.down] = +(out[n.down] * 0.9).toFixed(4);
    return out;
  }

  function abilityMods(row) {
    return PSC.Abilities.mods(row);
  }

  /** Outgoing ability multiplier for a concrete move instance. */
  function abilityOutWithMods(am, cat, type) {
    let m = 1;
    if (am.out != null) m *= am.out;
    if (cat === 'physical' && am.outPhy != null) m *= am.outPhy;
    if (cat === 'special' && am.outSpe != null) m *= am.outSpe;
    if (cat === 'physical' && am.pa != null) m *= am.pa;
    if (cat === 'special' && am.sa != null) m *= am.sa;
    if (am.typeMulti && am.typeMulti[type] != null) m *= am.typeMulti[type];
    return m;
  }

  function abilityOut(row, move) {
    return abilityOutWithMods(abilityMods(row), move && move.cat, move && move.type);
  }

  const METRIC_CFG = {
    atk: 1,
    typeM: 1,
    weatherM: 1,
    useAvgType: true,
    useWeatherAvg: true,
    coneHitCap: 3,
    trailTick: 0.5
  };

  const RAW_CFG = { atk: 1, typeM: 1, weatherM: 1, useAvgType: false, useWeatherAvg: false };
  const RAW_DPS_CACHE = new WeakMap();

  /** Raw Lv5/evolved DPS at neutral stats and multipliers (per move definition). */
  function rawMoveDps(def, evo) {
    let entry = RAW_DPS_CACHE.get(def);
    if (!entry) { entry = {}; RAW_DPS_CACHE.set(def, entry); }
    const key = evo ? 'evo' : 'lv5';
    if (entry[key] == null) {
      entry[key] = dpsBreakdown(instance(def, 5, evo), RAW_CFG).dps || 0;
    }
    return entry[key];
  }

  /**
   * Offensive rating for one row.
   *
   * Baseline = average raw DPS of every available move of the row's type at
   * neutral stats. Adjusted = the same moves with PA/SA, spawn-weighted type,
   * weather and ability. Rating = adjusted / baseline, i.e. a multiplier.
   * Moves with higher raw DPS pull the average harder (specialty), while every
   * available move still contributes (flexibility).
   */
  function offenseForRow(row, mon) {
    const d = data();
    const am = abilityMods(row);
    const details = [];
    for (const id of row.moveIds || []) {
      const def = d.movesById[id];
      if (!def || def.kind === 'buff' || def.dmg == null) continue;
      let pick = null;
      for (const evo of [false, true]) {
        if (evo && !(d.evo[def.id] && d.evoMods[def.kind])) continue;
        const raw = rawMoveDps(def, evo);
        if (!(raw > 0)) continue;
        const cat = def.cat || 'special';
        const stat = cat === 'special'
          ? (mon.sa != null ? mon.sa : mon.atk)
          : (mon.pa != null ? mon.pa : mon.atk);
        const tm = d.avgTypeMult[def.type] != null ? d.avgTypeMult[def.type] : 1;
        const wx = WEATHER_AVG_MULT[def.type] != null ? WEATHER_AVG_MULT[def.type] : 1;
        const ab = abilityOutWithMods(am, cat, def.type);
        const factor = (stat || 1) * tm * wx * ab;
        const adjusted = raw * factor;
        if (!pick || adjusted > pick.adjustedDps) {
          pick = {
            id: def.id,
            def,
            evo,
            name: evo && d.evo[def.id] ? d.evo[def.id][0] : PSC.Data.moveName(def),
            type: def.type,
            cat,
            stat,
            rawDps: raw,
            typeM: tm,
            wxM: wx,
            ability: ab,
            factor,
            adjustedDps: adjusted
          };
        }
      }
      if (pick) details.push(pick);
    }

    const n = details.length;
    const baselineDps = n ? details.reduce((a, x) => a + x.rawDps, 0) / n : 0;
    const pooledDps = n ? details.reduce((a, x) => a + x.adjustedDps, 0) / n : 0;
    const multiplier = baselineDps > 0 ? pooledDps / baselineDps : 0;
    const meanFactor = arr => arr.length ? arr.reduce((a, x) => a + x.factor, 0) / arr.length : 0;
    const topMove = details.slice().sort((a, b) => b.adjustedDps - a.adjustedDps)[0] || null;

    return {
      dps: multiplier,
      multiplier,
      baselineDps,
      pooledDps,
      typeM: d.avgTypeMult[row.variantType] != null ? d.avgTypeMult[row.variantType] : 1,
      wxM: WEATHER_AVG_MULT[row.variantType] != null ? WEATHER_AVG_MULT[row.variantType] : 1,
      moves: details,
      moveCount: n,
      phyMultiplier: meanFactor(details.filter(x => x.cat === 'physical')),
      speMultiplier: meanFactor(details.filter(x => x.cat === 'special')),
      topMove,
      move: topMove ? topMove.def : null,
      moveName: topMove ? topMove.name : '—',
      moveDps: topMove ? topMove.adjustedDps : 0
    };
  }

  function dodgeFactor(row) {
    const d = PSC.Abilities.dodge(row.abilityId);
    const profile = data().enemyAttackProfile;
    let specialOnlyFactor = 1;
    if (d.specialOnly && d.chance) {
      specialOnlyFactor = 1 / Math.max(0.01, 1 - d.chance * (profile.speWeight || 0.5));
    }
    return {
      chance: d.chance,
      factor: d.applied ? (d.specialOnly ? specialOnlyFactor : d.factor) : 1,
      applied: d.applied,
      conditional: d.conditional,
      note: d.note,
      specialOnly: d.specialOnly
    };
  }

  /** Spawn-weighted incoming multiplier, including type, weather, guards, ability. */
  function damageReduction(row, mon) {
    const d = data();
    const am = abilityMods(row);
    const profile = d.enemyAttackProfile;
    const typeDef = PSC.TypeChart.defenseTypeScore(mon.types, d.enemyWeights);
    const wxDef = PSC.TypeChart.defenseWeatherScore(d.enemyWeights);
    const dfG = guardDef(mon.df);
    const sdG = guardDef(mon.sd);

    const rows = [];
    let sum = 0, wsum = 0;
    const profileRows = (profile.groups && profile.groups.length) ? profile.groups : (profile.rows || []);
    for (const e of profileRows) {
      const m = PSC.TypeChart.multiplier(e.atkType, mon.types);
      const wx = WEATHER_AVG_MULT[e.atkType] != null ? WEATHER_AVG_MULT[e.atkType] : 1;
      const guard = e.cat === 'special' ? sdG : dfG;
      let ability = 1;
      if (am.in != null) ability *= am.in;
      if (e.cat === 'special' && am.inSpe != null) ability *= am.inSpe;
      if (e.cat === 'physical' && am.inPhy != null) ability *= am.inPhy;
      if (am.typeDefMulti && am.typeDefMulti[e.atkType] != null) ability *= am.typeDefMulti[e.atkType];
      const combined = m * wx * guard * ability;
      sum += (e.weight || 0) * combined;
      wsum += (e.weight || 0);
      rows.push({ profile: e, typeM: m, wx, guard, ability, combined });
    }
    const dr = wsum > 0 ? sum / wsum : typeDef * wxDef * ((dfG + sdG) / 2);
    return {
      dr,
      typeDef,
      wxDef,
      dfG,
      sdG,
      phyDefM: typeDef * wxDef * dfG,
      speDefM: typeDef * wxDef * sdG,
      rows,
      specialShare: profile.speWeight || 0.5
    };
  }

  function metricCore(row, natureId, prefs) {
    const mon = withNature(row, natureId);
    const off = offenseForRow(row, mon);
    const def = damageReduction(row, mon);
    const hit = hitMulti(mon, prefs);
    const dodge = dodgeFactor(row);
    const ehp = def.dr > 0 ? (hit * dodge.factor) / def.dr : hit * dodge.factor;
    return {
      mon,
      natureId: natureId || 'neutral',
      offense: off.multiplier,
      offenseTypeM: off.typeM,
      offenseWxM: off.wxM,
      offenseBaseline: off.baselineDps,
      offensePooled: off.pooledDps,
      offenseMoveCount: off.moveCount,
      offensePhy: off.phyMultiplier,
      offenseSpe: off.speMultiplier,
      offenseMoves: off.moves,
      topMove: off.topMove,
      hitMulti: hit,
      dodge,
      dr: def,
      ehp,
      spd: mon.spd != null ? +mon.spd : 0,
      paNat: mon.pa != null ? mon.pa : mon.atk,
      saNat: mon.sa != null ? mon.sa : mon.atk
    };
  }

  const NATURE_CANDIDATES = ['neutral', 'adamant', 'modest', 'bold', 'calm', 'timid'];

  function rawProduct(m, weights) {
    const w = weights || { off: 1, def: 1, spd: 0.25 };
    return Math.pow(Math.max(1e-9, m.offense), w.off) *
      Math.pow(Math.max(1e-9, m.ehp), w.def) *
      Math.pow(Math.max(1e-9, m.spd), w.spd);
  }

  function rowMetrics(row, prefs) {
    const mode = (prefs && prefs.natureMode) || 'neutral';
    let best = metricCore(row, mode === 'best' ? 'neutral' : mode, prefs);
    if (mode === 'best') {
      for (const nid of NATURE_CANDIDATES) {
        const m = metricCore(row, nid, prefs);
        if (rawProduct(m, prefs.weights) > rawProduct(best, prefs.weights)) best = m;
      }
    }
    return best;
  }

  function prefsSignature(prefs) {
    const w = (prefs && prefs.weights) || {};
    const c = (prefs && prefs.config) || {};
    return [
      prefs.natureMode, prefs.medianMode, prefs.curve,
      w.off, w.def, w.spd,
      c.typeMult, c.weatherMult, c.useWeatherAvg, c.coneHitCap, c.trailTick,
      c.refEnemyHp, c.refPlayerLvl
    ].join('|');
  }

  function calcConfig(prefs) {
    const c = (prefs && prefs.config) || {};
    return {
      typeM: c.typeMult != null ? c.typeMult : 1,
      weatherM: c.weatherMult != null ? c.weatherMult : 1,
      useAvgType: true,
      useWeatherAvg: c.useWeatherAvg !== false,
      coneHitCap: c.coneHitCap || 3,
      trailTick: c.trailTick || 0.5,
      refEnemyHp: c.refEnemyHp || 100,
      refPlayerLvl: c.refPlayerLvl || 20,
      usePoison: false
    };
  }

  function ensureRow(row, prefs) {
    if (!row) return null;
    const sig = prefsSignature(prefs);
    if (!row._m || row._prefsSig !== sig) {
      row._m = rowMetrics(row, prefs);
      row._prefsSig = sig;
    }
    return row._m;
  }

  function ensureMetrics(rows, prefs) {
    if (!rows || !rows.length) return { medOff: 1, medEhp: 1, medSpd: 1 };
    const sig = prefsSignature(prefs);
    if (!rows[0]._m || rows[0]._prefsSig !== sig) {
      for (const r of rows) {
        r._m = rowMetrics(r, prefs);
        r._prefsSig = sig;
      }
    }
    const offs = [], ehps = [], spds = [];
    for (const r of rows) {
      if (r._m.offense > 0) offs.push(r._m.offense);
      if (r._m.ehp > 0) ehps.push(r._m.ehp);
      if (r._m.spd > 0) spds.push(r._m.spd);
    }
    const medOff = U.median(offs) || 1;
    const medEhp = U.median(ehps) || 1;
    const medSpd = U.median(spds) || 1;
    const w = (prefs && prefs.weights) || { off: 1, def: 1, spd: 0.25 };
    for (const r of rows) {
      const m = r._m;
      m.score = Math.pow(Math.max(1e-9, m.offense / medOff), w.off) *
        Math.pow(Math.max(1e-9, m.ehp / medEhp), w.def) *
        Math.pow(Math.max(1e-9, m.spd / medSpd), w.spd);
    }
    rankRows(rows);
    return { medOff, medEhp, medSpd };
  }

  function rankRows(rows) {
    const specs = [
      ['offense', r => r._m.offense],
      ['ehp', r => r._m.ehp],
      ['spd', r => r._m.spd],
      ['score', r => r._m.score],
      ['dr', r => -r._m.dr.dr],
      ['hit', r => r._m.hitMulti]
    ];
    const maps = {};
    for (const [k, fn] of specs) maps[k] = competitionRank(rows, fn);
    for (const r of rows) {
      r.ranks = {
        offense: maps.offense.get(r.rowKey),
        ehp: maps.ehp.get(r.rowKey),
        spd: maps.spd.get(r.rowKey),
        score: maps.score.get(r.rowKey),
        dr: maps.dr.get(r.rowKey),
        hit: maps.hit.get(r.rowKey)
      };
    }
  }

  function competitionRank(rows, valueFn) {
    const sorted = [...rows].sort((a, b) => valueFn(b) - valueFn(a));
    const map = new Map();
    let rank = 1, prev = null;
    sorted.forEach((r, i) => {
      const v = valueFn(r);
      if (i === 0) { rank = 1; prev = v; }
      else if (v !== prev) { rank = i + 1; prev = v; }
      map.set(r.rowKey, rank);
    });
    return map;
  }

  function badge(t) {
    return PSC.Utils.typeBadge(t);
  }
  function multClass(m) { return m > 1.05 ? 'mult-super' : m < 0.95 ? 'mult-weak' : 'mult-neutral'; }
  function defClass(m) { return m < 0.95 ? 'mult-super' : m > 1.05 ? 'mult-weak' : 'mult-neutral'; }

  function hitboxMatrix(row, prefs) {
    const m = ensureRow(row, prefs);
    const hs = hitSteps(m.mon, prefs);
    const curve = (prefs && prefs.curve) || 'power15';
    return {
      title: 'Hitbox multiplier — ' + row.name + ' · ' + (row.abilityName || '—'),
      subtitle: 'Smaller bodies are harder to hit. Median hitbox radius is ' + U.fmt(hs.med, 2) +
        ' and this Pokémon has r ' + U.fmt(hs.r, 1) + '.',
      html: '<table class="compact matrix-table">' +
        '<thead><tr><th class="text-left">Term</th><th>Value</th><th class="text-left">Meaning</th></tr></thead><tbody>' +
        '<tr><td class="text-left">Median r</td><td>' + U.fmt(hs.med, 3) + '</td><td class="text-left">Baseline body radius across the Pokédex</td></tr>' +
        '<tr><td class="text-left">This Pokémon r</td><td>' + U.fmt(hs.r, 3) + '</td><td class="text-left">From the idle sprite frame</td></tr>' +
        '<tr><td class="text-left">Ratio</td><td>×' + U.fmt(hs.ratio, 3) + '</td><td class="text-left">median r ÷ this r</td></tr>' +
        '<tr><td class="text-left">Curve</td><td>' + U.esc(curve) + '</td><td class="text-left">' + U.esc(hs.text) + '</td></tr>' +
        '<tr class="row-highlight"><td class="text-left"><b>Hitbox multi</b></td><td><b>×' + U.fmt(hs.value, 3) + '</b></td><td class="text-left">Higher is better (harder to hit)</td></tr>' +
        '</tbody></table><div class="matrix-foot">EHP uses this multiplier directly.</div>'
    };
  }

  function offenseMatrix(row, prefs) {
    const m = ensureRow(row, prefs);
    const d = data();
    const moves = (m.offenseMoves || []).slice().sort((a, b) => b.adjustedDps - a.adjustedDps);
    const totalPct = d.enemyWeights.reduce((a, e) => a + (e.pct || 0), 0) || 100;
    const moveRows = moves.map(x => {
      const top = m.topMove && x.id === m.topMove.id && x.evo === m.topMove.evo;
      return '<tr class="' + (top ? 'row-highlight' : '') + '">' +
        '<td class="text-left">' + U.esc(x.name) + (x.evo ? ' <span class="muted-soft">evo</span>' : '') + '</td>' +
        '<td>' + badge(x.type) + '</td>' +
        '<td class="text-left">' + U.esc(x.cat) + '</td>' +
        '<td>' + (x.cat === 'physical' ? 'PA ' : 'SA ') + U.fmt(x.stat, 2) + '</td>' +
        '<td>' + U.fmt(x.rawDps, 1) + '</td>' +
        '<td class="' + multClass(x.typeM) + '">×' + x.typeM.toFixed(3) + '</td>' +
        '<td>×' + x.wxM.toFixed(3) + '</td>' +
        '<td>×' + x.ability.toFixed(3) + '</td>' +
        '<td>' + U.fmt(x.adjustedDps, 1) + '</td>' +
        '<td class="' + multClass(x.factor) + '">×' + x.factor.toFixed(3) + '</td></tr>';
    }).join('');
    const typeRows = d.enemyWeights.map(e => {
      const tm = PSC.TypeChart.multiplier(row.variantType, e.types);
      const pct = totalPct ? (e.pct / totalPct) * 100 : 0;
      return '<tr><td class="text-left">' + (e.types || []).map(badge).join(' ') + '</td>' +
        '<td>' + pct.toFixed(2) + '%</td>' +
        '<td class="text-left muted-soft">' + U.esc((e.examples || []).join(', ')) + '</td>' +
        '<td class="' + multClass(tm) + '">×' + tm.toFixed(3) + '</td>' +
        '<td>×' + (pct / 100 * tm).toFixed(4) + '</td></tr>';
    }).join('');
    const phy = moves.filter(x => x.cat === 'physical').length;
    const spe = moves.length - phy;
    return {
      title: 'Offensive pool — ' + row.name + ' · ' + row.variantType + ' · ' + (row.abilityName || '—'),
      subtitle: 'Baseline <b>' + U.fmt(m.offenseBaseline, 1) + '</b> DPS → adjusted <b>' +
        U.fmt(m.offensePooled, 1) + '</b> DPS · multiplier <b>×' + U.fmt(m.offense, 3) +
        '</b> · ' + moves.length + ' moves (' + phy + ' physical / ' + spe + ' special)',
      html: '<div class="table-wrap compact matrix-table"><table><thead><tr>' +
        '<th class="text-left">Move</th><th>Type</th><th class="text-left">Cat</th><th>Stat</th>' +
        '<th>Raw DPS</th><th>type</th><th>weather</th><th>ability</th><th>Adj DPS</th><th>factor</th>' +
        '</tr></thead><tbody>' + (moveRows || '<tr><td class="text-left muted-soft" colspan="10">No damaging moves</td></tr>') +
        '</tbody></table></div>' +
        '<div class="matrix-foot">Rating = adjusted average ÷ baseline average = <b>×' + U.fmt(m.offense, 3) +
        '</b>. Baseline is every available move at neutral stats; adjusted applies PA/SA, spawn-weighted type, weather and ability.</div>' +
        '<p class="note">Higher-DPS moves pull the average harder (specialty); every available move contributes (flexibility).</p>' +
        '<div class="matrix-subtitle">Spawn-weighted type multiplier for ' + badge(row.variantType) + '</div>' +
        '<div class="table-wrap compact matrix-table"><table><thead><tr>' +
        '<th class="text-left">Enemy types</th><th>Weight</th><th class="text-left">Examples</th><th>type</th><th>weighted</th>' +
        '</tr></thead><tbody>' + typeRows + '</tbody></table></div>'
    };
  }

  function drMatrix(row, prefs) {
    const m = ensureRow(row, prefs);
    const total = m.dr.rows.reduce((a, x) => a + (x.profile.weight || 0), 0) || 1;
    const rows = m.dr.rows.map(x => {
      const e = x.profile;
      return '<tr><td class="text-left">' + badge(e.atkType) + '</td>' +
        '<td>' + ((e.weight || 0) / total * 100).toFixed(2) + '%</td>' +
        '<td class="text-left"><span class="muted-soft">' + U.esc(e.cat) + '</span></td>' +
        '<td class="' + defClass(x.typeM) + '">×' + x.typeM.toFixed(3) + '</td>' +
        '<td>×' + x.wx.toFixed(3) + '</td>' +
        '<td>×' + x.guard.toFixed(3) + '</td>' +
        '<td>×' + x.ability.toFixed(3) + '</td>' +
        '<td class="' + defClass(x.combined) + '"><b>×' + x.combined.toFixed(3) + '</b></td></tr>';
    }).join('');
    const ehp = (m.hitMulti * m.dodge.factor) / (m.dr.dr || 1);
    return {
      title: 'Damage reduction — ' + row.name + ' · ' + (row.abilityName || '—'),
      subtitle: 'Spawn-weighted incoming multiplier <b>×' + m.dr.dr.toFixed(3) + '</b> · type ×' + m.dr.typeDef.toFixed(3) +
        ' · weather ×' + m.dr.wxDef.toFixed(3) + ' · DF guard ×' + m.dr.dfG.toFixed(3) + ' · SD guard ×' + m.dr.sdG.toFixed(3),
      html: '<div class="table-wrap compact matrix-table"><table><thead><tr>' +
        '<th class="text-left">Attack type</th><th>Weight</th><th class="text-left">Category</th>' +
        '<th>type</th><th>weather</th><th>guard</th><th>ability</th><th>incoming</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="matrix-foot">EHP = hitbox ' + m.hitMulti.toFixed(3) + ' × dodge ' + m.dodge.factor.toFixed(3) +
        ' ÷ DR ' + m.dr.dr.toFixed(3) + ' = <b>' + ehp.toFixed(3) + '</b></div>'
    };
  }

  function dodgeMatrix(row, prefs) {
    const m = ensureRow(row, prefs);
    const hs = hitSteps(m.mon, prefs);
    const abilityRows = Object.keys(ABILITY_DODGE).map(id => {
      const d = ABILITY_DODGE[id];
      const applied = !d.conditional;
      const factor = applied ? 1 / (1 - d.chance) : 1;
      const mine = id === row.abilityId;
      return '<tr class="' + (mine ? 'row-highlight' : '') + '"><td class="text-left">' + U.esc(PSC.Data.abilityName(id)) +
        ' <span class="muted-soft">' + U.esc(id) + '</span></td>' +
        '<td>' + U.pct(d.chance, 0) + '</td>' +
        '<td class="' + (applied ? 'mult-super' : 'muted-soft') + '">×' + factor.toFixed(3) + '</td>' +
        '<td class="text-left">' + U.esc(d.note || '') + '</td></tr>';
    }).join('');
    return {
      title: 'Dodge matrix — ' + row.name + ' · ' + (row.abilityName || '—'),
      subtitle: 'Hitbox r <b>' + hs.r.toFixed(1) + '</b> vs baseline <b>' + hs.med.toFixed(2) +
        '</b> · curve ' + ((prefs && prefs.curve) || 'power15') + ' · hitbox multi <b>' + hs.value.toFixed(3) +
        '</b> · ability dodge factor <b>×' + m.dodge.factor.toFixed(3) + '</b>',
      html: '<div class="matrix-foot">Hitbox: ' + hs.text + ' = <b>' + hs.value.toFixed(3) + '</b></div>' +
        '<div class="table-wrap compact matrix-table"><table><thead><tr>' +
        '<th class="text-left">Dodge ability</th><th>Chance</th><th>Factor</th><th class="text-left">Condition</th>' +
        '</tr></thead><tbody>' + abilityRows + '</tbody></table></div>' +
        '<p class="note">Only unconditional dodges are folded into the multiplier. Conditional dodges are listed here for reference.</p>'
    };
  }

  function ehpMatrix(row, prefs) {
    const m = ensureRow(row, prefs);
    const hs = hitSteps(m.mon, prefs);
    const ehp = (m.hitMulti * m.dodge.factor) / (m.dr.dr || 1);
    return {
      title: 'EHP breakdown — ' + row.name + ' · ' + (row.abilityName || '—'),
      subtitle: 'EHP = hitbox multi × ability dodge ÷ damage reduction',
      html: '<div class="table-wrap compact matrix-table"><table><thead><tr>' +
        '<th class="text-left">Term</th><th>Value</th><th class="text-left">Notes</th></tr></thead><tbody>' +
        '<tr><td class="text-left">Hitbox r</td><td>' + hs.r.toFixed(1) + '</td><td class="text-left">Baseline median ' + hs.med.toFixed(2) + '</td></tr>' +
        '<tr><td class="text-left">Hitbox multi</td><td class="mult-super">×' + m.hitMulti.toFixed(3) + '</td><td class="text-left">' + hs.text + ' (higher is better)</td></tr>' +
        '<tr><td class="text-left">Ability dodge</td><td class="mult-super">×' + m.dodge.factor.toFixed(3) + '</td><td class="text-left">' + U.esc(m.dodge.note || 'No unconditional dodge') + '</td></tr>' +
        '<tr><td class="text-left">Damage reduction</td><td class="' + defClass(m.dr.dr) + '">×' + m.dr.dr.toFixed(3) + '</td><td class="text-left">Spawn-weighted incoming after type, weather, guards and ability</td></tr>' +
        '<tr class="row-highlight"><td class="text-left"><b>EHP</b></td><td><b>' + ehp.toFixed(3) + '</b></td><td class="text-left">' + m.hitMulti.toFixed(3) + ' × ' + m.dodge.factor.toFixed(3) + ' ÷ ' + m.dr.dr.toFixed(3) + '</td></tr>' +
        '</tbody></table></div>'
    };
  }

  function scoreMatrix(row, prefs, meds) {
    const m = ensureRow(row, prefs);
    const w = (prefs && prefs.weights) || { off: 1, def: 1, spd: 0.25 };
    const med = meds || { medOff: 1, medEhp: 1, medSpd: 1 };
    const o = m.offense / med.medOff;
    const d = m.ehp / med.medEhp;
    const s = (m.spd || 0) / med.medSpd;
    return {
      title: 'Score breakdown — ' + row.name + ' · ' + row.variantType + ' · ' + (row.abilityName || '—'),
      subtitle: 'score = (offense / median)^wOff × (ehp / median)^wDef × (spd / median)^wSpd',
      html: '<div class="table-wrap compact matrix-table"><table><thead><tr>' +
        '<th class="text-left">Term</th><th>Raw</th><th>Median</th><th>Ratio</th><th>Weight</th><th>Contribution</th></tr></thead><tbody>' +
        '<tr><td class="text-left">Offense multiplier (avg)</td><td>×' + U.fmt(m.offense, 3) + '</td><td>×' + U.fmt(med.medOff, 3) +
        '</td><td>' + o.toFixed(3) + '</td><td>' + w.off + '</td><td>' + Math.pow(Math.max(1e-9, o), w.off).toFixed(3) + '</td></tr>' +
        '<tr><td class="text-left">EHP</td><td>' + m.ehp.toFixed(3) + '</td><td>' + med.medEhp.toFixed(3) +
        '</td><td>' + d.toFixed(3) + '</td><td>' + w.def + '</td><td>' + Math.pow(Math.max(1e-9, d), w.def).toFixed(3) + '</td></tr>' +
        '<tr><td class="text-left">SPD</td><td>' + U.fmt(m.spd, 0) + '</td><td>' + U.fmt(med.medSpd, 0) +
        '</td><td>' + s.toFixed(3) + '</td><td>' + w.spd + '</td><td>' + Math.pow(Math.max(1e-9, s), w.spd).toFixed(3) + '</td></tr>' +
        '<tr class="row-highlight"><td class="text-left"><b>Overall score</b></td><td colspan="4"></td><td><b>' + m.score.toFixed(3) + '</b></td></tr>' +
        '</tbody></table></div><p class="note">Nature: ' + U.esc(m.natureId) + ' · rank #' + ((row.ranks && row.ranks.score) || '—') + '</p>'
    };
  }

  function matrixFor(kind, row, prefs, meds) {
    if (kind === 'offense') return offenseMatrix(row, prefs);
    if (kind === 'dr') return drMatrix(row, prefs);
    if (kind === 'dodge') return dodgeMatrix(row, prefs);
    if (kind === 'ehp') return ehpMatrix(row, prefs);
    if (kind === 'hitbox') return hitboxMatrix(row, prefs);
    return scoreMatrix(row, prefs, meds);
  }

  return {
    instance,
    dpsBreakdown,
    estimateMobHits,
    guardDef,
    medianHitRadius,
    hitMulti,
    hitSteps,
    withNature,
    abilityMods,
    abilityOut,
    offenseForRow,
    dodgeFactor,
    damageReduction,
    rowMetrics,
    ensureRow,
    ensureMetrics,
    calcConfig,
    prefsSignature,
    offenseMatrix,
    drMatrix,
    dodgeMatrix,
    ehpMatrix,
    hitboxMatrix,
    scoreMatrix,
    matrixFor,
    typeBadge: badge,
    multClass,
    defClass
  };
})();
