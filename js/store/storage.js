/**
 * StoreStorage — Trama
 * Gerencia persistência no localStorage e rotinas de importação/exportação JSON.
 * Suporta múltiplos projetos isolados, v1, v2 e v3
 * (Pastas como bases de dados, abas abertas e pool central de entidades por projeto).
 */
const StoreStorage = (() => {
  const LS_KEY = 'trama_v1';
  const INDEX_KEY = 'trama_projects_index';
  const ACTIVE_KEY = 'trama_active_project_id';
  const PROJ_PREFIX = 'trama_proj_';

  /* ── Multi-Project Index & Metadata ──────────────── */
  function getProjectsList(){
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      if(raw){
        const list = JSON.parse(raw);
        if(Array.isArray(list) && list.length > 0) return list;
      }
      // Se não há índice mas há trama_v1, indexa o projeto existente
      const legacy = localStorage.getItem(LS_KEY);
      if(legacy){
        const snap = JSON.parse(legacy);
        const defaultId = snap.projectId || 'proj_nobiu';
        const defaultName = snap.projectName || 'Nobiu';
        const initialList = [{
          id: defaultId,
          name: defaultName,
          updatedAt: snap.savedAt || Date.now(),
          tabCount: Array.isArray(snap.tabs) ? snap.tabs.length : 1,
          entityCount: snap.entities ? Object.keys(snap.entities).length : 0,
        }];
        localStorage.setItem(INDEX_KEY, JSON.stringify(initialList));
        localStorage.setItem(PROJ_PREFIX + defaultId, legacy);
        localStorage.setItem(ACTIVE_KEY, defaultId);
        return initialList;
      }
      return [];
    } catch(e){
      console.warn('[StoreStorage] getProjectsList:', e);
      return [];
    }
  }

  function saveProjectsList(list){
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(list));
    } catch(e){
      console.warn('[StoreStorage] saveProjectsList:', e);
    }
  }

  function getActiveProjectId(){
    try {
      const activeId = localStorage.getItem(ACTIVE_KEY);
      if(activeId) return activeId;
      const list = getProjectsList();
      if(list.length > 0){
        localStorage.setItem(ACTIVE_KEY, list[0].id);
        return list[0].id;
      }
      return 'proj_nobiu';
    } catch(e){
      return 'proj_nobiu';
    }
  }

  function setActiveProjectId(id){
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch(e){
      console.warn('[StoreStorage] setActiveProjectId:', e);
    }
  }

  /* ── Save & Load Project State ───────────────────── */
  function save(state){
    try {
      const projectId = state.projectId || getActiveProjectId() || 'proj_nobiu';
      const projectName = state.projectName || 'Nobiu';
      const payload = {
        version: 3,
        projectId: projectId,
        projectName: projectName,
        savedAt: Date.now(),
        activeTabId: state.activeTabId,
        openTabIds: state.openTabIds || [],
        folders: state.folders || [],
        entities: state.entities || {},
        tabs: (state.tabs || []).map(t => ({
          id: t.id,
          name: t.name,
          folderId: t.folderId || null,
          nodes: t.nodes,
          edges: t.edges,
        }))
      };

      const jsonStr = JSON.stringify(payload);
      // Salva snapshot específico deste projeto
      localStorage.setItem(PROJ_PREFIX + projectId, jsonStr);
      // Mantém trama_v1 espelhando o projeto ativo para compatibilidade
      localStorage.setItem(LS_KEY, jsonStr);
      localStorage.setItem(ACTIVE_KEY, projectId);

      // Atualiza índice de projetos
      const list = getProjectsList();
      const existingIdx = list.findIndex(p => p.id === projectId);
      const meta = {
        id: projectId,
        name: projectName,
        updatedAt: payload.savedAt,
        tabCount: payload.tabs.length,
        entityCount: Object.keys(payload.entities).length,
      };

      if(existingIdx >= 0){
        list[existingIdx] = meta;
      } else {
        list.push(meta);
      }
      saveProjectsList(list);
    } catch(e){
      console.warn('[StoreStorage] save:', e);
    }
  }

  function loadProject(projectId, nodeDefaultsFn, edgeDefaultsFn){
    try {
      let raw = localStorage.getItem(PROJ_PREFIX + projectId);
      if(!raw && projectId === 'proj_nobiu'){
        raw = localStorage.getItem(LS_KEY);
      }
      if(!raw) return null;
      const snap = JSON.parse(raw);
      const parsed = parseJSONContent(snap, nodeDefaultsFn, edgeDefaultsFn);
      if(parsed){
        parsed.projectId = snap.projectId || projectId;
      }
      return parsed;
    } catch(e){
      console.warn('[StoreStorage] loadProject:', e);
      return null;
    }
  }

  function load(nodeDefaultsFn, edgeDefaultsFn){
    const activeId = getActiveProjectId();
    return loadProject(activeId, nodeDefaultsFn, edgeDefaultsFn);
  }

  function deleteProject(projectId){
    try {
      localStorage.removeItem(PROJ_PREFIX + projectId);
      const list = getProjectsList().filter(p => p.id !== projectId);
      saveProjectsList(list);
      return true;
    } catch(e){
      console.warn('[StoreStorage] deleteProject:', e);
      return false;
    }
  }

  /* ── Export & Import JSON ────────────────────────── */
  let _fileHandle = null;

  async function exportJSON(state, filename = null){
    const name = state.projectName || 'trama';
    const cleanFilename = filename || `${name.toLowerCase().replace(/\s+/g, '_')}.json`;

    const data = {
      version: 3,
      projectId: state.projectId || 'proj_default',
      projectName: state.projectName || 'Nobiu',
      exportedAt: new Date().toISOString(),
      activeTabId: state.activeTabId,
      openTabIds: state.openTabIds || [],
      folders: state.folders || [],
      entities: state.entities || {},
      tabs: (state.tabs || []).map(t => ({
        id: t.id,
        name: t.name,
        folderId: t.folderId || null,
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
            suggestedName: cleanFilename,
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
    a.download = cleanFilename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function parseJSONContent(snap, nodeDefaultsFn, edgeDefaultsFn){
    if(!snap) return null;

    let tabs = [];
    let activeTabId = null;
    let folders = Array.isArray(snap.folders) ? [...snap.folders] : [];
    let entities = (snap.entities && typeof snap.entities === 'object') ? { ...snap.entities } : {};
    const projectName = snap.projectName || 'Nobiu';
    const projectId = snap.projectId || `proj_${Date.now().toString(36)}`;

    // Compatibilidade retroativa com v1 (nodes e edges na raiz)
    if(Array.isArray(snap?.nodes)){
      const tabDefaultId = (typeof TabsManager !== 'undefined') ? TabsManager.tabUid() : `tab_${Date.now()}`;
      tabs = [{
        id: tabDefaultId,
        name: 'Principal',
        folderId: null,
        nodes: snap.nodes.map(n => nodeDefaultsFn(n)),
        edges: (snap.edges ?? []).filter(e => e.source && e.target).map(e => edgeDefaultsFn(e))
      }];
      activeTabId = tabDefaultId;
    }
    // v2 e v3 com array de tabs
    else if(Array.isArray(snap?.tabs) && snap.tabs.length > 0){
      tabs = snap.tabs.map(t => ({
        id: t.id || ((typeof TabsManager !== 'undefined') ? TabsManager.tabUid() : `tab_${Date.now()}`),
        name: t.name || 'Aba',
        folderId: t.folderId || null,
        nodes: (t.nodes || []).map(n => nodeDefaultsFn(n)),
        edges: (t.edges || []).filter(e => e.source && e.target).map(e => edgeDefaultsFn(e))
      }));
      activeTabId = (snap.activeTabId && tabs.some(t => t.id === snap.activeTabId))
        ? snap.activeTabId
        : tabs[0].id;
    } else {
      return null;
    }

    // Sincroniza e garante entidades e pastas
    if(typeof ExplorerManager !== 'undefined'){
      entities = ExplorerManager.syncEntitiesFromTabs(entities, tabs);
      folders = ExplorerManager.ensureDefaultFolder(folders, tabs);
    }

    // Determina abas abertas no topo (openTabIds)
    let openTabIds = Array.isArray(snap.openTabIds)
      ? snap.openTabIds.filter(id => tabs.some(t => t.id === id))
      : tabs.map(t => t.id);

    if(openTabIds.length === 0 && tabs.length > 0){
      openTabIds = [activeTabId || tabs[0].id];
    }

    return { projectId, projectName, tabs, activeTabId, openTabIds, folders, entities };
  }

  function parseImportFile(file, nodeDefaultsFn, edgeDefaultsFn){
    return new Promise((resolve, reject) => {
      if(!file){
        return reject(new Error('Use um arquivo .json válido exportado pelo Trama.'));
      }
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const snap = JSON.parse(e.target.result);
          const parsed = parseJSONContent(snap, nodeDefaultsFn, edgeDefaultsFn);
          if(!parsed){
            return reject(new Error('Estrutura do arquivo JSON inválida para o Trama.'));
          }
          resolve(parsed);
        } catch(err){
          reject(new Error('Não foi possível ler o arquivo JSON selecionado.'));
        }
      };
      reader.onerror = () => reject(new Error('Falha na leitura do arquivo pelo navegador.'));
      reader.readAsText(file);
    });
  }

  return {
    save,
    load,
    loadProject,
    deleteProject,
    getProjectsList,
    saveProjectsList,
    getActiveProjectId,
    setActiveProjectId,
    exportJSON,
    parseJSONContent,
    parseImportFile
  };
})();
