const App = (() => {
  const DOM = {};

  function cacheDOM(){
    [
      'sidebar','sidebar-close','sidebar-title',
      'sb-node-fields','sb-edge-fields',
      'sb-type-badge','sb-title','sb-desc','sb-meta',
      'sb-edge-type-badge','sb-edge-label','sb-edge-endpoints',
      'sb-priority-selector','tags-list','sb-tags',
      'search-input','search-clear','search-chips','search-dropdown',
      'btn-export','btn-import','btn-theme','icon-theme','btn-toggle-meta',
      'btn-layout','toast','canvas-wrap','focus-hint',
    ].forEach(id=>{ DOM[id]=document.getElementById(id) });
  }

  /* ═══════════════════════════════════════════════
     TOAST
  ════════════════════════════════════════════════ */
  let _toastTimer=null;
  function toast(msg,dur=2600){
    const el=DOM['toast'];
    el.textContent=msg; el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer=setTimeout(()=>el.classList.remove('show'),dur);
  }

  /* ═══════════════════════════════════════════════
     THEME
  ════════════════════════════════════════════════ */
  function initTheme(){
    const saved=localStorage.getItem('trama_theme')?? 'dark';
    setTheme(saved);
  }

  function setTheme(theme){
    document.documentElement.dataset.theme=theme;
    localStorage.setItem('trama_theme',theme);
    Graph.syncTheme();
    const icon=DOM['icon-theme'];
    icon.innerHTML = theme==='dark'
      ? `<circle cx="12" cy="12" r="5"/>
         <line x1="12" y1="1"  x2="12" y2="3"/>
         <line x1="12" y1="21" x2="12" y2="23"/>
         <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
         <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
         <line x1="1"  y1="12" x2="3"  y2="12"/>
         <line x1="21" y1="12" x2="23" y2="12"/>
         <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
         <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`
      : `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  }

  function toggleTheme(){
    setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  }

  /* ═══════════════════════════════════════════════
     SIDEBAR
  ════════════════════════════════════════════════ */
  function openSidebar(nodeId){
    const node=Store.getNode(nodeId);
    if(!node) return;
    DOM['sidebar-title'].textContent = 'Propriedades do Vértice';
    DOM['sb-node-fields'].hidden = false;
    DOM['sb-edge-fields'].hidden = true;
    populateSidebar(node);
    DOM['sidebar'].classList.add('open');
  }

  function openEdgeSidebar(edgeId){
    const edge=Store.getEdge(edgeId);
    if(!edge) return;
    DOM['sidebar-title'].textContent = 'Propriedades da Aresta';
    DOM['sb-node-fields'].hidden = true;
    DOM['sb-edge-fields'].hidden = false;
    populateEdgeSidebar(edge);
    DOM['sidebar'].classList.add('open');
    setTimeout(() => {
      DOM['sb-edge-label'].focus();
      DOM['sb-edge-label'].select();
    }, 50);
  }

  function closeSidebar(){
    DOM['sidebar'].classList.remove('open');
  }

  function populateSidebar(node){
    const badge=DOM['sb-type-badge'];
    badge.textContent=node.type; badge.dataset.type=node.type;
    // Não sobrescrever o input se o usuário estiver ativamente digitando nele
    if(document.activeElement !== DOM['sb-title']){
      DOM['sb-title'].value=node.title;
    }
    if(document.activeElement !== DOM['sb-desc']){
      DOM['sb-desc'].value=node.description;
    }
    DOM['sb-priority-selector'].querySelectorAll('.priority-btn')
      .forEach(b=>b.classList.toggle('active',b.dataset.priority===node.priority));
    renderTags(node.tags);
    const d=new Date(node.createdAt).toLocaleDateString('pt-BR');
    DOM['sb-meta'].textContent=`ID: ${node.id} · ${d}`;
  }

  function populateEdgeSidebar(edge){
    const badge=DOM['sb-edge-type-badge'];
    badge.textContent=edge.edgeType; badge.dataset.type=edge.edgeType;
    if(document.activeElement !== DOM['sb-edge-label']){
      DOM['sb-edge-label'].value = edge.label ?? edge.edgeType;
    }
    const src = Store.getNode(edge.source)?.title ?? edge.source;
    const tgt = Store.getNode(edge.target)?.title ?? edge.target;
    DOM['sb-edge-endpoints'].textContent = `${src} → ${tgt}`;
    DOM['sb-meta'].textContent = `ID: ${edge.id}`;
  }

  /* ── Tags sidebar ───────────────────────────── */
  function renderTags(tags){
    const list=DOM['tags-list'];
    list.innerHTML='';
    tags.forEach(tag=>{
      const chip=document.createElement('span');
      chip.className='tag-chip';
      chip.innerHTML=`${esc(tag)}<button data-tag="${esc(tag)}" title="Remover">✕</button>`;
      chip.querySelector('button').addEventListener('click',()=>removeTag(tag));
      list.appendChild(chip);
    });
  }

  function addTag(raw){
    const tag=raw.trim().toLowerCase().replace(/\s+/g,'-');
    if(!tag) return;
    const node=Store.getSelectedNode();
    if(!node) return;
    if(node.tags.includes(tag)){ toast(`Etiqueta "${tag}" já existe`); return; }
    const newTags=[...node.tags,tag];
    Store.updateNode(node.id,{tags:newTags});
    renderTags(newTags);
    DOM['sb-tags'].value='';
  }

  function removeTag(tag){
    const node=Store.getSelectedNode();
    if(!node) return;
    const newTags=node.tags.filter(t=>t!==tag);
    Store.updateNode(node.id,{tags:newTags});
    renderTags(newTags);
  }

  function bindSidebarInputs(){
    let tTimer=null;
    DOM['sb-title'].addEventListener('input',e=>{
      clearTimeout(tTimer);
      tTimer=setTimeout(()=>{
        const n=Store.getSelectedNode(); if(!n) return;
        Store.updateNode(n.id,{title:e.target.value});
      },200);
    });

    DOM['sb-title'].addEventListener('blur',e=>{
      const n=Store.getSelectedNode(); if(!n) return;
      if(!e.target.value.trim()){
        e.target.value = 'Sem título';
        Store.updateNode(n.id,{title:'Sem título'});
      }
    });

    let elTimer=null;
    DOM['sb-edge-label'].addEventListener('input',e=>{
      clearTimeout(elTimer);
      elTimer=setTimeout(()=>{
        const ed=Store.getSelectedEdge(); if(!ed) return;
        Store.updateEdge(ed.id,{label:e.target.value});
      },200);
    });

    DOM['sb-edge-label'].addEventListener('blur',e=>{
      const ed=Store.getSelectedEdge(); if(!ed) return;
      if(!e.target.value.trim()){
        const fallback = ed.edgeType;
        e.target.value = fallback;
        Store.updateEdge(ed.id,{label:fallback});
      }
    });

    let dTimer=null;
    DOM['sb-desc'].addEventListener('input',e=>{
      clearTimeout(dTimer);
      dTimer=setTimeout(()=>{
        const n=Store.getSelectedNode(); if(!n) return;
        Store.updateNode(n.id,{description:e.target.value});
      },300);
    });

    DOM['sb-priority-selector'].addEventListener('click',e=>{
      const btn=e.target.closest('.priority-btn'); if(!btn) return;
      const n=Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id,{priority:btn.dataset.priority});
      DOM['sb-priority-selector'].querySelectorAll('.priority-btn')
        .forEach(b=>b.classList.toggle('active',b===btn));
    });

    DOM['sb-tags'].addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===','){
        e.preventDefault(); addTag(DOM['sb-tags'].value.replace(',',''));
      }
    });

    DOM['sidebar-close'].addEventListener('click',closeSidebar);
  }

  /* ═══════════════════════════════════════════════
     CONTEXT MENU
  ════════════════════════════════════════════════ */
  const ContextMenu = (() => {
    const el = document.getElementById('context-menu');
    let targetId = null;
    let targetPos = null;

    function hide(){ el.hidden = true; targetId = null; targetPos = null; }

    function position(x, y){
      el.hidden = false;
      // Prevent overflow
      const rect = el.getBoundingClientRect();
      const left = (x + rect.width > window.innerWidth) ? window.innerWidth - rect.width - 10 : x;
      const top  = (y + rect.height > window.innerHeight) ? window.innerHeight - rect.height - 10 : y;
      el.style.left = `${left}px`;
      el.style.top  = `${top}px`;
    }

    function showNodeMenu(id, cx, cy){
      targetId = id;
      el.innerHTML = `
        <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Nova Aresta</div>
        <button class="cm-item" data-action="edge" data-edge="dependencia">Dependência</button>
        <button class="cm-item" data-action="edge" data-edge="resolve">Resolve</button>
        <button class="cm-item" data-action="edge" data-edge="relaciona">Relaciona</button>
        <button class="cm-item" data-action="edge" data-edge="neutra">Neutra</button>
        <div class="cm-divider"></div>
        <button class="cm-item" data-action="delete" style="color:var(--node-problema)">Excluir Vértice</button>
      `;
      position(cx, cy);
    }

    function showEdgeMenu(id, cx, cy){
      targetId = id;
      const edge = Store.getEdge(id);
      const label = edge ? (edge.label || edge.edgeType) : 'Aresta';
      el.innerHTML = `
        <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Aresta: ${esc(label)}</div>
        <button class="cm-item" data-action="edit-edge">Editar Propriedades</button>
        <div class="cm-divider"></div>
        <button class="cm-item" data-action="delete-edge" style="color:var(--node-problema)">Excluir Aresta</button>
      `;
      position(cx, cy);
    }

    function showCoreMenu(gx, gy, cx, cy){
      targetPos = { x: gx, y: gy };
      el.innerHTML = `
        <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Novo Vértice</div>
        <button class="cm-item" data-action="add" data-type="problema"><span class="dot dot-problema"></span>Problema</button>
        <button class="cm-item" data-action="add" data-type="solucao"><span class="dot dot-solucao"></span>Solução</button>
        <button class="cm-item" data-action="add" data-type="agrupador"><span class="dot dot-agrupador"></span>Agrupador</button>
        <button class="cm-item" data-action="add" data-type="neutro"><span class="dot dot-neutro"></span>Neutro</button>
      `;
      position(cx, cy);
    }

    function bind(){
      el.addEventListener('click', e => {
        const btn = e.target.closest('.cm-item');
        if(!btn || btn.dataset.action === undefined) return;
        
        const action = btn.dataset.action;
        const currentTargetId = targetId;
        const currentTargetPos = targetPos;
        hide(); // Esconde o menu de contexto imediatamente

        if(action === 'add' && currentTargetPos){
          const node = Graph.addNodeAtPos(btn.dataset.type, currentTargetPos.x, currentTargetPos.y);
          Store.selectNode(node.id);
          openSidebar(node.id);
          setTimeout(() => {
            DOM['sb-title'].focus();
            DOM['sb-title'].select();
          }, 50);
        } 
        else if(action === 'edge' && currentTargetId){
          Graph.startEdgeModeFromContext(btn.dataset.edge, currentTargetId);
        }
        else if(action === 'delete' && currentTargetId){
          Store.deleteNode(currentTargetId);
        }
        else if(action === 'edit-edge' && currentTargetId){
          Store.selectEdge(currentTargetId);
          openEdgeSidebar(currentTargetId);
        }
        else if(action === 'delete-edge' && currentTargetId){
          Store.deleteEdge(currentTargetId);
        }
      });

      document.addEventListener('click', e => {
        if(!e.target.closest('#context-menu')) hide();
      });
      document.addEventListener('contextmenu', e => {
        if(!e.target.closest('#cy')) hide();
        e.preventDefault();
      });
    }

    return { showNodeMenu, showEdgeMenu, showCoreMenu, hide, bind };
  })();

  /* ═══════════════════════════════════════════════
     SEARCH UNIFICADO (nome + #etiqueta)
  ════════════════════════════════════════════════ */
  const Search = (() => {
    let activeTagFilters = [];
    let ddIndex = -1;

    function getInput()    { return DOM['search-input'] }
    function getDropdown() { return DOM['search-dropdown'] }
    function getChips()    { return DOM['search-chips'] }

    function renderChips(){
      getChips().innerHTML='';
      activeTagFilters.forEach(tag=>{
        const chip=document.createElement('span');
        chip.className='search-chip';
        chip.innerHTML=`#${esc(tag)}<button title="Remover">✕</button>`;
        chip.querySelector('button').addEventListener('click',()=>removeTagFilter(tag));
        getChips().appendChild(chip);
      });
      DOM['search-clear'].classList.toggle(
        'visible', activeTagFilters.length>0 || getInput().value.length>0
      );
    }

    function addTagFilter(tag){
      if(activeTagFilters.includes(tag)) return;
      activeTagFilters.push(tag);
      Store.setFilter({tags:[...activeTagFilters]});
      renderChips();
      getInput().value='';
      hideDropdown();
    }

    function removeTagFilter(tag){
      activeTagFilters=activeTagFilters.filter(t=>t!==tag);
      Store.setFilter({tags:[...activeTagFilters]});
      renderChips();
    }

    function clearAll(){
      activeTagFilters=[];
      getInput().value='';
      Store.setFilter({tags:[],text:''});
      renderChips();
      DOM['search-clear'].classList.remove('visible');
      hideDropdown();
    }

    function showDropdown(items){
      hideDropdown();
      if(!items.length) return;
      const dd=getDropdown();
      dd.innerHTML=''; dd.hidden=false; ddIndex=-1;

      items.forEach((item,i)=>{
        const el=document.createElement('div');
        el.dataset.index=i;

        if(item.kind==='tag'){
          el.className='search-dd-item search-dd-tag';
          el.innerHTML=`<span class="tag-icon">#</span>
            <span class="dd-node-title">${esc(item.value)}</span>
            <span class="dd-node-sub">etiqueta</span>`;
          el.addEventListener('mousedown',e=>{ e.preventDefault(); addTagFilter(item.value) });
        } else {
          const typeColor={'problema':'var(--node-problema)','solucao':'var(--node-solucao)','agrupador':'var(--node-agrupador)','neutro':'var(--node-neutro)'}[item.type]||'var(--text-muted)';
          el.className='search-dd-item';
          el.innerHTML=`<span class="dd-node-type" style="background:${typeColor}"></span>
            <span class="dd-node-title">${esc(item.title)}</span>
            <span class="dd-node-sub">${item.type}</span>`;
          el.addEventListener('mousedown',e=>{
            e.preventDefault();
            Graph.focusNode(item.id);
            Store.selectNode(item.id);
            openSidebar(item.id);
            hideDropdown();
            getInput().value='';
            DOM['search-clear'].classList.remove('visible');
          });
        }
        dd.appendChild(el);
      });
    }

    function hideDropdown(){
      const dd=getDropdown();
      dd.hidden=true; dd.innerHTML=''; ddIndex=-1;
    }

    function navigate(dir){
      const dd=getDropdown();
      const items=dd.querySelectorAll('.search-dd-item');
      if(!items.length) return;
      items[ddIndex]?.classList.remove('active');
      ddIndex=(ddIndex+dir+items.length)%items.length;
      items[ddIndex]?.classList.add('active');
    }

    function confirmSelection(){
      const dd=getDropdown();
      const active=dd.querySelector('.search-dd-item.active');
      if(active){ active.dispatchEvent(new MouseEvent('mousedown')); return true; }
      return false;
    }

    function buildSuggestions(q){
      const raw=q.trim().toLowerCase();
      const results=[];

      if(raw.startsWith('#')){
        // Modo tag: sugere etiquetas
        const tagQ=raw.slice(1);
        Store.getAllTags()
          .filter(t=>t.includes(tagQ)&&!activeTagFilters.includes(t))
          .slice(0,8)
          .forEach(t=>results.push({kind:'tag',value:t}));
      } else if(raw){
        // Modo texto: sugere etiquetas e nós
        Store.getAllTags()
          .filter(t=>t.includes(raw)&&!activeTagFilters.includes(t))
          .slice(0,3)
          .forEach(t=>results.push({kind:'tag',value:t}));
        Store.getNodes()
          .filter(n=>n.title.toLowerCase().includes(raw)||n.description.toLowerCase().includes(raw))
          .slice(0,6)
          .forEach(n=>results.push({kind:'node',id:n.id,title:n.title,type:n.type}));
      }
      return results;
    }

    function bind(){
      const input=getInput();

      input.addEventListener('input',()=>{
        const val=input.value;
        DOM['search-clear'].classList.toggle('visible',val.length>0||activeTagFilters.length>0);

        const suggestions=buildSuggestions(val);
        if(suggestions.length) showDropdown(suggestions);
        else hideDropdown();

        // Filtro de texto (não-tag)
        if(!val.startsWith('#')){
          Store.setFilter({text:val});
        }
      });

      input.addEventListener('keydown',e=>{
        if(e.key==='ArrowDown'){ e.preventDefault(); navigate(1); return }
        if(e.key==='ArrowUp')  { e.preventDefault(); navigate(-1); return }
        if(e.key==='Enter'){
          e.preventDefault();
          if(confirmSelection()) return;
          // Se começa com # adiciona como tag filter
          if(input.value.startsWith('#')) addTagFilter(input.value.slice(1).trim());
          return;
        }
        if(e.key==='Backspace'&&!input.value&&activeTagFilters.length){
          removeTagFilter(activeTagFilters[activeTagFilters.length-1]); return;
        }
        if(e.key==='Escape') hideDropdown();
      });

      input.addEventListener('blur',()=>setTimeout(hideDropdown,150));

      // Clique no wrap foca input
      document.getElementById('search-wrap')
        .addEventListener('click',()=>input.focus());

      DOM['search-clear'].addEventListener('click',clearAll);
    }

    return {bind};
  })();

  /* ═══════════════════════════════════════════════
     DROPDOWNS (Tipo, Prioridade)
  ════════════════════════════════════════════════ */
  function bindDropdowns(){

    function setupDropdown(ddId, triggerId, menuId, labelId, filterKey, labelPrefix){
      const dd      = document.getElementById(ddId);
      const trigger = document.getElementById(triggerId);
      const menu    = document.getElementById(menuId);
      const labelEl = document.getElementById(labelId);

      trigger.addEventListener('click', e=>{
        e.stopPropagation();
        // Fecha outros
        document.querySelectorAll('.dropdown.open').forEach(d=>{ if(d!==dd) d.classList.remove('open') });
        dd.classList.toggle('open');
      });

      menu.addEventListener('click', e=>{
        const item=e.target.closest('.dd-item'); if(!item) return;
        const val=item.dataset.value;

        menu.querySelectorAll('.dd-item').forEach(i=>i.classList.remove('active'));
        item.classList.add('active');

        const labels={
          all: `${labelPrefix}: Todos`,
          problema:'Problema', solucao:'Solução', agrupador:'Agrupador', neutro:'Neutro',
          alta:'Alta', media:'Média', baixa:'Baixa',
        };
        const isAll = val==='all';
        labelEl.textContent = isAll ? `${labelPrefix}: Todos` : `${labelPrefix}: ${labels[val]??val}`;
        trigger.classList.toggle('active-filter',!isAll);

        Store.setFilter({[filterKey]:val});
        dd.classList.remove('open');
      });
    }

    setupDropdown('dd-type',    'dd-type-trigger',    'dd-type-menu',    'dd-type-label',    'type',    'Tipo');
    setupDropdown('dd-priority','dd-priority-trigger', 'dd-priority-menu','dd-priority-label','priority','Prioridade');

    // Fecha dropdowns ao clicar fora
    document.addEventListener('click',()=>{
      document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open'));
    });
  }

  /* ═══════════════════════════════════════════════
     STORE OBSERVER
  ════════════════════════════════════════════════ */
  function bindStoreObserver(){
    Store.subscribe((event,payload)=>{
      switch(event){
        case 'selection:change':
          if(!payload && !Store.getSelectedEdge()) closeSidebar();
          break;

        case 'selection:edgeChange':
          if(!payload && !Store.getSelectedNode()) closeSidebar();
          break;

        case 'node:update':{
          const n=Store.getSelectedNode();
          if(n&&n.id===payload.id) populateSidebar(payload);
          break;
        }

        case 'edge:update':{
          const e=Store.getSelectedEdge();
          if(e&&e.id===payload.id) populateEdgeSidebar(payload);
          break;
        }

        case 'node:delete':
          if(!Store.getSelectedNode() && !Store.getSelectedEdge()) closeSidebar();
          toast('Vértice removido');
          break;

        case 'edge:add':
          toast(`Aresta "${payload.edgeType}" criada`); break;

        case 'edge:delete':
          if(!Store.getSelectedNode() && !Store.getSelectedEdge()) closeSidebar();
          toast('Aresta removida'); break;

        case 'io:import':
          Graph.applyFilter(); break;

        case 'store:ready':
          toast(`Trama · ${payload.nodes.length} vértices carregados`,2000); break;
      }
    });
  }

  /* ═══════════════════════════════════════════════
     GRAPH EVENTS
  ════════════════════════════════════════════════ */
  function bindGraphEvents(){
    document.addEventListener('graph:openSidebar',()=>{
      const n=Store.getSelectedNode();
      if(n){
        openSidebar(n.id);
        setTimeout(() => {
          DOM['sb-title'].focus();
          DOM['sb-title'].select();
        }, 50);
      }
    });

    document.addEventListener('graph:error',e=>toast(`⚠ ${e.detail}`));

    document.addEventListener('graph:edgeSelected',e=>{
      const edge=Store.getEdge(e.detail.edgeId);
      if(!edge) return;
      Store.selectEdge(edge.id);
      openEdgeSidebar(edge.id);
    });

    document.addEventListener('graph:contextNode', e => ContextMenu.showNodeMenu(e.detail.id, e.detail.x, e.detail.y));
    document.addEventListener('graph:contextEdge', e => ContextMenu.showEdgeMenu(e.detail.id, e.detail.x, e.detail.y));
    document.addEventListener('graph:contextCore', e => ContextMenu.showCoreMenu(e.detail.gx, e.detail.gy, e.detail.cx, e.detail.cy));
  }

  /* ═══════════════════════════════════════════════
     IO
  ════════════════════════════════════════════════ */
  function bindIO(){
    DOM['btn-export'].addEventListener('click',()=>{
      try{ Store.exportJSON(); toast('Exportado com sucesso') }
      catch(e){ toast(`Erro: ${e.message}`) }
    });

    DOM['btn-import'].addEventListener('change',async e=>{
      const file=e.target.files[0]; if(!file) return;
      try{
        const count=await Store.importJSON(file);
        toast(`Importado: ${count} vértices`);
        closeSidebar();
      }catch(err){ toast(`Erro: ${err.message}`) }
      finally{ e.target.value='' }
    });
  }

  /* ═══════════════════════════════════════════════
     KEYBOARD GLOBAL
  ════════════════════════════════════════════════ */
  function bindKeyboard(){
    document.addEventListener('keydown',e=>{
      const tag=document.activeElement.tagName;
      const inInput=tag==='INPUT'||tag==='TEXTAREA';
      if((e.ctrlKey||e.metaKey)&&e.key==='e'){ e.preventDefault(); Store.exportJSON(); toast('Exportado') }
      if((e.ctrlKey||e.metaKey)&&e.key==='f'){ e.preventDefault(); DOM['search-input'].focus(); DOM['search-input'].select() }
      if(e.key==='/'&&!inInput){ e.preventDefault(); DOM['search-input'].focus() }
      if(e.key==='t'&&!inInput) toggleTheme();
      if(e.key==='l'&&!inInput){ Graph.runForceLayout(); toast('Organizando…') }
      if(!inInput&&!e.ctrlKey&&!e.metaKey){
        if(e.key==='1') document.querySelector('[data-value="problema"]')?.click();
        if(e.key==='2') document.querySelector('[data-value="solucao"]')?.click();
        if(e.key==='3') document.querySelector('[data-value="agrupador"]')?.click();
        if(e.key==='4') document.querySelector('[data-value="neutro"]')?.click();
      }
    });
  }

  /* ── Utils ──────────────────────────────────── */
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

  /* ═══════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════ */
  function init(){
    cacheDOM();
    initTheme();
    Store.init();
    bindStoreObserver();
    Graph.init();
    bindGraphEvents();
    bindSidebarInputs();
    ContextMenu.bind();
    bindDropdowns();
    Search.bind();
    bindIO();
    bindKeyboard();

    DOM['btn-theme'].addEventListener('click',toggleTheme);
    DOM['btn-layout'].addEventListener('click',()=>{
      Graph.runForceLayout();
      toast('Organizando…');
    });

    // Toggle meta
    const btnMeta=DOM['btn-toggle-meta'];
    btnMeta.classList.add('active');
    btnMeta.addEventListener('click',()=>{
      const cur=Store.getShowNodeMeta();
      Store.setShowNodeMeta(!cur);
      btnMeta.classList.toggle('active',!cur);
      toast(!cur?'Metadados visíveis':'Metadados ocultos');
    });

    setTimeout(()=>toast('Dica: hover longo foca vértice · Shift inverte · / para buscar',4000),2200);
  }

  return {init,toast,openSidebar,closeSidebar};
})();

document.addEventListener('DOMContentLoaded',App.init);