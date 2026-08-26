/* ═══════════════════════════════════════════════════
   graph.js — Cytoscape init, estilos, eventos canvas
════════════════════════════════════════════════════ */

const Graph = (() => {

    let _selectedCyId = null; 

  /* ─── Instância Cytoscape ─────────────────────── */
  let cy = null;

  /* ─── Estado interno do modo aresta ──────────── */
  const edgeMode = {
    active:   false,
    edgeType: null,
    sourceId: null,
  };

  /* ─── Helpers CSS var → valor ─────────────────── */
  const CSS = name =>
    getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();

  /* ═══════════════════════════════════════════════
     PALETA (espelha style.css vars)
  ════════════════════════════════════════════════ */
  const COLOR = {
    node: {
      problema:  '#ef5350',
      solucao:   '#42a5f5',
      agrupador: '#ab47bc',
    },
    status: {
      pendente:  '#ffa726',
      andamento: '#42a5f5',
      concluido: '#66bb6a',
    },
    priority: {
      alta:  '#ef5350',
      media: '#ffa726',
      baixa: '#66bb6a',
    },
    edge: {
      dependencia: '#ff7043',
      resolve:     '#26a69a',
      relaciona:   '#7e57c2',
    },
    bg: {
      surface:  '#1a1d27',
      elevated: '#222635',
      hover:    '#2a2f42',
    },
    text: {
      primary:   '#e8eaf6',
      secondary: '#9196a8',
      muted:     '#555d72',
    },
    border: '#2e3347',
    accent: '#5c6bc0',
  };

  /* Actualiza paleta quando tema muda */
  function syncTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    COLOR.bg.surface  = light ? '#ffffff' : '#1a1d27';
    COLOR.bg.elevated = light ? '#e8ecf4' : '#222635';
    COLOR.text.primary   = light ? '#1a1d27' : '#e8eaf6';
    COLOR.text.secondary = light ? '#4a5068' : '#9196a8';
    COLOR.border = light ? '#d0d5e8' : '#2e3347';
    if (cy) cy.style(buildStyle());
  }

  /* ═══════════════════════════════════════════════
     STYLESHEET Cytoscape
  ════════════════════════════════════════════════ */
  function buildStyle() {
    return [

      /* ── Nó base ─────────────────────────────── */
      {
        selector: 'node',
        style: {
          'shape':               'round-rectangle',
          'width':               'label',
          'height':              'label',
          'padding':             '14px',
          'background-color':    COLOR.bg.elevated,
          'border-width':        2,
          'border-color':        COLOR.border,
          'color':               COLOR.text.primary,
          'font-family':         'Inter, system-ui, sans-serif',
          'font-size':           '13px',
          'font-weight':         500,
          'label':               'data(label)',
          'text-valign':         'center',
          'text-halign':         'center',
          'text-wrap':           'wrap',
          'text-max-width':      '160px',
          'min-width':           '100px',
          'min-height':          '44px',
          'ghost':               'no',
          'transition-property': 'background-color, border-color, border-width, opacity',
          'transition-duration': '150ms',
        },
      },

      /* ── Tipos de nó (cor da borda + indicador) ─ */
      {
        selector: 'node[type="problema"]',
        style: {
          'border-color':     COLOR.node.problema,
          'border-width':     2,
          'background-color': `${COLOR.node.problema}18`,
        },
      },
      {
        selector: 'node[type="solucao"]',
        style: {
          'border-color':     COLOR.node.solucao,
          'border-width':     2,
          'background-color': `${COLOR.node.solucao}18`,
        },
      },
      {
        selector: 'node[type="agrupador"]',
        style: {
          'border-color':     COLOR.node.agrupador,
          'border-width':     2,
          'border-style':     'dashed',
          'background-color': `${COLOR.node.agrupador}12`,
          'shape':            'round-rectangle',
        },
      },

      /* ── Status overlay (borda interna) ─────── */
      {
        selector: 'node[status="concluido"]',
        style: {
          'opacity': 0.75,
        },
      },

      /* ── Selecionado ─────────────────────────── */
      {
        selector: 'node:selected',
        style: {
          'border-width':  3,
          'border-color':  COLOR.accent,
          'shadow-blur':   18,
          'shadow-color':  COLOR.accent,
          'shadow-opacity': 0.5,
          'shadow-offset-x': 0,
          'shadow-offset-y': 0,
        },
      },

      /* ── Hover ───────────────────────────────── */
      {
        selector: 'node.hover',
        style: {
          'border-width':  3,
          'shadow-blur':   12,
          'shadow-color':  COLOR.accent,
          'shadow-opacity': 0.3,
          'shadow-offset-x': 0,
          'shadow-offset-y': 0,
        },
      },

      /* ── Edge mode: source highlight ─────────── */
      {
        selector: 'node.edge-source',
        style: {
          'border-color':  COLOR.accent,
          'border-width':  3,
          'shadow-blur':   20,
          'shadow-color':  COLOR.accent,
          'shadow-opacity': 0.7,
          'shadow-offset-x': 0,
          'shadow-offset-y': 0,
        },
      },

      /* ── Nó dimmed (filtro) ───────────────────── */
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.08,
        },
      },

      /* ── Badge de status (via label extra) ───── */
      /* Usamos um pseudo-label no campo sublabel   */
      {
        selector: 'node[sublabel]',
        style: {
          'label': 'data(label)',
        },
      },

      /* ═══ ARESTAS ══════════════════════════════ */

      /* ── Aresta base ─────────────────────────── */
      {
        selector: 'edge',
        style: {
          'width':              2,
          'line-color':         COLOR.border,
          'target-arrow-color': COLOR.border,
          'target-arrow-shape': 'triangle',
          'arrow-scale':        1.2,
          'curve-style':        'bezier',
          'label':              'data(edgeType)',
          'font-size':          '10px',
          'font-family':        'Inter, system-ui, sans-serif',
          'color':              COLOR.text.muted,
          'text-background-color': COLOR.bg.surface,
          'text-background-opacity': 0.85,
          'text-background-padding': '2px',
          'text-rotation':      'autorotate',
          'transition-property':'line-color, opacity',
          'transition-duration':'150ms',
        },
      },

      /* ── Tipos de aresta ─────────────────────── */
      {
        selector: 'edge[edgeType="dependencia"]',
        style: {
          'line-color':         COLOR.edge.dependencia,
          'target-arrow-color': COLOR.edge.dependencia,
          'line-style':         'dashed',
          'color':              COLOR.edge.dependencia,
        },
      },
      {
        selector: 'edge[edgeType="resolve"]',
        style: {
          'line-color':         COLOR.edge.resolve,
          'target-arrow-color': COLOR.edge.resolve,
          'color':              COLOR.edge.resolve,
        },
      },
      {
        selector: 'edge[edgeType="relaciona"]',
        style: {
          'line-color':         COLOR.edge.relaciona,
          'target-arrow-color': COLOR.edge.relaciona,
          'source-arrow-shape': 'triangle',
          'source-arrow-color': COLOR.edge.relaciona,
          'color':              COLOR.edge.relaciona,
        },
      },

      /* ── Aresta bidirecional (directed=false) ── */
      {
        selector: 'edge[?bidirectional]',
        style: {
          'source-arrow-shape': 'triangle',
        },
      },

      /* ── Aresta selecionada ───────────────────── */
      {
        selector: 'edge:selected',
        style: {
          'width':    3.5,
          'overlay-color':   COLOR.accent,
          'overlay-padding': 6,
          'overlay-opacity': 0.15,
        },
      },

      /* ── Aresta dimmed ───────────────────────── */
      {
        selector: 'edge.dimmed',
        style: { 'opacity': 0.06 },
      },

      /* ── Aresta hover ────────────────────────── */
      {
        selector: 'edge.hover',
        style: {
          'width': 3,
          'overlay-opacity': 0.1,
          'overlay-color': COLOR.accent,
          'overlay-padding': 5,
        },
      },
    ];
  }

  /* ═══════════════════════════════════════════════
     CONVERTER Store → Cytoscape elements
  ════════════════════════════════════════════════ */

  function nodeToElement(n) {
    return {
      group: 'nodes',
      data: {
        id:          n.id,
        type:        n.type,
        status:      n.status,
        priority:    n.priority,
        label:       buildLabel(n),
        title:       n.title,
        edgeType:    null,
        bidirectional: false,
      },
      position: { x: n.x, y: n.y },
    };
  }

  function edgeToElement(e) {
    return {
      group: 'edges',
      data: {
        id:           e.id,
        source:       e.source,
        target:       e.target,
        edgeType:     e.edgeType,
        bidirectional: !e.directed,
      },
    };
  }

    function buildLabel(n) {
        const title = n.title.length > 28 ? n.title.slice(0, 26) + '…' : n.title;
        if (!Store.getShowNodeMeta()) return title;
        const priorityIcon = { alta: '🔴', media: '🟡', baixa: '🟢' }[n.priority] ?? '';
        const statusIcon   = { pendente: '○', andamento: '◑', concluido: '●' }[n.status] ?? '';
        return `${priorityIcon} ${title}\n${statusIcon} ${n.status}`;
    }

  /* ═══════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════ */
  function init() {
    const snapshot = Store.getSnapshot();

    cy = cytoscape({
      container: document.getElementById('cy'),

      elements: [
        ...snapshot.nodes.map(nodeToElement),
        ...snapshot.edges.map(edgeToElement),
      ],

      style: buildStyle(),

      layout: { name: 'preset' },

      // Interação
      userZoomingEnabled:    true,
      userPanningEnabled:    true,
      boxSelectionEnabled:   false,
      selectionType:         'single',
      minZoom:               0.15,
      maxZoom:               4,
      wheelSensitivity:      0.3,
    });

    _bindCyEvents();
    _bindStoreEvents();
    _bindUIEvents();

    // Fit inicial suave
    cy.ready(() => cy.fit(undefined, 60));
  }

  /* ═══════════════════════════════════════════════
     BIND — Cytoscape eventos
  ════════════════════════════════════════════════ */
  function _bindCyEvents() {

    /* ── Hover nó ────────────────────────────── */
    cy.on('mouseover', 'node', evt => {
      evt.target.addClass('hover');
      document.getElementById('cy').style.cursor = 'pointer';
    });
    cy.on('mouseout', 'node', evt => {
      evt.target.removeClass('hover');
      document.getElementById('cy').style.cursor = '';
    });

    /* ── Hover aresta ────────────────────────── */
    cy.on('mouseover', 'edge', evt => evt.target.addClass('hover'));
    cy.on('mouseout',  'edge', evt => evt.target.removeClass('hover'));

    /* ── Clique aresta ───────────────────────── */
    cy.on('tap', 'edge', evt => {
      if (edgeMode.active) return;
      const edgeId = evt.target.id();
      // Notifica main.js via evento customizado
      document.dispatchEvent(
        new CustomEvent('graph:edgeSelected', { detail: { edgeId } })
      );
    });

    /* ── Clique no canvas vazio ──────────────── */
    cy.on('tap', evt => {
        if (evt.target !== cy) return;
        if (edgeMode.active) return;
        _selectedCyId = null;
        cy.nodes().unselect();
        cy.edges().unselect();
        Store.clearSelection();
    });

    /* ── Drag nó: sync posição no Store ─────── */
    cy.on('dragfreeon', 'node', evt => {
      const n   = evt.target;
      const pos = n.position();
      Store.updateNodePosition(n.id(), pos.x, pos.y);
    });

    let _tapTimerId = null;
    let _tapTimer   = null;
    const TAP_DELAY = 250; // ms — janela para detectar duplo clique

    cy.on('tap', 'node', evt => {
    const id = evt.target.id();

    if (edgeMode.active) {
        _handleEdgeModeClick(id);
        return;
    }

    if (_tapTimer && _tapTimerId === id) {
        // Segundo tap no mesmo nó dentro do delay → duplo clique
        clearTimeout(_tapTimer);
        _tapTimer   = null;
        _tapTimerId = null;

        // Abre sidebar
        Store.selectNode(id);
        document.dispatchEvent(new CustomEvent('graph:openSidebar'));
        return;
    }

    // Primeiro tap: seleciona visualmente, aguarda segundo
    cy.nodes().unselect();
    evt.target.select();
    _selectedCyId = id;
    _tapTimerId   = id;

    _tapTimer = setTimeout(() => {
        _tapTimer   = null;
        _tapTimerId = null;
        // Tap simples confirmado — só seleção visual, sem sidebar
    }, TAP_DELAY);
    });
  }

  /* ═══════════════════════════════════════════════
     BIND — Store observer
  ════════════════════════════════════════════════ */
  function _bindStoreEvents() {
    Store.subscribe((event, payload) => {
      switch (event) {

        case 'node:add':
          cy.add(nodeToElement(payload));
          break;

        case 'node:update': {
          const cyNode = cy.getElementById(payload.id);
          if (!cyNode.length) break;
          cyNode.data({
            type:     payload.type,
            status:   payload.status,
            priority: payload.priority,
            label:    buildLabel(payload),
            title:    payload.title,
          });
          // Reaplica classe de tipo se mudou
          cy.nodes().removeClass('type-problema type-solucao type-agrupador');
          cyNode.addClass(`type-${payload.type}`);
          break;
        }

        case 'node:delete': {
            const cyNode = cy.getElementById(payload.id);
            if (cyNode && cyNode.length) {
                cyNode.remove();
            }
            payload.removedEdges.forEach(e => {
                const cyEdge = cy.getElementById(e.id);
                if (cyEdge && cyEdge.length) cyEdge.remove();
            });
            _selectedCyId = null;
            break;
        }
        case 'edge:add':
          cy.add(edgeToElement(payload));
          break;

        case 'edge:delete': {
            const cyEdge = cy.getElementById(payload.id);
            if (cyEdge && cyEdge.length) cyEdge.remove();
            break;
        }
        case 'selection:change':
          cy.nodes().unselect();
          if (payload) {
            const n = cy.getElementById(payload);
            if (n.length) n.select();
          }
          break;

        case 'filter:change':
          applyFilter();
          break;

        case 'io:import':
          // Rebuild completo do grafo
          cy.elements().remove();
          const snap = Store.getSnapshot();
          cy.add([
            ...snap.nodes.map(nodeToElement),
            ...snap.edges.map(edgeToElement),
          ]);
          cy.fit(undefined, 60);
          break;

        case 'store:reset':
          cy.elements().remove();
          break;
        case 'display:nodeMeta':
            // Re-renderiza labels de todos os nós
            cy.nodes().forEach(n => {
                const node = Store.getNode(n.id());
                if (node) n.data('label', buildLabel(node));
            });
            break;
      }
    });
  }

    function _deleteSelected() {
        // Prioriza seleção cy direta (_selectedCyId) ou cy.$(':selected')
        const selected = cy.$(':selected');
        const nodeIds = selected.nodes().map(n => n.id());
        const edgeIds = selected.edges().map(e => e.id());

        // Inclui _selectedCyId se não estiver já na lista
        if (_selectedCyId && !nodeIds.includes(_selectedCyId)) {
            nodeIds.push(_selectedCyId);
        }

        nodeIds.forEach(id => {
            try { Store.deleteNode(id); } catch (e) { console.warn(e); }
        });
        edgeIds.forEach(id => {
            try { Store.deleteEdge(id); } catch (e) { console.warn(e); }
        });

        _selectedCyId = null;
    }

  /* ═══════════════════════════════════════════════
     BIND — Botões da UI (zoom, layout, delete)
  ════════════════════════════════════════════════ */
  function _bindUIEvents() {

    /* Zoom */
    document.getElementById('zoom-in')
      .addEventListener('click', () => cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: cyCenter() }));

    document.getElementById('zoom-out')
      .addEventListener('click', () => cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: cyCenter() }));

    document.getElementById('zoom-fit')
      .addEventListener('click', () => cy.fit(undefined, 60));

    /* Layout force-directed */
    document.getElementById('btn-layout')
      .addEventListener('click', runForceLayout);

    /* Edge mode buttons */
    document.querySelectorAll('.edge-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.edge;
        startEdgeMode(type);
      });
    });

    /* Cancel edge mode */
    document.getElementById('cancel-edge')
      .addEventListener('click', cancelEdgeMode);

    /* Keyboard shortcuts */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (edgeMode.active) cancelEdgeMode();
        else Store.clearSelection();
      }
        if ((e.key === 'Delete' || e.key === 'Backspace') &&
            document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'TEXTAREA') {
            _deleteSelected();
        }
    });
  }

  /* ═══════════════════════════════════════════════
     EDGE MODE
  ════════════════════════════════════════════════ */
  function startEdgeMode(type) {
    edgeMode.active   = true;
    edgeMode.edgeType = type;
    edgeMode.sourceId = null;

    // UI
    const banner = document.getElementById('edge-mode-banner');
    const label  = document.getElementById('edge-mode-label');
    banner.hidden = false;
    label.innerHTML = `Clique no nó de <strong>origem</strong> — tipo: <em>${type}</em>`;

    document.getElementById('canvas-wrap').classList.add('edge-mode');

    // Destaca tools ativa
    document.querySelectorAll('.edge-tool').forEach(b => b.classList.remove('active'));
    document.querySelector(`.edge-tool[data-edge="${type}"]`)?.classList.add('active');
  }

  function cancelEdgeMode() {
    edgeMode.active   = false;
    edgeMode.edgeType = null;
    edgeMode.sourceId = null;

    document.getElementById('edge-mode-banner').hidden = true;
    document.getElementById('canvas-wrap').classList.remove('edge-mode');
    document.querySelectorAll('.edge-tool').forEach(b => b.classList.remove('active'));
    cy.nodes().removeClass('edge-source');
  }

  function _handleEdgeModeClick(nodeId) {
    if (!edgeMode.sourceId) {
      // Primeiro clique: define source
      edgeMode.sourceId = nodeId;
      cy.getElementById(nodeId).addClass('edge-source');

      const label = document.getElementById('edge-mode-label');
      label.innerHTML = `Clique no nó de <strong>destino</strong>`;
      return;
    }

    // Segundo clique: cria aresta
    const source = edgeMode.sourceId;
    const target = nodeId;
    const type   = edgeMode.edgeType;
    const directed = (type !== 'relaciona'); // relaciona = bidirecional por padrão

    try {
      Store.addEdge({ source, target, edgeType: type, directed });
    } catch (err) {
      document.dispatchEvent(
        new CustomEvent('graph:error', { detail: err.message })
      );
    } finally {
      cancelEdgeMode();
    }
  }

  /* ═══════════════════════════════════════════════
     FILTER — dim / show nós e arestas
  ════════════════════════════════════════════════ */
  function applyFilter() {
    const visible = Store.getVisibleNodeIds();  // Set<string>

    cy.batch(() => {
      cy.nodes().forEach(n => {
        if (visible.has(n.id())) {
          n.removeClass('dimmed');
          n.style('display', 'element');
        } else {
          n.addClass('dimmed');
          // Opcional: ocultar completamente (comentar para manter dimmed)
          n.style('display', 'none');
        }
      });

      // Arestas: visível só se ambos os nós forem visíveis
      cy.edges().forEach(e => {
        const srcOk = visible.has(e.source().id());
        const tgtOk = visible.has(e.target().id());
        if (srcOk && tgtOk) {
          e.removeClass('dimmed');
          e.style('display', 'element');
        } else {
          e.addClass('dimmed');
          e.style('display', 'none');
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════
     LAYOUT FORCE-DIRECTED
  ════════════════════════════════════════════════ */
  function runForceLayout() {
    const visible = cy.nodes(':visible');
    if (!visible.length) return;

    const layout = visible.layout({
      name:            'cose',
      animate:         true,
      animationDuration: 600,
      animationEasing: 'ease-in-out-cubic',
      fit:             true,
      padding:         60,
      nodeRepulsion:   () => 8000,
      nodeOverlap:     20,
      idealEdgeLength: () => 120,
      edgeElasticity:  () => 100,
      nestingFactor:   5,
      gravity:         80,
      numIter:         1000,
      initialTemp:     200,
      coolingFactor:   0.95,
      minTemp:         1.0,
      randomize:       false,
    });

    layout.on('layoutstop', () => {
      // Sync posições de volta pro Store
      cy.nodes().forEach(n => {
        const pos = n.position();
        Store.updateNodePosition(n.id(), pos.x, pos.y);
      });
    });

    layout.run();
  }

  /* ═══════════════════════════════════════════════
     HELPERS PÚBLICOS
  ════════════════════════════════════════════════ */

  function cyCenter() {
    const container = document.getElementById('cy');
    return {
      x: container.clientWidth  / 2,
      y: container.clientHeight / 2,
    };
  }

  /** Adiciona nó no centro do viewport atual */
  function addNodeAtCenter(type) {
    const center = cy.extent();
    const x = (center.x1 + center.x2) / 2 + (Math.random() - 0.5) * 80;
    const y = (center.y1 + center.y2) / 2 + (Math.random() - 0.5) * 80;
    return Store.addNode({ type, x, y });
  }

  /** Focus + flash num nó pelo id */
  function focusNode(id) {
    const n = cy.getElementById(id);
    if (!n.length) return;
    cy.animate({
      center: { eles: n },
      zoom: Math.max(cy.zoom(), 1),
      duration: 350,
      easing: 'ease-in-out-cubic',
    });
    n.flashClass('hover', 600);
  }

  /** Retorna instância cy (debug / main.js) */
  function getInstance() { return cy; }

  /* ─── API pública ─────────────────────────────── */
  return {
    init,
    addNodeAtCenter,
    applyFilter,
    runForceLayout,
    focusNode,
    syncTheme,
    cancelEdgeMode,
    getInstance,
    getSelectedCyId: () => _selectedCyId,
  };

})();