/* Abilities tab view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Abilities = (function () {
  const U = PSC.Utils;

  function render() {
    if (!PSC.Data.loaded) return;
    const body = document.getElementById('abilBody');
    if (!body) return;
    const q = (document.getElementById('abilitySearch') || {}).value || '';
    const implOnly = !!(document.getElementById('abilImplOnly') || {}).checked;
    const list = PSC.Models.Abilities.list(q, implOnly);
    body.innerHTML = list.map(r => {
      let status, cls;
      if (r.implemented) { status = 'Calculated'; cls = 'mult-super'; }
      else if (r.willNot) { status = 'Will not implement'; cls = 'mult-weak'; }
      else { status = 'Not calculated'; cls = 'mult-weak'; }
      return '<tr>' +
        '<td class="text-left"><a href="#" class="abil-link" data-ability-link="' + U.esc(r.id) + '">' +
        U.esc(r.name) + '</a><div class="note tight">' + U.esc(r.id) + '</div></td>' +
        '<td class="text-left desc-cell">' + U.esc(r.desc || '—') + '</td>' +
        '<td class="text-left"><span class="' + cls + '">' + U.esc(status) + '</span>' +
        '<div class="note tight">' + U.esc(r.calcDesc || '') + '</div></td></tr>';
    }).join('') || '<tr><td colspan="3" class="note">No abilities match.</td></tr>';
  }

  return { render };
})();
