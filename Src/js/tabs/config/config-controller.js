/* Config tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Config = (function () {
  let inited = false;

  function clampField(f, raw) {
    let v = f.kind === 'int' ? parseInt(raw, 10) : parseFloat(raw);
    if (!Number.isFinite(v)) return null;
    if (f.min != null) v = Math.max(f.min, v);
    if (f.max != null) v = Math.min(f.max, v);
    return v;
  }

  function init() {
    if (inited) return;
    inited = true;

    for (const f of PSC.Models.Config.FIELDS) {
      const el = document.getElementById(f.id);
      if (!el) continue;
      el.addEventListener(f.kind === 'bool' ? 'change' : 'change', e => {
        if (f.kind === 'bool') {
          PSC.Models.Config.set(f.key, e.target.checked);
        } else {
          const v = clampField(f, e.target.value);
          if (v == null) { PSC.Views.Config.sync(); return; }
          e.target.value = v;
          PSC.Models.Config.set(f.key, v);
        }
        PSC.Models.Config.invalidateAll();
      });
    }

    document.querySelectorAll('[data-action="recalc"]').forEach(b =>
      b.addEventListener('click', () => {
        PSC.Models.Config.recalc();
        PSC.Store.set('status', { text: 'Recalculated with current configuration.', cls: 'ok' }, 'status');
      }));

    document.querySelectorAll('[data-action="reload"]').forEach(b =>
      b.addEventListener('click', () => {
        if (PSC.Controllers.App && PSC.Controllers.App.reload) PSC.Controllers.App.reload();
        else PSC.Data.load(true).then(() => PSC.Store.emit('data'));
      }));

    PSC.Store.on((state, reason) => {
      if (reason === 'status') PSC.Views.Config.renderStatus();
      if (state.tab !== 'config') return;
      PSC.Views.Config.render();
    });
  }

  return { init };
})();
