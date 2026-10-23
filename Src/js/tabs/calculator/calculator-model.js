/* Calculator tab model. */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Calculator = (function () {
  const U = PSC.Utils;

  function mon() {
    const dex = PSC.Store.state.selectedDex;
    return dex == null ? null : PSC.Data.findDex(dex);
  }

  function pool() {
    const p = mon();
    if (!p) return [];
    const d = PSC.Data.state;
    const natural = new Set(['normal', ...(p.types || [])]);
    const ids = new Set();
    for (const m of d.moves) if (natural.has(m.type)) ids.add(m.id);
    for (const id of d.tmOf(p.dex) || []) ids.add(id);
    return [...ids].map(id => d.movesById[id]).filter(Boolean);
  }

  function cfg() {
    const p = mon();
    return Object.assign({}, PSC.Store.config(), {
      atk: p ? Math.max(p.pa != null ? p.pa : p.atk || 1, p.sa != null ? p.sa : p.atk || 1) : 1,
      mon: p,
      selfR: p ? p.hit : 12
    });
  }

  function resolve(def, entry) {
    if (!def) return null;
    if (def.kind === 'buff') {
      return {
        kind: 'buff', id: def.id, name: PSC.Data.moveName(def), type: def.type,
        stat: def.stat, amount: +def.amount || 0, stacks: def.stacks || 5,
        cd: +def.cd || 1, dur: +def.dur || 7
      };
    }
    const evo = !!(entry && entry.evolved && PSC.Data.state.evo[def.id] && PSC.Data.state.evoMods[def.kind]);
    const inst = PSC.Calc.instance(def, 5, evo);
    const b = PSC.Calc.dpsBreakdown(inst, cfg());
    return {
      kind: 'dmg', id: def.id, name: PSC.Data.moveName(def), type: def.type,
      dps: Math.round(b.dps), tier: evo ? 'Evo' : 'Lv5', evolved: evo
    };
  }

  function slots() {
    return PSC.Store.state.calculator.slots;
  }

  function score() {
    const state = slots();
    const steps = [];
    let base = 0;
    const labels = [];
    let mainBuff = null, sideBuff = null;
    for (const entry of state[0]) {
      const def = PSC.Data.findMove(entry.id);
      const r = resolve(def, entry);
      if (!r) continue;
      if (r.kind === 'buff') mainBuff = r;
      else { base += r.dps; labels.push(r.name + ' (' + r.tier + ')=' + r.dps); }
    }
    for (let s = 1; s < 4; s++) {
      for (const entry of state[s]) {
        const def = PSC.Data.findMove(entry.id);
        const r = resolve(def, entry);
        if (r && r.kind === 'buff' && !sideBuff) sideBuff = r;
      }
    }
    steps.push('Main damage: ' + (labels.join(' + ') || '0'));
    steps.push('Base sum = ' + base);
    let mult = 1, uptime = 1;
    if (mainBuff) {
      const peak = mainBuff.amount * mainBuff.stacks;
      mult = 1 + peak;
      steps.push(mainBuff.name + ' in main slot → +' + Math.round(peak * 100) + '% (always up)');
    } else if (sideBuff) {
      const peak = sideBuff.amount * sideBuff.stacks;
      mult = 1 + peak;
      uptime = sideBuff.dur / (sideBuff.dur + sideBuff.cd);
      steps.push(sideBuff.name + ' in side slot → peak +' + Math.round(peak * 100) + '%');
      steps.push('uptime = ' + sideBuff.dur + '/(' + sideBuff.dur + '+' + sideBuff.cd + ') = ' + (uptime * 100).toFixed(1) + '%');
    } else {
      steps.push('No ATK buff');
    }
    const effective = Math.round(base * mult * uptime);
    steps.push('Effective DPS = ' + base + ' × ' + mult.toFixed(2) + ' × ' + uptime.toFixed(3) + ' = ' + effective);
    return { effective, steps, base, mult, uptime };
  }

  function pickerOptions() {
    const used = new Set(slots().flat().map(e => e.id));
    return pool().filter(m => !used.has(m.id)).map(m => ({
      id: m.id,
      name: PSC.Data.moveName(m),
      type: m.type,
      kind: m.kind
    }));
  }

  function sizeData() {
    const p = mon();
    if (!p) return null;
    const meta = PSC.Data.state.spriteMeta[p.dex];
    const idle = (meta && meta.a && meta.a.Idle) || {};
    const w = idle.w || 32, h = idle.h || 32, n = idle.n || 3;
    const SCALE = 3.2;
    const px = 2 * SCALE;
    return {
      mon: p,
      hit: p.hit,
      w, h, n,
      pxPerSrc: px,
      spriteW: w * px,
      spriteH: h * px,
      bgW: n * w * px,
      bgH: 8 * h * px,
      size: p.size
    };
  }

  function removeAt(slot, row) {
    const state = slots();
    if (!state[slot]) return;
    state[slot].splice(row, 1);
    PSC.Store.emit('calculator');
  }

  function add(slot, id) {
    const state = slots();
    if (!state[slot] || state[slot].length >= 4) return false;
    const def = PSC.Data.findMove(id);
    state[slot].push({ id, evolved: !!(def && PSC.Data.state.evo[id] && PSC.Data.state.evoMods[def.kind]) });
    PSC.Store.state.calculator.pick = null;
    PSC.Store.emit('calculator');
    return true;
  }

  function clear() {
    PSC.Store.state.calculator.slots = [[], [], [], []];
    PSC.Store.state.calculator.pick = null;
    PSC.Store.emit('calculator');
  }

  function prune() {
    const p = mon();
    if (!p) return;
    const allowed = new Set(pool().map(m => m.id));
    for (const slot of slots()) {
      for (let i = slot.length - 1; i >= 0; i--) if (!allowed.has(slot[i].id)) slot.splice(i, 1);
    }
  }

  return { mon, pool, cfg, resolve, slots, score, pickerOptions, sizeData, removeAt, add, clear, prune };
})();
