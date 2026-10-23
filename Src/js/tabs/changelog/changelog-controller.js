/* Changelog tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Changelog = (function () {
  let inited = false;

  function init() {
    if (inited) return;
    inited = true;
    PSC.Store.on(state => {
      if (state.tab !== 'changelog') return;
      PSC.Views.Changelog.render();
    });
  }

  return { init };
})();
