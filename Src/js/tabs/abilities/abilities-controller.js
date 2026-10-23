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

    const body = document.getElementById('abilBody');
    if (body) body.addEventListener('click', e => {
      const a = e.target.closest('[data-ability-link]');
      if (!a) return;
      e.preventDefault();
      const id = a.dataset.abilityLink;
      PSC.Store.batch(() => {
        PSC.Store.set('pokedex.abilitySel', new Set(id ? [id] : []));
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
