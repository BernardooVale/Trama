/**
 * StoreHistory — Trama
 * Gerencia histórico de alterações com snapshots atômicos e suporte a transações em lote.
 */
const StoreHistory = (() => {
  const MAX_UNDO = 50;
  const undoStack = [];
  const redoStack = [];
  let _isBatching = false;

  function isBatching(){
    return _isBatching;
  }

  function record(activeTab){
    if(_isBatching || !activeTab) return;
    const snapshot = {
      tabId: activeTab.id,
      nodes: activeTab.nodes.map(n => ({ ...n, tags: [...n.tags] })),
      edges: activeTab.edges.map(e => ({ ...e })),
    };
    undoStack.push(snapshot);
    if(undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  }

  function batch(fn, activeTabGetter){
    if(_isBatching){
      fn();
      return;
    }
    _isBatching = true;
    const tab = activeTabGetter ? activeTabGetter() : null;
    if(tab) record(tab);
    try {
      fn();
    } finally {
      _isBatching = false;
    }
  }

  function canUndo(){
    return undoStack.length > 0;
  }

  function canRedo(){
    return redoStack.length > 0;
  }

  function undo(activeTab){
    if(!canUndo() || !activeTab) return null;
    const currentSnapshot = {
      tabId: activeTab.id,
      nodes: activeTab.nodes.map(n => ({ ...n, tags: [...n.tags] })),
      edges: activeTab.edges.map(e => ({ ...e })),
    };
    redoStack.push(currentSnapshot);
    if(redoStack.length > MAX_UNDO) redoStack.shift();
    return undoStack.pop() || null;
  }

  function redo(activeTab){
    if(!canRedo() || !activeTab) return null;
    const currentSnapshot = {
      tabId: activeTab.id,
      nodes: activeTab.nodes.map(n => ({ ...n, tags: [...n.tags] })),
      edges: activeTab.edges.map(e => ({ ...e })),
    };
    undoStack.push(currentSnapshot);
    if(undoStack.length > MAX_UNDO) undoStack.shift();
    return redoStack.pop() || null;
  }

  function pop(){
    return undoStack.pop() || null;
  }

  function clear(){
    undoStack.length = 0;
    redoStack.length = 0;
  }

  return { isBatching, record, batch, canUndo, canRedo, undo, redo, pop, clear };
})();
