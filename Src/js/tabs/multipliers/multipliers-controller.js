/* Multipliers tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Multipliers = (function () {
  let inited = false;

  function init() {
    if (inited) return;
    inited = true;

    const chips = document.getElementById('weakAtkChips');
    if (chips) chips.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.clear) {
        PSC.Store.set('multipliers.weakTypes', new Set());
        return;
      }
      if (b.dataset.type) PSC.Store.toggleSet('multipliers.weakTypes', b.dataset.type);
    });

    document.querySelectorAll('[data-action="clear-weak-atk"]').forEach(b =>
      b.addEventListener('click', () => PSC.Store.set('multipliers.weakTypes', new Set())));

    PSC.Store.on((state, reason) => {
      if (state.tab !== 'multipliers') return;
      PSC.Views.Multipliers.render();
    });
  }

  return { init };
})();
