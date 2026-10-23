/* PokéSurvivor Calc — MVC bootstrap.
 *
 * All behaviour lives in the model/view/controller files loaded before this
 * script. This file only starts the shell once the DOM is ready.
 */
(function () {
  function start() {
    try {
      PSC.Controllers.App.init();
    } catch (e) {
      console.error('[PSC] failed to start', e);
      const status = document.getElementById('status');
      if (status) {
        status.textContent = 'Startup error: ' + (e && e.message ? e.message : e);
        status.className = 'status err';
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
