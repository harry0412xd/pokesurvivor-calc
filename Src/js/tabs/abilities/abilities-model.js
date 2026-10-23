/* Abilities tab model. */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Abilities = (function () {
  const U = PSC.Utils;

  function allIds() {
    const ids = new Set();
    if (typeof ABILITIES === 'object') Object.keys(ABILITIES).forEach(id => ids.add(id));
    for (const arr of Object.values(PSC.Data.state.dexAbil || {})) {
      for (const a of arr || []) if (a && a !== 0 && a !== '0') ids.add(String(a));
    }
    return [...ids].sort((a, b) => PSC.Data.abilityName(a).localeCompare(PSC.Data.abilityName(b)));
  }

  function row(id) {
    const meta = PSC.Abilities.meta(id);
    return {
      id,
      name: PSC.Data.abilityName(id),
      desc: meta.desc || '',
      calcDesc: meta.calcDesc || '',
      implemented: !!meta.implemented,
      willNot: !!meta.willNot,
      groups: meta.groups || { conditions: [], effects: [] }
    };
  }

  function groupText(groups) {
    return (groups.conditions || []).concat(groups.effects || [])
      .map(key => PSC.AbilityGroups.label(key)).join(' ');
  }

  function list(q, implOnly, group) {
    const query = String(q || '').trim().toLowerCase();
    return allIds().map(row).filter(r => {
      if (implOnly && !r.implemented) return false;
      if (group && !r.groups.conditions.includes(group) && !r.groups.effects.includes(group)) return false;
      if (!query) return true;
      return (r.name + ' ' + r.id + ' ' + r.desc + ' ' + r.calcDesc + ' ' + groupText(r.groups))
        .toLowerCase().includes(query);
    });
  }

  function groups() { return PSC.AbilityGroups.groups(); }

  return { allIds, row, list, groups };
})();
