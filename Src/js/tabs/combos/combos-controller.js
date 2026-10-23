/* Best combos controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Combos = (function () {
  let inited = false;

  function sync() {
    const c = PSC.Store.state.combos;
    const bond = document.getElementById('bondSize');
    if (bond) bond.value = c.bondSize;
    const sw = document.getElementById('preferSwitchSlots');
    if (sw) sw.checked = c.preferSwitch;
  }

  function jumpToMove(id) {
    const def = PSC.Data.findMove(id);
    if (!def) return;
    PSC.Store.batch(() => {
      PSC.Store.set('dps.types', new Set());
      PSC.Store.set('dps.kinds', new Set());
      PSC.Store.set('dps.cat', '');
      PSC.Store.set('dps.search', PSC.Data.moveName(def));
      PSC.Store.setTab('dps');
    });
    requestAnimationFrame(() => {
      const target = document.querySelector('#dpsBody tr[data-move-id="' + id + '"]');
      if (!target) return;
      target.classList.add('highlight-row');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function init() {
    if (inited) return;
    inited = true;
    sync();

    const bond = document.getElementById('bondSize');
    if (bond) bond.addEventListener('input', e => {
      const v = Math.max(1, Math.min(4, parseInt(e.target.value, 10) || 4));
      e.target.value = v;
      PSC.Store.set('combos.bondSize', v);
    });

    const sw = document.getElementById('preferSwitchSlots');
    if (sw) sw.addEventListener('change', e => {
      PSC.Store.set('combos.preferSwitch', e.target.checked);
    });

    document.querySelectorAll('[data-action="calc-combos"]').forEach(b =>
      b.addEventListener('click', () => {
        PSC.Models.Combos.invalidate();
        PSC.Views.Combos.render();
      }));

    const list = document.getElementById('comboList');
    if (list) list.addEventListener('click', e => {
      const mv = e.target.closest('[data-move-id]');
      if (!mv) return;
      jumpToMove(mv.dataset.moveId);
    });

    PSC.Store.on((state, reason) => {
      if (['selected', 'dps', 'config', 'data', 'combos', 'scoring'].includes(reason)) {
        PSC.Models.Combos.invalidate();
      }
      if (state.tab !== 'combos') return;
      sync();
      PSC.Views.Combos.render();
    });
  }

  return { init, sync, jumpToMove };
})();
