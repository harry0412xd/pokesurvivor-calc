/* Mechanics tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Mechanics = (function () {
  let inited = false;

  function init() {
    if (inited) return;
    inited = true;
    PSC.Store.on(state => {
      if (state.tab !== 'mechanics') return;
      PSC.Views.Mechanics.render();
    });
  }

  return { init };
})();
