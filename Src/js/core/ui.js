/* Shared UI helpers: tooltips, chips, modals, matrix rendering, formatting. */
window.PSC = window.PSC || {};

PSC.UI = (function () {
  const U = PSC.Utils;
  const tips = new Map();
  let currentTipKey = null;
  let inited = false;

  const COLUMN_LABELS = PSC.Labels.COLUMN_LABELS;

  function init() {
    if (inited) return;
    inited = true;
    PSC.Labels.syncTableHeaders(document.getElementById('pokeTable'));

    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tipkey]');
      if (!el) return;
      const key = el.getAttribute('data-tipkey');
      const html = tips.get(key);
      if (!html) return;
      currentTipKey = key;
      showTip(html, e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', e => {
      if (!currentTipKey) return;
      moveTip(e.clientX, e.clientY);
    });
    document.addEventListener('mouseout', e => {
      const from = e.target.closest && e.target.closest('[data-tipkey]');
      if (!from) return;
      const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-tipkey]') : null;
      if (to === from) return;
      currentTipKey = null;
      hideTip();
    });

    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', e => { if (e.target === bd) closeModal(bd.id); });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeAllModals();
        hideTip();
      }
    });
  }

  function tip(key, html) {
    tips.set(key, html);
    return ' data-tipkey="' + U.esc(key) + '"';
  }

  function clearTips(prefix) {
    if (!prefix) { tips.clear(); return; }
    for (const k of [...tips.keys()]) if (k.startsWith(prefix)) tips.delete(k);
  }

  function showTip(html, x, y) {
    const el = document.getElementById('tt');
    if (!el) return;
    el.innerHTML = html;
    el.style.display = 'block';
    moveTip(x, y);
  }

  function moveTip(x, y) {
    const el = document.getElementById('tt');
    if (!el || el.style.display === 'none') return;
    const r = el.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    el.style.left = Math.max(8, left) + 'px';
    el.style.top = Math.max(8, top) + 'px';
  }

  function hideTip() {
    const el = document.getElementById('tt');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    el.classList.add('open');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = true;
    el.classList.remove('open');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(el => {
      el.hidden = true;
      el.classList.remove('open');
    });
  }

  function matrix(kind, row) {
    if (!row) return;
    const prefs = PSC.Store.prefs();
    const meds = PSC.Store.state.pokedex.meds || null;
    const data = PSC.Calc.matrixFor(kind, row, prefs, meds);
    const titleEl = document.getElementById('matrixTitle');
    const subEl = document.getElementById('matrixSubtitle');
    const body = document.getElementById('matrixBody');
    if (titleEl) titleEl.textContent = data.title;
    if (subEl) subEl.innerHTML = data.subtitle;
    if (body) body.innerHTML = data.html;
    openModal('matrixModal');
  }

  function typeChip(type, selected, extraClass) {
    const c = TYPE_COLORS[type] || '#888';
    return '<button type="button" class="type-chip' + (selected ? ' selected' : '') +
      (extraClass ? ' ' + extraClass : '') + '" data-type="' + U.esc(type) + '"' +
      ' style="--chip-color:' + c + ';background:' + c + (selected ? '44' : '22') + ';color:' + c + '">' +
      U.esc(type) + '</button>';
  }

  function kindChip(kind, selected) {
    return '<button type="button" class="kind-chip' + (selected ? ' selected' : '') +
      '" data-kind="' + U.esc(kind) + '">' + U.esc(kind) + '</button>';
  }

  function abilityChip(id, name, selected) {
    return '<button type="button" class="type-chip ability-chip' + (selected ? ' selected' : '') +
      '" data-ability="' + U.esc(id) + '"' +
      (selected ? ' title="Remove ' + U.esc(name) + '"' : '') + '>' + U.esc(name) +
      (selected ? '<span class="chip-x" aria-hidden="true">×</span>' : '') + '</button>';
  }

  function scorePrefsFromInputs() {
    const val = id => {
      const el = document.getElementById(id);
      return el ? +el.value : 0;
    };
    return {
      weights: {
        off: Math.max(0, val('swOffNum')),
        def: Math.max(0, val('swDefNum')),
        spd: Math.max(0, val('swSpdNum'))
      },
      natureMode: (document.getElementById('natureModeSel') || {}).value || 'neutral',
      medianMode: (document.getElementById('dodgeMedianModeSel') || {}).value || 'pokemon',
      curve: (document.getElementById('dodgeCurveSel') || {}).value || 'power15'
    };
  }

  function syncScoreInputs() {
    const s = PSC.Store.state.scoring;
    const pairs = [['Off', s.weights.off], ['Def', s.weights.def], ['Spd', s.weights.spd]];
    for (const [k, v] of pairs) {
      const r = document.getElementById('sw' + k + 'Range');
      const n = document.getElementById('sw' + k + 'Num');
      if (r) r.value = v;
      if (n) n.value = v;
    }
    const nat = document.getElementById('natureModeSel');
    if (nat) nat.value = s.natureMode;
    const med = document.getElementById('dodgeMedianModeSel');
    if (med) med.value = s.medianMode;
    const curve = document.getElementById('dodgeCurveSel');
    if (curve) curve.value = s.curve;
  }

  function renderColumnsModal() {
    const box = document.getElementById('columnsList');
    if (!box) return;
    box.innerHTML = PSC.Store.DEFAULT_COLUMNS.map(id =>
      '<label class="poke-col-check"><input type="checkbox" data-col="' + id + '"' +
      (PSC.Store.isColumnVisible(id) ? ' checked' : '') + ' /> ' +
      U.esc(COLUMN_LABELS[id] || id) + '</label>'
    ).join('');
  }

  function applyColumnClasses() {
    const table = document.getElementById('pokeTable');
    if (!table) return;
    PSC.Store.DEFAULT_COLUMNS.forEach(id => {
      table.classList.toggle('hide-col-' + id, !PSC.Store.isColumnVisible(id));
    });
  }

  function statCell(value, digits, rank) {
    const txt = typeof value === 'number' ? U.fmt(value, digits) : (value == null ? '—' : value);
    return txt + (rank ? ' <span class="rank-tag">#' + rank + '</span>' : '');
  }

  function sortArrow(active, dir) {
    return active ? (dir > 0 ? '▲' : '▼') : '';
  }

  return {
    init,
    tip,
    clearTips,
    showTip,
    hideTip,
    openModal,
    closeModal,
    closeAllModals,
    matrix,
    typeChip,
    kindChip,
    abilityChip,
    scorePrefsFromInputs,
    syncScoreInputs,
    renderColumnsModal,
    applyColumnClasses,
    statCell,
    sortArrow,
    COLUMN_LABELS
  };
})();
