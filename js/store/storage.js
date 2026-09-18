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

  let _fileHandle = null;

  async function exportJSON(state, filename = 'trama.json'){
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
    const jsonContent = JSON.stringify(data, null, 2);

    // Se o navegador suportar File System Access API (Chrome/Edge/Brave)
    if('showSaveFilePicker' in window){
      try {
        if(!_fileHandle){
          _fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Arquivo JSON Trama',
              accept: { 'application/json': ['.json'] },
            }],
          });
        }
        const writable = await _fileHandle.createWritable();
        await writable.write(jsonContent);
        await writable.close();
        return true;
      } catch(err){
        if(err.name === 'AbortError') return false; // usuário cancelou
        console.warn('[StoreStorage] showSaveFilePicker fallback:', err);
      }
    }

    // Fallback padrão de download via elemento HTML <a>
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function parseJSONContent(snap, nodeDefaultsFn, edgeDefaultsFn){
    if(!snap) return null;
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
  }

  function parseImportFile(file, nodeDefaultsFn, edgeDefaultsFn){
    return new Promise((resolve, reject) => {
      if(!file){
        return reject(new Error('Use um arquivo .json válido exportado pelo Trama.'));
      }
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const snap = JSON.parse(evt.target.result);
          const parsed = parseJSONContent(snap, nodeDefaultsFn, edgeDefaultsFn);
          if(parsed) resolve(parsed);
          else reject(new Error('Formato do arquivo JSON inválido.'));
        } catch(err){
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo JSON.'));
      reader.readAsText(file);
    });
  }

  return { save, load, exportJSON, parseImportFile, parseJSONContent };
})();
