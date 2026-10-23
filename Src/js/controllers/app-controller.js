/* Application shell controller: tabs, global Pokémon selection, data status. */
window.PSC = window.PSC || {};
PSC.Controllers = PSC.Controllers || {};

PSC.Controllers.App = (function () {
  const U = PSC.Utils;
  const TABS = ['dps', 'calc', 'pokedex', 'combos', 'multipliers', 'abilities', 'items', 'mechanics', 'changelog', 'config'];
  let inited = false;
  let searchIdx = -1;

  function showTab(tab) {
    const active = TABS.includes(tab) ? tab : 'dps';
    document.querySelectorAll('#tabBar .tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === active));
    document.querySelectorAll('#panels .panel').forEach(p =>
      p.classList.toggle('active', p.id === 'panel-' + active));
  }

  function setStatus(text, cls) {
    PSC.Store.set('status', { text, cls: cls || '' }, 'status');
  }

  // --------------------------------------------------------------- Global bar
  function updateBar() {
    const dex = PSC.Store.state.selectedDex;
    const p = dex == null ? null : PSC.Data.findDex(dex);
    const nameEl = document.getElementById('globalPokeName');
    const statsEl = document.getElementById('globalPokeStats');
    const sprEl = document.getElementById('globalPokeSprite');
    if (!p) {
      if (nameEl) nameEl.textContent = 'None';
      if (statsEl) statsEl.innerHTML = '';
      if (sprEl) {
        sprEl.style.cssText = '';
        sprEl.classList.add('empty');
      }
      return;
    }
    const pa = p.pa != null ? +p.pa : (p.atk != null ? +p.atk : null);
    const sa = p.sa != null ? +p.sa : (p.atk != null ? +p.atk : null);
    const r = p.hit != null ? p.hit : null;
    if (nameEl) nameEl.textContent = p.name + ' (#' + p.dex + ')';
    if (statsEl) {
      statsEl.innerHTML =
        '<span>PA <b>' + (pa != null ? pa.toFixed(2) : '—') + '</b></span>' +
        '<span>SA <b>' + (sa != null ? sa.toFixed(2) : '—') + '</b></span>' +
        (r != null ? '<span>r <b>' + (+r).toFixed(1) + '</b></span>' : '') +
        '<span>' + (p.types || []).map(t => U.typeBadge(t)).join(' ') + '</span>';
    }
    if (sprEl) {
      sprEl.classList.remove('empty');
      sprEl.style.cssText = U.spriteStyle(p.dex, 48, PSC.Data.state.spriteMeta) +
        'width:48px;height:48px;flex-shrink:0;border-radius:8px;border:1px solid var(--border)';
    }
  }

  function hideResults() {
    const box = document.getElementById('globalPokeResults');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    searchIdx = -1;
  }

  function selectDex(dex) {
    PSC.Store.setSelectedDex(dex);
    const input = document.getElementById('globalPokeSearch');
    if (input) input.value = '';
    hideResults();
  }

  function renderSearch() {
    const input = document.getElementById('globalPokeSearch');
    const box = document.getElementById('globalPokeResults');
    if (!input || !box || !PSC.Data.loaded) return;
    const q = input.value.trim();
    if (!q) { hideResults(); return; }
    const hits = PSC.Data.state.dex
      .filter(p => U.matchSearch(p.name, q) || U.matchSearch(String(p.dex), q))
      .slice(0, 12);
    if (!hits.length) {
      box.innerHTML = '<div class="global-poke-hit muted-soft">No matches</div>';
      box.hidden = false;
      searchIdx = -1;
      return;
    }
    searchIdx = 0;
    box.innerHTML = hits.map((p, i) =>
      '<div class="global-poke-hit' + (i === 0 ? ' active' : '') + '" data-dex="' + p.dex + '">' +
      '<div class="hit-spr" style="' + U.spriteStyle(p.dex, 32, PSC.Data.state.spriteMeta) + '"></div>' +
      '<div><div>' + U.esc(p.name) + '</div><div class="hit-meta">#' + p.dex + ' · ' +
      U.esc((p.types || []).join('/')) + ' · PA ' + (p.pa != null ? (+p.pa).toFixed(2) : '—') +
      ' · SA ' + (p.sa != null ? (+p.sa).toFixed(2) : '—') + '</div></div></div>'
    ).join('');
    box.hidden = false;
  }

  function bindGlobalBar() {
    const input = document.getElementById('globalPokeSearch');
    const box = document.getElementById('globalPokeResults');
    if (input) {
      input.addEventListener('input', renderSearch);
      input.addEventListener('focus', () => { if (input.value.trim()) renderSearch(); });
      input.addEventListener('blur', () => setTimeout(hideResults, 120));
      input.addEventListener('keydown', e => {
        const hits = box ? [...box.querySelectorAll('.global-poke-hit[data-dex]')] : [];
        if (!hits.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          searchIdx = Math.min(hits.length - 1, searchIdx + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          searchIdx = Math.max(0, searchIdx - 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const el = hits[Math.max(0, searchIdx)];
          if (el) selectDex(+el.dataset.dex);
          return;
        } else if (e.key === 'Escape') {
          hideResults();
          return;
        } else {
          return;
        }
        hits.forEach((el, i) => el.classList.toggle('active', i === searchIdx));
        hits[searchIdx].scrollIntoView({ block: 'nearest' });
      });
    }
    if (box) box.addEventListener('mousedown', e => {
      const hit = e.target.closest('.global-poke-hit[data-dex]');
      if (!hit) return;
      e.preventDefault();
      selectDex(+hit.dataset.dex);
    });
    document.querySelectorAll('[data-action="clear-global-poke"]').forEach(b =>
      b.addEventListener('click', () => selectDex(null)));
  }

  // --------------------------------------------------------------- Data load
  function syncDataState(res) {
    PSC.Store.state.data = {
      loaded: PSC.Data.loaded,
      sha: PSC.Data.sha,
      counts: Object.assign({}, PSC.Data.counts)
    };
  }

  async function loadData(force) {
    if (PSC.Data.state.loading) return;
    setStatus(force ? 'Reloading game data from GitHub…' : 'Loading game data…', 'loading');
    PSC.Data.setProgressHandler((msg) => setStatus(msg, 'loading'));
    const res = await PSC.Data.load(!!force);
    if (!res || !res.ok) {
      setStatus(PSC.Data.state.error || 'Failed to load game data.', 'err');
      return;
    }
    syncDataState();
    setStatus('Loaded ' + PSC.Data.counts.moves + ' moves · ' + PSC.Data.counts.rows +
      ' builds · ' + PSC.Data.counts.abilities + ' abilities · ' + PSC.Data.counts.tms + ' TMs.', 'ok');
    if (PSC.Store.state.selectedDex != null && !PSC.Data.findDex(PSC.Store.state.selectedDex)) {
      PSC.Store.setSelectedDex(null);
    }
    PSC.Store.emit('data');
  }

  function initTabs() {
    document.querySelectorAll('#tabBar .tab').forEach(t =>
      t.addEventListener('click', () => PSC.Store.setTab(t.dataset.tab)));
  }

  function init() {
    if (inited) return;
    inited = true;

    PSC.UI.init();
    PSC.Views.Modals.init();

    PSC.Controllers.Dps.init();
    PSC.Controllers.Calculator.init();
    PSC.Controllers.Pokedex.init();
    PSC.Controllers.Combos.init();
    PSC.Controllers.Multipliers.init();
    PSC.Controllers.Abilities.init();
    PSC.Controllers.Items.init();
    PSC.Controllers.Mechanics.init();
    PSC.Controllers.Changelog.init();
    PSC.Controllers.Config.init();

    initTabs();
    bindGlobalBar();

    const v = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '0';
    const ver = document.getElementById('verInline');
    if (ver) ver.textContent = 'v' + v;

    PSC.Store.on((state, reason) => {
      showTab(state.tab);
      if (reason === 'selected' || reason === 'data') updateBar();
      if (reason === 'data' && state.tab === 'pokedex') PSC.Views.Pokedex.render();
    });

    showTab(PSC.Store.state.tab);
    updateBar();
    PSC.Views.Changelog.render();
    loadData(false);
  }

  return { init, reload: () => loadData(true), updateBar, showTab, selectDex, loadData };
})();
