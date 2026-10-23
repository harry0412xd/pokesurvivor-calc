/* Pokédex tab view. One <td> per <th>, so sorting and column hiding line up. */
window.PSC = window.PSC || {};
PSC.Views = PSC.Views || {};

PSC.Views.Pokedex = (function () {
  const U = PSC.Utils;
  const RANK_KEYS = { pa: null, sa: null, df: null, sd: null, hp: null, spd: null, hit: null, bst: null };
  let radarRow = null;

  function renderChips() {
    const p = PSC.Store.state.pokedex;
    const options = PSC.Models.Pokedex.abilityOptions();
    const aBox = document.getElementById('pokeAbilityChips');
    if (aBox) {
      const selected = [...p.abilitySel].sort((a, b) =>
        PSC.Data.abilityName(a).localeCompare(PSC.Data.abilityName(b)));
      aBox.innerHTML = selected.map(id =>
        PSC.UI.abilityChip(id, PSC.Data.abilityName(id), true)
      ).join('') || '<span class="note">No ability filter — every ability is included.</span>';
    }
    const list = document.getElementById('pokeAbilityOptions');
    if (list) {
      list.innerHTML = options.map(id =>
        '<option value="' + U.esc(PSC.Data.abilityName(id)) + '"></option>'
      ).join('');
    }
    const tBox = document.getElementById('pokeTypeChips');
    if (tBox) {
      tBox.innerHTML = TYPE_LIST.map(t => PSC.UI.typeChip(t, p.typeSel.has(t))).join('');
    }
    const vBox = document.getElementById('pokeVariantChips');
    if (vBox) {
      vBox.innerHTML = PSC.Models.Pokedex.variantTypes().map(t => PSC.UI.typeChip(t, p.variantSel.has(t))).join('');
    }
  }

  function populateGens() {
    const sel = document.getElementById('pokeGen');
    if (!sel) return;
    const gens = PSC.Models.Pokedex.gens();
    const cur = PSC.Store.state.pokedex.gen;
    sel.innerHTML = '<option value="">All gens</option>' +
      gens.map(g => '<option value="' + g + '"' + (String(g) === String(cur) ? ' selected' : '') + '>Gen ' + g + '</option>').join('');
  }

  function abilityTip(row) {
    const meta = PSC.Abilities.meta(row.abilityId || '');
    return '<div class="tt-title">' + U.esc(row.abilityName || '—') + '</div>' +
      '<div class="tt-step">' + U.esc(meta.desc || 'No description.') + '</div>' +
      '<div class="tt-muted">' + U.esc(meta.calcDesc || '') + '</div>';
  }

  function cell(row, cls, content, opts) {
    opts = opts || {};
    const attrs = [];
    if (opts.tipKey) attrs.push(PSC.UI.tip(opts.tipKey, opts.tipHtml));
    if (opts.matrix) attrs.push(' data-matrix="' + opts.matrix + '" data-rowkey="' + U.esc(row.rowKey) + '"');
    return '<td class="' + cls + (opts.extra || '') + '"' + attrs.join('') +
      (opts.style ? ' style="' + opts.style + '"' : '') + '>' + content + '</td>';
  }

  function renderTable() {
    const body = document.getElementById('pokeBody');
    if (!body) return;
    const pg = PSC.Models.Pokedex.page();
    const p = PSC.Store.state.pokedex;
    const meds = PSC.Store.state.pokedex.meds || { medOff: 1, medEhp: 1, medSpd: 1 };

    body.innerHTML = pg.rows.map(row => {
      const m = PSC.Models.Pokedex.metricsFor(row);
      const rk = row.ranks || {};
      const color = TYPE_COLORS[row.variantType] || '#888';
      const hitTip = '<div class="tt-title">Hitbox multi</div><div class="tt-step">' +
        U.fmt(m.hitMulti, 3) + ' — r ' + U.fmt(row.hit, 1) + ' vs baseline ' +
        U.fmt(PSC.Calc.medianHitRadius(PSC.Store.prefs()), 2) + '</div>';
      const dodgeTip = '<div class="tt-title">Dodge (ability)</div><div class="tt-step">' +
        (row.abilityName || '—') + ' → ×' + U.fmt(m.dodge.factor, 3) + '</div>' +
        '<div class="tt-muted">' + U.esc(m.dodge.note || 'No unconditional dodge.') + '</div>';
      const drTip = '<div class="tt-title">Damage reduction</div><div class="tt-step">' +
        'type ×' + U.fmt(m.dr.typeDef, 3) + ' · weather ×' + U.fmt(m.dr.wxDef, 3) +
        ' · DF ×' + U.fmt(m.dr.dfG, 3) + ' · SD ×' + U.fmt(m.dr.sdG, 3) + '</div>' +
        '<div class="tt-result">incoming ×' + U.fmt(m.dr.dr, 3) + '</div>';
      const ehpTip = '<div class="tt-title">EHP</div><div class="tt-step">' +
        U.fmt(m.hitMulti, 3) + ' (hitbox) × ' + U.fmt(m.dodge.factor, 3) + ' (dodge) ÷ ' +
        U.fmt(m.dr.dr, 3) + ' (damage reduction)</div><div class="tt-result">' + U.fmt(m.ehp, 3) + '</div>';
      const offTip = '<div class="tt-title">Offensive rating (pool avg)</div><div class="tt-step">' +
        (m.offenseMoveCount || 0) + ' moves · baseline ' + U.fmt(m.offenseBaseline, 1) + ' → adjusted ' +
        U.fmt(m.offensePooled, 1) + ' DPS</div>' +
        '<div class="tt-step">spawn type ×' + U.fmt(m.offenseTypeM, 3) +
        ' · weather ×' + U.fmt(m.offenseWxM, 3) + '</div>' +
        '<div class="tt-muted">Top: ' + U.esc(m.topMove && m.topMove.name || '—') +
        (m.topMove ? ' (' + U.fmt(m.topMove.adjustedDps, 1) + ' DPS)' : '') + '</div>' +
        '<div class="tt-result">×' + U.fmt(m.offense, 3) + ' spawn-weighted</div>';
      const scoreTip = '<div class="tt-title">Overall score</div><div class="tt-step">' +
        '(offense / ' + U.fmt(meds.medOff, 3) + ')^' + PSC.Store.state.scoring.weights.off +
        ' × (ehp / ' + U.fmt(meds.medEhp, 3) + ')^' + PSC.Store.state.scoring.weights.def +
        ' × (spd / ' + U.fmt(meds.medSpd, 0) + ')^' + PSC.Store.state.scoring.weights.spd + '</div>' +
        '<div class="tt-result">' + U.fmt(m.score, 3) + '</div>';

      return '<tr data-dex="' + row.dex + '" data-rowkey="' + U.esc(row.rowKey) + '">' +
        cell(row, 'text-left col-dex', row.dex) +
        cell(row, 'col-gen', row.gen || '—') +
        cell(row, 'text-left col-name', '<div class="poke-name-cell">' +
          '<div class="poke-spr" style="' + U.spriteStyle(row.dex, 34, PSC.Data.state.spriteMeta) + '"></div>' +
          '<div><div class="pname" data-action="open-radar" data-dex="' + row.dex + '">' + U.esc(row.name) + '</div>' +
          '<div class="poke-sub">r ' + U.fmt(row.hit, 1) + ' · ' + (row.size || '') + '</div></div></div>') +
        cell(row, 'text-left col-types', U.typeStack(row.types)) +
        cell(row, 'text-left col-ability', U.esc(row.abilityName || '—'), { tipKey: 'ability:' + row.rowKey, tipHtml: abilityTip(row) }) +
        cell(row, 'text-left col-variant', '<span class="type-badge" style="background:' + color + '33;color:' + color + '">' +
          U.esc(row.variantType) + '</span> <span class="variant-src">' + (row.variantSource === 'tm' ? 'TM' : 'nat') + '</span>') +
        cell(row, 'col-pa', U.fmt(row.pa != null ? row.pa : row.atk, 2)) +
        cell(row, 'col-sa', U.fmt(row.sa != null ? row.sa : row.atk, 2)) +
        cell(row, 'col-df', U.fmt(row.df, 0)) +
        cell(row, 'col-sd', U.fmt(row.sd, 0)) +
        cell(row, 'col-hp', U.fmt(row.hp, 0)) +
        cell(row, 'col-spd', U.fmt(row.spd, 0)) +
        cell(row, 'col-hit', U.fmt(row.hit, 1)) +
        cell(row, 'col-bst', U.fmt(row.bst, 0)) +
        cell(row, 'col-hitbox ' + PSC.Calc.multClass(m.hitMulti), U.fmt(m.hitMulti, 3) + hintRank(rk.hit), { tipKey: 'hit:' + row.rowKey, tipHtml: hitTip, extra: ' matrix-cell', matrix: 'hitbox' }) +
        cell(row, 'col-dodge ' + PSC.Calc.multClass(m.dodge.factor), U.fmt(m.dodge.factor, 3), { tipKey: 'dodge:' + row.rowKey, tipHtml: dodgeTip, extra: ' matrix-cell', matrix: 'dodge' }) +
        cell(row, 'col-dr ' + PSC.Calc.defClass(m.dr.dr), '×' + U.fmt(m.dr.dr, 3) + hintRank(rk.dr), { tipKey: 'dr:' + row.rowKey, tipHtml: drTip, extra: ' matrix-cell', matrix: 'dr' }) +
        cell(row, 'col-ehp ' + PSC.Calc.multClass(m.ehp), U.fmt(m.ehp, 3) + hintRank(rk.ehp), { tipKey: 'ehp:' + row.rowKey, tipHtml: ehpTip, extra: ' matrix-cell', matrix: 'ehp' }) +
        cell(row, 'col-offense ' + PSC.Calc.multClass(m.offense), '×' + U.fmt(m.offense, 3) + hintRank(rk.offense), { tipKey: 'off:' + row.rowKey, tipHtml: offTip, extra: ' matrix-cell', matrix: 'offense' }) +
        cell(row, 'col-score score-cell', '<b>' + U.fmt(m.score, 3) + '</b>' + hintRank(rk.score), { tipKey: 'score:' + row.rowKey, tipHtml: scoreTip, extra: ' matrix-cell', matrix: 'score' }) +
        '</tr>';
    }).join('') || '<tr><td colspan="20" class="note">No rows match the current filters.</td></tr>';

    const countEl = document.getElementById('pokeCount');
    if (countEl) countEl.textContent = '(' + pg.total + ' builds)';
    const pageEl = document.getElementById('pokePageInfo');
    if (pageEl) pageEl.textContent = 'Page ' + (pg.page + 1) + ' / ' + pg.pages + ' · ' + pg.total + ' rows';

    const table = document.getElementById('pokeTable');
    if (table) {
      PSC.UI.applyColumnClasses();
      table.querySelectorAll('th.sortable').forEach(th => {
        const arrow = th.querySelector('.arrow');
        if (!arrow) return;
        arrow.textContent = th.dataset.sort === p.sortKey ? (p.sortDir > 0 ? '▲' : '▼') : '';
      });
    }
  }

  function hintRank(rank) {
    return rank ? '<span class="rank-tag">#' + rank + '</span>' : '';
  }

  function render() {
    if (!PSC.Data.loaded) return;
    populateGens();
    renderChips();
    renderTable();
    const variantSel = document.getElementById('pokeVariantFilter');
    if (variantSel) variantSel.value = PSC.Store.state.pokedex.variant;
    const ba = document.getElementById('bestAbilityOnly');
    if (ba) ba.checked = PSC.Store.state.pokedex.bestAbility;
    const search = document.getElementById('pokeSearch');
    if (search) search.value = PSC.Store.state.pokedex.search;
  }

  // ------------------------------------------------------------------ Radar
  // Radar axes are exactly the numeric Pokédex table columns (minus # and Gen,
  // which are identifiers). Labels come from js/labels.js.
  const RADAR_KEYS = PSC.Labels.RADAR_KEYS;
  const RADAR_LABELS = PSC.Labels.RADAR_LABELS;
  const INVERT = new Set(['hit', 'dr']);

  function renderAxes() {
    const box = document.getElementById('radarAxisToggles');
    if (!box) return;
    const axes = PSC.Store.state.radar.axes;
    const row = keys => keys.map(k => {
      const def = PSC.Labels.byKey[k] || { full: k, abbr: k };
      return '<button type="button" class="radar-axis' + (axes[k] ? ' on' : '') +
        '" data-axis="' + k + '" aria-pressed="' + (axes[k] ? 'true' : 'false') +
        '" title="' + U.esc(def.full) + '">' + U.esc(def.abbr) + '</button>';
    }).join('');
    box.innerHTML = '<div class="radar-axes-row"><span class="radar-axes-label">Axes</span>' +
      row(RADAR_KEYS) + '</div>';
  }

  function avgStats(rows) {
    if (!rows || !rows.length) return null;
    const out = {};
    for (const k of RADAR_KEYS) out[k] = U.mean(rows.map(r => PSC.Models.Pokedex.radarStats(r)[k]));
    return out;
  }

  function drawRadar(row) {
    const canvas = document.getElementById('pokeRadar');
    if (!canvas || !row) return;
    const stats = PSC.Models.Pokedex.radarStats(row);
    const axes = PSC.Store.state.radar.axes;
    const keys = RADAR_KEYS.filter(k => axes[k]);
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.33;
    ctx.clearRect(0, 0, W, H);

    if (keys.length < 3) {
      ctx.fillStyle = '#9aa4b2';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Select at least 3 axes', cx, cy);
      renderLegend(row, []);
      return;
    }

    const all = PSC.Data.state.rows;
    const mins = {}, maxes = {};
    for (const k of keys) {
      const vals = all.map(r => PSC.Models.Pokedex.radarStats(r)[k]).filter(v => v != null && isFinite(+v)).map(Number);
      mins[k] = vals.length ? Math.min(...vals) : 0;
      maxes[k] = vals.length ? Math.max(...vals) : 1;
    }
    const norm = (s, k) => {
      const lo = mins[k], hi = maxes[k];
      if (hi <= lo) return 0.5;
      let t = (s[k] - lo) / (hi - lo);
      if (INVERT.has(k)) t = 1 - t;
      return U.clamp(t, 0, 1);
    };
    const poly = (s, color, fill, width) => {
      ctx.beginPath();
      keys.forEach((k, i) => {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / keys.length);
        const v = norm(s, k);
        const x = cx + Math.cos(ang) * R * v;
        const y = cy + Math.sin(ang) * R * v;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 2;
      ctx.stroke();
    };

    ctx.strokeStyle = '#1e2836';
    ctx.lineWidth = 1;
    for (let g = 1; g <= 4; g++) {
      ctx.beginPath();
      keys.forEach((k, i) => {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / keys.length);
        const x = cx + Math.cos(ang) * R * (g / 4);
        const y = cy + Math.sin(ang) * R * (g / 4);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
    keys.forEach((k, i) => {
      const ang = -Math.PI / 2 + i * (2 * Math.PI / keys.length);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      ctx.stroke();
      ctx.fillStyle = '#9aa4b2';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(RADAR_LABELS[k] || k, cx + Math.cos(ang) * (R + 14), cy + Math.sin(ang) * (R + 14) + 3);
    });

    const radar = PSC.Store.state.radar;
    if (!radar.typeOn) radar.typeOn = {};
    const series = [{ key: 'self', label: 'This Pokémon', color: '#4fc3f7', n: 1, on: true, self: true }];
    const allAvg = avgStats(all);
    if (allAvg) {
      series.push({
        key: 'all', label: 'All rows avg', color: '#78909c', n: all.length,
        on: radar.showAll !== false, avg: allAvg
      });
    }
    const TYPE_LINE = ['#ffb74d', '#ce93d8', '#80cbc4', '#ef9a9a'];
    (row.types || []).forEach((t, idx) => {
      const pool = PSC.Models.Pokedex.radarPool([t]);
      const avg = avgStats(pool);
      if (!avg) return;
      series.push({
        key: 'type:' + t, type: t, label: t + ' avg', color: TYPE_COLORS[t] || TYPE_LINE[idx % TYPE_LINE.length],
        n: pool.length, on: radar.typeOn[t] !== false, avg
      });
    });
    series.filter(x => !x.self && x.on).forEach(x => {
      poly(x.avg, x.color, x.key === 'all' ? 'rgba(120,144,156,0.12)' : null, 1.5);
    });
    poly(stats, '#4fc3f7', 'rgba(79,195,247,0.22)', 2.5);
    renderLegend(row, series);
    renderStatList(row, keys, stats);
  }

  function renderLegend(row, series) {
    const el = document.getElementById('radarLegend');
    if (!el) return;
    el.innerHTML =
      '<span class="radar-legend-title">Legend</span>' +
      series.map(x => {
        if (x.self) {
          return '<span class="radar-legend-item self"><i style="background:' + x.color + '"></i>' +
            U.esc(x.label) + ' (' + x.n + ')</span>';
        }
        const kind = x.key === 'all' ? 'all' : 'type';
        const typeAttr = kind === 'type' ? ' data-type="' + U.esc(x.type) + '"' : '';
        return '<button type="button" class="radar-legend-item' + (x.on ? '' : ' off') +
          '" data-legend="' + kind + '"' + typeAttr + ' aria-pressed="' + (x.on ? 'true' : 'false') +
          '" title="Toggle ' + U.esc(x.label) + '"><i style="background:' + x.color + '"></i>' +
          U.esc(x.label) + ' (' + x.n + ')</button>';
      }).join('');
  }

  function renderStatList(row, keys, stats) {
    const el = document.getElementById('pokeStatList');
    if (!el) return;
    const rk = row.ranks || {};
    const rankFor = k => {
      const map = { hitbox: 'hit', hit: 'hit', dr: 'dr', dodge: 'dodge', ehp: 'ehp', offense: 'offense', score: 'score', spd: 'spd' };
      return map[k] && rk[map[k]] ? '#' + rk[map[k]] : '';
    };
    el.innerHTML = keys.map(k =>
      '<div class="stat-line"><span>' + RADAR_LABELS[k] + '</span><b>' + statFmt(k, stats[k]) + '</b>' +
      '<span class="rank-tag">' + rankFor(k) + '</span></div>'
    ).join('') +
      '<div class="stat-line"><span>Ability</span><b>' + U.esc(row.abilityName || '—') + '</b></div>' +
      '<div class="stat-line"><span>Tm type</span><b>' + U.esc(row.variantType) + '</b></div>' +
      '<button type="button" class="btn-primary select-radar-poke" data-dex="' + row.dex + '">Select</button>';
  }

  function statFmt(k, v) {
    if (v == null) return '—';
    if (k === 'hp' || k === 'spd' || k === 'bst') return U.fmt(v, 0);
    if (k === 'pa' || k === 'sa') return U.fmt(v, 2);
    if (k === 'df' || k === 'sd') return U.fmt(v, 0);
    if (k === 'hit') return U.fmt(v, 1);
    return U.fmt(v, 3);
  }

  function openRadar(row) {
    if (!row) return;
    radarRow = row;
    ensureRowMetrics(row);
    document.getElementById('pokeDetailTitle').innerHTML =
      '<span class="poke-spr" style="display:inline-block;vertical-align:middle;margin-right:0.45rem;' +
      U.spriteStyle(row.dex, 44, PSC.Data.state.spriteMeta) + '"></span>' + U.esc(row.name) +
      ' <span class="muted-soft">#' + row.dex + ' · ' + U.esc((row.types || []).join('/')) +
      ' · ' + U.esc(row.variantType) + ' · ' + U.esc(row.abilityName || '—') + '</span>';
    const typeBox = document.getElementById('pokeDetailTypes');
    if (typeBox) typeBox.innerHTML = U.typeStack(row.types);
    renderAxes();
    const natureSel = document.getElementById('radarNatureSel');
    if (natureSel) {
      natureSel.innerHTML = '<option value="">Neutral</option>' +
        NATURES.map(n => '<option value="' + n.id + '">' + U.esc(n.en) + ' (' + (n.up ? '+' + n.up : '±') + (n.down ? '/' + n.down : '') + ')</option>').join('');
      natureSel.value = PSC.Store.state.radar.nature || '';
    }
    PSC.UI.openModal('radarModal');
    drawRadar(row);
  }

  function ensureRowMetrics(row) {
    if (!row._m) PSC.Calc.ensureRow(row, PSC.Store.prefs());
  }

  return {
    render,
    renderChips,
    renderAxes,
    drawRadar,
    openRadar,
    currentRadarRow: () => radarRow,
    ensureRowMetrics,
    populateGens
  };
})();
