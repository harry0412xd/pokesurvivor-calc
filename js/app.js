/* PokéSurvivor Toolkit — App entry v1.4.0 */
/* Load order: model → view → controller → app */
(function () {
  const el = document.getElementById('verInline');
  if (el && typeof APP_VERSION !== 'undefined') el.textContent = 'v' + APP_VERSION;
})();
