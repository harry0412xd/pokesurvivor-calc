/* DPS tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Dps = (function () {
  let inited = false;

  function sync() {
    const d = PSC.Store.state.dps;
    const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    set('dpsSearch', el => { el.value = d.search; });
    set('dpsCatFilter', el => { el.value = d.cat; });
    set('dpsMobbing', el => { el.checked = d.mobbing; });
    set('projHitPct', el => { el.value = d.projHitPct; });
    set('avgEnemyR', el => { el.value = d.avgEnemyR; });
    set('useAvgType', el => { el.checked = d.useAvgType; });
    set('usePoison', el => { el.checked = d.usePoison; });
    set('hideUnusableMoves', el => { el.checked = d.hideUnusable; });
  }

  function init() {
    if (inited) return;
    inited = true;
    sync();
    const d = () => PSC.Store.state.dps;

    const bind = (id, ev, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(ev, fn);
    };

    bind('dpsSearch', 'input', e => PSC.Store.set('dps.search', e.target.value));
    bind('dpsCatFilter', 'change', e => PSC.Store.set('dps.cat', e.target.value));
    bind('dpsMobbing', 'change', e => { PSC.Store.set('dps.mobbing', e.target.checked); });
    bind('projHitPct', 'input', e => PSC.Store.set('dps.projHitPct', Math.max(1, Math.min(100, +e.target.value || 70))));
    bind('avgEnemyR', 'input', e => PSC.Store.set('dps.avgEnemyR', Math.max(1, +e.target.value || 12)));
    bind('useAvgType', 'change', e => PSC.Store.set('dps.useAvgType', e.target.checked));
    bind('usePoison', 'change', e => PSC.Store.set('dps.usePoison', e.target.checked));
    bind('hideUnusableMoves', 'change', e => PSC.Store.set('dps.hideUnusable', e.target.checked));

    const chips = document.getElementById('dpsTypeChips');
    if (chips) chips.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.clear) { PSC.Store.set('dps.types', new Set(), 'dps'); return; }
      if (b.dataset.type) PSC.Store.toggleSet('dps.types', b.dataset.type);
    });

    const kinds = document.getElementById('dpsKindChips');
    if (kinds) kinds.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.clear) { PSC.Store.set('dps.kinds', new Set(), 'dps'); return; }
      if (b.dataset.kind) PSC.Store.toggleSet('dps.kinds', b.dataset.kind);
    });

    document.querySelectorAll('#panel-dps th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (d().sortKey === key) PSC.Store.set('dps.sortDir', -d().sortDir);
        else {
          PSC.Store.batch(() => {
            PSC.Store.set('dps.sortKey', key);
            PSC.Store.set('dps.sortDir', ['name', 'type', 'kind'].includes(key) ? 1 : -1);
          });
        }
      });
    });

    PSC.Store.on((state, reason) => {
      if (reason === 'selected' || reason === 'dps' || reason === 'data') PSC.Models.Dps.invalidate();
      if (state.tab !== 'dps') return;
      sync();
      PSC.Views.Dps.render();
    });
  }

  return { init, sync };
})();
