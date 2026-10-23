/* DPS tab view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Dps = (function () {
  const U = PSC.Utils;

  function renderChips() {
    const d = PSC.Store.state.dps;
    const data = PSC.Data.state;
    const types = PSC.TypeChart ? TYPE_LIST : [];
    const tBox = document.getElementById('dpsTypeChips');
    if (tBox) {
      tBox.innerHTML = types.map(t => PSC.UI.typeChip(t, d.types.has(t))).join('') +
        '<button type="button" class="type-chip clear-chip" data-clear="types">Clear</button>';
    }
    const kinds = [...new Set(data.moves.filter(m => m.kind !== 'buff').map(m => m.kind))].sort();
    const kBox = document.getElementById('dpsKindChips');
    if (kBox) {
      kBox.innerHTML = kinds.map(k => PSC.UI.kindChip(k, d.kinds.has(k))).join('') +
        '<button type="button" class="type-chip clear-chip" data-clear="kinds">Clear</button>';
    }
  }

  function levelTip(row, n) {
    const b = row.levels[n - 1];
    if (!b) return '';
    const c = b.components;
    return '<div class="tt-title">' + U.esc(row.name) + ' · Lv' + n + '</div>' +
      '<div class="tt-result">' + U.esc(b.expr) + '</div>' +
      '<div class="tt-step">' + c.dmg + ' dmg × ' + c.count + ' hit · ATK ' + U.fmt(c.atkUse, 2) +
      ' · type ' + U.fmt(c.typeFactor, 3) + ' · weather ' + U.fmt(c.weatherFactor, 3) +
      ' · ability ' + U.fmt(c.abilityFactor, 3) + '</div>' +
      (b.poisonDps ? '<div class="tt-step">poison DoT ' + U.fmt(b.poisonDps, 1) + ' DPS</div>' : '') +
      (b.burnDps ? '<div class="tt-step">burn DoT ' + U.fmt(b.burnDps, 1) + ' DPS</div>' : '') +
      '<div class="tt-muted">DPS ' + Math.round(b.dps) + '</div>';
  }

  function render() {
    renderChips();
    const rows = PSC.Models.Dps.filtered();
    const d = PSC.Store.state.dps;
    const body = document.getElementById('dpsBody');
    if (!body) return;

    body.innerHTML = rows.map(r => {
      const color = TYPE_COLORS[r.type] || '#888';
      const catLabel = r.cat === 'physical' ? 'PHY' : 'SPE';
      const catCls = r.cat === 'physical' ? 'cat-phy' : 'cat-spe';
      const lv = n => '<td class="tip-num" ' + PSC.UI.tip('dps:' + r.id + ':' + n, levelTip(r, n)) + '>' + r['lv' + n] + '</td>';
      const multTip = '<div class="tt-title">dmg multi</div><div class="tt-step">' +
        U.fmt(r.atkM, 3) + ' (ATK) × ' + U.fmt(r.covM, 3) + ' (spawn type) × ' +
        U.fmt(r.wxM, 3) + ' (weather) × ' + U.fmt(r.abM, 3) + ' (ability) = <b>' + U.fmt(r.mult, 3) + '</b></div>';
      return '<tr data-move-id="' + U.esc(r.id) + '" class="' + (r.usable ? '' : 'dps-unusable') + '">' +
        '<td class="text-left">' + U.esc(r.name) + '</td>' +
        '<td class="text-left"><span class="type-badge" style="background:' + color + '33;color:' + color + '">' + U.esc(r.type) + '</span></td>' +
        '<td class="text-left"><span class="kind-badge">' + U.esc(r.kind) + '</span></td>' +
        '<td class="text-left"><span class="cat-badge ' + catCls + '">' + catLabel + '</span></td>' +
        '<td class="tip-num" ' + PSC.UI.tip('dps:mult:' + r.id, multTip) + '><b>' + U.fmt(r.mult, 3) + '</b></td>' +
        lv(1) + lv(2) + lv(3) + lv(4) + lv(5) +
        '<td>' + (r.evo != null ? '<span class="evo-num" ' + PSC.UI.tip('dps:evo:' + r.id, evoTip(r)) + '>' + r.evo + '</span>' : '—') + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="11" class="note">No moves match the current filters.</td></tr>';

    const buffBody = document.getElementById('buffsBody');
    if (buffBody) {
      buffBody.innerHTML = PSC.Models.Dps.buffs.map(def => {
        const color = TYPE_COLORS[def.type] || '#888';
        const cells = [];
        for (let lvl = 1; lvl <= 5; lvl++) {
          cells.push('<td class="buff-cell">' + U.esc(PSC.Models.Dps.buffInfo(def, lvl)) + '</td>');
        }
        return '<tr><td class="text-left">' + U.esc(PSC.Data.moveName(def)) + '</td>' +
          '<td><span class="type-badge" style="background:' + color + '33;color:' + color + '">' + U.esc(def.type) + '</span></td>' +
          cells.join('') + '<td class="text-left buff-max">' + U.esc(PSC.Models.Dps.buffMax(def)) + '</td></tr>';
      }).join('') || '<tr><td colspan="8" class="note">No buffs loaded.</td></tr>';
    }

    const mobbing = document.getElementById('mobbingOpts');
    if (mobbing) mobbing.hidden = !d.mobbing;
  }

  function evoTip(row) {
    const b = PSC.Models.Dps.evoBreakdown(row);
    if (!b) return '';
    return '<div class="tt-title">Evolved Lv5</div><div class="tt-result">' + U.esc(b.expr) + '</div>' +
      '<div class="tt-muted">DPS ' + Math.round(b.dps) + '</div>';
  }

  return { render, renderChips };
})();
