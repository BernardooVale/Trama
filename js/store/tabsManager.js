/**
 * TabsManager — Trama
 * Gerencia ciclo de vida de abas, prevenção de dependências circulares (DAG) e exclusão em cascata.
 */
const TabsManager = (() => {
  function tabUid(){
    return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
  }

  function getTabs(tabs){
    return tabs.map((t, idx) => ({ id: t.id, name: t.name, isMain: idx === 0 }));
  }

  function canImportTab(tabs, targetTabId, candidateTabId){
    if(!targetTabId || !candidateTabId) return false;
    if(targetTabId === candidateTabId) return false;

    const depMap = new Map();
    tabs.forEach(t => {
      const deps = new Set();
      t.nodes.forEach(n => {
        if(n.type === 'subgrafo' && n.subgraphTabId){
          deps.add(n.subgraphTabId);
        }
      });
      depMap.set(t.id, deps);
    });

    const visited = new Set();
    const queue = [candidateTabId];
    while(queue.length > 0){
      const curr = queue.shift();
      if(curr === targetTabId) return false;
      if(!visited.has(curr)){
        visited.add(curr);
        const nextDeps = depMap.get(curr);
        if(nextDeps){
          for(const dep of nextDeps){
            if(!visited.has(dep)) queue.push(dep);
          }
        }
      }
    }
    return true;
  }

  function getImportableTabs(tabs, targetTabId){
    return tabs.filter(t => canImportTab(tabs, targetTabId, t.id)).map(t => ({ id: t.id, name: t.name }));
  }

  function cascadeDeleteSubgraphs(tabs, deletedTabId){
    tabs.forEach(t => {
      if(t.id === deletedTabId) return;
      const nodesToDelete = t.nodes.filter(n => n.type === 'subgrafo' && n.subgraphTabId === deletedTabId);
      if(nodesToDelete.length > 0){
        const idsToDelete = new Set(nodesToDelete.map(n => n.id));
        t.nodes = t.nodes.filter(n => !idsToDelete.has(n.id));
        t.edges = t.edges.filter(e => !idsToDelete.has(e.source) && !idsToDelete.has(e.target));
      }
    });
  }

  return { tabUid, getTabs, canImportTab, getImportableTabs, cascadeDeleteSubgraphs };
})();
