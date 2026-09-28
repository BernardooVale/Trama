/**
 * Graph — Trama
 * Controlador principal da instância do Cytoscape, delegando estilos, foco e criação de arestas.
 */
const Graph = (() => {
  let cy = null;
  let _selectedCyId = null;

  function syncTheme(){
    GraphStyles.syncTheme(cy);
  }

  /* ── Converters ────────────────────────────────── */
  function nodeToEl(n){
    const el = {
      group: 'nodes',
      data: {
        id: n.id,
        type: n.type,
        priority: n.priority,
        label: buildLabel(n),
        title: n.title,
        url: n.url || '',
      },
      position: { x: n.x, y: n.y },
    };
    if(n.parentId){
      el.data.parent = n.parentId;
    }
    return el;
  }

  function edgeToEl(e){
    return {
      group: 'edges',
      data: { id: e.id, source: e.source, target: e.target, edgeType: e.edgeType, label: e.label ?? '', bidirectional: !e.directed },
    };
  }

  function buildLabel(n){
    const title = n.title ?? '';
    if(!Store.getShowNodeMeta()) return title;
    const pi = { alta: '↑', media: '·', baixa: '↓' }[n.priority] ?? '';
    return pi ? (title ? `${pi} ${title}` : pi) : title;
  }

  function elementsFromSnapshot(snap){
    const sortedNodes = [...snap.nodes].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
    return [...sortedNodes.map(nodeToEl), ...snap.edges.map(edgeToEl)];
  }

  /* ═══════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════ */
  function init(){
    GraphFocus.init();
    const snap = Store.getSnapshot();
    cy = cytoscape({
      container: document.getElementById('cy'),
      elements:  elementsFromSnapshot(snap),
      style:     GraphStyles.buildStyle(),
      layout:    { name: 'preset' },
      userZoomingEnabled:  true,
      userPanningEnabled:  true,
      boxSelectionEnabled: false,
      selectionType:       'single',
      minZoom: 0.08, maxZoom: 5,
      wheelSensitivity: 0.22,
    });

    _bindCyEvents();
    _bindStoreEvents();
    _bindUIEvents();
    _initQuickHandle();
    cy.ready(() => cy.fit(undefined, 60));
  }

  /* ═══════════════════════════════════════════════
     CY EVENTS
  ════════════════════════════════════════════════ */
  function _bindCyEvents(){
    cy.on('mouseover', 'node', evt => {
      evt.target.addClass('hover');
      GraphFocus.onNodeMouseOver(cy, evt.target.id(), evt.target.grabbed());
    });

    cy.on('mouseout', 'node', evt => {
      evt.target.removeClass('hover');
      GraphFocus.onNodeMouseOut(cy);
    });

    cy.on('mouseover', 'edge', evt => evt.target.addClass('hover'));
    cy.on('mouseout', 'edge', evt => evt.target.removeClass('hover'));

    cy.on('tap', 'node', evt => {
      const id = evt.target.id();
      if(GraphEdgeMode.isActive()){
        GraphEdgeMode.handleClick(cy, id);
        return;
      }

      const origEvent = evt.originalEvent;
      const isCtrl = origEvent && (origEvent.ctrlKey || origEvent.metaKey);
      const nodeData = Store.getNode(id);

      if(isCtrl && nodeData && nodeData.type === 'subgrafo' && nodeData.subgraphTabId){
        document.dispatchEvent(new CustomEvent('graph:jumpTab', { detail: { tabId: nodeData.subgraphTabId } }));
        return;
      }

      if(window._shiftHeld){
        evt.target.select();
        _selectedCyId = id;
        return;
      }

      cy.nodes().unselect();
      evt.target.select();
      _selectedCyId = id;
      Store.selectNode(id);
      document.dispatchEvent(new CustomEvent('graph:openSidebar'));
    });

    cy.on('tap', 'edge', evt => {
      if(GraphEdgeMode.isActive()) return;
      if(window._shiftHeld){ evt.target.select(); return; }
      document.dispatchEvent(new CustomEvent('graph:edgeSelected', { detail: { edgeId: evt.target.id() } }));
    });

    cy.on('dbltap', 'node', evt => {
      const id = evt.target.id();
      if(GraphEdgeMode.isActive()) return;

      cy.nodes().unselect();
      evt.target.select();
      _selectedCyId = id;
      Store.selectNode(id);
      document.dispatchEvent(new CustomEvent('graph:openSidebar', { detail: { autoSelectText: true } }));
    });

    cy.on('dbltap', 'edge', evt => {
      if(GraphEdgeMode.isActive()) return;
      document.dispatchEvent(new CustomEvent('graph:edgeSelected', { detail: { edgeId: evt.target.id(), autoSelectText: true } }));
    });

    cy.on('tap', evt => {
      if(evt.target !== cy || GraphEdgeMode.isActive()) return;
      _selectedCyId = null;
      cy.elements().unselect();
      Store.clearSelection();
      _updateQuickHandle();
    });

    let _nodeGrabPos = null;
    cy.on('grab', 'node', evt => {
      _nodeGrabPos = { ...evt.target.position() };
    });

    cy.on('dragfreeon', 'node', evt => {
      const node = evt.target;
      const p = node.position();
      if(_nodeGrabPos && (Math.round(_nodeGrabPos.x) !== Math.round(p.x) || Math.round(_nodeGrabPos.y) !== Math.round(p.y))){
        Store.recordHistory();
      }
      _nodeGrabPos = null;

      if(node.isParent()){
        Store.batch(() => {
          Store.updateNodePosition(node.id(), p.x, p.y);
          node.descendants().forEach(child => {
            const cp = child.position();
            Store.updateNodePosition(child.id(), cp.x, cp.y);
          });
        });
      } else {
        Store.updateNodePosition(node.id(), p.x, p.y);
      }
      _updateQuickHandle();
    });

    cy.on('pan zoom', () => {
      _updateQuickHandle();
    });

    cy.on('cxttap', 'node', evt => {
      document.dispatchEvent(new CustomEvent('graph:contextNode', {
        detail: { id: evt.target.id(), x: evt.originalEvent.clientX, y: evt.originalEvent.clientY }
      }));
    });

    cy.on('cxttap', 'edge', evt => {
      document.dispatchEvent(new CustomEvent('graph:contextEdge', {
        detail: { id: evt.target.id(), x: evt.originalEvent.clientX, y: evt.originalEvent.clientY }
      }));
    });

    cy.on('cxttap', evt => {
      if(evt.target !== cy) return;
      document.dispatchEvent(new CustomEvent('graph:contextCore', {
        detail: { gx: evt.position.x, gy: evt.position.y, cx: evt.originalEvent.clientX, cy: evt.originalEvent.clientY }
      }));
    });

    let _panMouseStart = null;
    let _panUnlocked = false;
    const PAN_THRESHOLD = 5;
    const cyContainer = document.getElementById('cy');

    let _draggingNode = false;
    cy.on('grab', 'node', () => {
      _draggingNode = true;
      GraphFocus.cancelTimer();
      GraphFocus.clear(cy);
    });
    cy.on('free', 'node', () => { _draggingNode = false; });
    cy.on('dragfree', 'node', () => { _draggingNode = false; });

    cyContainer.addEventListener('mousedown', e => {
      if(e.button !== 0) return;
      GraphFocus.cancelTimer();
      GraphFocus.clear(cy);
      _panMouseStart = { x: e.clientX, y: e.clientY };
      _panUnlocked = false;
      if(!_draggingNode) cy.userPanningEnabled(false);
    }, { capture: true });

    cyContainer.addEventListener('mousemove', e => {
      if(!_panMouseStart || _draggingNode) return;
      const dx = e.clientX - _panMouseStart.x;
      const dy = e.clientY - _panMouseStart.y;
      if(!_panUnlocked && Math.hypot(dx, dy) > PAN_THRESHOLD){
        _panUnlocked = true;
        cy.userPanningEnabled(true);
      }
    }, { capture: true });

    cyContainer.addEventListener('mouseup', () => {
      _panMouseStart = null;
      if(!_panUnlocked) cy.userPanningEnabled(true);
    }, { capture: true });

    cyContainer.addEventListener('mouseleave', () => {
      _panMouseStart = null;
      _panUnlocked = false;
      cy.userPanningEnabled(true);
    });

    cyContainer.addEventListener('wheel', () => {
      cy.userPanningEnabled(true);
    }, { passive: true });

    document.addEventListener('keydown', e => {
      if(e.key === 'Shift'){
        window._shiftHeld = true;
        cy.boxSelectionEnabled(true);
        cy.selectionType('additive');
      }
      if(e.key === 'Control' || e.key === 'Meta'){
        window._ctrlHeld = true;
      }
      if((e.key === 'Shift' || e.key === 'Control' || e.key === 'Meta') && GraphFocus.isFocusActive() && GraphFocus.getFocusNodeId()){
        GraphFocus.activate(cy, GraphFocus.getFocusNodeId(), !!window._shiftHeld, !!window._ctrlHeld);
      }
    });

    document.addEventListener('keyup', e => {
      if(e.key === 'Shift'){
        window._shiftHeld = false;
        cy.boxSelectionEnabled(false);
        cy.selectionType('single');
      }
      if(e.key === 'Control' || e.key === 'Meta'){
        window._ctrlHeld = false;
      }
      if((e.key === 'Shift' || e.key === 'Control' || e.key === 'Meta') && GraphFocus.isFocusActive() && GraphFocus.getFocusNodeId()){
        GraphFocus.activate(cy, GraphFocus.getFocusNodeId(), !!window._shiftHeld, !!window._ctrlHeld);
      }
    });

    document.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if((e.key === 'Delete' || e.key === 'Backspace') && !inInput){
        e.preventDefault();
        _deleteSelected();
      }
      if(e.key === 'Escape'){
        if(GraphEdgeMode.isActive()) GraphEdgeMode.cancel(cy);
        else {
          _selectedCyId = null;
          cy.elements().unselect();
          Store.clearSelection();
        }
      }
    });
  }

  function _deleteSelected(){
    const selected = cy.$(':selected');
    const nodeIds = selected.nodes().map(n => n.id());
    const edgeIds = selected.edges().map(e => e.id());
    if(_selectedCyId && !nodeIds.includes(_selectedCyId)) nodeIds.push(_selectedCyId);
    if(!nodeIds.length && !edgeIds.length) return;
    Store.batch(() => {
      nodeIds.forEach(id => { try { Store.deleteNode(id); } catch(e){ console.warn(e); } });
      edgeIds.forEach(id => { try { Store.deleteEdge(id); } catch(e){ console.warn(e); } });
    });
    _selectedCyId = null;
  }

  /* ═══════════════════════════════════════════════
     STORE OBSERVER
  ════════════════════════════════════════════════ */
  function _bindStoreEvents(){
    Store.subscribe((event, payload) => {
      switch(event){
        case 'node:add':
          cy.add(nodeToEl(payload));
          _updateQuickHandle();
          break;

        case 'node:update':{
          const n = cy.getElementById(payload.id);
          if(n.length){
            n.data({
              type: payload.type,
              priority: payload.priority,
              label: buildLabel(payload),
              title: payload.title,
              url: payload.url || ''
            });
            const currentParent = n.data('parent') || null;
            const targetParent = payload.parentId || null;
            if(currentParent !== targetParent){
              n.move({ parent: targetParent });
            }
          }
          _updateQuickHandle();
          break;
        }

        case 'node:delete':{
          const n = cy.getElementById(payload.id);
          if(n && n.length) n.remove();
          payload.removedEdges.forEach(e => {
            const ce = cy.getElementById(e.id);
            if(ce && ce.length) ce.remove();
          });
          _selectedCyId = null;
          _updateQuickHandle();
          break;
        }

        case 'edge:add':
          cy.add(edgeToEl(payload));
          break;

        case 'edge:update':{
          const e = cy.getElementById(payload.id);
          if(e.length) e.data({ edgeType: payload.edgeType, label: payload.label ?? '' });
          break;
        }

        case 'edge:delete':{
          const ce = cy.getElementById(payload.id);
          if(ce && ce.length) ce.remove();
          break;
        }

        case 'selection:change':
          cy.nodes().unselect();
          if(payload){ const n = cy.getElementById(payload); if(n.length) n.select(); }
          _updateQuickHandle();
          break;

        case 'selection:edgeChange':
          cy.edges().unselect();
          if(payload){ const e = cy.getElementById(payload); if(e.length) e.select(); }
          _updateQuickHandle();
          break;

        case 'filter:change':
          applyFilter();
          break;

        case 'io:import':{
          cy.elements().remove();
          const snap = Store.getSnapshot();
          cy.add(elementsFromSnapshot(snap));
          cy.fit(undefined, 60);
          _updateQuickHandle();
          break;
        }

        case 'store:restore':{
          cy.elements().remove();
          const snap = Store.getSnapshot();
          cy.add(elementsFromSnapshot(snap));
          applyFilter();
          _updateQuickHandle();
          break;
        }

        case 'store:reset':
          cy.elements().remove();
          _updateQuickHandle();
          break;

        case 'tabs:switch':{
          cy.elements().remove();
          const snap = Store.getSnapshot();
          cy.add(elementsFromSnapshot(snap));
          applyFilter();
          _updateQuickHandle();
          if(snap.nodes.length > 0) cy.fit(undefined, 60);
          break;
        }

        case 'display:nodeMeta':
          cy.nodes().forEach(n => {
            const node = Store.getNode(n.id());
            if(node) n.data('label', buildLabel(node));
          });
          break;
      }
    });
  }

  function _bindUIEvents(){
    document.getElementById('zoom-in')?.addEventListener('click', () => cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: _center() }));
    document.getElementById('zoom-out')?.addEventListener('click', () => cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: _center() }));
    document.getElementById('zoom-fit')?.addEventListener('click', () => cy.fit(undefined, 60));

    document.querySelectorAll('.edge-tool').forEach(btn => {
      btn.addEventListener('click', () => GraphEdgeMode.start(btn.dataset.edge));
    });
    document.getElementById('cancel-edge')?.addEventListener('click', () => GraphEdgeMode.cancel(cy));
  }

  function applyFilter(){
    const visible = Store.getVisibleNodeIds();
    cy.batch(() => {
      cy.nodes().forEach(n => {
        if(visible.has(n.id())){ n.removeClass('dimmed'); n.style('display', 'element'); }
        else                   { n.addClass('dimmed');    n.style('display', 'none'); }
      });
      cy.edges().forEach(e => {
        const ok = visible.has(e.source().id()) && visible.has(e.target().id());
        if(ok){ e.removeClass('dimmed'); e.style('display', 'element'); }
        else  { e.addClass('dimmed');   e.style('display', 'none'); }
      });
    });
  }

  function _center(){
    const c = document.getElementById('cy');
    return { x: c.clientWidth / 2, y: c.clientHeight / 2 };
  }

  function addNodeAtCenter(type){
    const e = cy.extent();
    return Store.addNode({
      type,
      x: (e.x1 + e.x2) / 2 + (Math.random() - .5) * 80,
      y: (e.y1 + e.y2) / 2 + (Math.random() - .5) * 80,
    });
  }

  function addNodeAtPos(type, x, y){
    return Store.addNode({ type, x, y });
  }

  function startEdgeModeFromContext(type, sourceId){
    GraphEdgeMode.startFromContext(cy, type, sourceId);
  }

  function cancelEdgeMode(){
    GraphEdgeMode.cancel(cy);
  }

  function focusNode(id){
    const n = cy.getElementById(id);
    if(n.length){
      cy.center(n);
      cy.zoom({ level: Math.max(cy.zoom(), 1.2), position: n.position() });
    }
  }

  function getInstance(){ return cy; }

  function getModelCenter(){
    if(!cy) return { x: 300, y: 300 };
    const e = cy.extent();
    return { x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2 };
  }

  function getCursorModelPos(){
    if(!cy) return getModelCenter();
    const container = document.getElementById('cy');
    if(!container) return getModelCenter();
    const rect = container.getBoundingClientRect();
    const mouse = GraphFocus.getLastMousePos();
    if(mouse.x < rect.left || mouse.x > rect.right || mouse.y < rect.top || mouse.y > rect.bottom){
      return getModelCenter();
    }
    const pan = cy.pan();
    const zoom = cy.zoom();
    return {
      x: Math.round((mouse.x - rect.left - pan.x) / zoom),
      y: Math.round((mouse.y - rect.top  - pan.y) / zoom),
    };
  }

  /* ── Quick Connect Handle ──────────────────────── */
  let _quickHandleEl = null;

  function _initQuickHandle(){
    _quickHandleEl = document.getElementById('quick-handle');
    if(!_quickHandleEl){
      _quickHandleEl = document.createElement('div');
      _quickHandleEl.id = 'quick-handle';
      _quickHandleEl.className = 'quick-handle';
      _quickHandleEl.hidden = true;
      document.getElementById('canvas-wrap')?.appendChild(_quickHandleEl);
    }
  }

  function _updateQuickHandle(){
    if(!_quickHandleEl) _quickHandleEl = document.getElementById('quick-handle');
    if(!_quickHandleEl || !cy) return;
    const selNode = Store.getSelectedNode();
    if(!selNode || GraphEdgeMode.isActive()){
      _quickHandleEl.hidden = true;
      return;
    }
    const cyNode = cy.getElementById(selNode.id);
    if(!cyNode.length || cyNode.hidden() || cyNode.isParent()){
      _quickHandleEl.hidden = true;
      return;
    }
    const bb = cyNode.renderedBoundingBox();
    _quickHandleEl.hidden = false;
    _quickHandleEl.style.left = `${Math.round(bb.x2 + 8)}px`;
    _quickHandleEl.style.top = `${Math.round(bb.y1 - 6)}px`;

    const hasUrl = Boolean(selNode.url);
    _quickHandleEl.innerHTML = `
      <button class="qh-btn" id="qh-btn-connect" title="Puxar conexão">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
        <span>Conectar</span>
      </button>
      <button class="qh-btn" id="qh-btn-child" title="Criar nó filho conectado (Tab)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>+ Filho</span>
      </button>
      ${hasUrl ? `
        <a class="qh-btn qh-btn--link" href="${selNode.url}" target="_blank" rel="noopener" title="Abrir link externo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      ` : ''}
    `;

    document.getElementById('qh-btn-connect')?.addEventListener('click', e => {
      e.stopPropagation();
      startEdgeModeFromContext('dependencia', selNode.id);
    });

    document.getElementById('qh-btn-child')?.addEventListener('click', e => {
      e.stopPropagation();
      createQuickChild(selNode.id);
    });
  }

  function createQuickChild(sourceId){
    const sourceNode = Store.getNode(sourceId);
    if(!sourceNode) return;

    let childType = 'solucao';
    let edgeType = 'resolve';
    if(sourceNode.type === 'problema'){
      childType = 'solucao';
      edgeType = 'resolve';
    } else if(sourceNode.type === 'solucao'){
      childType = 'problema';
      edgeType = 'dependencia';
    } else if(sourceNode.type === 'agrupador'){
      childType = 'neutro';
      edgeType = 'dependencia';
    } else {
      childType = 'neutro';
      edgeType = 'relaciona';
    }

    const newX = sourceNode.x + 190;
    const newY = sourceNode.y + Math.round((Math.random() - 0.5) * 60);

    const child = Store.batch(() => {
      const n = Store.addNode({
        type: childType,
        title: childType === 'solucao' ? 'Nova solução' : (childType === 'problema' ? 'Novo problema' : 'Novo vértice'),
        x: newX,
        y: newY,
        parentId: sourceNode.parentId || null,
      });
      Store.addEdge({
        source: (edgeType === 'resolve' ? n.id : sourceNode.id),
        target: (edgeType === 'resolve' ? sourceNode.id : n.id),
        edgeType,
        directed: true,
      });
      return n;
    });

    Store.selectNode(child.id);
    document.dispatchEvent(new CustomEvent('graph:openSidebar', { detail: { autoSelectText: true } }));
    if(typeof App !== 'undefined' && App.toast) App.toast('Nó filho conectado criado');
  }

  function syncAllPositions(){
    if(!cy) return;
    cy.nodes().forEach(n => {
      const p = n.position();
      Store.updateNodePosition(n.id(), p.x, p.y);
    });
  }

  function runLayout(layoutName = 'hierarchical-vertical'){
    if(!cy) return;
    Store.recordHistory();

    let layoutConfig = {};
    if(layoutName === 'hierarchical-vertical'){
      layoutConfig = {
        name: 'breadthfirst',
        directed: true,
        padding: 60,
        spacingFactor: 1.25,
        avoidOverlap: true,
        animate: true,
        animationDuration: 500,
        nodeDimensionsIncludeLabels: true,
        stop: syncAllPositions,
      };
    } else if(layoutName === 'hierarchical-horizontal'){
      layoutConfig = {
        name: 'breadthfirst',
        directed: true,
        padding: 60,
        spacingFactor: 1.25,
        avoidOverlap: true,
        animate: true,
        animationDuration: 500,
        transform: (node, pos) => ({ x: pos.y * 1.5, y: pos.x }),
        nodeDimensionsIncludeLabels: true,
        stop: syncAllPositions,
      };
    } else if(layoutName === 'cose'){
      layoutConfig = {
        name: 'cose',
        animate: true,
        animationDuration: 600,
        refresh: 20,
        fit: true,
        padding: 60,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: () => 450000,
        nodeOverlap: 25,
        idealEdgeLength: () => 130,
        edgeElasticity: () => 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        nodeDimensionsIncludeLabels: true,
        stop: syncAllPositions,
      };
    } else if(layoutName === 'concentric'){
      layoutConfig = {
        name: 'concentric',
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 60,
        spacingFactor: 1.25,
        concentric: n => n.degree(),
        levelWidth: () => 2,
        nodeDimensionsIncludeLabels: true,
        stop: syncAllPositions,
      };
    } else if(layoutName === 'grid'){
      layoutConfig = {
        name: 'grid',
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 60,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        stop: syncAllPositions,
      };
    }

    const layout = cy.layout(layoutConfig);
    layout.run();
  }

  function runForceLayout(){
    runLayout('cose');
  }

  function pulseNode(id){
    if(!cy) return;
    const n = cy.getElementById(id);
    if(n.length){
      cy.center(n);
      cy.zoom({ level: Math.max(cy.zoom(), 1.25), position: n.position() });
      n.addClass('pulse-highlight');
      setTimeout(() => {
        n.removeClass('pulse-highlight');
      }, 2200);
    }
  }

  function resize(){
    if(cy) cy.resize();
  }

  return {
    init, addNodeAtCenter, addNodeAtPos, applyFilter,
    focusNode, pulseNode, syncTheme, cancelEdgeMode, getInstance, startEdgeModeFromContext,
    runLayout, runForceLayout, createQuickChild, resize,
    getCursorModelPos, getModelCenter,
    updateQuickHandle: _updateQuickHandle,
  };
})();