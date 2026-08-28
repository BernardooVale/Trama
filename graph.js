const Graph = (() => {
  let cy           = null;
  let _selectedCyId  = null;
  let _tapTimer      = null;
  let _tapTimerId    = null;
  const TAP_DELAY    = 250;

  /* ── Focus mode ────────────────────────────────── */
  let _focusTimer   = null;
  let _focusActive  = false;
  let _focusNodeId  = null;
  const FOCUS_DELAY = 750;

  const edgeMode = { active:false, edgeType:null, sourceId:null };

  /* ── Palette (espelha CSS vars) ────────────────── */
  const C = {
    node:   { problema:'#c4706c', solucao:'#6c9ea8', agrupador:'#8a9c7a' },
    edge:   { dependencia:'#c48c6c', resolve:'#6ca88a', relaciona:'#8a8caa' },
    accent: '#c49a6c',
    border: '#2e2f2a',
    bg:     { surface:'#181916', elevated:'#21221e' },
    text:   { primary:'#ede9e2', secondary:'#8a8880', muted:'#4a4a45' },
  };

  function syncTheme(){
    const light = document.documentElement.dataset.theme === 'light';
    C.border         = light ? '#d8d4ce' : '#2e2f2a';
    C.bg.surface     = light ? '#faf9f6' : '#181916';
    C.bg.elevated    = light ? '#eeecea' : '#21221e';
    C.text.primary   = light ? '#1c1b18' : '#ede9e2';
    C.text.secondary = light ? '#5a5852' : '#8a8880';
    C.text.muted     = light ? '#9a9890' : '#4a4a45';
    if(cy) cy.style(buildStyle());
  }

  /* ── Stylesheet ────────────────────────────────── */
  function buildStyle(){
    return [
      {
        selector: 'node',
        style: {
          'shape':            'round-rectangle',
          'width':            'label', 'height':'label', 'padding':'13px',
          'background-color': C.bg.elevated,
          'border-width':     1.5, 'border-color': C.border,
          'color':            C.text.primary,
          'font-family':      'Inter,system-ui,sans-serif',
          'font-size':        '12px', 'font-weight': '400',
          'label':            'data(label)',
          'text-valign':      'center', 'text-halign':'center',
          'text-wrap':        'wrap', 'text-max-width':'148px',
          'min-width':        '88px', 'min-height':'38px',
          'transition-property': 'background-color,border-color,border-width,opacity',
          'transition-duration': '140ms',
        },
      },
      {
        selector: 'node[type="problema"]',
        style: {
          'border-color': C.node.problema, 'border-width': 1.5,
          'background-color': `${C.node.problema}12`,
        },
      },
      {
        selector: 'node[type="solucao"]',
        style: {
          'border-color': C.node.solucao, 'border-width': 1.5,
          'background-color': `${C.node.solucao}12`,
        },
      },
      {
        selector: 'node[type="agrupador"]',
        style: {
          'border-color': C.node.agrupador, 'border-width': 1.5,
          'border-style': 'dashed',
          'background-color': `${C.node.agrupador}10`,
        },
      },
      {
        selector: 'node:selected',
        style: {
          'border-width':    2.5, 'border-color': C.accent,
          'shadow-blur':     14,  'shadow-color': C.accent,
          'shadow-opacity':  0.4, 'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },
      {
        selector: 'node.hover',
        style: {
          'shadow-blur':    8, 'shadow-color': C.accent,
          'shadow-opacity': 0.2,'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },
      {
        selector: 'node.edge-source',
        style: {
          'border-color': C.accent,'border-width':2.5,
          'shadow-blur':  18,'shadow-color':C.accent,
          'shadow-opacity':0.6,'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },

      /* Focus: highlight preserva cor do tipo */
      {
        selector: 'node.focus-highlight[type="problema"]',
        style: {
          'border-color':   C.node.problema, 'border-width': 2.5,
          'background-color': `${C.node.problema}28`,
          'shadow-blur':    18, 'shadow-color': C.node.problema,
          'shadow-opacity': 0.45,'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },
      {
        selector: 'node.focus-highlight[type="solucao"]',
        style: {
          'border-color':   C.node.solucao, 'border-width': 2.5,
          'background-color': `${C.node.solucao}28`,
          'shadow-blur':    18, 'shadow-color': C.node.solucao,
          'shadow-opacity': 0.45,'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },
      {
        selector: 'node.focus-highlight[type="agrupador"]',
        style: {
          'border-color':   C.node.agrupador, 'border-width': 2.5,
          'background-color': `${C.node.agrupador}28`,
          'shadow-blur':    18, 'shadow-color': C.node.agrupador,
          'shadow-opacity': 0.45,'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },
      {
        selector: 'node.focus-dim',
        style: { 'opacity': 0.07 },
      },

      /* Focus arestas: preserva cor do tipo */
      {
        selector: 'edge.focus-highlight[edgeType="dependencia"]',
        style: { 'opacity':1,'width':2.5,'line-color':C.edge.dependencia,'target-arrow-color':C.edge.dependencia },
      },
      {
        selector: 'edge.focus-highlight[edgeType="resolve"]',
        style: { 'opacity':1,'width':2.5,'line-color':C.edge.resolve,'target-arrow-color':C.edge.resolve },
      },
      {
        selector: 'edge.focus-highlight[edgeType="relaciona"]',
        style: { 'opacity':1,'width':2.5,'line-color':C.edge.relaciona,'target-arrow-color':C.edge.relaciona,'source-arrow-color':C.edge.relaciona },
      },
      {
        selector: 'edge.focus-dim',
        style: { 'opacity': 0.04 },
      },

      /* Filter dim */
      { selector:'node.dimmed', style:{ 'opacity':0.06 } },
      { selector:'edge.dimmed', style:{ 'opacity':0.04 } },

      /* ── Edges ─────────────────────────────────── */
      {
        selector: 'edge',
        style: {
          'width':1.5,'line-color':C.border,
          'target-arrow-color':C.border,'target-arrow-shape':'triangle',
          'arrow-scale':1.0,'curve-style':'bezier',
          'label':'data(edgeType)',
          'font-size':'10px','font-family':'Inter,system-ui,sans-serif',
          'color':C.text.muted,
          'text-background-color':C.bg.surface,
          'text-background-opacity':0.85,'text-background-padding':'2px',
          'text-rotation':'autorotate',
          'transition-property':'opacity,width',
          'transition-duration':'140ms',
        },
      },
      {
        selector: 'edge[edgeType="dependencia"]',
        style: {
          'line-color':C.edge.dependencia,'target-arrow-color':C.edge.dependencia,
          'line-style':'dashed','color':C.edge.dependencia,
        },
      },
      {
        selector: 'edge[edgeType="resolve"]',
        style: {
          'line-color':C.edge.resolve,'target-arrow-color':C.edge.resolve,
          'color':C.edge.resolve,
        },
      },
      {
        selector: 'edge[edgeType="relaciona"]',
        style: {
          'line-color':C.edge.relaciona,'target-arrow-color':C.edge.relaciona,
          'source-arrow-shape':'triangle','source-arrow-color':C.edge.relaciona,
          'color':C.edge.relaciona,
        },
      },
      {
        selector: 'edge:selected',
        style:{'width':3,'overlay-color':C.accent,'overlay-padding':4,'overlay-opacity':0.12},
      },
      {
        selector: 'edge.hover',
        style:{'width':2.5,'overlay-opacity':0.08,'overlay-color':C.accent,'overlay-padding':4},
      },
    ];
  }

  /* ── Converters ────────────────────────────────── */
  function nodeToEl(n){
    return {
      group:'nodes',
      data:{ id:n.id, type:n.type, priority:n.priority, label:buildLabel(n), title:n.title },
      position:{ x:n.x, y:n.y },
    };
  }
  function edgeToEl(e){
    return {
      group:'edges',
      data:{ id:e.id, source:e.source, target:e.target, edgeType:e.edgeType, bidirectional:!e.directed },
    };
  }
  function buildLabel(n){
    const title = n.title.length > 24 ? n.title.slice(0,22)+'…' : n.title;
    if(!Store.getShowNodeMeta()) return title;
    const pi = {alta:'↑',media:'·',baixa:'↓'}[n.priority] ?? '';
    return `${pi} ${title}`;
  }

  /* ═══════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════ */
  function init(){
    const snap = Store.getSnapshot();
    cy = cytoscape({
      container: document.getElementById('cy'),
      elements:  [...snap.nodes.map(nodeToEl), ...snap.edges.map(edgeToEl)],
      style:     buildStyle(),
      layout:    { name:'preset' },

      // Pan habilitado nativamente — controle via threshold no mousedown
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
     FOCUS MODE
  ════════════════════════════════════════════════ */
  function _activateFocus(nodeId, inbound){
    _clearFocusClasses();
    _focusActive = true;
    _focusNodeId = nodeId;

    const root      = cy.getElementById(nodeId);
    const edges     = inbound ? root.incomers('edge')  : root.outgoers('edge');
    const neighbors = inbound ? root.incomers('node')  : root.outgoers('node');
    const highlighted = root.union(edges).union(neighbors);
    const dimmed      = cy.elements().difference(highlighted);

    cy.batch(() => {
      highlighted.addClass('focus-highlight');
      dimmed.addClass('focus-dim');
    });

    document.getElementById('focus-hint').hidden = false;
  }

  function _clearFocusClasses(){
    cy.batch(() => cy.elements().removeClass('focus-highlight focus-dim'));
  }

  function _clearFocus(){
    if(!_focusActive) return;
    _focusActive = false;
    _focusNodeId = null;
    _clearFocusClasses();
    document.getElementById('focus-hint').hidden = true;
  }

  /* ═══════════════════════════════════════════════
     CY EVENTS
  ════════════════════════════════════════════════ */
  function _bindCyEvents(){

    /* ── Hover ──────────────────────────────────── */
    cy.on('mouseover','node', evt => {
      evt.target.addClass('hover');
      const id = evt.target.id();
      clearTimeout(_focusTimer);
      _focusTimer = setTimeout(() => {
        // Lê shift no momento da ativação
        const inbound = window._shiftHeld === true;
        _activateFocus(id, inbound);
      }, FOCUS_DELAY);
    });

    cy.on('mouseout','node', evt => {
      evt.target.removeClass('hover');
      clearTimeout(_focusTimer);
      _clearFocus();
    });

    cy.on('mouseover','edge', evt => evt.target.addClass('hover'));
    cy.on('mouseout', 'edge', evt => evt.target.removeClass('hover'));

    /* ── Tap: duplo clique manual ───────────────── */
    cy.on('tap','node', evt => {
      const id = evt.target.id();
      if(edgeMode.active){ _handleEdgeModeClick(id); return; }

      if(_tapTimer && _tapTimerId === id){
        clearTimeout(_tapTimer); _tapTimer=null; _tapTimerId=null;
        Store.selectNode(id);
        document.dispatchEvent(new CustomEvent('graph:openSidebar'));
        return;
      }

      // Shift+tap: adiciona à seleção
      if(window._shiftHeld){
        evt.target.select();
        _selectedCyId = id;
        return;
      }

      cy.nodes().unselect();
      evt.target.select();
      _selectedCyId = id;
      _tapTimerId   = id;
      _tapTimer = setTimeout(() => { _tapTimer=null; _tapTimerId=null; }, TAP_DELAY);
    });

    cy.on('tap','edge', evt => {
      if(edgeMode.active) return;
      if(window._shiftHeld){ evt.target.select(); return; }
      document.dispatchEvent(
        new CustomEvent('graph:edgeSelected',{detail:{edgeId:evt.target.id()}})
      );
    });

    cy.on('tap', evt => {
      if(evt.target !== cy) return;
      if(edgeMode.active) return;
      _selectedCyId = null;
      cy.elements().unselect();
      Store.clearSelection();
    });

    /* ── Drag sync ──────────────────────────────── */
    cy.on('dragfreeon','node', evt => {
      const p = evt.target.position();
      Store.updateNodePosition(evt.target.id(), p.x, p.y);
    });

    /* ── Pan: só com clique+arrasta ────────────── */
    // Estratégia: pan sempre habilitado no Cytoscape,
    // mas bloqueamos o mousedown no container até o threshold
    // usando grab/ungrab do cy para detectar se o usuário
    // está segurando um nó. Se não estiver, aplicamos threshold manual.
    let _panMouseStart  = null;
    let _panUnlocked    = false;
    const PAN_THRESHOLD = 5;

    const cyContainer = document.getElementById('cy');

    // Cytoscape dispara 'grab' quando arrasta nó — nesse caso pan nativo já está bloqueado
    let _draggingNode = false;
    cy.on('grab','node',   () => { _draggingNode=true });
    cy.on('free','node',   () => { _draggingNode=false });
    cy.on('dragfree','node',() => { _draggingNode=false });

    cyContainer.addEventListener('mousedown', e => {
      if(e.button !== 0) return;
      _panMouseStart = { x:e.clientX, y:e.clientY };
      _panUnlocked   = false;
      // Desabilita pan até threshold ser atingido (se não for nó)
      if(!_draggingNode) cy.userPanningEnabled(false);
    }, { capture:true });

    cyContainer.addEventListener('mousemove', e => {
      if(!_panMouseStart || _draggingNode) return;
      const dx = e.clientX - _panMouseStart.x;
      const dy = e.clientY - _panMouseStart.y;
      if(!_panUnlocked && Math.hypot(dx,dy) > PAN_THRESHOLD){
        _panUnlocked = true;
        cy.userPanningEnabled(true);
      }
    }, { capture:true });

    cyContainer.addEventListener('mouseup', () => {
      _panMouseStart = null;
      if(!_panUnlocked) cy.userPanningEnabled(true); // restaura para scroll/wheel
    }, { capture:true });

    cyContainer.addEventListener('mouseleave', () => {
      _panMouseStart = null; _panUnlocked = false;
      cy.userPanningEnabled(true);
    });

    // Scroll/wheel: sempre habilitado (zoom nativo do cy)
    // pan via wheel/trackpad: re-habilita temporariamente
    cyContainer.addEventListener('wheel', () => {
      cy.userPanningEnabled(true);
    }, { passive:true });

    /* ── Shift: multi-seleção ───────────────────── */
    // Shift+drag → box selection nativa do Cytoscape
    document.addEventListener('keydown', e => {
      if(e.key !== 'Shift') return;
      window._shiftHeld = true;
      cy.boxSelectionEnabled(true);
      cy.selectionType('additive');

      // Se foco ativo, reinverte
      if(_focusActive && _focusNodeId){
        _activateFocus(_focusNodeId, true);
      }
    });

    document.addEventListener('keyup', e => {
      if(e.key !== 'Shift') return;
      window._shiftHeld = false;
      cy.boxSelectionEnabled(false);
      cy.selectionType('single');

      // Volta ao foco normal se ainda hover
      if(_focusActive && _focusNodeId){
        _activateFocus(_focusNodeId, false);
      }
    });

    /* ── Keyboard delete/escape ─────────────────── */
    document.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      const inInput = tag==='INPUT' || tag==='TEXTAREA';
      if((e.key==='Delete'||e.key==='Backspace') && !inInput){
        e.preventDefault(); _deleteSelected();
      }
      if(e.key==='Escape'){
        if(edgeMode.active) cancelEdgeMode();
        else { _selectedCyId=null; cy.elements().unselect(); Store.clearSelection(); }
      }
    });
  }

  /* ── Delete ──────────────────────────────────── */
  function _deleteSelected(){
    const selected = cy.$(':selected');
    const nodeIds  = selected.nodes().map(n => n.id());
    const edgeIds  = selected.edges().map(e => e.id());
    if(_selectedCyId && !nodeIds.includes(_selectedCyId)) nodeIds.push(_selectedCyId);
    nodeIds.forEach(id => { try{ Store.deleteNode(id) }catch(e){ console.warn(e) } });
    edgeIds.forEach(id => { try{ Store.deleteEdge(id) }catch(e){ console.warn(e) } });
    _selectedCyId = null;
  }

  /* ═══════════════════════════════════════════════
     STORE OBSERVER
  ════════════════════════════════════════════════ */
  function _bindStoreEvents(){
    Store.subscribe((event, payload) => {
      switch(event){
        case 'node:add':
          cy.add(nodeToEl(payload)); break;

        case 'node:update':{
          const n = cy.getElementById(payload.id);
          if(!n.length) break;
          n.data({ type:payload.type, priority:payload.priority, label:buildLabel(payload), title:payload.title });
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
          cy.add(edgeToEl(payload)); break;

        case 'edge:delete':{
          const ce = cy.getElementById(payload.id);
          if(ce && ce.length) ce.remove();
          break;
        }

        case 'selection:change':
          cy.nodes().unselect();
          if(payload){ const n=cy.getElementById(payload); if(n.length) n.select(); }
          break;

        case 'filter:change':
          applyFilter(); break;

        case 'io:import':{
          cy.elements().remove();
          const snap = Store.getSnapshot();
          cy.add([...snap.nodes.map(nodeToEl), ...snap.edges.map(edgeToEl)]);
          cy.fit(undefined, 60);
          break;
        }

        case 'store:reset':
          cy.elements().remove(); break;

        case 'display:nodeMeta':
          cy.nodes().forEach(n => {
            const node = Store.getNode(n.id());
            if(node) n.data('label', buildLabel(node));
          });
          break;
      }
    });
  }

  /* ═══════════════════════════════════════════════
     UI EVENTS
  ════════════════════════════════════════════════ */
  function _bindUIEvents(){
    document.getElementById('zoom-in')
      .addEventListener('click', () => cy.zoom({level:cy.zoom()*1.25, renderedPosition:_center()}));
    document.getElementById('zoom-out')
      .addEventListener('click', () => cy.zoom({level:cy.zoom()*0.8,  renderedPosition:_center()}));
    document.getElementById('zoom-fit')
      .addEventListener('click', () => cy.fit(undefined, 60));

    document.querySelectorAll('.edge-tool').forEach(btn => {
      btn.addEventListener('click', () => startEdgeMode(btn.dataset.edge));
    });
    document.getElementById('cancel-edge')
      .addEventListener('click', cancelEdgeMode);
  }

  /* ═══════════════════════════════════════════════
     EDGE MODE
  ════════════════════════════════════════════════ */
  function startEdgeMode(type){
    edgeMode.active=true; edgeMode.edgeType=type; edgeMode.sourceId=null;
    document.getElementById('edge-mode-banner').hidden = false;
    document.getElementById('edge-mode-label').innerHTML =
      `Clique no vértice de <strong>origem</strong> — <em>${type}</em>`;
    document.getElementById('canvas-wrap').classList.add('edge-mode');
    document.querySelectorAll('.edge-tool').forEach(b => b.classList.remove('active'));
    document.querySelector(`.edge-tool[data-edge="${type}"]`)?.classList.add('active');
  }

  function cancelEdgeMode(){
    edgeMode.active=false; edgeMode.edgeType=null; edgeMode.sourceId=null;
    document.getElementById('edge-mode-banner').hidden = true;
    document.getElementById('canvas-wrap').classList.remove('edge-mode');
    document.querySelectorAll('.edge-tool').forEach(b => b.classList.remove('active'));
    cy.nodes().removeClass('edge-source');
  }

  function _handleEdgeModeClick(id){
    if(!edgeMode.sourceId){
      edgeMode.sourceId = id;
      cy.getElementById(id).addClass('edge-source');
      document.getElementById('edge-mode-label').innerHTML =
        `Clique no vértice de <strong>destino</strong>`;
      return;
    }
    const directed = (edgeMode.edgeType !== 'relaciona');
    try{ Store.addEdge({source:edgeMode.sourceId, target:id, edgeType:edgeMode.edgeType, directed}) }
    catch(err){ document.dispatchEvent(new CustomEvent('graph:error',{detail:err.message})) }
    finally{ cancelEdgeMode() }
  }

  /* ═══════════════════════════════════════════════
     FILTER
  ════════════════════════════════════════════════ */
  function applyFilter(){
    const visible = Store.getVisibleNodeIds();
    cy.batch(() => {
      cy.nodes().forEach(n => {
        if(visible.has(n.id())){ n.removeClass('dimmed'); n.style('display','element'); }
        else                   { n.addClass('dimmed');    n.style('display','none'); }
      });
      cy.edges().forEach(e => {
        const ok = visible.has(e.source().id()) && visible.has(e.target().id());
        if(ok){ e.removeClass('dimmed'); e.style('display','element'); }
        else  { e.addClass('dimmed');   e.style('display','none'); }
      });
    });
  }

  /* ── Helpers ───────────────────────────────────── */
  function _center(){
    const c = document.getElementById('cy');
    return { x:c.clientWidth/2, y:c.clientHeight/2 };
  }

  function addNodeAtCenter(type){
    const e = cy.extent();
    return Store.addNode({
      type, x:(e.x1+e.x2)/2+(Math.random()-.5)*80,
            y:(e.y1+e.y2)/2+(Math.random()-.5)*80,
    });
  }

  function focusNode(id){
    const n = cy.getElementById(id);
    if(!n.length) return;
    cy.animate({center:{eles:n}, zoom:Math.max(cy.zoom(),1), duration:320, easing:'ease-in-out-cubic'});
    n.flashClass('hover',500);
  }

  function getInstance(){ return cy }

  return {
    init, addNodeAtCenter, applyFilter,
    focusNode, syncTheme, cancelEdgeMode, getInstance,
  };
})();