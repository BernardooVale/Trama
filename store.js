/**
 * Store — Trama
 * Camada de estado central (Model), orquestrando abas, nós, arestas e observadores.
 */
const Store = (() => {
  const NODE_TYPES = ['problema', 'solucao', 'agrupador', 'neutro', 'subgrafo', 'texto'];
  const EDGE_TYPES = ['dependencia', 'resolve', 'relaciona', 'neutra'];
  const PRIORITIES = ['alta', 'media', 'baixa'];

  let state = {
    version: 2,
    activeTabId: null,
    tabs: [], // Array<{ id, name, nodes: [], edges: [] }>
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

  /* ── Tab Wrappers ──────────────────────────────── */
  function getTabs(){
    return TabsManager.getTabs(state.tabs);
  }

  function getActiveTab(){
    return state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0] || null;
  }

  function getActiveTabId(){
    return state.activeTabId;
  }

  function createTab(name){
    const tabName = (name && String(name).trim()) ? String(name).trim() : `Aba ${state.tabs.length + 1}`;
    const newTab = {
      id: TabsManager.tabUid(),
      name: tabName,
      nodes: [],
      edges: []
    };
    state.tabs.push(newTab);
    switchTab(newTab.id);
    save();
    notify('tabs:change', { tabs: getTabs(), activeTabId: state.activeTabId });
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
    notify('tabs:change', { tabs: getTabs(), activeTabId: state.activeTabId });
    return tab;
  }

  function switchTab(tabId){
    const tab = state.tabs.find(t => t.id === tabId);
    if(!tab) return;
    state.activeTabId = tabId;
    state.selectedId = null;
    state.selectedEdgeId = null;
    save();
    notify('tabs:switch', { activeTabId: tabId, tab });
  }

  function deleteTab(tabId){
    if(state.tabs.length <= 1){
      throw new Error('Não é possível excluir a única aba.');
    }
    const idx = state.tabs.findIndex(t => t.id === tabId);
    if(idx === -1) throw new Error(`Aba não encontrada: ${tabId}`);
    if(idx === 0){
      throw new Error('A aba principal é fixa e não pode ser excluída.');
    }

    TabsManager.cascadeDeleteSubgraphs(state.tabs, tabId);
    state.tabs.splice(idx, 1);

    if(state.activeTabId === tabId){
      const nextTab = state.tabs[Math.max(0, idx - 1)] || state.tabs[0];
      state.activeTabId = nextTab.id;
    }
    state.selectedId = null;
    state.selectedEdgeId = null;
    save();
    notify('tabs:change', { tabs: getTabs(), activeTabId: state.activeTabId });
    notify('tabs:switch', { activeTabId: state.activeTabId, tab: getActiveTab() });
  }

  function canImportTab(targetTabId, candidateTabId){
    return TabsManager.canImportTab(state.tabs, targetTabId, candidateTabId);
  }

  function getImportableTabs(targetTabId = state.activeTabId){
    return TabsManager.getImportableTabs(state.tabs, targetTabId);
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

  function undo(){
    const prev = StoreHistory.pop();
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

  /* ── Defaults & IDs ────────────────────────────── */
  function uid(){ return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`; }
  function edgeUid(){ return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`; }

  function nodeDefaults(p = {}){
    return {
      id:            p.id            ?? uid(),
      type:          p.type          ?? 'neutro',
      title:         p.title !== undefined ? p.title : (p.type === 'subgrafo' && p.subgraphTabId ? (state.tabs.find(t => t.id === p.subgraphTabId)?.name || 'Subgrafo') : (p.type === 'texto' ? 'Texto' : 'Novo vértice')),
      description:   p.description   ?? '',
      priority:      p.priority      ?? 'media',
      tags:          Array.isArray(p.tags) ? [...p.tags] : [],
      x:             p.x             ?? 300 + Math.random()*400,
      y:             p.y             ?? 200 + Math.random()*300,
      createdAt:     p.createdAt     ?? Date.now(),
      subgraphTabId: p.subgraphTabId ?? null,
    };
  }

  function edgeDefaults(p = {}){
    return {
      id:       p.id       ?? edgeUid(),
      source:   p.source,
      target:   p.target,
      edgeType: p.edgeType ?? 'neutra',
      label:    p.label !== undefined ? p.label : '',
      directed: p.directed ?? true,
    };
  }

  /* ── Nodes CRUD ────────────────────────────────── */
  function addNode(partial = {}, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhuma aba ativa.');
    if(partial.type === 'subgrafo' && partial.subgraphTabId){
      if(!canImportTab(tab.id, partial.subgraphTabId)){
        throw new Error('Importação circular não permitida.');
      }
    }
    if(!options.skipHistory) recordHistory();
    const node = nodeDefaults(partial);
    tab.nodes.push(node);
    save();
    notify('node:add', node);
    return node;
  }

  function updateNode(id, changes = {}, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhuma aba ativa.');
    const idx = tab.nodes.findIndex(n => n.id === id);
    if(idx === -1) throw new Error(`Nó não encontrado: ${id}`);
    if(!options.skipHistory) recordHistory();
    if(changes.type && !NODE_TYPES.includes(changes.type)) delete changes.type;
    if(changes.priority && !PRIORITIES.includes(changes.priority)) delete changes.priority;
    if(changes.title !== undefined){
      changes.title = String(changes.title);
    }
    if(changes.tags !== undefined && !Array.isArray(changes.tags)) delete changes.tags;
    tab.nodes[idx] = { ...tab.nodes[idx], ...changes };
    save();
    notify('node:update', tab.nodes[idx]);
    return tab.nodes[idx];
  }

  function deleteNode(id, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhuma aba ativa.');
    const targetNode = tab.nodes.find(n => n.id === id);
    if(!targetNode) throw new Error(`Nó não encontrado: ${id}`);
    if(!options.skipHistory) recordHistory();
    tab.nodes = tab.nodes.filter(n => n.id !== id);
    const removedEdges = tab.edges.filter(e => e.source === id || e.target === id);
    tab.edges = tab.edges.filter(e => e.source !== id && e.target !== id);
    if(state.selectedId === id) state.selectedId = null;
    save();
    notify('node:delete', { id, removedEdges });
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

  /* ── Edges CRUD ────────────────────────────────── */
  function addEdge(partial = {}, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhuma aba ativa.');
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
    if(!tab) throw new Error('Nenhuma aba ativa.');
    const idx = tab.edges.findIndex(e => e.id === id);
    if(idx === -1) throw new Error(`Aresta não encontrada: ${id}`);
    if(!options.skipHistory) recordHistory();
    if(changes.edgeType && !EDGE_TYPES.includes(changes.edgeType)) delete changes.edgeType;
    if(changes.label !== undefined){
      changes.label = String(changes.label);
    }
    tab.edges[idx] = { ...tab.edges[idx], ...changes };
    save();
    notify('edge:update', tab.edges[idx]);
    return tab.edges[idx];
  }

  function deleteEdge(id, options = {}){
    const tab = getActiveTab();
    if(!tab) throw new Error('Nenhuma aba ativa.');
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
    notify('selection:edgeChange', id);
    notify('selection:change', null);
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
      state.tabs = loaded.tabs;
      state.activeTabId = loaded.activeTabId;
      return true;
    }
    return false;
  }

  async function exportJSON(filename = 'trama.json'){
    const success = await StoreStorage.exportJSON(state, filename);
    if(success) notify('io:export', { count: getNodes().length });
    return success;
  }

  function importJSON(file){
    return StoreStorage.parseImportFile(file, nodeDefaults, edgeDefaults).then(parsed => {
      state.tabs = parsed.tabs;
      state.activeTabId = parsed.activeTabId;
      state.selectedId = null;
      state.selectedEdgeId = null;
      save();
      notify('tabs:change', { tabs: getTabs(), activeTabId: state.activeTabId });
      notify('io:import', { count: getNodes().length });
      return getNodes().length;
    });
  }

  function getSnapshot(){
    const tab = getActiveTab();
    return {
      tabId: state.activeTabId,
      tabs: getTabs(),
      nodes: tab ? tab.nodes.map(n => ({ ...n, tags: [...n.tags] })) : [],
      edges: tab ? tab.edges.map(e => ({ ...e })) : [],
      selectedId: state.selectedId,
      filter: { ...state.filter },
    };
  }

  function reset(){
    state.tabs = [];
    state.activeTabId = null;
    state.selectedId = null;
    state.selectedEdgeId = null;
    createTab('Principal');
    save();
    notify('store:reset', null);
  }

  function seed(){
    state.tabs = [];
    const mainTab = {
      id: TabsManager.tabUid(),
      name: 'Principal',
      nodes: [],
      edges: []
    };
    state.tabs.push(mainTab);
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

  async function init(){
    let loadedFromJSON = false;
    try {
      const res = await fetch('./trama.json', { cache: 'no-store' });
      if(res.ok){
        const jsonText = await res.text();
        const snap = JSON.parse(jsonText);
        const parsed = StoreStorage.parseJSONContent(snap, nodeDefaults, edgeDefaults);
        if(parsed){
          state.tabs = parsed.tabs;
          state.activeTabId = parsed.activeTabId;
          loadedFromJSON = true;
          save();
        }
      }
    } catch(err){
      console.warn('[Store] Auto-fetch ./trama.json fallback:', err);
    }

    if(!loadedFromJSON){
      if(!load()){
        seed();
      }
    }
    notify('store:ready', getSnapshot());
  }

  return {
    init, reset, seed,
    getTabs, getActiveTab, getActiveTabId, createTab, renameTab, switchTab, deleteTab,
    canImportTab, getImportableTabs,
    addNode, updateNode, deleteNode, getNode, getNodes, updateNodePosition,
    addEdge, updateEdge, deleteEdge, getEdge, getEdges,
    selectNode, selectEdge, clearSelection, getSelectedNode, getSelectedEdge,
    setFilter, getFilter, getVisibleNodeIds,
    setShowNodeMeta, getShowNodeMeta,
    save, load, exportJSON, importJSON,
    subscribe, getSnapshot, getAllTags,
    undo, canUndo, recordHistory, batch,
    NODE_TYPES, EDGE_TYPES, PRIORITIES,
  };
})();