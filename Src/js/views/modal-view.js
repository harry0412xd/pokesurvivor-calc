/* Shared modal view: scoring weights and Pokédex column visibility. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Modals = (function () {
  let inited = false;

  function openScoring() {
    PSC.UI.syncScoreInputs();
    PSC.UI.openModal('scoringModal');
  }

  function openColumns() {
    PSC.UI.renderColumnsModal();
    PSC.UI.openModal('columnsModal');
  }

  function applyScoring() {
    const prefs = PSC.UI.scorePrefsFromInputs();
    PSC.Store.setScoring(prefs);
    PSC.UI.closeModal('scoringModal');
  }

  function resetScoring() {
    PSC.Store.resetScoring();
    PSC.UI.syncScoreInputs();
  }

  function applyColumns() {
    const hidden = new Set();
    document.querySelectorAll('#columnsList input[data-col]').forEach(inp => {
      if (!inp.checked) hidden.add(inp.dataset.col);
    });
    PSC.Store.setColumns(hidden);
    PSC.UI.closeModal('columnsModal');
    PSC.UI.applyColumnClasses();
  }

  function resetColumns() {
    PSC.Store.resetColumns();
    PSC.UI.renderColumnsModal();
    PSC.UI.applyColumnClasses();
  }

  function bindWeightPair(key) {
    const range = document.getElementById('sw' + key + 'Range');
    const num = document.getElementById('sw' + key + 'Num');
    if (range && num) {
      range.addEventListener('input', () => { num.value = range.value; });
      num.addEventListener('input', () => { range.value = num.value; });
    }
  }

  function init() {
    if (inited) return;
    inited = true;
    ['Off', 'Def', 'Spd'].forEach(bindWeightPair);

    document.querySelectorAll('[data-action="open-scoring"]').forEach(b =>
      b.addEventListener('click', openScoring));
    document.querySelectorAll('[data-action="open-columns"]').forEach(b =>
      b.addEventListener('click', openColumns));
    document.querySelectorAll('[data-action="close-scoring"]').forEach(b =>
      b.addEventListener('click', () => PSC.UI.closeModal('scoringModal')));
    document.querySelectorAll('[data-action="close-columns"]').forEach(b =>
      b.addEventListener('click', () => PSC.UI.closeModal('columnsModal')));
    document.querySelectorAll('[data-action="close-radar"]').forEach(b =>
      b.addEventListener('click', () => PSC.UI.closeModal('radarModal')));
    document.querySelectorAll('[data-action="close-matrix"]').forEach(b =>
      b.addEventListener('click', () => PSC.UI.closeModal('matrixModal')));
    document.querySelectorAll('[data-action="apply-scoring"]').forEach(b =>
      b.addEventListener('click', applyScoring));
    document.querySelectorAll('[data-action="reset-scoring"]').forEach(b =>
      b.addEventListener('click', resetScoring));
    document.querySelectorAll('[data-action="apply-columns"]').forEach(b =>
      b.addEventListener('click', applyColumns));
    document.querySelectorAll('[data-action="reset-columns"]').forEach(b =>
      b.addEventListener('click', resetColumns));
  }

  return { init, openScoring, openColumns, applyScoring, resetScoring, applyColumns, resetColumns };
})();
