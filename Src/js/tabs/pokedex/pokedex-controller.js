/* Pokédex tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Pokedex = (function () {
  let inited = false;

  function resetPage() { PSC.Store.state.pokedex.page = 0; }

  function findRow(key) {
    if (!key) return null;
    return PSC.Data.state.rows.find(r => r.rowKey === key) || null;
  }

  function visibleRows() {
    return PSC.Models.Pokedex.page().rows;
  }

  function matrixTargetRow() {
    const sel = PSC.Store.state.selectedDex;
    let row = sel != null ? PSC.Models.Pokedex.rowForDex(sel) : null;
    if (!row) row = visibleRows()[0] || null;
    if (!row) row = PSC.Data.state.rows[0] || null;
    return row;
  }

  function radarCurrentRow() {
    return PSC.Views.Pokedex.currentRadarRow() ||
      (PSC.Store.state.selectedDex != null ? PSC.Models.Pokedex.rowForDex(PSC.Store.state.selectedDex) : null);
  }

  function init() {
    if (inited) return;
    inited = true;

    const search = document.getElementById('pokeSearch');
    if (search) search.addEventListener('input', e => {
      resetPage();
      PSC.Store.set('pokedex.search', e.target.value);
    });

    const gen = document.getElementById('pokeGen');
    if (gen) gen.addEventListener('change', e => {
      resetPage();
      PSC.Store.set('pokedex.gen', e.target.value);
    });

    const variant = document.getElementById('pokeVariantFilter');
    if (variant) variant.addEventListener('change', e => {
      resetPage();
      PSC.Store.set('pokedex.variant', e.target.value);
    });

    const best = document.getElementById('bestAbilityOnly');
    if (best) best.addEventListener('change', e => {
      resetPage();
      PSC.Store.set('pokedex.bestAbility', e.target.checked);
    });

    const aBox = document.getElementById('pokeAbilityChips');
    if (aBox) aBox.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || !b.dataset.ability) return;
      resetPage();
      PSC.Store.toggleSet('pokedex.abilitySel', b.dataset.ability);
    });

    function addAbilityFromInput() {
      const input = document.getElementById('pokeAbilitySearch');
      if (!input) return;
      const raw = input.value.trim();
      if (!raw) return;
      const query = raw.toLowerCase();
      const options = PSC.Models.Pokedex.abilityOptions();
      const nameOf = id => String(PSC.Data.abilityName(id)).toLowerCase();
      const match = options.find(id => id.toLowerCase() === query || nameOf(id) === query) ||
        options.find(id => nameOf(id).startsWith(query) || id.startsWith(query)) ||
        options.find(id => nameOf(id).includes(query) || id.includes(query));
      if (!match) {
        input.setCustomValidity('No matching ability');
        input.reportValidity();
        return;
      }
      input.setCustomValidity('');
      resetPage();
      const current = PSC.Store.state.pokedex.abilitySel || new Set();
      if (!current.has(match)) PSC.Store.set('pokedex.abilitySel', new Set([...current, match]));
      input.value = '';
      input.focus();
    }

    const aSearch = document.getElementById('pokeAbilitySearch');
    if (aSearch) {
      aSearch.addEventListener('input', () => aSearch.setCustomValidity(''));
      aSearch.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        addAbilityFromInput();
      });
      aSearch.addEventListener('change', addAbilityFromInput);
    }
    const aAdd = document.getElementById('pokeAbilityAdd');
    if (aAdd) aAdd.addEventListener('click', addAbilityFromInput);

    const tBox = document.getElementById('pokeTypeChips');
    if (tBox) tBox.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || !b.dataset.type) return;
      resetPage();
      PSC.Store.toggleSet('pokedex.typeSel', b.dataset.type);
    });

    const vBox = document.getElementById('pokeVariantChips');
    if (vBox) vBox.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || !b.dataset.type) return;
      resetPage();
      PSC.Store.toggleSet('pokedex.variantSel', b.dataset.type);
    });

    document.querySelectorAll('[data-action="clear-abilities"]').forEach(b => b.addEventListener('click', () => {
      resetPage();
      PSC.Store.set('pokedex.abilitySel', new Set());
    }));
    document.querySelectorAll('[data-action="clear-types"]').forEach(b => b.addEventListener('click', () => {
      resetPage();
      PSC.Store.set('pokedex.typeSel', new Set());
    }));
    document.querySelectorAll('[data-action="clear-variant-types"]').forEach(b => b.addEventListener('click', () => {
      resetPage();
      PSC.Store.set('pokedex.variantSel', new Set());
    }));

    document.querySelectorAll('#pokeTable th.sortable').forEach(th => {
      th.addEventListener('click', e => {
        if (e.target.closest('.matrix-btn')) return;
        const key = th.dataset.sort;
        const p = PSC.Store.state.pokedex;
        if (p.sortKey === key) PSC.Store.set('pokedex.sortDir', -p.sortDir);
        else {
          const asc = ['name', 'dex', 'ability', 'types', 'variant', 'dr', 'hit'].includes(key);
          PSC.Store.batch(() => {
            PSC.Store.set('pokedex.sortKey', key);
            PSC.Store.set('pokedex.sortDir', asc ? 1 : -1);
          });
        }
        resetPage();
      });
    });

    document.querySelectorAll('#pokeTable .matrix-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const row = matrixTargetRow();
        if (row) PSC.UI.matrix(btn.dataset.matrix, row);
      });
    });

    const body = document.getElementById('pokeBody');
    if (body) body.addEventListener('click', e => {
      if (e.target.closest('button, a, input, select, .matrix-btn')) return;
      const matrixCell = e.target.closest('[data-matrix]');
      if (matrixCell) {
        const row = findRow(matrixCell.dataset.rowkey);
        if (row) PSC.UI.matrix(matrixCell.dataset.matrix, row);
        return;
      }
      const tr = e.target.closest('tr[data-rowkey]');
      if (tr) {
        const row = findRow(tr.dataset.rowkey);
        if (row) PSC.Views.Pokedex.openRadar(row);
      }
    });

    document.querySelectorAll('[data-action="page-prev"]').forEach(b => b.addEventListener('click', () => {
      const p = PSC.Store.state.pokedex;
      PSC.Store.set('pokedex.page', Math.max(0, p.page - 1));
    }));
    document.querySelectorAll('[data-action="page-next"]').forEach(b => b.addEventListener('click', () => {
      const p = PSC.Store.state.pokedex;
      const pages = Math.max(1, Math.ceil(PSC.Models.Pokedex.list().length / POKE_PAGE_SIZE));
      PSC.Store.set('pokedex.page', Math.min(pages - 1, p.page + 1));
    }));

    // Radar modal controls
    const axes = document.getElementById('radarAxisToggles');
    if (axes) axes.addEventListener('click', e => {
      const btn = e.target.closest('button[data-axis]');
      if (!btn) return;
      const key = btn.dataset.axis;
      const on = !PSC.Store.state.radar.axes[key];
      PSC.Store.state.radar.axes[key] = on;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const row = radarCurrentRow();
      if (row) PSC.Views.Pokedex.drawRadar(row);
    });

    const legend = document.getElementById('radarLegend');
    if (legend) legend.addEventListener('click', e => {
      const b = e.target.closest('[data-legend]');
      if (!b) return;
      const r = PSC.Store.state.radar;
      if (b.dataset.legend === 'all') r.showAll = r.showAll === false;
      if (b.dataset.legend === 'type' && b.dataset.type) {
        const t = b.dataset.type;
        r.typeOn[t] = r.typeOn[t] === false;
      }
      const row = radarCurrentRow();
      if (row) PSC.Views.Pokedex.drawRadar(row);
    });

    const nat = document.getElementById('radarNatureSel');
    if (nat) nat.addEventListener('change', e => {
      PSC.Store.state.radar.nature = e.target.value;
      PSC.Store.setScoring({ natureMode: e.target.value || 'neutral' });
      PSC.Models.Pokedex.invalidate();
      PSC.Views.Pokedex.render();
      const row = radarCurrentRow();
      if (row) PSC.Views.Pokedex.drawRadar(row);
    });

    const statList = document.getElementById('pokeStatList');
    if (statList) statList.addEventListener('click', e => {
      const b = e.target.closest('.select-radar-poke');
      if (!b) return;
      PSC.Store.setSelectedDex(+b.dataset.dex);
      PSC.UI.closeModal('radarModal');
    });

    PSC.Store.on((state, reason) => {
      if (reason === 'scoring' || reason === 'columns' || reason === 'data') PSC.Models.Pokedex.invalidate();
      if (state.tab !== 'pokedex') return;
      PSC.Views.Pokedex.render();
    });
  }

  return { init, matrixTargetRow, findRow, visibleRows };
})();
