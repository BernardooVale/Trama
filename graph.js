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
    return {
      group: 'nodes',
      data: { id: n.id, type: n.type, priority: n.priority, label: buildLabel(n), title: n.title },
      position: { x: n.x, y: n.y },
    };
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

  /* ═══════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════ */
  function init(){
    GraphFocus.init();
    const snap = Store.getSnapshot();
    cy = cytoscape({
      container: document.getElementById('cy'),
      elements:  [...snap.nodes.map(nodeToEl), ...snap.edges.map(edgeToEl)],
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
    });

    let _nodeGrabPos = null;
    cy.on('grab', 'node', evt => {
      _nodeGrabPos = { ...evt.target.position() };
    });

    cy.on('dragfreeon', 'node', evt => {
      const p = evt.target.position();
      if(_nodeGrabPos && (Math.round(_nodeGrabPos.x) !== Math.round(p.x) || Math.round(_nodeGrabPos.y) !== Math.round(p.y))){
        Store.recordHistory();
      }
      _nodeGrabPos = null;
      Store.updateNodePosition(evt.target.id(), p.x, p.y);
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
    cy.on('grab', 'node', () => { _draggingNode = true; });
    cy.on('free', 'node', () => { _draggingNode = false; });
    cy.on('dragfree', 'node', () => { _draggingNode = false; });

    cyContainer.addEventListener('mousedown', e => {
      if(e.button !== 0) return;
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
      if(e.key !== 'Shift') return;
      window._shiftHeld = true;
      cy.boxSelectionEnabled(true);
      cy.selectionType('additive');
      if(GraphFocus.isFocusActive() && GraphFocus.getFocusNodeId()){
        GraphFocus.activate(cy, GraphFocus.getFocusNodeId(), true);
      }
    });

    document.addEventListener('keyup', e => {
      if(e.key !== 'Shift') return;
      window._shiftHeld = false;
      cy.boxSelectionEnabled(false);
      cy.selectionType('single');
      if(GraphFocus.isFocusActive() && GraphFocus.getFocusNodeId()){
        GraphFocus.activate(cy, GraphFocus.getFocusNodeId(), false);
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
          break;

        case 'node:update':{
          const n = cy.getElementById(payload.id);
          if(n.length) n.data({ type: payload.type, priority: payload.priority, label: buildLabel(payload), title: payload.title });
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
          break;

        case 'selection:edgeChange':
          cy.edges().unselect();
          if(payload){ const e = cy.getElementById(payload); if(e.length) e.select(); }
          break;

        case 'filter:change':
          applyFilter();
          break;

        case 'io:import':{
          cy.elements().remove();
          const snap = Store.getSnapshot();
          cy.add([...snap.nodes.map(nodeToEl), ...snap.edges.map(edgeToEl)]);
          cy.fit(undefined, 60);
          break;
        }

        case 'store:restore':{
          cy.elements().remove();
          const snap = Store.getSnapshot();
          cy.add([...snap.nodes.map(nodeToEl), ...snap.edges.map(edgeToEl)]);
          applyFilter();
          break;
        }

        case 'store:reset':
          cy.elements().remove();
          break;

        case 'tabs:switch':{
          cy.elements().remove();
          const snap = Store.getSnapshot();
          cy.add([...snap.nodes.map(nodeToEl), ...snap.edges.map(edgeToEl)]);
          applyFilter();
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

  function runForceLayout(){
    if(!cy) return;
    Store.recordHistory();
    const layout = cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 500,
      randomize: false,
      fit: true,
      padding: 60,
      stop: () => {
        cy.nodes().forEach(n => {
          const p = n.position();
          Store.updateNodePosition(n.id(), p.x, p.y);
        });
      }
    });
    layout.run();
  }

  return {
    init, addNodeAtCenter, addNodeAtPos, applyFilter,
    focusNode, syncTheme, cancelEdgeMode, getInstance, startEdgeModeFromContext,
    runForceLayout, getCursorModelPos, getModelCenter
  };
})();