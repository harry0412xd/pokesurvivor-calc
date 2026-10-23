/* Calculator tab view: 4 bond rows × 4 slots, move picker and size stage. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Calculator = (function () {
  const U = PSC.Utils;

  function typeColor(type) {
    return TYPE_COLORS[type] || '#888';
  }

  function renderGrid() {
    const body = document.getElementById('calcGridBody');
    if (!body) return;
    const slots = PSC.Models.Calculator.slots();
    const mon = PSC.Models.Calculator.mon();
    let html = '';
    for (let row = 0; row < 4; row++) {
      html += '<tr><th>Bond ' + (row + 1) + '</th>';
      for (let slot = 0; slot < 4; slot++) {
        const entry = slots[slot] && slots[slot][row];
        if (entry) {
          const def = PSC.Data.findMove(entry.id);
          const color = def ? typeColor(def.type) : '#ccc';
          const tier = def && def.kind === 'buff' ? 'buff' : (entry.evolved ? 'Evo' : 'Lv5');
          html += '<td class="cell filled" data-slot="' + slot + '" data-row="' + row + '" title="Click to remove">' +
            '<span class="cell-move" style="color:' + color + '">' +
            U.esc(def ? PSC.Data.moveName(def) : entry.id) + '</span>' +
            '<div class="cell-tier">' + tier + '</div></td>';
        } else {
          html += '<td class="cell" data-slot="' + slot + '" data-row="' + row + '">' +
            '<span class="cell-plus">+</span></td>';
        }
      }
      html += '</tr>';
    }
    body.innerHTML = html;

    const info = document.getElementById('calcPokeInfo');
    if (info) {
      if (mon) {
        info.innerHTML = '#' + mon.dex + ' · ' + U.esc((mon.types || []).join('/')) +
          ' · <span class="size-tag ' + (mon.size || '') + '">' + U.esc(mon.size || '') + '</span>';
      } else {
        info.textContent = 'Uses the selected Pokémon in the top bar.';
      }
    }
  }

  function renderPicker() {
    const box = document.getElementById('calcPicker');
    if (!box) return;
    const pick = PSC.Store.state.calculator.pick;
    if (!pick) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    const options = PSC.Models.Calculator.pickerOptions();
    box.hidden = false;
    box.innerHTML = options.length ? options.map(o => {
      const color = typeColor(o.type);
      const label = o.name + (o.kind === 'buff' ? ' (buff)' : '');
      return '<span class="pick" data-id="' + U.esc(o.id) + '" style="color:' + color + '">' +
        U.esc(label) + '</span>';
    }).join('') : '<span class="note">No remaining moves for this Pokémon.</span>';
  }

  function renderResult() {
    const box = document.getElementById('calcResult');
    if (!box) return;
    const res = PSC.Models.Calculator.score();
    box.innerHTML = '<div class="iname">Effective DPS: ' + res.effective + '</div>' +
      '<div class="idesc">' + res.steps.map(s => U.esc(s)).join('<br>') + '</div>';
  }

  function renderSize() {
    const stage = document.getElementById('sizeView');
    const meta = document.getElementById('sizePokeMeta');
    if (!stage) return;
    const data = PSC.Models.Calculator.sizeData();
    if (!data) {
      stage.innerHTML = '<div class="size-empty">Select a Pokémon</div>';
      if (meta) meta.textContent = 'Uses the selected Pokémon.';
      return;
    }
    const SCALE = data.pxPerSrc / 2;
    let rings = '';
    for (let r = 10; r <= 50; r += 10) {
      const d = r * 2 * SCALE;
      rings += '<div class="ring" style="width:' + d + 'px;height:' + d + 'px"></div>' +
        '<div class="ring-label" style="top:calc(50% - ' + (r * SCALE) + 'px - 10px)">r=' + r + '</div>';
    }
    const hd = data.hit * 2 * SCALE;
    rings += '<div class="hit-ring" style="width:' + hd + 'px;height:' + hd + 'px" title="hitbox r=' + data.hit + '"></div>';
    const sprStyle = 'width:' + data.spriteW + 'px;height:' + data.spriteH + 'px;' +
      'background-image:url(\'' + U.spriteUrl(data.mon.dex) + '\');' +
      'background-size:' + data.bgW + 'px ' + data.bgH + 'px;' +
      'background-position:0 0;background-repeat:no-repeat;' +
      'left:50%;top:50%;transform:translate(-50%,-50%);position:absolute;';
    stage.innerHTML = rings + '<div class="spr-wrap" style="' + sprStyle + '"></div>';
    if (meta) {
      meta.innerHTML = '#' + data.mon.dex + ' · hitbox r=<b>' + U.fmt(data.hit, 1) + '</b>' +
        ' · frame ' + data.w + '×' + data.h +
        ' · <span class="size-tag ' + U.esc(data.size || '') + '">' + U.esc(data.size || '') + '</span>';
    }
  }

  function render() {
    if (!PSC.Data.loaded) return;
    renderGrid();
    renderPicker();
    renderResult();
    renderSize();
  }

  return { render, renderGrid, renderPicker, renderResult, renderSize };
})();
