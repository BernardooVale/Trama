/**
 * Search Component — Trama
 * Busca unificada (nome e #etiqueta) com dropdown de sugestões e navegação por teclado.
 */
const Search = (() => {
  let activeTagFilters = [];
  let ddIndex = -1;

  function getInput()    { return document.getElementById('search-input'); }
  function getDropdown() { return document.getElementById('search-dropdown'); }
  function getChips()    { return document.getElementById('search-chips'); }
  function getClearBtn() { return document.getElementById('search-clear'); }

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function renderChips(){
    const chipsEl = getChips();
    if(!chipsEl) return;
    chipsEl.innerHTML = '';
    activeTagFilters.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'search-chip';
      chip.innerHTML = `#${esc(tag)}<button title="Remover">✕</button>`;
      chip.querySelector('button').addEventListener('click', () => removeTagFilter(tag));
      chipsEl.appendChild(chip);
    });
    getClearBtn()?.classList.toggle(
      'visible', activeTagFilters.length > 0 || (getInput()?.value.length ?? 0) > 0
    );
  }

  function addTagFilter(tag){
    if(activeTagFilters.includes(tag)) return;
    activeTagFilters.push(tag);
    Store.setFilter({ tags: [...activeTagFilters] });
    renderChips();
    const inp = getInput();
    if(inp) inp.value = '';
    hideDropdown();
  }

  function removeTagFilter(tag){
    activeTagFilters = activeTagFilters.filter(t => t !== tag);
    Store.setFilter({ tags: [...activeTagFilters] });
    renderChips();
  }

  function clearAll(){
    activeTagFilters = [];
    const inp = getInput();
    if(inp) inp.value = '';
    Store.setFilter({ tags: [], text: '' });
    renderChips();
    getClearBtn()?.classList.remove('visible');
    hideDropdown();
  }

  function showDropdown(items){
    hideDropdown();
    if(!items.length) return;
    const dd = getDropdown();
    if(!dd) return;
    dd.innerHTML = '';
    dd.hidden = false;
    ddIndex = -1;

    items.forEach((item, i) => {
      const el = document.createElement('div');
      el.dataset.index = i;

      if(item.kind === 'tag'){
        el.className = 'search-dd-item search-dd-tag';
        el.innerHTML = `<span class="tag-icon">#</span>
          <span class="dd-node-title">${esc(item.value)}</span>
          <span class="dd-node-sub">etiqueta</span>`;
        el.addEventListener('mousedown', e => { e.preventDefault(); addTagFilter(item.value); });
      } else {
        const typeColor = {
          'problema':  'var(--node-problema)',
          'solucao':   'var(--node-solucao)',
          'agrupador': 'var(--node-agrupador)',
          'neutro':    'var(--node-neutro)',
          'subgrafo':  'var(--node-subgrafo)',
        }[item.type] || 'var(--text-muted)';

        el.className = 'search-dd-item';
        el.innerHTML = `<span class="dd-node-type" style="background:${typeColor}"></span>
          <span class="dd-node-title">${esc(item.title)}</span>
          <span class="dd-node-sub">${item.type}</span>`;
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          Graph.focusNode(item.id);
          Store.selectNode(item.id);
          Sidebar.open(item.id);
          hideDropdown();
          const inp = getInput();
          if(inp) inp.value = '';
          getClearBtn()?.classList.remove('visible');
        });
      }
      dd.appendChild(el);
    });
  }

  function hideDropdown(){
    const dd = getDropdown();
    if(!dd) return;
    dd.hidden = true;
    dd.innerHTML = '';
    ddIndex = -1;
  }

  function navigate(dir){
    const dd = getDropdown();
    if(!dd) return;
    const items = dd.querySelectorAll('.search-dd-item');
    if(!items.length) return;
    items[ddIndex]?.classList.remove('active');
    ddIndex = (ddIndex + dir + items.length) % items.length;
    items[ddIndex]?.classList.add('active');
  }

  function confirmSelection(){
    const dd = getDropdown();
    if(!dd) return false;
    const active = dd.querySelector('.search-dd-item.active');
    if(active){ active.dispatchEvent(new MouseEvent('mousedown')); return true; }
    return false;
  }

  function buildSuggestions(q){
    const raw = q.trim().toLowerCase();
    const results = [];

    if(raw.startsWith('#')){
      const tagQ = raw.slice(1);
      Store.getAllTags()
        .filter(t => t.includes(tagQ) && !activeTagFilters.includes(t))
        .slice(0, 8)
        .forEach(t => results.push({ kind: 'tag', value: t }));
    } else if(raw){
      Store.getAllTags()
        .filter(t => t.includes(raw) && !activeTagFilters.includes(t))
        .slice(0, 3)
        .forEach(t => results.push({ kind: 'tag', value: t }));
      Store.getNodes()
        .filter(n => (n.title || '').toLowerCase().includes(raw) || (n.description || '').toLowerCase().includes(raw))
        .slice(0, 6)
        .forEach(n => results.push({ kind: 'node', id: n.id, title: n.title, type: n.type }));
    }
    return results;
  }

  function bind(){
    const input = getInput();
    if(!input) return;

    input.addEventListener('input', () => {
      const val = input.value;
      getClearBtn()?.classList.toggle('visible', val.length > 0 || activeTagFilters.length > 0);

      const suggestions = buildSuggestions(val);
      if(suggestions.length) showDropdown(suggestions);
      else hideDropdown();

      if(!val.startsWith('#')){
        Store.setFilter({ text: val });
      }
    });

    input.addEventListener('keydown', e => {
      if(e.key === 'ArrowDown'){ e.preventDefault(); navigate(1); return; }
      if(e.key === 'ArrowUp')  { e.preventDefault(); navigate(-1); return; }
      if(e.key === 'Enter'){
        e.preventDefault();
        if(confirmSelection()) return;
        if(input.value.startsWith('#')) addTagFilter(input.value.slice(1).trim());
        return;
      }
      if(e.key === 'Backspace' && !input.value && activeTagFilters.length){
        removeTagFilter(activeTagFilters[activeTagFilters.length - 1]); return;
      }
      if(e.key === 'Escape') hideDropdown();
    });

    input.addEventListener('blur', () => setTimeout(hideDropdown, 150));

    const wrap = document.getElementById('search-wrap');
    if(wrap) wrap.addEventListener('click', () => input.focus());

    getClearBtn()?.addEventListener('click', clearAll);
  }

  return { bind, clearAll };
})();
