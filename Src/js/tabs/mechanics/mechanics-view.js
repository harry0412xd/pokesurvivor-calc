/* Mechanics tab view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Mechanics = (function () {
  function render() {
    const el = document.getElementById('mechanicsBody');
    if (!el) return;
    el.innerHTML = PSC.Models.Mechanics.groups().map(g =>
      '<div class="mech-card"><h3>' + g.title + '</h3><ul>' +
      g.items.map(i => '<li>' + i + '</li>').join('') + '</ul></div>'
    ).join('');
  }

  return { render };
})();
