/**
 * StoreHistory — Trama
 * Gerencia histórico de alterações com snapshots atômicos e suporte a transações em lote.
 */
const StoreHistory = (() => {
  const MAX_UNDO = 50;
  const undoStack = [];
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

  function pop(){
    return undoStack.pop() || null;
  }

  function clear(){
    undoStack.length = 0;
  }

  return { isBatching, record, batch, canUndo, pop, clear };
})();
