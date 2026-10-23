/* Calculator tab controller. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.Calculator = (function () {
  let inited = false;

  function openPicker(slot, row) {
    const mon = PSC.Models.Calculator.mon();
    if (!mon) {
      PSC.Store.set('status', { text: 'Select a Pokémon in the top bar first.', cls: 'err' }, 'status');
      return;
    }
    PSC.Store.set('calculator.pick', { slot, row }, 'calculator');
  }

  function init() {
    if (inited) return;
    inited = true;

    const body = document.getElementById('calcGridBody');
    if (body) body.addEventListener('click', e => {
      const td = e.target.closest('td[data-slot]');
      if (!td) return;
      const slot = +td.dataset.slot;
      const row = +td.dataset.row;
      const slots = PSC.Models.Calculator.slots();
      if (slots[slot] && slots[slot][row]) {
        PSC.Models.Calculator.removeAt(slot, row);
      } else {
        openPicker(slot, row);
      }
    });

    const picker = document.getElementById('calcPicker');
    if (picker) picker.addEventListener('click', e => {
      const pick = e.target.closest('.pick');
      if (!pick) return;
      const cell = PSC.Store.state.calculator.pick;
      if (!cell) return;
      if (!PSC.Models.Calculator.add(cell.slot, pick.dataset.id)) {
        PSC.Store.set('status', { text: 'Max 4 bonded moves per slot.', cls: 'err' }, 'status');
      }
    });

    document.querySelectorAll('[data-action="calc-clear"]').forEach(b =>
      b.addEventListener('click', () => PSC.Models.Calculator.clear()));

    PSC.Store.on((state, reason) => {
      if (reason === 'selected' || reason === 'data') PSC.Models.Calculator.prune();
      if (state.tab !== 'calc') return;
      PSC.Views.Calculator.render();
    });
  }

  return { init };
})();
