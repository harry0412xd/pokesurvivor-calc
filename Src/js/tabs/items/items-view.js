/* Items tab view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Items = (function () {
  const U = PSC.Utils;

  function render() {
    if (!PSC.Data.loaded) return;
    const dropBody = document.getElementById('dropBody');
    if (dropBody) {
      dropBody.innerHTML = PSC.Models.Items.drops().map(d =>
        '<tr class="drop-rate">' +
        '<td class="text-left">' + d.src + '</td>' +
        '<td class="text-left">' + d.item + '</td>' +
        '<td class="text-left">' + d.t1 + '</td>' +
        '<td class="text-left">' + d.t10 + '</td>' +
        '<td class="text-left drop-other">' + d.other + '</td></tr>'
      ).join('');
    }
    const list = document.getElementById('itemList');
    if (list) {
      const items = PSC.Models.Items.items();
      list.innerHTML = items.length ? items.map(it =>
        '<div class="item-row"><div class="iname">' + U.esc(it.name) +
        ' <span class="muted-soft">(' + U.esc(it.id) + ')</span></div>' +
        '<div class="idesc">' + U.esc(it.desc) + '</div></div>'
      ).join('') : '<div class="note">No items loaded — reload from GitHub.</div>';
    }
  }

  return { render };
})();
