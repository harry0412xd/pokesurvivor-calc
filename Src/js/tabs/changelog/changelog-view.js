/* Changelog tab view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Changelog = (function () {
  function render() {
    const version = PSC.Models.Changelog.version();
    const badge = document.getElementById('appVersionBadge');
    if (badge) badge.textContent = 'v' + version;
    const list = document.getElementById('changelogList');
    if (!list) return;
    list.innerHTML = PSC.Models.Changelog.entries().map(c =>
      '<div class="changelog-item item-row"><div class="iname"><span class="ver">v' + c.v +
      '</span> · ' + c.date + '</div><ul>' +
      c.items.map(i => '<li>' + i + '</li>').join('') + '</ul></div>'
    ).join('');
  }

  return { render };
})();
