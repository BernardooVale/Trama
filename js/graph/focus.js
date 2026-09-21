/**
 * GraphFocus — Trama
 * Gerencia o modo foco dinâmico por hover prolongado no Cytoscape.
 */
const GraphFocus = (() => {
  let _focusTimer = null;
  let _focusActive = false;
  let _focusNodeId = null;
  const FOCUS_DELAY = 750;
  let _lastMousePos = { x: 0, y: 0 };
  let _mouseDown = false;

  function init(){
    document.addEventListener('mousemove', e => {
      _lastMousePos = { x: e.clientX, y: e.clientY };
    }, { passive: true });

    document.addEventListener('mousedown', () => {
      _mouseDown = true;
      clearTimeout(_focusTimer);
    }, { passive: true });

    document.addEventListener('mouseup', () => {
      _mouseDown = false;
    }, { passive: true });
  }

  function activate(cy, nodeId, inbound, allPaths){
    clearClasses(cy);
    _focusActive = true;
    _focusNodeId = nodeId;

    const root = cy.getElementById(nodeId);
    if(!root.length) return;

    let highlighted;
    if(allPaths){
      const visitedNodes = new Set([nodeId]);
      const visitedEdges = new Set();
      const queue = [nodeId];

      while(queue.length > 0){
        const currId = queue.shift();
        const currNode = cy.getElementById(currId);
        if(!currNode.length) continue;

        const edges = inbound ? currNode.incomers('edge') : currNode.outgoers('edge');
        edges.forEach(edge => {
          visitedEdges.add(edge.id());
          const nextNode = inbound ? edge.source() : edge.target();
          if(nextNode && nextNode.length){
            const nextId = nextNode.id();
            if(!visitedNodes.has(nextId)){
              visitedNodes.add(nextId);
              queue.push(nextId);
            }
          }
        });
      }

      let elems = root;
      visitedNodes.forEach(id => { elems = elems.union(cy.getElementById(id)); });
      visitedEdges.forEach(id => { elems = elems.union(cy.getElementById(id)); });
      highlighted = elems;
    } else {
      const edges = inbound ? root.incomers('edge') : root.outgoers('edge');
      const neighbors = inbound ? root.incomers('node') : root.outgoers('node');
      highlighted = root.union(edges).union(neighbors);
    }

    const dimmed = cy.elements().difference(highlighted);

    cy.batch(() => {
      highlighted.addClass('focus-highlight');
      dimmed.addClass('focus-dim');
    });

    const hint = document.getElementById('focus-hint');
    if(hint) hint.hidden = false;
  }

  function clearClasses(cy){
    if(cy) cy.batch(() => cy.elements().removeClass('focus-highlight focus-dim'));
  }

  function clear(cy){
    if(!_focusActive) return;
    _focusActive = false;
    _focusNodeId = null;
    clearClasses(cy);
    const hint = document.getElementById('focus-hint');
    if(hint) hint.hidden = true;
  }

  function onNodeMouseOver(cy, nodeId, grabbed){
    clearTimeout(_focusTimer);
    _focusTimer = setTimeout(() => {
      // Ignora foco se houver arrasto de nó, clique/botão pressionado ou modo de aresta ativo
      if(grabbed || _mouseDown) return;
      if(GraphEdgeMode && GraphEdgeMode.isActive()) return;
      const node = cy.getElementById(nodeId);
      if(!node.length || node.grabbed()) return;

      const inbound = window._shiftHeld === true;
      const allPaths = window._ctrlHeld === true;
      activate(cy, nodeId, inbound, allPaths);
    }, FOCUS_DELAY);
  }

  function onNodeMouseOut(cy){
    clearTimeout(_focusTimer);
    clear(cy);
  }

  function cancelTimer(){
    clearTimeout(_focusTimer);
  }

  function getLastMousePos(){ return { ..._lastMousePos }; }
  function isFocusActive(){ return _focusActive; }
  function getFocusNodeId(){ return _focusNodeId; }

  return { init, activate, clear, clearClasses, cancelTimer, onNodeMouseOver, onNodeMouseOut, getLastMousePos, isFocusActive, getFocusNodeId };
})();
