/**
 * GraphEdgeMode — Trama
 * Gerencia o modo interativo de criação de arestas na interface e no Cytoscape.
 */
const GraphEdgeMode = (() => {
  const edgeMode = { active: false, edgeType: null, sourceId: null };

  function isActive(){
    return edgeMode.active;
  }

  function getEdgeType(){
    return edgeMode.edgeType;
  }

  function start(type){
    edgeMode.active = true;
    edgeMode.edgeType = type;
    edgeMode.sourceId = null;

    const banner = document.getElementById('edge-mode-banner');
    if(banner) banner.hidden = false;
    const label = document.getElementById('edge-mode-label');
    if(label) label.innerHTML = `Clique no vértice de <strong>origem</strong> — <em>${type}</em>`;

    document.getElementById('canvas-wrap')?.classList.add('edge-mode');
    document.querySelectorAll('.edge-tool').forEach(b => b.classList.remove('active'));
    document.querySelector(`.edge-tool[data-edge="${type}"]`)?.classList.add('active');
  }

  function cancel(cy){
    edgeMode.active = false;
    edgeMode.edgeType = null;
    edgeMode.sourceId = null;

    const banner = document.getElementById('edge-mode-banner');
    if(banner) banner.hidden = true;
    document.getElementById('canvas-wrap')?.classList.remove('edge-mode');
    document.querySelectorAll('.edge-tool').forEach(b => b.classList.remove('active'));
    if(cy) cy.nodes().removeClass('edge-source');
  }

  function handleClick(cy, id){
    if(!edgeMode.sourceId){
      edgeMode.sourceId = id;
      if(cy) cy.getElementById(id).addClass('edge-source');
      const label = document.getElementById('edge-mode-label');
      if(label) label.innerHTML = `Clique no vértice de <strong>destino</strong>`;
      return;
    }

    const directed = true;
    try {
      const newEdge = Store.addEdge({
        source: edgeMode.sourceId,
        target: id,
        edgeType: edgeMode.edgeType,
        directed
      });
      if(newEdge){
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('graph:edgeSelected', {
            detail: { edgeId: newEdge.id, isNew: true }
          }));
        }, 60);
      }
    } catch(err){
      document.dispatchEvent(new CustomEvent('graph:error', { detail: err.message }));
    } finally {
      cancel(cy);
    }
  }

  function startFromContext(cy, type, sourceId){
    start(type);
    handleClick(cy, sourceId);
  }

  return { isActive, getEdgeType, start, cancel, handleClick, startFromContext };
})();
