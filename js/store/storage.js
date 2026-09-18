/**
 * StoreStorage — Trama
 * Gerencia persistência no localStorage e rotinas de importação/exportação JSON.
 */
const StoreStorage = (() => {
  const LS_KEY = 'trama_v1';

  function save(state){
    try {
      const payload = {
        version: 2,
        savedAt: Date.now(),
        activeTabId: state.activeTabId,
        tabs: state.tabs.map(t => ({
          id: t.id,
          name: t.name,
          nodes: t.nodes,
          edges: t.edges,
        }))
      };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch(e){
      console.warn('[StoreStorage] save:', e);
    }
  }

  function load(nodeDefaultsFn, edgeDefaultsFn){
    try {
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return null;
      const snap = JSON.parse(raw);

      // Compatibilidade retroativa com v1 (nodes e edges na raiz)
      if(Array.isArray(snap?.nodes)){
        const tabDefaultId = TabsManager.tabUid();
        return {
          tabs: [{
            id: tabDefaultId,
            name: 'Principal',
            nodes: snap.nodes.map(n => nodeDefaultsFn(n)),
            edges: (snap.edges ?? []).filter(e => e.source && e.target).map(e => edgeDefaultsFn(e))
          }],
          activeTabId: tabDefaultId
        };
      }

      // v2 com array de tabs
      if(Array.isArray(snap?.tabs) && snap.tabs.length > 0){
        const tabs = snap.tabs.map(t => ({
          id: t.id || TabsManager.tabUid(),
          name: t.name || 'Aba',
          nodes: (t.nodes || []).map(n => nodeDefaultsFn(n)),
          edges: (t.edges || []).filter(e => e.source && e.target).map(e => edgeDefaultsFn(e))
        }));
        const activeTabId = (snap.activeTabId && tabs.some(t => t.id === snap.activeTabId))
          ? snap.activeTabId
          : tabs[0].id;
        return { tabs, activeTabId };
      }

      return null;
    } catch(e){
      console.warn('[StoreStorage] load:', e);
      return null;
    }
  }

  function exportJSON(state){
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      activeTabId: state.activeTabId,
      tabs: state.tabs.map(t => ({
        id: t.id,
        name: t.name,
        nodes: t.nodes,
        edges: t.edges,
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trama_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseImportFile(file, nodeDefaultsFn, edgeDefaultsFn){
    return new Promise((resolve, reject) => {
      if(!file || file.type !== 'application/json'){
        return reject(new Error('Use um arquivo .json válido exportado pelo Trama.'));
      }
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const snap = JSON.parse(evt.target.result);
          if(Array.isArray(snap?.nodes)){
            const tabDefaultId = TabsManager.tabUid();
            resolve({
              tabs: [{
                id: tabDefaultId,
                name: 'Principal',
                nodes: snap.nodes.map(n => nodeDefaultsFn(n)),
                edges: (snap.edges ?? []).filter(e => e.source && e.target).map(e => edgeDefaultsFn(e))
              }],
              activeTabId: tabDefaultId
            });
          } else if(Array.isArray(snap?.tabs) && snap.tabs.length > 0){
            const tabs = snap.tabs.map(t => ({
              id: t.id || TabsManager.tabUid(),
              name: t.name || 'Aba',
              nodes: (t.nodes || []).map(n => nodeDefaultsFn(n)),
              edges: (t.edges || []).filter(e => e.source && e.target).map(e => edgeDefaultsFn(e))
            }));
            const activeTabId = (snap.activeTabId && tabs.some(t => t.id === snap.activeTabId))
              ? snap.activeTabId
              : tabs[0].id;
            resolve({ tabs, activeTabId });
          } else {
            reject(new Error('Formato do arquivo JSON inválido.'));
          }
        } catch(err){
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo JSON.'));
      reader.readAsText(file);
    });
  }

  return { save, load, exportJSON, parseImportFile };
})();
