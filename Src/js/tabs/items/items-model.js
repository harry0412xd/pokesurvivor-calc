/* Items tab model. */
window.PSC = window.PSC || {};
PSC.Models = PSC.Models || {};

PSC.Models.Items = (function () {
  function drops() { return MECHANICS_DROPS; }
  function items() { return PSC.Data.state.items || []; }
  return { drops, items };
})();
