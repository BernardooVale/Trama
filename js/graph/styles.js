/**
 * GraphStyles — Trama
 * Paleta de cores, estilos visuais e sincronização de tema para o Cytoscape.
 */
const GraphStyles = (() => {
  const C = {
    node:   { problema:'#d95c55', solucao:'#4a8da0', agrupador:'#76965d', neutro:'#8a8880', subgrafo:'#9d72cf', texto:'#e0a96d' },
    edge:   { dependencia:'#d97d55', resolve:'#4aa078', relaciona:'#7676a0', neutra:'#8a8880' },
    accent: '#d99a55',
    border: '#2e2f2a',
    bg:     { surface:'#181916', elevated:'#21221e' },
    text:   { primary:'#ede9e2', secondary:'#8a8880', muted:'#4a4a45' },
  };

  function syncTheme(cy){
    const light = document.documentElement.dataset.theme === 'light';
    C.border         = light ? '#d8d4ce' : '#2e2f2a';
    C.bg.surface     = light ? '#faf9f6' : '#181916';
    C.bg.elevated    = light ? '#eeecea' : '#21221e';
    C.text.primary   = light ? '#1c1b18' : '#ede9e2';
    C.text.secondary = light ? '#5a5852' : '#8a8880';
    C.text.muted     = light ? '#9a9890' : '#4a4a45';
    if(cy) cy.style(buildStyle());
  }

  function buildStyle(){
    return [
      {
        selector: 'node',
        style: {
          'shape':            'round-rectangle',
          'width':            'label', 'height':'label', 'padding':'16px 20px',
          'background-color': C.bg.elevated,
          'border-width':     1.5, 'border-color': C.border,
          'color':            C.text.primary,
          'font-family':      'Inter,system-ui,sans-serif',
          'font-size':        '12px', 'font-weight': '400',
          'label':            'data(label)',
          'text-valign':      'center', 'text-halign':'center',
          'text-wrap':        'wrap', 'text-max-width':'130px',
          'min-width':        '100px', 'min-height':'46px',
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
        selector: 'node[type="neutro"]',
        style: {
          'border-color': C.node.neutro, 'border-width': 1.5,
          'background-color': `${C.node.neutro}12`,
        },
      },
      {
        selector: 'node[type="subgrafo"]',
        style: {
          'border-color': C.node.subgrafo, 'border-width': 2,
          'border-style': 'solid',
          'background-color': `${C.node.subgrafo}15`,
        },
      },
      {
        selector: 'node[type="texto"]',
        style: {
          'background-opacity': 0,
          'border-width': 1,
          'border-color': 'transparent',
          'border-style': 'dashed',
          'color': C.text.primary,
          'font-size': '13px',
          'font-weight': '500',
        },
      },
      {
        selector: 'node[type="texto"].hover',
        style: {
          'border-color': `${C.node.texto}60`,
          'border-style': 'dashed',
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
      /* Focus highlights preservando cor do nó */
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
        selector: 'node.focus-highlight[type="neutro"]',
        style: {
          'border-color':   C.node.neutro, 'border-width': 2.5,
          'background-color': `${C.node.neutro}28`,
          'shadow-blur':    18, 'shadow-color': C.node.neutro,
          'shadow-opacity': 0.45,'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },
      {
        selector: 'node.focus-highlight[type="subgrafo"]',
        style: {
          'border-color':   C.node.subgrafo, 'border-width': 2.5,
          'background-color': `${C.node.subgrafo}30`,
          'shadow-blur':    18, 'shadow-color': C.node.subgrafo,
          'shadow-opacity': 0.5,'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },
      {
        selector: 'node.focus-highlight[type="texto"]',
        style: {
          'border-color':   C.node.texto, 'border-width': 2.5,
          'background-color': `${C.node.texto}28`,
          'shadow-blur':    18, 'shadow-color': C.node.texto,
          'shadow-opacity': 0.45,'shadow-offset-x':0,'shadow-offset-y':0,
        },
      },
      {
        selector: 'node.focus-dim',
        style: { 'opacity': 0.07 },
      },
      /* Focus arestas */
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
        style: { 'opacity':1,'width':2.5,'line-color':C.edge.relaciona,'target-arrow-color':C.edge.relaciona },
      },
      {
        selector: 'edge.focus-highlight[edgeType="neutra"]',
        style: { 'opacity':1,'width':2.5,'line-color':C.edge.neutra,'target-arrow-color':C.edge.neutra },
      },
      {
        selector: 'edge.focus-dim',
        style: { 'opacity': 0.04 },
      },
      /* Filtros */
      { selector:'node.dimmed', style:{ 'opacity':0.06 } },
      { selector:'edge.dimmed', style:{ 'opacity':0.04 } },
      /* Arestas */
      {
        selector: 'edge',
        style: {
          'width':1.5,'line-color':C.border,
          'target-arrow-color':C.border,'target-arrow-shape':'triangle',
          'arrow-scale':1.0,'curve-style':'bezier',
          'label':'data(label)',
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
          'line-color':C.edge.relaciona,
          'target-arrow-color':C.edge.relaciona,
          'color':C.edge.relaciona,
        },
      },
      {
        selector: 'edge[edgeType="neutra"]',
        style: {
          'line-color':C.edge.neutra,
          'target-arrow-color':C.edge.neutra,
          'color':C.edge.neutra,
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

  return { C, buildStyle, syncTheme };
})();
