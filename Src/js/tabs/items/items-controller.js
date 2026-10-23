/* Items tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Items = (function () {
  let inited = false;

  function init() {
    if (inited) return;
    inited = true;
    PSC.Store.on(state => {
      if (state.tab !== 'items') return;
      PSC.Views.Items.render();
    });
  }

  return { init };
})();
