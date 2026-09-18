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
  let _mouseMoving = false;
  let _moveCheckTimer = null;

  function init(){
    document.addEventListener('mousemove', e => {
      const dx = e.clientX - _lastMousePos.x;
      const dy = e.clientY - _lastMousePos.y;
      if(Math.hypot(dx, dy) > 2){
        _mouseMoving = true;
        clearTimeout(_moveCheckTimer);
        _moveCheckTimer = setTimeout(() => { _mouseMoving = false; }, 120);
      }
      _lastMousePos = { x: e.clientX, y: e.clientY };
    }, { passive: true });
  }

  function activate(cy, nodeId, inbound){
    clearClasses(cy);
    _focusActive = true;
    _focusNodeId = nodeId;

    const root = cy.getElementById(nodeId);
    if(!root.length) return;
    const edges = inbound ? root.incomers('edge') : root.outgoers('edge');
    const neighbors = inbound ? root.incomers('node') : root.outgoers('node');
    const highlighted = root.union(edges).union(neighbors);
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
      if(_mouseMoving || grabbed) return;
      const inbound = window._shiftHeld === true;
      activate(cy, nodeId, inbound);
    }, FOCUS_DELAY);
  }

  function onNodeMouseOut(cy){
    clearTimeout(_focusTimer);
    clear(cy);
  }

  function getLastMousePos(){ return { ..._lastMousePos }; }
  function isFocusActive(){ return _focusActive; }
  function getFocusNodeId(){ return _focusNodeId; }

  return { init, activate, clear, clearClasses, onNodeMouseOver, onNodeMouseOut, getLastMousePos, isFocusActive, getFocusNodeId };
})();
