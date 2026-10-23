/* Abilities tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Abilities = (function () {
  let inited = false;

  function init() {
    if (inited) return;
    inited = true;

    const search = document.getElementById('abilitySearch');
    if (search) search.addEventListener('input', () => PSC.Views.Abilities.render());
    const impl = document.getElementById('abilImplOnly');
    if (impl) impl.addEventListener('change', () => PSC.Views.Abilities.render());
    const group = document.getElementById('abilGroupFilter');
    if (group) group.addEventListener('change', () => PSC.Views.Abilities.render());

    const body = document.getElementById('abilBody');
    if (body) body.addEventListener('click', e => {
      const row = e.target.closest('[data-ability-add]');
      if (!row) return;
      e.preventDefault();
      const id = row.dataset.abilityAdd;
      if (!id) return;
      const current = PSC.Store.state.pokedex.abilitySel || new Set();
      PSC.Store.batch(() => {
        PSC.Store.set('pokedex.abilitySel', new Set([...current, id]));
        PSC.Store.set('pokedex.page', 0);
        PSC.Store.setTab('pokedex');
      });
    });

    PSC.Store.on((state) => {
      if (state.tab !== 'abilities') return;
      PSC.Views.Abilities.render();
    });
  }

  return { init };
})();
