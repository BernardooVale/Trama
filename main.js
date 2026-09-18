const App = (() => {
  const DOM = {};

  function cacheDOM(){
    [
      'sidebar','sidebar-close','sidebar-title',
      'sb-node-fields','sb-edge-fields',
      'sb-type-badge','sb-title','sb-desc','sb-meta',
      'sb-priority-row','sb-tags-row','sb-subgraph-fields','btn-jump-tab',
      'tabs-bar','tabs-list','btn-tab-add',
      'sb-edge-type-badge','sb-edge-label','sb-edge-endpoints',
      'sb-priority-selector','tags-list','sb-tags',
      'search-input','search-clear','search-chips','search-dropdown',
      'btn-export','btn-import','btn-theme','icon-theme','btn-toggle-meta',
      'btn-layout','btn-undo','toast','canvas-wrap','focus-hint',
    ].forEach(id=>{ DOM[id]=document.getElementById(id) });
  }

  /* ── Clipboard ─────────────────────────────────── */
  let clipboard = null; // { nodes: [...], edges: [...] }

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
  function openSidebar(nodeId, autoSelectText=false){
    Sidebar.open(nodeId, autoSelectText);
  }

  function openEdgeSidebar(edgeId, autoSelectText=false){
    Sidebar.openEdge(edgeId, autoSelectText);
  }

  function closeSidebar(){
    Sidebar.close();
  }

  /* ── Clipboard & History Helpers ───────────────── */
  function copySelection(){
    const cy = Graph.getInstance();
    const selNodes = cy ? cy.$('node:selected') : null;
    let nodesToCopy = [];

    if(selNodes && selNodes.length > 0){
      nodesToCopy = selNodes.map(n => Store.getNode(n.id())).filter(Boolean);
    } else {
      const single = Store.getSelectedNode();
      if(single) nodesToCopy = [single];
    }

    if(!nodesToCopy.length){
      toast('Nenhum vértice selecionado para copiar');
      return false;
    }

    const nodeIds = new Set(nodesToCopy.map(n => n.id));
    const edgesToCopy = Store.getEdges().filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    clipboard = {
      nodes: nodesToCopy.map(n => ({
        type: n.type,
        title: n.title,
        description: n.description,
        priority: n.priority,
        tags: [...n.tags],
        x: n.x,
        y: n.y,
        origId: n.id,
      })),
      edges: edgesToCopy.map(e => ({
        sourceOrig: e.source,
        targetOrig: e.target,
        edgeType: e.edgeType,
        label: e.label,
        directed: e.directed,
      })),
    };

    toast(nodesToCopy.length === 1 ? 'Vértice copiado (Ctrl+C)' : `${nodesToCopy.length} vértices copiados (Ctrl+C)`);
    return true;
  }

  function pasteClipboard(targetPos = null){
    if(!clipboard || !clipboard.nodes.length){
      toast('Área de transferência vazia');
      return false;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    clipboard.nodes.forEach(n => {
      if(n.x < minX) minX = n.x;
      if(n.x > maxX) maxX = n.x;
      if(n.y < minY) minY = n.y;
      if(n.y > maxY) maxY = n.y;
    });
    const origCenterX = (minX + maxX) / 2;
    const origCenterY = (minY + maxY) / 2;

    let destX, destY;
    if(targetPos){
      destX = targetPos.x;
      destY = targetPos.y;
    } else {
      const cursor = Graph.getCursorModelPos();
      destX = cursor.x;
      destY = cursor.y;
    }

    const dx = destX - origCenterX;
    const dy = destY - origCenterY;
    const finalDx = Math.abs(dx) < 5 && Math.abs(dy) < 5 ? 40 : dx;
    const finalDy = Math.abs(dx) < 5 && Math.abs(dy) < 5 ? 40 : dy;

    const idMap = new Map();
    const createdNodes = [];

    Store.batch(() => {
      clipboard.nodes.forEach(n => {
        const newNode = Store.addNode({
          type: n.type,
          title: n.title,
          description: n.description,
          priority: n.priority,
          tags: [...n.tags],
          x: Math.round(n.x + finalDx),
          y: Math.round(n.y + finalDy),
        });
        idMap.set(n.origId, newNode.id);
        createdNodes.push(newNode);
      });

      clipboard.edges.forEach(e => {
        const newSrc = idMap.get(e.sourceOrig);
        const newTgt = idMap.get(e.targetOrig);
        if(newSrc && newTgt){
          try{
            Store.addEdge({
              source: newSrc,
              target: newTgt,
              edgeType: e.edgeType,
              label: e.label,
              directed: e.directed,
            });
          }catch(err){ console.warn(err) }
        }
      });
    });

    const cy = Graph.getInstance();
    if(cy){
      cy.elements().unselect();
      createdNodes.forEach(n => {
        cy.getElementById(n.id).select();
      });
    }

    if(createdNodes.length === 1){
      Store.selectNode(createdNodes[0].id);
      Sidebar.open(createdNodes[0].id, false);
      toast('Vértice colado');
    } else {
      toast(`${createdNodes.length} vértices colados`);
    }

    return true;
  }

  function undoAction(){
    if(!Store.canUndo()){
      toast('Nada para desfazer');
      return false;
    }
    const success = Store.undo();
    if(success){
      toast('Ação desfeita (Ctrl+Z)');
    }
    return success;
  }

  function hasClipboard(){
    return !!(clipboard && clipboard.nodes && clipboard.nodes.length > 0);
  }

  /* ═══════════════════════════════════════════════
     STORE OBSERVER
  ════════════════════════════════════════════════ */
  function bindStoreObserver(){
    Store.subscribe((event,payload)=>{
      switch(event){
        case 'tabs:change':
          TabsUI.render();
          break;

        case 'tabs:switch':
          TabsUI.render();
          closeSidebar();
          toast(`Aba: ${payload.tab.name}`);
          break;

        case 'selection:change':
          if(!payload && !Store.getSelectedEdge()) closeSidebar();
          break;

        case 'selection:edgeChange':
          if(!payload && !Store.getSelectedNode()) closeSidebar();
          break;

        case 'node:update':{
          const n=Store.getSelectedNode();
          if(n&&n.id===payload.id) Sidebar.populate(payload);
          break;
        }

        case 'edge:update':{
          const e=Store.getSelectedEdge();
          if(e&&e.id===payload.id) Sidebar.populateEdge(payload);
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
          TabsUI.render();
          Graph.applyFilter();
          break;

        case 'store:restore':
          TabsUI.render();
          if(!Store.getSelectedNode() && !Store.getSelectedEdge()){
            closeSidebar();
          } else if(Store.getSelectedNode()){
            Sidebar.populate(Store.getSelectedNode());
          } else if(Store.getSelectedEdge()){
            Sidebar.populateEdge(Store.getSelectedEdge());
          }
          break;

        case 'store:ready':
          TabsUI.render();
          toast(`Trama · ${payload.nodes.length} vértices carregados`,2000); break;
      }
    });
  }

  /* ═══════════════════════════════════════════════
     GRAPH EVENTS
  ════════════════════════════════════════════════ */
  function bindGraphEvents(){
    document.addEventListener('graph:openSidebar', e => {
      const n=Store.getSelectedNode();
      if(n){
        openSidebar(n.id, !!e.detail?.autoSelectText);
      }
    });

    // Pular para aba disparado por Ctrl+Click no subgrafo ou botão na sidebar
    document.addEventListener('graph:jumpTab', e => {
      const targetTabId = e.detail?.tabId;
      if(targetTabId){
        Store.switchTab(targetTabId);
      }
    });

    document.addEventListener('graph:error',e=>toast(`⚠ ${e.detail}`));

    document.addEventListener('graph:edgeSelected',e=>{
      const edge=Store.getEdge(e.detail.edgeId);
      if(!edge) return;
      Store.selectEdge(edge.id);
      openEdgeSidebar(edge.id, !!e.detail.isNew || !!e.detail.autoSelectText);
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
     DROPDOWNS
  ════════════════════════════════════════════════ */
  function bindDropdowns(){
    ['type', 'priority'].forEach(name => {
      const dd = document.getElementById(`dd-${name}`);
      const trigger = document.getElementById(`dd-${name}-trigger`);
      const menu = document.getElementById(`dd-${name}-menu`);
      const label = document.getElementById(`dd-${name}-label`);
      if(!dd || !trigger || !menu) return;

      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = dd.classList.contains('open');
        document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
        if(!isOpen) dd.classList.add('open');
      });

      menu.querySelectorAll('.dd-item').forEach(item => {
        item.addEventListener('click', e => {
          e.stopPropagation();
          const val = item.dataset.value;
          menu.querySelectorAll('.dd-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');

          if(name === 'type'){
            Store.setFilter({ type: val });
            if(label) label.textContent = `Tipo: ${item.textContent.trim()}`;
            trigger.classList.toggle('active-filter', val !== 'all');
          } else {
            Store.setFilter({ priority: val });
            if(label) label.textContent = `Prioridade: ${item.textContent.trim()}`;
            trigger.classList.toggle('active-filter', val !== 'all');
          }
          dd.classList.remove('open');
        });
      });
    });

    document.addEventListener('click', e => {
      if(!e.target.closest('.dropdown')){
        document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
      }
    });
  }

  /* ═══════════════════════════════════════════════
     KEYBOARD GLOBAL
  ════════════════════════════════════════════════ */
  function bindKeyboard(){
    document.addEventListener('keydown',e=>{
      const tag=document.activeElement.tagName;
      const inInput=tag==='INPUT'||tag==='TEXTAREA';

      // Atalhos com Ctrl / Cmd
      if(e.ctrlKey||e.metaKey){
        const key = e.key.toLowerCase();
        // Ctrl+Shift+T: Nova aba de grafo
        if(key === 't' && e.shiftKey && !inInput){
          e.preventDefault();
          Store.createTab();
          return;
        }
        // Ctrl+Shift+W: Fechar aba de grafo ativa
        if(key === 'w' && e.shiftKey && !inInput){
          e.preventDefault();
          TabsUI.deleteTabPrompt(Store.getActiveTabId());
          return;
        }
        // Ctrl+E: Renomear aba de grafo ativa
        if(key === 'e' && !inInput){
          e.preventDefault();
          TabsUI.renameActiveTabPrompt();
          return;
        }
        // Ctrl+S: Exportar JSON do projeto
        if(key === 's' && !inInput){
          e.preventDefault();
          Store.exportJSON();
          toast('Exportado');
          return;
        }
        if(key === 'z' && !inInput){
          e.preventDefault();
          undoAction();
          return;
        }
        if(key === 'c' && !inInput){
          e.preventDefault();
          copySelection();
          return;
        }
        if(key === 'v' && !inInput){
          e.preventDefault();
          pasteClipboard();
          return;
        }
        if(key === 'f'){
          e.preventDefault();
          DOM['search-input'].focus();
          DOM['search-input'].select();
          return;
        }
      }

      if(e.key==='/'&&!inInput){ e.preventDefault(); DOM['search-input'].focus() }
      if(e.key==='t'&&!inInput&&!e.ctrlKey&&!e.metaKey) toggleTheme();
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
    Sidebar.bind();
    TabsUI.bind();
    bindStoreObserver();
    bindGraphEvents();
    ContextMenu.bind();
    bindDropdowns();
    Search.bind();
    bindIO();
    bindKeyboard();
    Store.init();
    TabsUI.render();
    Graph.init();

    DOM['btn-theme'].addEventListener('click',toggleTheme);
    DOM['btn-undo']?.addEventListener('click', () => undoAction());
    DOM['btn-layout'].addEventListener('click',()=>{
      Graph.runForceLayout();
      toast('Organizando…');
    });

    // Botão pular para aba na sidebar
    DOM['btn-jump-tab']?.addEventListener('click', () => {
      const n = Store.getSelectedNode();
      if(n && n.type === 'subgrafo' && n.subgraphTabId){
        Store.switchTab(n.subgraphTabId);
      }
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

    bindGlobalContextMenu();
    setTimeout(()=>toast('Dica: Ctrl+Shift+T nova aba · Ctrl+Shift+W fechar · Ctrl+E renomear · Ctrl+Click pula pro subgrafo',4000),2200);
  }

  function bindGlobalContextMenu(){
    document.addEventListener('contextmenu', e => {
      e.preventDefault();
    });
  }

  return {
    init, toast, openSidebar, closeSidebar,
    copySelection, pasteClipboard, undoAction, hasClipboard
  };
})();

document.addEventListener('DOMContentLoaded',App.init);