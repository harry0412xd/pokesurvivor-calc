/* Config tab view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Config = (function () {
  const U = PSC.Utils;

  function sync() {
    const c = PSC.Models.Config.values();
    for (const f of PSC.Models.Config.FIELDS) {
      const el = document.getElementById(f.id);
      if (!el) continue;
      if (f.kind === 'bool') el.checked = !!c[f.key];
      else el.value = c[f.key];
    }
    renderStatus();
  }

  function renderStatus() {
    const el = document.getElementById('status');
    if (!el) return;
    const s = PSC.Store.state.status;
    el.textContent = s.text;
    el.className = 'status' + (s.cls ? ' ' + s.cls : '');
  }

  function render() {
    sync();
  }

  return { render, sync, renderStatus };
})();
