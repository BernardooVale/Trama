/**
 * GraphStyles — Trama
 * Paleta de cores, estilos visuais e sincronização de tema para o Cytoscape.
 * Design refinado, acabamento fosco e descansado para os olhos (zero neon).
 */
const GraphStyles = (() => {
  const C = {
    node: {
      problema:  '#cf6660', // Terracota / Coral mate
      solucao:   '#439775', // Sálvia suave
      agrupador: '#4f8ab5', // Azul aço calmo
      neutro:    '#7d8794', // Ardósia neutro
      subgrafo:  '#9172bc', // Ametista suave
      texto:     '#c9904c', // Ocre / Âmbar mate
    },
    nodeBg: {
      problema:               '#241c1e', // Card sólido escuro acolchoado
      solucao:                '#19231f',
      agrupador:              '#1a2128',
      agrupadorParentOpacity: 0.08,
      neutro:                 '#1f2127',
      subgrafo:               '#211c27',
      textoHover:             '#c9904c',
    },
    edge: {
      dependencia: '#c47042', // Terracota quente
      resolve:     '#439775', // Sálvia
      relaciona:   '#69779e', // Ardósia periwinkle
      neutra:      '#7d8794', // Neutro
    },
    accent: '#c07b46', // Cobre artesanal fosco e acolhedor (zero neon)
    border: '#2e333d',
    bg: {
      surface:  '#1b1e23',
      elevated: '#22262d',
      base:     '#14161a',
    },
    text: {
      primary:   '#e1e3e8', // Branco suave, sem ofuscamento
      secondary: '#9297a3',
      muted:     '#636874',
    },
  };

  function syncTheme(cy){
    const light = document.documentElement.dataset.theme === 'light';

    C.border         = light ? '#d3d7de' : '#2e333d';
    C.bg.surface     = light ? '#ffffff' : '#1b1e23';
    C.bg.elevated    = light ? '#f6f7f9' : '#22262d';
    C.bg.base        = light ? '#f0f2f5' : '#14161a';
    C.text.primary   = light ? '#181b20' : '#e1e3e8';
    C.text.secondary = light ? '#474d58' : '#9297a3';
    C.text.muted     = light ? '#717885' : '#636874';
    C.accent         = light ? '#995925' : '#c07b46';

    C.node = light ? {
      problema:  '#b93833',
      solucao:   '#276f52',
      agrupador: '#28678c',
      neutro:    '#535e6c',
      subgrafo:  '#634591',
      texto:     '#995e1e',
    } : {
      problema:  '#cf6660',
      solucao:   '#439775',
      agrupador: '#4f8ab5',
      neutro:    '#7d8794',
      subgrafo:  '#9172bc',
      texto:     '#c9904c',
    };

    C.nodeBg = light ? {
      problema:               '#fdf5f5',
      solucao:                '#f2f8f5',
      agrupador:              '#f2f6fa',
      agrupadorParentOpacity: 0.05,
      neutro:                 '#f5f6f8',
      subgrafo:               '#f7f4fb',
      textoHover:             '#995e1e',
    } : {
      problema:               '#241c1e',
      solucao:                '#19231f',
      agrupador:              '#1a2128',
      agrupadorParentOpacity: 0.08,
      neutro:                 '#1f2127',
      subgrafo:               '#211c27',
      textoHover:             '#c9904c',
    };

    C.edge = light ? {
      dependencia: '#b05728',
      resolve:     '#276f52',
      relaciona:   '#4d5b82',
      neutra:      '#535e6c',
    } : {
      dependencia: '#c47042',
      resolve:     '#439775',
      relaciona:   '#69779e',
      neutra:      '#7d8794',
    };

    if(cy) cy.style(buildStyle());
  }

  function buildStyle(){
    return [
      {
        selector: 'node',
        style: {
          'shape':            'round-rectangle',
          'width':            'label', 'height':'label', 'padding':'15px 20px',
          'background-color': C.bg.elevated,
          'background-opacity': 1,
          'border-width':     2, 'border-color': C.border,
          'color':            C.text.primary,
          'font-family':      'Inter,system-ui,sans-serif',
          'font-size':        '13px', 'font-weight': '600',
          'label':            'data(label)',
          'text-valign':      'center', 'text-halign':'center',
          'text-wrap':        'wrap', 'text-max-width':'135px',
          'min-width':        '100px', 'min-height':'46px',
          'transition-property': 'background-color,border-color,border-width,opacity',
          'transition-duration': '140ms',
        },
      },
      {
        selector: 'node[type="problema"]',
        style: {
          'border-color': C.node.problema, 'border-width': 2,
          'background-color': C.nodeBg.problema,
          'background-opacity': 1,
        },
      },
      {
        selector: 'node[type="solucao"]',
        style: {
          'border-color': C.node.solucao, 'border-width': 2,
          'background-color': C.nodeBg.solucao,
          'background-opacity': 1,
        },
      },
      {
        selector: 'node[type="agrupador"]',
        style: {
          'border-color': C.node.agrupador, 'border-width': 2,
          'border-style': 'dashed',
          'background-color': C.nodeBg.agrupador,
          'background-opacity': 1,
        },
      },
      {
        selector: 'node:parent',
        style: {
          'shape':            'round-rectangle',
          'padding':          30,
          'background-color': C.node.agrupador,
          'background-opacity': C.nodeBg.agrupadorParentOpacity,
          'border-color':     C.node.agrupador,
          'border-width':     2,
          'border-style':     'dashed',
          'border-opacity':   0.85,
          'text-valign':      'top',
          'text-halign':      'center',
          'text-margin-y':    -12,
          'font-size':        '13px',
          'font-weight':      '600',
          'color':            C.text.primary,
          'text-background-color': C.bg.surface,
          'text-background-opacity': 0.95,
          'text-background-padding': '4px',
          'text-background-shape': 'roundrectangle',
          'text-border-color': C.node.agrupador,
          'text-border-width': 1,
          'text-border-style': 'solid',
          'z-index':          0,
        },
      },
      {
        selector: 'node:parent:selected',
        style: {
          'border-color':     C.accent,
          'border-width':     2.5,
          'border-style':     'solid',
          'background-color': C.accent,
          'background-opacity': 0.08,
        },
      },
      {
        selector: 'node[type="neutro"]',
        style: {
          'border-color': C.node.neutro, 'border-width': 2,
          'background-color': C.nodeBg.neutro,
          'background-opacity': 1,
        },
      },
      {
        selector: 'node[type="subgrafo"]',
        style: {
          'border-color': C.node.subgrafo, 'border-width': 2,
          'border-style': 'solid',
          'background-color': C.nodeBg.subgrafo,
          'background-opacity': 1,
        },
      },
      {
        selector: 'node[type="texto"]',
        style: {
          'background-opacity': 0,
          'border-width': 1.5,
          'border-color': 'transparent',
          'border-style': 'dashed',
          'color': C.text.primary,
          'font-size': '13px',
          'font-weight': '600',
        },
      },
      {
        selector: 'node[type="texto"].hover',
        style: {
          'border-color': C.node.texto,
          'border-style': 'dashed',
          'border-width': 1.5,
          'background-color': C.nodeBg.textoHover,
          'background-opacity': 0.10,
        },
      },
      {
        selector: 'node:selected',
        style: {
          'border-width':    3,
          'border-color':    C.accent,
          'shadow-blur':     8,
          'shadow-color':    C.accent,
          'shadow-opacity':  0.25,
          'shadow-offset-x': 0,
          'shadow-offset-y': 0,
        },
      },
      {
        selector: 'node.pulse-highlight',
        style: {
          'border-color':   C.accent,
          'border-width':   3,
          'shadow-blur':    12,
          'shadow-color':   C.accent,
          'shadow-opacity': 0.4,
        },
      },
      {
        selector: 'node.hover',
        style: {
          'shadow-blur':    6,
          'shadow-color':   C.accent,
          'shadow-opacity': 0.15,
          'shadow-offset-x': 0,
          'shadow-offset-y': 0,
        },
      },
      {
        selector: 'node.edge-source',
        style: {
          'border-color':   C.accent,
          'border-width':   2.8,
          'shadow-blur':    8,
          'shadow-color':   C.accent,
          'shadow-opacity': 0.35,
          'shadow-offset-x': 0,
          'shadow-offset-y': 0,
        },
      },
      /* Focus highlights discretos preservando cor do nó */
      {
        selector: 'node.focus-highlight[type="problema"]',
        style: {
          'border-color':   C.node.problema, 'border-width': 2.8,
          'shadow-blur':    8, 'shadow-color': C.node.problema,
          'shadow-opacity': 0.3,
        },
      },
      {
        selector: 'node.focus-highlight[type="solucao"]',
        style: {
          'border-color':   C.node.solucao, 'border-width': 2.8,
          'shadow-blur':    8, 'shadow-color': C.node.solucao,
          'shadow-opacity': 0.3,
        },
      },
      {
        selector: 'node.focus-highlight[type="agrupador"]',
        style: {
          'border-color':   C.node.agrupador, 'border-width': 2.8,
          'shadow-blur':    8, 'shadow-color': C.node.agrupador,
          'shadow-opacity': 0.3,
        },
      },
      {
        selector: 'node.focus-highlight[type="neutro"]',
        style: {
          'border-color':   C.node.neutro, 'border-width': 2.8,
          'shadow-blur':    8, 'shadow-color': C.node.neutro,
          'shadow-opacity': 0.3,
        },
      },
      {
        selector: 'node.focus-highlight[type="subgrafo"]',
        style: {
          'border-color':   C.node.subgrafo, 'border-width': 2.8,
          'shadow-blur':    8, 'shadow-color': C.node.subgrafo,
          'shadow-opacity': 0.3,
        },
      },
      {
        selector: 'node.focus-highlight[type="texto"]',
        style: {
          'border-color':   C.node.texto, 'border-width': 2.5,
          'background-color': C.nodeBg.textoHover,
          'background-opacity': 0.12,
          'shadow-blur':    8, 'shadow-color': C.node.texto,
          'shadow-opacity': 0.25,
        },
      },
      {
        selector: 'node.focus-dim',
        style: { 'opacity': 0.18 },
      },
      /* Focus arestas */
      {
        selector: 'edge.focus-highlight[edgeType="dependencia"]',
        style: { 'opacity': 1, 'width': 2.8, 'line-color': C.edge.dependencia, 'target-arrow-color': C.edge.dependencia, 'source-arrow-color': C.edge.dependencia },
      },
      {
        selector: 'edge.focus-highlight[edgeType="resolve"]',
        style: { 'opacity': 1, 'width': 2.8, 'line-color': C.edge.resolve, 'target-arrow-color': C.edge.resolve, 'source-arrow-color': C.edge.resolve },
      },
      {
        selector: 'edge.focus-highlight[edgeType="relaciona"]',
        style: { 'opacity': 1, 'width': 2.8, 'line-color': C.edge.relaciona, 'target-arrow-color': C.edge.relaciona, 'source-arrow-color': C.edge.relaciona },
      },
      {
        selector: 'edge.focus-highlight[edgeType="neutra"]',
        style: { 'opacity': 1, 'width': 2.8, 'line-color': C.edge.neutra, 'target-arrow-color': C.edge.neutra, 'source-arrow-color': C.edge.neutra },
      },
      {
        selector: 'edge.focus-dim',
        style: { 'opacity': 0.12 },
      },
      /* Filtros */
      { selector: 'node.dimmed', style: { 'opacity': 0.15 } },
      { selector: 'edge.dimmed', style: { 'opacity': 0.10 } },
      /* Arestas */
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': C.border,
          'target-arrow-color': C.border,
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.15,
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '11px',
          'font-weight': '500',
          'font-family': 'Inter,system-ui,sans-serif',
          'color': C.text.primary,
          'text-background-color': C.bg.surface,
          'text-background-opacity': 0.95,
          'text-background-padding': '3px',
          'text-background-shape': 'roundrectangle',
          'text-border-width': 1,
          'text-border-color': C.border,
          'text-border-style': 'solid',
          'text-rotation': 'autorotate',
          'transition-property': 'opacity,width',
          'transition-duration': '140ms',
        },
      },
      {
        selector: 'edge[edgeType="dependencia"]',
        style: {
          'line-color': C.edge.dependencia,
          'target-arrow-color': C.edge.dependencia,
          'source-arrow-color': C.edge.dependencia,
          'line-style': 'dashed',
          'color': C.edge.dependencia,
          'text-border-color': C.edge.dependencia,
        },
      },
      {
        selector: 'edge[edgeType="resolve"]',
        style: {
          'line-color': C.edge.resolve,
          'target-arrow-color': C.edge.resolve,
          'source-arrow-color': C.edge.resolve,
          'color': C.edge.resolve,
          'text-border-color': C.edge.resolve,
        },
      },
      {
        selector: 'edge[edgeType="relaciona"]',
        style: {
          'line-color': C.edge.relaciona,
          'target-arrow-color': C.edge.relaciona,
          'source-arrow-color': C.edge.relaciona,
          'color': C.edge.relaciona,
          'text-border-color': C.edge.relaciona,
        },
      },
      {
        selector: 'edge[edgeType="neutra"]',
        style: {
          'line-color': C.edge.neutra,
          'target-arrow-color': C.edge.neutra,
          'source-arrow-color': C.edge.neutra,
          'color': C.edge.neutra,
          'text-border-color': C.edge.neutra,
        },
      },
      /* Formatos de Curva e Traçado */
      {
        selector: 'edge[curveStyle="straight"]',
        style: {
          'curve-style': 'straight',
        },
      },
      {
        selector: 'edge[curveStyle="bezier"]',
        style: {
          'curve-style': 'bezier',
        },
      },
      {
        selector: 'edge[curveStyle="taxi"]',
        style: {
          'curve-style': 'taxi',
          'taxi-direction': 'data(taxiDirection)',
          'taxi-turn': 'data(taxiTurn)',
          'taxi-turn-min-distance': 10,
        },
      },
      {
        selector: 'edge[curveStyle="unbundled-bezier"]',
        style: {
          'curve-style': 'unbundled-bezier',
          'control-point-distances': 'data(controlPointDistance)',
          'control-point-weights': 'data(controlPointWeight)',
        },
      },
      {
        selector: 'edge[curveStyle="segments"]',
        style: {
          'curve-style': 'segments',
          'segment-distances': 'data(segmentDistance)',
          'segment-weights': 'data(segmentWeight)',
        },
      },
      /* Padrão do Traço (Line Pattern) */
      { selector: 'edge[linePattern="solid"]', style: { 'line-style': 'solid' } },
      { selector: 'edge[linePattern="dashed"]', style: { 'line-style': 'dashed' } },
      { selector: 'edge[linePattern="dotted"]', style: { 'line-style': 'dotted' } },
      /* Direção das Setas (Arrow Direction) */
      { selector: 'edge[arrowDirection="none"]', style: { 'target-arrow-shape': 'none', 'source-arrow-shape': 'none' } },
      { selector: 'edge[arrowDirection="target"]', style: { 'target-arrow-shape': 'triangle', 'source-arrow-shape': 'none' } },
      { selector: 'edge[arrowDirection="both"]', style: { 'target-arrow-shape': 'triangle', 'source-arrow-shape': 'triangle' } },
      {
        selector: 'edge:selected',
        style: {
          'width': 3,
          'overlay-color': C.accent,
          'overlay-padding': 4,
          'overlay-opacity': 0.12,
        },
      },
      {
        selector: 'edge.hover',
        style: {
          'width': 2.5,
          'overlay-opacity': 0.08,
          'overlay-color': C.accent,
          'overlay-padding': 3,
        },
      },
    ];
  }

  return { C, buildStyle, syncTheme };
})();
