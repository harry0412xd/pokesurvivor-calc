/* Multipliers tab view. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Multipliers = (function () {
  const U = PSC.Utils;

  function renderChips() {
    const box = document.getElementById('weakAtkChips');
    if (!box) return;
    const sel = PSC.Store.state.multipliers.weakTypes;
    box.innerHTML = TYPE_LIST.map(t => PSC.UI.typeChip(t, sel.has(t))).join('') +
      '<button type="button" class="type-chip clear-chip" data-clear="weak">Clear</button>';
  }

  function renderWeakMatrix() {
    const head = document.getElementById('weakMatrixHead');
    const body = document.getElementById('weakMatrixBody');
    if (!head || !body) return;
    const m = PSC.Models.Multipliers.weakMatrix();
    const yourTypes = m.yourTypes;

    head.innerHTML = '<tr><th class="text-left">Enemy types</th><th>%</th>' +
      yourTypes.map(t => {
        const c = TYPE_COLORS[t] || '#888';
        return '<th title="Offense: you attack as ' + t + '">off <span class="type-badge" style="background:' +
          c + '33;color:' + c + '">' + t + '</span></th>';
      }).join('') +
      (m.multi ? '<th title="Highest multiplier among your types">Best off</th><th title="Equal-split offense">Avg off</th>' : '') +
      '<th title="Incoming damage from this enemy, equal-split over their types">def</th></tr>';

    body.innerHTML = m.rows.map(e => {
      const badges = e.types.map(t => U.typeBadge(t)).join(' ');
      const cells = e.mults.map(v => '<td class="' + PSC.Calc.multClass(v) + '">×' + v.toFixed(2) + '</td>').join('');
      const extra = m.multi
        ? '<td class="' + PSC.Calc.multClass(e.best) + '">×' + e.best.toFixed(2) + '</td>' +
          '<td class="' + PSC.Calc.multClass(e.avg) + '">×' + e.avg.toFixed(2) + '</td>'
        : '';
      return '<tr><td class="text-left">' + badges + '</td><td>' + e.pct.toFixed(2) + '%</td>' +
        cells + extra + '<td class="' + PSC.Calc.defClass(e.defM) + '">×' + e.defM.toFixed(2) + '</td></tr>';
    }).join('') ||
      '<tr><td colspan="' + (2 + yourTypes.length + (m.multi ? 2 : 0) + 1) + '" class="note">No enemy weights loaded.</td></tr>';

    const avgCells = m.avgCells.map(v => '<td class="' + PSC.Calc.multClass(v) + '">×' + v.toFixed(3) + '</td>').join('');
    const avgExtra = m.multi
      ? '<td class="' + PSC.Calc.multClass(m.avgBest) + '">×' + m.avgBest.toFixed(3) + '</td>' +
        '<td class="' + PSC.Calc.multClass(m.avgSplit) + '">×' + m.avgSplit.toFixed(3) + '</td>'
      : '';
    body.innerHTML += '<tr class="avg-row"><td class="text-left">Average (spawn-weighted)</td><td>100%</td>' +
      avgCells + avgExtra + '<td class="' + PSC.Calc.defClass(m.avgDef) + '">×' + m.avgDef.toFixed(3) + '</td></tr>';

    const summary = document.getElementById('weakMultiSummary');
    if (summary) {
      if (yourTypes.length) {
        const split = PSC.Models.Multipliers.coverage(yourTypes);
        const best = PSC.Models.Multipliers.bestOf(yourTypes);
        summary.innerHTML = 'Selection <b>' + U.esc(yourTypes.join('+')) + '</b>: equal-split ×' +
          split.toFixed(3) + ' · best-of ×' + best.toFixed(3) +
          (m.multi ? '' : ' · add another type to compare split vs best');
      } else {
        summary.textContent = '';
      }
    }
  }

  function renderOffense() {
    const body = document.getElementById('offenseTypeBody');
    if (!body) return;
    body.innerHTML = PSC.Models.Multipliers.offenseTypes().map(r => {
      const c = TYPE_COLORS[r.type] || '#888';
      return '<tr><td class="text-left"><span class="type-badge" style="background:' + c + '33;color:' + c + '">' +
        U.esc(r.type) + '</span></td>' +
        '<td title="Spawn-weighted soft type multiplier as ' + U.esc(r.type) + ' attacker">' + r.typeM.toFixed(3) + '</td>' +
        '<td title="Long-run weather average for ' + U.esc(r.type) + '">' + r.wxM.toFixed(3) + '</td>' +
        '<td class="' + PSC.Calc.multClass(r.comb) + '"><b>' + r.comb.toFixed(3) + '</b></td></tr>';
    }).join('');
  }

  function renderDefense() {
    const body = document.getElementById('defenseTypeBody');
    if (!body) return;
    body.innerHTML = PSC.Models.Multipliers.defenseTypes().map(r => {
      const c = TYPE_COLORS[r.type] || '#888';
      return '<tr><td class="text-left"><span class="type-badge" style="background:' + c + '33;color:' + c + '">' +
        U.esc(r.type) + '</span></td>' +
        '<td class="' + PSC.Calc.defClass(r.typeDef) + '" title="Spawn-weighted incoming type multiplier if you are ' +
        U.esc(r.type) + '">' + r.typeDef.toFixed(3) + '</td>' +
        '<td class="' + PSC.Calc.defClass(r.wxDef) + '" title="Spawn-weighted weather on enemy attack types">' +
        r.wxDef.toFixed(3) + '</td>' +
        '<td class="' + PSC.Calc.defClass(r.comb) + '"><b>' + r.comb.toFixed(3) + '</b></td></tr>';
    }).join('');
  }

  function renderEnemies() {
    const body = document.getElementById('enemyTypeBody');
    if (!body) return;
    body.innerHTML = PSC.Models.Multipliers.enemyWeights().slice()
      .sort((a, b) => b.pct - a.pct)
      .map(e => '<tr><td class="text-left">' + e.types.map(t => U.typeBadge(t)).join(' ') + '</td>' +
        '<td>' + e.pct.toFixed(1) + '</td>' +
        '<td class="text-left muted-soft">' + U.esc((e.examples || []).slice(0, 3).join(', ') || '—') + '</td></tr>')
      .join('');
  }

  function renderHitbox() {
    const el = document.getElementById('hitboxSummary');
    if (!el) return;
    const s = PSC.Models.Multipliers.hitboxSummary();
    if (!s) { el.textContent = 'No hitbox data loaded.'; return; }
    el.innerHTML = 'Median hitbox r = <strong>' + U.fmt(s.med, 2) + '</strong> · range ' +
      U.fmt(s.min, 1) + '–' + U.fmt(s.max, 1) + ' · ' + s.count + ' Pokémon · baseline mode <b>' +
      U.esc(s.medianMode) + '</b> · curve <b>' + U.esc(s.curve) + '</b>. Small bodies get a higher hitbox multiplier.';
  }

  function render() {
    if (!PSC.Data.loaded) return;
    renderChips();
    renderWeakMatrix();
    renderOffense();
    renderDefense();
    renderEnemies();
    renderHitbox();
  }

  return { render, renderChips, renderWeakMatrix, renderOffense, renderDefense, renderEnemies, renderHitbox };
})();
