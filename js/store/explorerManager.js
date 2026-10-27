/**
 * ExplorerManager — Trama
 * Gerencia a hierarquia de pastas (bases de dados/módulos), arquivos de grafos
 * e o pool central de entidades únicas ("o dado é único").
 */
const ExplorerManager = (() => {
  function folderUid(){
    return `fld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  /* ── Entity Pool Operations ("o dado é único") ── */

  /**
   * Extrai e sincroniza entidades de todas as abas para o pool único
   * @param {Object} entitiesMap - state.entities { [id]: Entity }
   * @param {Array} tabs - state.tabs
   */
  function syncEntitiesFromTabs(entitiesMap, tabs){
    if(!entitiesMap || typeof entitiesMap !== 'object') entitiesMap = {};
    if(!Array.isArray(tabs)) return entitiesMap;

    tabs.forEach(tab => {
      if(!Array.isArray(tab.nodes)) return;
      tab.nodes.forEach(node => {
        if(!node || !node.id) return;
        if(!entitiesMap[node.id]){
          entitiesMap[node.id] = {
            id: node.id,
            type: node.type || 'neutro',
            title: node.title !== undefined ? node.title : 'Novo vértice',
            description: node.description || '',
            priority: node.priority || 'media',
            tags: Array.isArray(node.tags) ? [...node.tags] : [],
            url: node.url || '',
            createdAt: node.createdAt || Date.now(),
            subgraphTabId: node.subgraphTabId || null,
          };
        } else {
          // Atualiza campos caso o nó da aba possua dados mais recentes
          const ent = entitiesMap[node.id];
          if(node.title !== undefined && !ent.title) ent.title = node.title;
          if(node.description && !ent.description) ent.description = node.description;
          if(node.tags && (!ent.tags || !ent.tags.length)) ent.tags = [...node.tags];
          if(node.url && !ent.url) ent.url = node.url;
        }
      });
    });

    return entitiesMap;
  }

  /**
   * Retorna a entidade canônica mesclada com propriedades posicionais locais do nó
   * @param {Object} entity - Entidade do pool central
   * @param {Object} localNode - Dados posicionais locais (x, y, parentId)
   */
  function mergeNodeWithEntity(entity, localNode = {}){
    if(!entity) return null;
    return {
      id: entity.id,
      type: entity.type || 'neutro',
      title: entity.title !== undefined ? entity.title : 'Vértice',
      description: entity.description || '',
      priority: entity.priority || 'media',
      tags: Array.isArray(entity.tags) ? [...entity.tags] : [],
      url: entity.url || '',
      createdAt: entity.createdAt || localNode.createdAt || Date.now(),
      subgraphTabId: entity.subgraphTabId || null,
      x: localNode.x ?? 300,
      y: localNode.y ?? 200,
      parentId: localNode.parentId ?? null,
    };
  }

  /**
   * Conta em quantos grafos/abas uma entidade está presente
   * @param {Array} tabs - state.tabs
   * @param {string} entityId - ID da entidade
   * @returns {Array<string>} Nomes das abas que usam o dado
   */
  function getEntityUsage(tabs, entityId){
    if(!Array.isArray(tabs) || !entityId) return [];
    const usedIn = [];
    tabs.forEach(tab => {
      if(Array.isArray(tab.nodes) && tab.nodes.some(n => n.id === entityId)){
        usedIn.push({ id: tab.id, name: tab.name });
      }
    });
    return usedIn;
  }

  /* ── Folder Tree Operations ── */

  /**
   * Garante ao menos uma pasta inicial se a lista estiver vazia
   * @param {Array} folders - state.folders
   * @param {Array} tabs - state.tabs
   */
  function ensureDefaultFolder(folders, tabs){
    if(!Array.isArray(folders) || folders.length === 0){
      const rootFolder = {
        id: folderUid(),
        name: 'Bases de Dados',
        parentId: null,
        isExpanded: true,
        createdAt: Date.now(),
      };
      folders = [rootFolder];

      // Atribui abas existentes sem pasta a essa pasta raiz
      if(Array.isArray(tabs)){
        tabs.forEach(tab => {
          if(!tab.folderId) tab.folderId = rootFolder.id;
        });
      }
    }
    return folders;
  }

  /**
   * Cria uma nova pasta
   * @param {Array} folders - state.folders
   * @param {string} name - Nome da pasta
   * @param {string|null} parentId - ID da pasta pai ou null para raiz
   */
  function createFolder(folders, name, parentId = null){
    const folderName = (name && String(name).trim()) ? String(name).trim() : 'Nova Base';
    const newFolder = {
      id: folderUid(),
      name: folderName,
      parentId: parentId || null,
      isExpanded: true,
      createdAt: Date.now(),
    };
    folders.push(newFolder);
    return newFolder;
  }

  /**
   * Renomeia uma pasta
   * @param {Array} folders - state.folders
   * @param {string} folderId - ID da pasta
   * @param {string} newName - Novo nome
   */
  function renameFolder(folders, folderId, newName){
    const folder = folders.find(f => f.id === folderId);
    if(!folder) throw new Error(`Pasta não encontrada: ${folderId}`);
    const name = (newName && String(newName).trim()) ? String(newName).trim() : folder.name;
    folder.name = name;
    return folder;
  }

  /**
   * Exclui uma pasta e gerencia itens filhos (move para raiz ou pai)
   * @param {Array} folders - state.folders
   * @param {Array} tabs - state.tabs
   * @param {string} folderId - ID da pasta a excluir
   */
  function deleteFolder(folders, tabs, folderId){
    const idx = folders.findIndex(f => f.id === folderId);
    if(idx === -1) throw new Error(`Pasta não encontrada: ${folderId}`);
    const target = folders[idx];

    // Realoca subpastas para o pai da pasta deletada
    folders.forEach(f => {
      if(f.parentId === folderId){
        f.parentId = target.parentId;
      }
    });

    // Realoca abas/grafos para o pai da pasta deletada
    tabs.forEach(t => {
      if(t.folderId === folderId){
        t.folderId = target.parentId;
      }
    });

    folders.splice(idx, 1);
  }

  /**
   * Constrói a árvore hierárquica completa para renderização no Explorer
   * @param {Array} folders - state.folders
   * @param {Array} tabs - state.tabs
   * @returns {Array} Nós da árvore na raiz
   */
  function buildTree(folders, tabs){
    const folderMap = new Map();
    folders.forEach(f => {
      folderMap.set(f.id, {
        ...f,
        type: 'folder',
        childrenFolders: [],
        childrenTabs: [],
      });
    });

    // Associa abas às pastas
    const rootTabs = [];
    tabs.forEach(t => {
      const tabItem = {
        id: t.id,
        name: t.name,
        isMain: t.isMain || false,
        folderId: t.folderId || null,
        nodeCount: Array.isArray(t.nodes) ? t.nodes.length : 0,
        edgeCount: Array.isArray(t.edges) ? t.edges.length : 0,
        type: 'tab',
      };
      if(t.folderId && folderMap.has(t.folderId)){
        folderMap.get(t.folderId).childrenTabs.push(tabItem);
      } else {
        rootTabs.push(tabItem);
      }
    });

    // Monta hierarquia de pastas
    const rootFolders = [];
    folderMap.forEach(f => {
      if(f.parentId && folderMap.has(f.parentId)){
        folderMap.get(f.parentId).childrenFolders.push(f);
      } else {
        rootFolders.push(f);
      }
    });

    return { rootFolders, rootTabs, allFolders: Array.from(folderMap.values()) };
  }

  /**
   * Move uma aba ou pasta para outra pasta de destino
   * @param {Array} folders - state.folders
   * @param {Array} tabs - state.tabs
   * @param {'tab'|'folder'} itemType - Tipo do item
   * @param {string} itemId - ID do item
   * @param {string|null} targetFolderId - ID da pasta de destino ou null
   */
  function moveItem(folders, tabs, itemType, itemId, targetFolderId){
    if(itemType === 'tab'){
      const tab = tabs.find(t => t.id === itemId);
      if(tab){
        tab.folderId = targetFolderId;
        return true;
      }
    } else if(itemType === 'folder'){
      if(itemId === targetFolderId) return false;
      // Previne mover pasta para dentro de si mesma ou de seus descendentes
      let curr = targetFolderId;
      while(curr){
        if(curr === itemId) return false; // ciclo detectado
        const parent = folders.find(f => f.id === curr);
        curr = parent ? parent.parentId : null;
      }
      const folder = folders.find(f => f.id === itemId);
      if(folder){
        folder.parentId = targetFolderId;
        return true;
      }
    }
    return false;
  }

  return {
    folderUid,
    syncEntitiesFromTabs,
    mergeNodeWithEntity,
    getEntityUsage,
    ensureDefaultFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    buildTree,
    moveItem,
  };
})();
