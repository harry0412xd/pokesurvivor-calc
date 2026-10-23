/* Abilities tab view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Abilities = (function () {
  const U = PSC.Utils;

  function populateGroups() {
    const sel = document.getElementById('abilGroupFilter');
    if (!sel || sel.dataset.ready === '1') return;
    const defs = PSC.Models.Abilities.groups();
    const opts = (label, list) => '<optgroup label="' + U.esc(label) + '">' +
      list.map(g => '<option value="' + U.esc(g.key) + '">' + U.esc(g.label) + '</option>').join('') +
      '</optgroup>';
    sel.innerHTML = '<option value="">All groups</option>' +
      opts('Condition', defs.conditions) + opts('Effect', defs.effects);
    sel.dataset.ready = '1';
  }

  function groupsHtml(groups) {
    const row = (kind, keys) => {
      if (!keys || !keys.length) return '';
      const title = kind === 'When' ? 'Condition' : 'Effect';
      return '<div class="ability-group-row"><span class="ability-group-kind">' + kind + '</span>' +
        keys.map(key => '<span class="ability-group ' + U.esc(kind.toLowerCase()) + '" title="' +
          U.esc(title + ': ' + PSC.AbilityGroups.label(key)) + '">' +
          U.esc(PSC.AbilityGroups.label(key)) + '</span>').join('') +
        '</div>';
    };
    return '<div class="ability-groups">' + row('When', groups.conditions) + row('Effect', groups.effects) + '</div>';
  }

  function render() {
    if (!PSC.Data.loaded) return;
    const body = document.getElementById('abilBody');
    if (!body) return;
    populateGroups();
    const q = (document.getElementById('abilitySearch') || {}).value || '';
    const implOnly = !!(document.getElementById('abilImplOnly') || {}).checked;
    const group = (document.getElementById('abilGroupFilter') || {}).value || '';
    const list = PSC.Models.Abilities.list(q, implOnly, group);
    body.innerHTML = list.map(r => {
      let status, cls;
      if (r.implemented) { status = 'Calculated'; cls = 'mult-super'; }
      else if (r.calcDesc && r.calcDesc.indexOf('Utility only') === 0) { status = 'Utility only'; cls = 'muted-soft'; }
      else if (r.willNot) { status = 'Will not implement'; cls = 'mult-weak'; }
      else { status = 'Not calculated'; cls = 'mult-weak'; }
      return '<tr class="abil-row" data-ability-add="' + U.esc(r.id) + '" title="Add to Pokédex ability filter">' +
        '<td class="text-left"><a href="#" class="abil-link">' +
        U.esc(r.name) + '</a><div class="note tight">' + U.esc(r.id) + '</div></td>' +
        '<td class="text-left groups-cell">' + groupsHtml(r.groups) + '</td>' +
        '<td class="text-left desc-cell">' + U.esc(r.desc || '—') + '</td>' +
        '<td class="text-left"><span class="' + cls + '">' + U.esc(status) + '</span>' +
        '<div class="note tight">' + U.esc(r.calcDesc || '') + '</div></td></tr>';
    }).join('') || '<tr><td colspan="4" class="note">No abilities match.</td></tr>';
  }

  return { render, populateGroups };
})();
