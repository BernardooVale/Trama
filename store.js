/**
 * Store — Trama
 * Camada de estado central (Model), orquestrando múltiplos projetos isolados,
 * pastas (módulos), abas abertas, nós, arestas, pool central de entidades
 * escopado por projeto e observadores.
 */
const Store = (() => {
  const NODE_TYPES = ['problema', 'solucao', 'agrupador', 'neutro', 'subgrafo', 'texto'];
  const EDGE_TYPES = ['dependencia', 'resolve', 'relaciona', 'neutra'];
  const PRIORITIES = ['alta', 'media', 'baixa'];
  const CURVE_STYLES = ['bezier', 'straight', 'taxi', 'unbundled-bezier', 'segments'];
  const LINE_PATTERNS = ['default', 'solid', 'dashed', 'dotted'];
  const ARROW_DIRECTIONS = ['target', 'both', 'none'];
  const TAXI_DIRECTIONS = ['auto', 'vertical', 'horizontal'];

  let state = {
    version: 3,
    projectId: 'proj_nobiu',
    projectName: 'Nobiu',
    activeTabId: null,
    openTabIds: [], // IDs das abas abertas na barra superior (estilo VS Code)
    folders: [],   // Array<{ id, name, parentId, isExpanded, createdAt }>
    entities: {},  // { [id]: { id, type, title, description, priority, tags, url, createdAt, subgraphTabId } }
    tabs: [],      // Array<{ id, name, folderId, nodes: [], edges: [] }>
    selectedId: null,
    selectedEdgeId: null,
    showNodeMeta: true,
    filter: {
      text: '',
      type: 'all',
      priority: 'all',
      tags: [],
    },
  };

  const listeners = new Set();
  function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
  function notify(event, payload){ listeners.forEach(fn => fn(event, payload)); }

  /* ── Project Scoping & Multi-Project Management ── */
  function getProjectId(){
    return state.projectId || 'proj_nobiu';
  }

  function getProjectName(){
    return state.projectName || 'Nobiu';
  }

  function setProjectName(name){
    const clean = String(name || 'Projeto').trim();
    state.projectName = clean;
    save();
    notify('project:change', clean);
    notify('project:listChange', getProjectsList());
    return clean;
  }

  function getProjectsList(){
    return StoreStorage.getProjectsList();
  }

  function createProject(name){
    // Salva o projeto atual antes de criar um novo
    save();

    const newId = `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const projName = (name && String(name).trim()) ? String(name).trim() : 'Novo Projeto';

    // Cria estrutura limpa e isolada para o novo projeto
    const rootFolderId = `fld_${Date.now().toString(36)}`;
    const rootFolder = {
      id: rootFolderId,
      name: 'Arquitetura',
      parentId: null,
      isExpanded: true,
      createdAt: Date.now()
    };

    const mainTabId = (typeof TabsManager !== 'undefined') ? TabsManager.tabUid() : `tab_${Date.now()}`;
    const mainTab = {
      id: mainTabId,
      name: 'Principal',
      folderId: rootFolderId,
      nodes: [],
      edges: []
    };

    state.projectId = newId;
    state.projectName = projName;
    state.folders = [rootFolder];
    state.tabs = [mainTab];
    state.openTabIds = [mainTabId];
    state.activeTabId = mainTabId;
    state.entities = {}; // Pool isolado, estritamente vazio para o novo projeto!
    state.selectedId = null;
    state.selectedEdgeId = null;

    StoreStorage.setActiveProjectId(newId);
    save();

    notify('project:switch', { projectId: newId, projectName: state.projectName });
    notify('project:change', state.projectName);
    notify('project:listChange', getProjectsList());
    notify('store:restore', getSnapshot());
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    notify('tabs:switch', { activeTabId: state.activeTabId, tab: getActiveTab() });
    notify('explorer:change', getExplorerTree());
    notify('entities:change', { count: 0 });

    return newId;
  }

  function switchProject(targetProjectId){
    if(!targetProjectId || targetProjectId === state.projectId) return true;

    // Salva o projeto ativo no momento
    save();

    const loaded = StoreStorage.loadProject(targetProjectId, nodeDefaults, edgeDefaults);
    if(!loaded){
      console.warn(`[Store] Não foi possível carregar projeto: ${targetProjectId}`);
      return false;
    }

    state.projectId = loaded.projectId || targetProjectId;
    state.projectName = loaded.projectName || 'Projeto';
    state.tabs = loaded.tabs || [];
    state.activeTabId = loaded.activeTabId || (state.tabs[0]?.id ?? null);
    state.openTabIds = loaded.openTabIds || state.tabs.map(t => t.id);
    state.folders = loaded.folders || [];
    state.entities = loaded.entities || {};
    state.selectedId = null;
    state.selectedEdgeId = null;

    StoreStorage.setActiveProjectId(targetProjectId);
    save();

    notify('project:switch', { projectId: state.projectId, projectName: state.projectName });
    notify('project:change', state.projectName);
    notify('project:listChange', getProjectsList());
    notify('store:restore', getSnapshot());
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    notify('tabs:switch', { activeTabId: state.activeTabId, tab: getActiveTab() });
    notify('explorer:change', getExplorerTree());
    notify('entities:change', { count: Object.keys(state.entities).length });

    return true;
  }

  function deleteProject(targetProjectId){
    const list = getProjectsList();
    if(list.length <= 1){
      throw new Error('Não é possível excluir o único projeto restante.');
    }

    if(targetProjectId === state.projectId){
      const other = list.find(p => p.id !== targetProjectId);
      if(other){
        switchProject(other.id);
      }
    }

    StoreStorage.deleteProject(targetProjectId);
    notify('project:listChange', getProjectsList());
    return true;
  }

  /* ── Tab & Graph Wrappers ───────────────────────── */
  function getTabs(){
    return TabsManager.getTabs(state.tabs);
  }

  function getOpenTabs(){
    if(!Array.isArray(state.openTabIds) || state.openTabIds.length === 0){
      state.openTabIds = state.tabs.map(t => t.id);
    }
    // Filtra apenas as que continuam existindo em state.tabs
    state.openTabIds = state.openTabIds.filter(id => state.tabs.some(t => t.id === id));
    if(state.openTabIds.length === 0 && state.tabs.length > 0){
      state.openTabIds = [state.activeTabId || state.tabs[0].id];
    }
    return state.openTabIds.map(id => {
      const t = state.tabs.find(tab => tab.id === id);
      return t ? { id: t.id, name: t.name, isMain: t.id === state.tabs[0]?.id } : null;
    }).filter(Boolean);
  }

  function getActiveTab(){
    return state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0] || null;
  }

  function getActiveTabId(){
    return state.activeTabId;
  }

  function openTab(tabId){
    if(!state.tabs.some(t => t.id === tabId)) return;
    if(!Array.isArray(state.openTabIds)) state.openTabIds = [];
    if(!state.openTabIds.includes(tabId)){
      state.openTabIds.push(tabId);
    }
    switchTab(tabId);
  }

  function closeTab(tabId){
    if(!Array.isArray(state.openTabIds)) return;
    const idx = state.openTabIds.indexOf(tabId);
    if(idx === -1) return;
    state.openTabIds.splice(idx, 1);

    // Se fechou a aba ativa, alterna para a aba adjacente
    if(state.activeTabId === tabId){
      if(state.openTabIds.length > 0){
        const nextId = state.openTabIds[Math.max(0, idx - 1)] || state.openTabIds[0];
        state.activeTabId = nextId;
      } else {
        const fallback = state.tabs[0];
        if(fallback){
          state.openTabIds = [fallback.id];
          state.activeTabId = fallback.id;
        } else {
          state.activeTabId = null;
        }
      }
    }

    state.selectedId = null;
    state.selectedEdgeId = null;
    save();
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    notify('tabs:switch', { activeTabId: state.activeTabId, tab: getActiveTab() });
    notify('explorer:change', getExplorerTree());
  }

  function closeOtherTabs(keepTabId){
    state.openTabIds = [keepTabId];
    switchTab(keepTabId);
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
  }

  function closeAllTabs(){
    const mainTab = state.tabs[0];
    if(mainTab){
      state.openTabIds = [mainTab.id];
      switchTab(mainTab.id);
      notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    }
  }

  function createTab(name, folderId = null){
    const tabName = (name && String(name).trim()) ? String(name).trim() : `Grafo ${state.tabs.length + 1}`;
    if(!folderId){
      const active = getActiveTab();
      folderId = active?.folderId || (state.folders[0]?.id ?? null);
    }
    const newTab = {
      id: TabsManager.tabUid(),
      name: tabName,
      folderId: folderId,
      nodes: [],
      edges: []
    };
    state.tabs.push(newTab);
    if(!Array.isArray(state.openTabIds)) state.openTabIds = [];
    state.openTabIds.push(newTab.id);
    switchTab(newTab.id);
    save();
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    notify('explorer:change', getExplorerTree());
    return newTab;
  }

  function renameTab(tabId, newName){
    const tab = state.tabs.find(t => t.id === tabId);
    if(!tab) throw new Error(`Aba não encontrada: ${tabId}`);
    const name = (newName && String(newName).trim()) ? String(newName).trim() : tab.name;
    tab.name = name;

    // Notifica nós de subgrafo que dependem desta aba
    state.tabs.forEach(t => {
      t.nodes.forEach(n => {
        if(n.type === 'subgrafo' && n.subgraphTabId === tabId){
          notify('node:update', n);
        }
      });
    });

    save();
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    notify('explorer:change', getExplorerTree());
    return tab;
  }

  function switchTab(tabId){
    const tab = state.tabs.find(t => t.id === tabId);
    if(!tab) return;
    if(!Array.isArray(state.openTabIds)) state.openTabIds = [];
    if(!state.openTabIds.includes(tabId)){
      state.openTabIds.push(tabId);
    }
    state.activeTabId = tabId;
    state.selectedId = null;
    state.selectedEdgeId = null;
    save();
    notify('tabs:switch', { activeTabId: tabId, tab });
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    notify('explorer:change', getExplorerTree());
  }

  function deleteTab(tabId){
    if(state.tabs.length <= 1){
      throw new Error('Não é possível excluir o único arquivo do projeto.');
    }
    const idx = state.tabs.findIndex(t => t.id === tabId);
    if(idx === -1) throw new Error(`Arquivo não encontrado: ${tabId}`);
    if(idx === 0){
      throw new Error('O arquivo principal é fixo e não pode ser excluído.');
    }

    TabsManager.cascadeDeleteSubgraphs(state.tabs, tabId);
    state.tabs.splice(idx, 1);

    if(Array.isArray(state.openTabIds)){
      const oIdx = state.openTabIds.indexOf(tabId);
      if(oIdx !== -1) state.openTabIds.splice(oIdx, 1);
    }

    if(state.activeTabId === tabId){
      const nextTab = (state.openTabIds && state.openTabIds.length > 0)
        ? state.tabs.find(t => t.id === state.openTabIds[0])
        : (state.tabs[Math.max(0, idx - 1)] || state.tabs[0]);
      state.activeTabId = nextTab.id;
    }
    state.selectedId = null;
    state.selectedEdgeId = null;
    save();
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    notify('tabs:switch', { activeTabId: state.activeTabId, tab: getActiveTab() });
    notify('explorer:change', getExplorerTree());
  }

  function isTabEmpty(tabId){
    const tab = state.tabs.find(t => t.id === tabId);
    if(!tab) return true;
    return (!tab.nodes || tab.nodes.length === 0) && (!tab.edges || tab.edges.length === 0);
  }

  function canImportTab(targetTabId, candidateTabId){
    return TabsManager.canImportTab(state.tabs, targetTabId, candidateTabId);
  }

  function getImportableTabs(targetTabId = state.activeTabId){
    return TabsManager.getImportableTabs(state.tabs, targetTabId);
  }

  /* ── Explorer (Pastas como Módulos do Projeto) ─── */
  function getFolders(){
    return state.folders || [];
  }

  function getFolder(folderId){
    return (state.folders || []).find(f => f.id === folderId) || null;
  }

  function createFolder(name, parentId = null){
    const newFolder = ExplorerManager.createFolder(state.folders, name, parentId);
    save();
    notify('explorer:change', getExplorerTree());
    return newFolder;
  }

  function renameFolder(folderId, newName){
    const folder = ExplorerManager.renameFolder(state.folders, folderId, newName);
    save();
    notify('explorer:change', getExplorerTree());
    return folder;
  }

  function deleteFolder(folderId){
    ExplorerManager.deleteFolder(state.folders, state.tabs, folderId);
    save();
    notify('explorer:change', getExplorerTree());
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
  }

  function toggleFolderExpand(folderId){
    const folder = (state.folders || []).find(f => f.id === folderId);
    if(folder){
      folder.isExpanded = !folder.isExpanded;
      save();
      notify('explorer:change', getExplorerTree());
    }
  }

  function moveItem(itemType, itemId, targetFolderId){
    const ok = ExplorerManager.moveItem(state.folders, state.tabs, itemType, itemId, targetFolderId);
    if(ok){
      save();
      notify('explorer:change', getExplorerTree());
      notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    }
    return ok;
  }

  function getExplorerTree(){
    return ExplorerManager.buildTree(state.folders, state.tabs);
  }

  /* ── Pool de Entidades Únicas do Projeto ───────── */
  function getEntities(){
    return { ...state.entities };
  }

  function getEntity(id){
    return state.entities[id] || null;
  }

  function getEntitiesList(){
    return Object.values(state.entities).map(ent => ({
      ...ent,
      usedIn: ExplorerManager.getEntityUsage(state.tabs, ent.id),
    }));
  }

  function registerEntity(ent){
    if(!ent || !ent.id) return;
    state.entities[ent.id] = {
      id: ent.id,
      type: ent.type || 'neutro',
      title: ent.title !== undefined ? String(ent.title) : 'Novo vértice',
      description: ent.description ? String(ent.description) : '',
      priority: ent.priority || 'media',
      tags: Array.isArray(ent.tags) ? [...ent.tags] : [],
      url: ent.url ? String(ent.url) : '',
      createdAt: ent.createdAt || Date.now(),
      subgraphTabId: ent.subgraphTabId || null,
    };
  }

  function addExistingEntityToTab(entityId, coords = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhum grafo ativo.');
    const entity = state.entities[entityId];
    if(!entity) throw new Error(`Entidade não encontrada no projeto: ${entityId}`);

    const existing = tab.nodes.find(n => n.id === entityId);
    if(existing){
      selectNode(existing.id);
      return existing;
    }

    recordHistory();
    const nodeInstance = {
      ...entity,
      tags: [...entity.tags],
      x: coords.x ?? Math.round(300 + Math.random() * 200),
      y: coords.y ?? Math.round(200 + Math.random() * 200),
      parentId: coords.parentId || null,
    };
    tab.nodes.push(nodeInstance);
    save();
    notify('node:add', nodeInstance);
    notify('entities:change', { count: Object.keys(state.entities).length });
    return nodeInstance;
  }

  function deleteEntityGlobal(id){
    recordHistory();
    state.tabs.forEach(t => {
      t.nodes.forEach(n => {
        if(n.parentId === id) n.parentId = null;
      });
      t.nodes = t.nodes.filter(n => n.id !== id);
      t.edges = t.edges.filter(e => e.source !== id && e.target !== id);
    });
    delete state.entities[id];
    if(state.selectedId === id) state.selectedId = null;
    save();
    notify('node:delete', { id, global: true });
    notify('entities:change', { count: Object.keys(state.entities).length });
    return id;
  }

  /* ── History Wrappers ──────────────────────────── */
  function recordHistory(){
    StoreHistory.record(getActiveTab());
  }

  function batch(fn){
    StoreHistory.batch(fn, getActiveTab);
  }

  function canUndo(){
    return StoreHistory.canUndo();
  }

  function canRedo(){
    return StoreHistory.canRedo();
  }

  function undo(){
    const prev = StoreHistory.undo(getActiveTab());
    if(!prev) return false;

    let targetTab = state.tabs.find(t => t.id === prev.tabId);
    if(!targetTab){
      targetTab = getActiveTab();
    } else if(state.activeTabId !== prev.tabId){
      switchTab(prev.tabId);
    }
    targetTab.nodes = prev.nodes.map(n => nodeDefaults(n));
    targetTab.edges = (prev.edges ?? []).filter(e => e.source && e.target).map(e => edgeDefaults(e));

    if(state.selectedId && !targetTab.nodes.some(n => n.id === state.selectedId)){
      state.selectedId = null;
    }
    if(state.selectedEdgeId && !targetTab.edges.some(e => e.id === state.selectedEdgeId)){
      state.selectedEdgeId = null;
    }
    save();
    notify('store:restore', getSnapshot());
    return true;
  }

  function redo(){
    const next = StoreHistory.redo(getActiveTab());
    if(!next) return false;

    let targetTab = state.tabs.find(t => t.id === next.tabId);
    if(!targetTab){
      targetTab = getActiveTab();
    } else if(state.activeTabId !== next.tabId){
      switchTab(next.tabId);
    }
    targetTab.nodes = next.nodes.map(n => nodeDefaults(n));
    targetTab.edges = (next.edges ?? []).filter(e => e.source && e.target).map(e => edgeDefaults(e));

    if(state.selectedId && !targetTab.nodes.some(n => n.id === state.selectedId)){
      state.selectedId = null;
    }
    if(state.selectedEdgeId && !targetTab.edges.some(e => e.id === state.selectedEdgeId)){
      state.selectedEdgeId = null;
    }
    save();
    notify('store:restore', getSnapshot());
    return true;
  }

  /* ── Defaults & IDs ────────────────────────────── */
  function uid(){ return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`; }
  function edgeUid(){ return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`; }

  function nodeDefaults(p = {}){
    const id = p.id ?? uid();
    const existingEnt = state.entities ? state.entities[id] : null;

    return {
      id:            id,
      type:          p.type          ?? (existingEnt?.type ?? 'neutro'),
      title:         p.title !== undefined ? p.title : (existingEnt?.title ?? (p.type === 'subgrafo' && p.subgraphTabId ? (state.tabs.find(t => t.id === p.subgraphTabId)?.name || 'Subgrafo') : (p.type === 'texto' ? 'Texto' : (p.type === 'agrupador' ? 'Contêiner' : 'Novo vértice')))),
      description:   p.description   ?? (existingEnt?.description ?? ''),
      priority:      p.priority      ?? (existingEnt?.priority ?? 'media'),
      tags:          Array.isArray(p.tags) ? [...p.tags] : (existingEnt ? [...existingEnt.tags] : []),
      url:           p.url           ?? (existingEnt?.url ?? ''),
      parentId:      p.parentId      ?? null,
      x:             p.x             ?? Math.round(300 + Math.random()*400),
      y:             p.y             ?? Math.round(200 + Math.random()*300),
      createdAt:     p.createdAt     ?? (existingEnt?.createdAt ?? Date.now()),
      subgraphTabId: p.subgraphTabId ?? (existingEnt?.subgraphTabId ?? null),
    };
  }

  function edgeDefaults(p = {}){
    return {
      id:                   p.id                   ?? edgeUid(),
      source:               p.source,
      target:               p.target,
      edgeType:             p.edgeType             ?? 'neutra',
      label:                p.label !== undefined ? p.label : '',
      directed:             p.directed             ?? true,
      curveStyle:           p.curveStyle           ?? 'bezier',
      controlPointDistance: p.controlPointDistance !== undefined ? Number(p.controlPointDistance) : 40,
      controlPointWeight:   p.controlPointWeight   !== undefined ? Number(p.controlPointWeight) : 0.5,
      segmentDistance:      p.segmentDistance      !== undefined ? Number(p.segmentDistance) : 40,
      segmentWeight:        p.segmentWeight        !== undefined ? Number(p.segmentWeight) : 0.5,
      taxiDirection:        p.taxiDirection        ?? 'auto',
      taxiTurn:             p.taxiTurn             ?? '50%',
      linePattern:          p.linePattern          ?? 'default',
      arrowDirection:       p.arrowDirection       ?? (p.directed === false ? 'none' : 'target'),
    };
  }

  /* ── Nodes CRUD (Sincronizado com Pool de Entidades do Projeto) ── */
  function addNode(partial = {}, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhum grafo ativo.');
    if(partial.type === 'subgrafo' && partial.subgraphTabId){
      if(!canImportTab(tab.id, partial.subgraphTabId)){
        throw new Error('Importação circular não permitida.');
      }
    }
    if(!options.skipHistory) recordHistory();
    const node = nodeDefaults(partial);

    // Registra no pool canônico deste projeto
    registerEntity({
      id: node.id,
      type: node.type,
      title: node.title,
      description: node.description,
      priority: node.priority,
      tags: node.tags,
      url: node.url,
      createdAt: node.createdAt,
      subgraphTabId: node.subgraphTabId,
    });

    tab.nodes.push(node);
    save();
    notify('node:add', node);
    notify('entities:change', { count: Object.keys(state.entities).length });
    return node;
  }

  function updateNode(id, changes = {}, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhum grafo ativo.');
    const idx = tab.nodes.findIndex(n => n.id === id);
    if(idx === -1) throw new Error(`Nó não encontrado: ${id}`);
    if(!options.skipHistory) recordHistory();
    if(changes.type && !NODE_TYPES.includes(changes.type)) delete changes.type;
    if(changes.priority && !PRIORITIES.includes(changes.priority)) delete changes.priority;
    if(changes.title !== undefined){
      changes.title = String(changes.title);
    }
    if(changes.tags !== undefined && !Array.isArray(changes.tags)) delete changes.tags;
    if(changes.url !== undefined) changes.url = String(changes.url).trim();
    if(changes.parentId !== undefined) changes.parentId = changes.parentId || null;

    // Se alterou de agrupador para outro tipo, desvincula os filhos
    if(changes.type && changes.type !== 'agrupador' && tab.nodes[idx].type === 'agrupador'){
      tab.nodes.forEach(n => {
        if(n.parentId === id) n.parentId = null;
      });
    }

    // Agrupador não pode ser filho de outro contêiner
    if(changes.type === 'agrupador'){
      changes.parentId = null;
    }

    // Validação de subgrafo
    if(changes.subgraphTabId){
      if(!canImportTab(tab.id, changes.subgraphTabId)){
        throw new Error('Importação circular não permitida.');
      }
    }

    // Atualiza o dado no pool central único deste projeto
    if(state.entities[id]){
      const ent = state.entities[id];
      if(changes.type) ent.type = changes.type;
      if(changes.title !== undefined) ent.title = changes.title;
      if(changes.description !== undefined) ent.description = changes.description;
      if(changes.priority) ent.priority = changes.priority;
      if(changes.tags) ent.tags = [...changes.tags];
      if(changes.url !== undefined) ent.url = changes.url;
      if(changes.subgraphTabId !== undefined) ent.subgraphTabId = changes.subgraphTabId;
    }

    // Sincroniza em todas as telas onde essa entidade aparece no projeto
    state.tabs.forEach(t => {
      const nodeInTab = t.nodes.find(n => n.id === id);
      if(nodeInTab){
        if(changes.type) nodeInTab.type = changes.type;
        if(changes.title !== undefined) nodeInTab.title = changes.title;
        if(changes.description !== undefined) nodeInTab.description = changes.description;
        if(changes.priority) nodeInTab.priority = changes.priority;
        if(changes.tags) nodeInTab.tags = [...changes.tags];
        if(changes.url !== undefined) nodeInTab.url = changes.url;
        if(changes.subgraphTabId !== undefined) nodeInTab.subgraphTabId = changes.subgraphTabId;
      }
    });

    // Atualiza propriedades posicionais específicas deste grafo
    if(changes.x !== undefined) tab.nodes[idx].x = Math.round(changes.x);
    if(changes.y !== undefined) tab.nodes[idx].y = Math.round(changes.y);
    if(changes.parentId !== undefined) tab.nodes[idx].parentId = changes.parentId;

    save();
    notify('node:update', tab.nodes[idx]);
    notify('entities:change', { count: Object.keys(state.entities).length });
    return tab.nodes[idx];
  }

  function deleteNode(id, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhum grafo ativo.');
    const targetNode = tab.nodes.find(n => n.id === id);
    if(!targetNode) throw new Error(`Nó não encontrado: ${id}`);
    if(!options.skipHistory) recordHistory();

    // Se era um contêiner, desassocia os nós filhos
    tab.nodes.forEach(n => {
      if(n.parentId === id) n.parentId = null;
    });
    tab.nodes = tab.nodes.filter(n => n.id !== id);
    const removedEdges = tab.edges.filter(e => e.source === id || e.target === id);
    tab.edges = tab.edges.filter(e => e.source !== id && e.target !== id);
    if(state.selectedId === id) state.selectedId = null;
    save();
    notify('node:delete', { id, removedEdges });
    notify('entities:change', { count: Object.keys(state.entities).length });
    return id;
  }

  function getNode(id){
    const tab = getActiveTab();
    return tab ? (tab.nodes.find(n => n.id === id) ?? null) : null;
  }

  function getNodes(){
    const tab = getActiveTab();
    return tab ? [...tab.nodes] : [];
  }

  /* ── Compound / Containers ─────────────────────── */
  function getContainers(){
    const tab = getActiveTab();
    if(!tab) return [];
    return tab.nodes.filter(n => n.type === 'agrupador');
  }

  function groupNodes(nodeIds, parentTitle = 'Contêiner'){
    const tab = getActiveTab();
    if(!tab || !nodeIds || !nodeIds.length) return null;
    return batch(() => {
      const targetNodes = tab.nodes.filter(n => nodeIds.includes(n.id) && n.type !== 'agrupador');
      if(!targetNodes.length) return null;

      const minX = Math.min(...targetNodes.map(n => n.x));
      const maxX = Math.max(...targetNodes.map(n => n.x));
      const minY = Math.min(...targetNodes.map(n => n.y));
      const maxY = Math.max(...targetNodes.map(n => n.y));

      const container = addNode({
        type: 'agrupador',
        title: parentTitle,
        x: Math.round((minX + maxX) / 2),
        y: Math.round((minY + maxY) / 2),
      });

      targetNodes.forEach(n => {
        updateNode(n.id, { parentId: container.id });
      });

      return container;
    });
  }

  function ungroupNode(nodeId){
    return updateNode(nodeId, { parentId: null });
  }

  function ungroupParent(parentId){
    const tab = getActiveTab();
    if(!tab) return;
    batch(() => {
      tab.nodes.forEach(n => {
        if(n.parentId === parentId){
          updateNode(n.id, { parentId: null });
        }
      });
    });
  }

  /* ── Edges CRUD ────────────────────────────────── */
  function addEdge(partial = {}, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhum grafo ativo.');
    const { source, target, edgeType = 'neutra', label, directed = true } = partial;
    if(!source || !target)               throw new Error('source e target obrigatórios');
    if(source === target)                throw new Error('Self-loop não permitido');
    if(!EDGE_TYPES.includes(edgeType)) throw new Error(`edgeType inválido: ${edgeType}`);
    if(!getNode(source))               throw new Error(`Source não encontrado: ${source}`);
    if(!getNode(target))               throw new Error(`Target não encontrado: ${target}`);
    const exists = tab.edges.some(e => e.source === source && e.target === target && e.edgeType === edgeType);
    if(exists) throw new Error('Aresta duplicada');
    if(!options.skipHistory) recordHistory();
    const edge = edgeDefaults({ source, target, edgeType, label: label ?? '', directed });
    tab.edges.push(edge);
    save();
    notify('edge:add', edge);
    return edge;
  }

  function updateEdge(id, changes = {}, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhum grafo ativo.');
    const idx = tab.edges.findIndex(e => e.id === id);
    if(idx === -1) throw new Error(`Aresta não encontrada: ${id}`);
    if(!options.skipHistory) recordHistory();
    if(changes.edgeType && !EDGE_TYPES.includes(changes.edgeType)) delete changes.edgeType;
    if(changes.curveStyle && !CURVE_STYLES.includes(changes.curveStyle)) delete changes.curveStyle;
    if(changes.linePattern && !LINE_PATTERNS.includes(changes.linePattern)) delete changes.linePattern;
    if(changes.arrowDirection && !ARROW_DIRECTIONS.includes(changes.arrowDirection)) delete changes.arrowDirection;
    if(changes.taxiDirection && !TAXI_DIRECTIONS.includes(changes.taxiDirection)) delete changes.taxiDirection;
    if(changes.controlPointDistance !== undefined) changes.controlPointDistance = Number(changes.controlPointDistance);
    if(changes.controlPointWeight !== undefined) changes.controlPointWeight = Math.max(0.05, Math.min(0.95, Number(changes.controlPointWeight)));
    if(changes.segmentDistance !== undefined) changes.segmentDistance = Number(changes.segmentDistance);
    if(changes.segmentWeight !== undefined) changes.segmentWeight = Math.max(0.05, Math.min(0.95, Number(changes.segmentWeight)));
    if(changes.arrowDirection !== undefined){
      changes.directed = changes.arrowDirection !== 'none';
    }
    if(changes.label !== undefined){
      changes.label = String(changes.label);
    }
    if(changes.edgeType && changes.edgeType !== tab.edges[idx].edgeType){
      const current = tab.edges[idx];
      const dup = tab.edges.some(e => e.id !== id && e.source === current.source && e.target === current.target && e.edgeType === changes.edgeType);
      if(dup){
        throw new Error(`Já existe uma conexão "${changes.edgeType}" entre estes mesmos vértices.`);
      }
    }
    tab.edges[idx] = { ...tab.edges[idx], ...changes };
    save();
    notify('edge:update', tab.edges[idx]);
    return tab.edges[idx];
  }

  function deleteEdge(id, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhum grafo ativo.');
    const idx = tab.edges.findIndex(e => e.id === id);
    if(idx === -1) throw new Error(`Aresta não encontrada: ${id}`);
    if(!options.skipHistory) recordHistory();
    tab.edges.splice(idx, 1);
    if(state.selectedEdgeId === id) state.selectedEdgeId = null;
    save();
    notify('edge:delete', { id });
    return id;
  }

  function getEdge(id){
    const tab = getActiveTab();
    return tab ? (tab.edges.find(e => e.id === id) ?? null) : null;
  }

  function getEdges(){
    const tab = getActiveTab();
    return tab ? [...tab.edges] : [];
  }

  /* ── Selection ─────────────────────────────────── */
  function selectNode(id){
    state.selectedId = id;
    state.selectedEdgeId = null;
    notify('selection:change', id);
    notify('selection:edgeChange', null);
  }

  function selectEdge(id){
    state.selectedEdgeId = id;
    state.selectedId = null;
    notify('selection:change', null);
    notify('selection:edgeChange', id);
  }

  function clearSelection(){
    state.selectedId = null;
    state.selectedEdgeId = null;
    notify('selection:change', null);
    notify('selection:edgeChange', null);
  }

  function getSelectedNode(){ return getNode(state.selectedId); }
  function getSelectedEdge(){ return getEdge(state.selectedEdgeId); }

  /* ── Filters ───────────────────────────────────── */
  function setFilter(changes){
    state.filter = { ...state.filter, ...changes };
    notify('filter:change', { ...state.filter });
  }

  function getFilter(){ return { ...state.filter }; }

  function getVisibleNodeIds(){
    const { text, type, priority, tags } = state.filter;
    const tab = getActiveTab();
    if(!tab) return new Set();
    const q = text.trim().toLowerCase();
    return new Set(
      tab.nodes.filter(n => {
        if(type !== 'all' && n.type !== type) return false;
        if(priority !== 'all' && n.priority !== priority) return false;
        if(tags.length && !tags.every(t => n.tags.includes(t))) return false;
        if(q && !(n.title || '').toLowerCase().includes(q) && !(n.description || '').toLowerCase().includes(q)) return false;
        return true;
      }).map(n => n.id)
    );
  }

  /* ── Display ───────────────────────────────────── */
  function setShowNodeMeta(val){ state.showNodeMeta = val; notify('display:nodeMeta', val); }
  function getShowNodeMeta(){ return state.showNodeMeta; }

  /* ── Position ──────────────────────────────────── */
  let _saveTimer = null;
  function _debouncedSave(){ clearTimeout(_saveTimer); _saveTimer = setTimeout(save, 800); }

  function updateNodePosition(id, x, y){
    const tab = getActiveTab();
    if(!tab) return;
    const idx = tab.nodes.findIndex(n => n.id === id);
    if(idx === -1) return;
    tab.nodes[idx].x = Math.round(x);
    tab.nodes[idx].y = Math.round(y);
    _debouncedSave();
  }

  function getAllTags(){
    const set = new Set();
    getNodes().forEach(n => n.tags.forEach(t => set.add(t)));
    return [...set].sort();
  }

  /* ── Storage Delegation ────────────────────────── */
  function save(){
    StoreStorage.save(state);
  }

  function load(){
    const loaded = StoreStorage.load(nodeDefaults, edgeDefaults);
    if(loaded){
      state.projectId = loaded.projectId || state.projectId;
      state.projectName = loaded.projectName || 'Nobiu';
      state.tabs = loaded.tabs;
      state.activeTabId = loaded.activeTabId;
      state.openTabIds = loaded.openTabIds || loaded.tabs.map(t => t.id);
      state.folders = loaded.folders || [];
      state.entities = loaded.entities || {};
      return true;
    }
    return false;
  }

  async function exportJSON(filename = null){
    const success = await StoreStorage.exportJSON(state, filename);
    if(success) notify('io:export', { count: getNodes().length });
    return success;
  }

  function importJSON(file, asNewProject = false){
    return StoreStorage.parseImportFile(file, nodeDefaults, edgeDefaults).then(parsed => {
      if(asNewProject){
        const newId = `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        state.projectId = newId;
        state.projectName = parsed.projectName || 'Projeto Importado';
      } else {
        state.projectName = parsed.projectName || state.projectName;
      }
      state.tabs = parsed.tabs;
      state.activeTabId = parsed.activeTabId;
      state.openTabIds = parsed.openTabIds || parsed.tabs.map(t => t.id);
      state.folders = parsed.folders || [];
      state.entities = parsed.entities || {};
      state.selectedId = null;
      state.selectedEdgeId = null;

      StoreStorage.setActiveProjectId(state.projectId);
      save();

      notify('project:switch', { projectId: state.projectId, projectName: state.projectName });
      notify('project:change', state.projectName);
      notify('project:listChange', getProjectsList());
      notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
      notify('tabs:switch', { activeTabId: state.activeTabId, tab: getActiveTab() });
      notify('explorer:change', getExplorerTree());
      notify('entities:change', { count: Object.keys(state.entities).length });
      notify('io:import', { count: getNodes().length });
      return getNodes().length;
    });
  }

  function getSnapshot(){
    const tab = getActiveTab();
    return {
      projectId: state.projectId,
      projectName: state.projectName,
      tabId: state.activeTabId,
      tabs: getTabs(),
      openTabs: getOpenTabs(),
      nodes: tab ? tab.nodes.map(n => ({ ...n, tags: [...n.tags] })) : [],
      edges: tab ? tab.edges.map(e => ({ ...e })) : [],
      selectedId: state.selectedId,
      filter: { ...state.filter },
    };
  }

  function reset(){
    state.tabs = [];
    state.folders = [];
    state.entities = {};
    state.openTabIds = [];
    state.activeTabId = null;
    state.selectedId = null;
    state.selectedEdgeId = null;
    ExplorerManager.ensureDefaultFolder(state.folders, state.tabs);
    createTab('Principal');
    save();
    notify('store:reset', null);
    notify('explorer:change', getExplorerTree());
    notify('entities:change', { count: 0 });
  }

  function seed(){
    state.tabs = [];
    state.folders = [];
    state.entities = {};
    state.openTabIds = [];

    ExplorerManager.ensureDefaultFolder(state.folders, state.tabs);
    const rootFolder = state.folders[0];

    const mainTab = {
      id: TabsManager.tabUid(),
      name: 'Principal',
      folderId: rootFolder ? rootFolder.id : null,
      nodes: [],
      edges: []
    };
    state.tabs.push(mainTab);
    state.openTabIds = [mainTab.id];
    state.activeTabId = mainTab.id;

    const p1 = addNode({ type:'problema',  title:'Performance degradada',   description:'API responde >2s em pico.',       priority:'alta',  tags:['backend','api'],   x:320, y:200 });
    const p2 = addNode({ type:'problema',  title:'UX confusa no onboarding',description:'Abandono 60% no passo 3.',        priority:'alta',  tags:['ux','onboarding'], x:640, y:160 });
    const s1 = addNode({ type:'solucao',   title:'Cache Redis',             description:'TTL 5min para queries quentes.',  priority:'alta',  tags:['backend','cache'], x:200, y:400 });
    const s2 = addNode({ type:'solucao',   title:'Refatorar onboarding',    description:'Reduzir de 5 para 3 passos.',     priority:'media', tags:['ux'],              x:720, y:360 });
    const g1 = addNode({ type:'agrupador', title:'Sprint Q3 — Infra',       description:'Épico de infra e performance.',   priority:'media', tags:['sprint','infra'],  x:460, y:490 });
    addEdge({ source:s1.id, target:p1.id, edgeType:'resolve',    directed:true });
    addEdge({ source:s2.id, target:p2.id, edgeType:'resolve',    directed:true });
    addEdge({ source:p1.id, target:p2.id, edgeType:'relaciona',  directed:false });
    addEdge({ source:g1.id, target:s1.id, edgeType:'dependencia',directed:true });
    addEdge({ source:g1.id, target:s2.id, edgeType:'dependencia',directed:true });
    save();
  }

  /* ── Architecture Diagnostics ────────────────── */
  function getDiagnostics(){
    const tab = getActiveTab();
    if(!tab) return { openProblems: [], orphanSolutions: [], isolatedNodes: [], bottlenecks: [], cycles: [], totalNodes: 0, totalEdges: 0 };

    const nodes = tab.nodes;
    const edges = tab.edges;

    const openProblems = nodes.filter(n => {
      if(n.type !== 'problema') return false;
      return !edges.some(e => e.edgeType === 'resolve' && (e.source === n.id || e.target === n.id));
    });

    const orphanSolutions = nodes.filter(n => {
      if(n.type !== 'solucao') return false;
      return !edges.some(e => e.edgeType === 'resolve' && (e.source === n.id || e.target === n.id));
    });

    const isolatedNodes = nodes.filter(n => {
      if(n.type === 'agrupador' || n.type === 'texto') return false;
      return !edges.some(e => e.source === n.id || e.target === n.id);
    });

    const depCounts = {};
    edges.forEach(e => {
      if(e.edgeType === 'dependencia'){
        depCounts[e.target] = (depCounts[e.target] || 0) + 1;
      }
    });
    const bottlenecks = nodes.filter(n => (depCounts[n.id] || 0) >= 3)
      .map(n => ({ node: n, count: depCounts[n.id] }));

    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
      if(e.edgeType === 'dependencia'){
        if(adj.has(e.source)) adj.get(e.source).push(e.target);
      }
    });

    const cycles = [];
    const visited = new Set();
    const recStack = new Set();
    const path = [];

    function dfs(u){
      visited.add(u);
      recStack.add(u);
      path.push(u);

      const neighbors = adj.get(u) || [];
      for(const v of neighbors){
        if(!visited.has(v)){
          dfs(v);
        } else if(recStack.has(v)){
          const cycleStartIdx = path.indexOf(v);
          if(cycleStartIdx !== -1){
            const cyclePath = path.slice(cycleStartIdx).concat(v);
            cycles.push(cyclePath.map(id => getNode(id)).filter(Boolean));
          }
        }
      }

      path.pop();
      recStack.delete(u);
    }

    nodes.forEach(n => {
      if(!visited.has(n.id)){
        dfs(n.id);
      }
    });

    return {
      openProblems,
      orphanSolutions,
      isolatedNodes,
      bottlenecks,
      cycles,
      totalNodes: nodes.length,
      totalEdges: edges.length
    };
  }

  async function init(){
    const projectList = StoreStorage.getProjectsList();

    // Se não há nenhum projeto cadastrado no storage local, carrega do trama.json
    if(projectList.length === 0){
      try {
        const res = await fetch('./trama.json', { cache: 'no-store' });
        if(res.ok){
          const jsonText = await res.text();
          const snap = JSON.parse(jsonText);
          const parsed = StoreStorage.parseJSONContent(snap, nodeDefaults, edgeDefaults);
          if(parsed){
            const defaultId = 'proj_nobiu';
            state.projectId = defaultId;
            state.projectName = parsed.projectName || 'Nobiu';
            state.tabs = parsed.tabs;
            state.activeTabId = parsed.activeTabId;
            state.openTabIds = parsed.openTabIds || parsed.tabs.map(t => t.id);
            state.folders = parsed.folders || [];
            state.entities = parsed.entities || {};
            StoreStorage.setActiveProjectId(defaultId);
            save();
          }
        }
      } catch(err){
        console.warn('[Store] Auto-fetch ./trama.json fallback:', err);
      }
    } else {
      // Carrega o projeto ativo do storage
      if(!load()){
        seed();
      }
    }

    state.entities = ExplorerManager.syncEntitiesFromTabs(state.entities || {}, state.tabs);
    state.folders = ExplorerManager.ensureDefaultFolder(state.folders || [], state.tabs);
    if(!Array.isArray(state.openTabIds) || state.openTabIds.length === 0){
      state.openTabIds = state.tabs.map(t => t.id);
    }

    notify('project:switch', { projectId: state.projectId, projectName: state.projectName });
    notify('project:change', state.projectName);
    notify('project:listChange', getProjectsList());
    notify('store:ready', getSnapshot());
    notify('tabs:change', { tabs: getTabs(), openTabs: getOpenTabs(), activeTabId: state.activeTabId });
    notify('explorer:change', getExplorerTree());
    notify('entities:change', { count: Object.keys(state.entities).length });
  }

  return {
    init, reset, seed,
    getProjectId, getProjectName, setProjectName, getProjectsList, createProject, switchProject, deleteProject,
    getTabs, getOpenTabs, openTab, closeTab, closeOtherTabs, closeAllTabs,
    getActiveTab, getActiveTabId, createTab, renameTab, switchTab, deleteTab, isTabEmpty,
    canImportTab, getImportableTabs,
    getFolders, getFolder, createFolder, renameFolder, deleteFolder, toggleFolderExpand, moveItem, getExplorerTree,
    getEntities, getEntity, getEntitiesList, addExistingEntityToTab, deleteEntityGlobal,
    addNode, updateNode, deleteNode, getNode, getNodes, updateNodePosition,
    getContainers, groupNodes, ungroupNode, ungroupParent,
    addEdge, updateEdge, deleteEdge, getEdge, getEdges,
    selectNode, selectEdge, clearSelection, getSelectedNode, getSelectedEdge,
    setFilter, getFilter, getVisibleNodeIds,
    setShowNodeMeta, getShowNodeMeta,
    save, load, exportJSON, importJSON,
    subscribe, getSnapshot, getAllTags,
    undo, canUndo, redo, canRedo, recordHistory, batch,
    getDiagnostics,
    NODE_TYPES, EDGE_TYPES, PRIORITIES,
    CURVE_STYLES, LINE_PATTERNS, ARROW_DIRECTIONS, TAXI_DIRECTIONS,
  };
})();
