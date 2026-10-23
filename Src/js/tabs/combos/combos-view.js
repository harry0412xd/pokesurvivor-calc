/* Best combos view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Combos = (function () {
  const U = PSC.Utils;

  function moveLabel(m) {
    const color = TYPE_COLORS[m.type] || '#ccc';
    return '<span style="color:' + color + (m.evolved ? ';font-weight:700' : '') + '">' +
      U.esc(m.name) + '(' + U.esc(m.tier) + ')</span>';
  }

  function comboRow(c, i) {
    const badges = c.types.map(t => U.typeBadge(t)).join(' ');
    const rankCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const mainStack = (c.mainMoves || []).map(m =>
      '<div class="slot-move" data-move-id="' + U.esc(m.id) + '" title="Show in DPS table">' +
      moveLabel(m) + ' <span class="slot-dps">' + m.dps + '</span></div>'
    ).join('');
    let buffStack = '';
    if (c.buff && c.buffPlacement === 'bond') {
      buffStack = '<div class="slot-move buff" data-move-id="' + U.esc(c.buff.id) + '">' +
        U.esc(c.buff.name) + ' <span class="slot-dps">×' + (c.mult || 1).toFixed(2) + '</span></div>';
    }
    const slot1 = '<div class="slot-col main"><div class="slot-tag">Main (active)</div>' +
      mainStack + buffStack + '</div>';
    let otherSlots = '';
    if (c.buff && c.buffPlacement === 'slot') {
      otherSlots = '<div class="slot-col"><div class="slot-tag">Other slot (switch)</div>' +
        '<div class="slot-move buff" data-move-id="' + U.esc(c.buff.id) + '">' + U.esc(c.buff.name) +
        ' <span class="slot-dps">' + Math.round((c.uptime || 0) * 100) + '% up</span></div></div>';
    }
    const meta = c.count + ' Pokémon · e.g. ' + c.examples.join(', ') +
      (c.monName ? ' · selected' : '');
    const tip = '<div class="tt-title">Combo calculation</div>' +
      (c.steps || []).map(s => '<div class="tt-step">' + U.esc(s) + '</div>').join('');
    return '<div class="combo-row tip-combo"' + PSC.UI.tip('combo:' + c.key + ':' + i, tip) + '>' +
      '<div class="left"><span class="rank ' + rankCls + '">' + (i + 1) + '</span> ' + badges +
      ' <span class="combo-meta">' + U.esc(meta) + '</span></div>' +
      '<div class="score">' + c.best + '</div>' +
      '<div class="slots-wrap">' + slot1 + otherSlots + '</div></div>';
  }

  function render() {
    if (!PSC.Data.loaded) return;
    const box = document.getElementById('comboList');
    if (!box) return;
    const list = PSC.Models.Combos.results();
    box.innerHTML = list.map(comboRow).join('') ||
      '<div class="note">No combos — load game data first.</div>';
  }

  return { render };
})();
