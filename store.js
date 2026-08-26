/* ═══════════════════════════════════════════════════
   store.js — Estado global, CRUD, LocalStorage, I/O
════════════════════════════════════════════════════ */

const Store = (() => {

  /* ─── Constantes ─────────────────────────────── */
  const LS_KEY    = 'trama_v1';
  const NODE_TYPES = ['problema', 'solucao', 'agrupador'];
  const EDGE_TYPES = ['dependencia', 'resolve', 'relaciona'];
  const STATUSES   = ['pendente', 'andamento', 'concluido'];
  const PRIORITIES = ['alta', 'media', 'baixa'];

  /* ─── Estado ──────────────────────────────────── */
  let state = {
    nodes:        [],
    edges:        [],
    selectedId:   null,
    showNodeMeta: true,
    filter: {
      text:   '',
      type:   'all',
      status: null,
      tags:   [],      // ← array de tags ativas no filtro
    },
  };

  /* ─── Subscribers (padrão observer leve) ─────── */
  const listeners = new Set();

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);   // retorna unsubscribe
  }

  function notify(event, payload) {
    listeners.forEach(fn => fn(event, payload));
  }

  /* ─── Helpers ─────────────────────────────────── */
  function uid() {
    return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function edgeUid() {
    return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function validate(obj, schema) {
    for (const [key, check] of Object.entries(schema)) {
      if (!check(obj[key])) throw new Error(`Campo inválido: "${key}" = ${JSON.stringify(obj[key])}`);
    }
  }

  /* ─── Defaults ────────────────────────────────── */
  function nodeDefaults(partial = {}) {
    return {
      id:          partial.id          ?? uid(),
      type:        partial.type        ?? 'problema',
      title:       partial.title       ?? 'Novo nó',
      description: partial.description ?? '',
      status:      partial.status      ?? 'pendente',
      priority:    partial.priority    ?? 'media',
      tags:        Array.isArray(partial.tags) ? [...partial.tags] : [],
      x:           partial.x           ?? 200 + Math.random() * 400,
      y:           partial.y           ?? 200 + Math.random() * 300,
      createdAt:   partial.createdAt   ?? Date.now(),
    };
  }

  function edgeDefaults(partial = {}) {
    return {
      id:       partial.id       ?? edgeUid(),
      source:   partial.source,
      target:   partial.target,
      edgeType: partial.edgeType ?? 'relaciona',
      directed: partial.directed ?? true,
    };
  }

  /* ═══════════════════════════════════════════════
     NODES — CRUD
  ════════════════════════════════════════════════ */

  function addNode(partial = {}) {
    const node = nodeDefaults(partial);

    validate(node, {
      type:     v => NODE_TYPES.includes(v),
      status:   v => STATUSES.includes(v),
      priority: v => PRIORITIES.includes(v),
      title:    v => typeof v === 'string' && v.trim().length > 0,
    });

    state.nodes.push(node);
    save();
    notify('node:add', node);
    return node;
  }

  function updateNode(id, changes = {}) {
    const idx = state.nodes.findIndex(n => n.id === id);
    if (idx === -1) throw new Error(`Nó não encontrado: ${id}`);

    // sanitise
    if (changes.type     && !NODE_TYPES.includes(changes.type))     delete changes.type;
    if (changes.status   && !STATUSES.includes(changes.status))     delete changes.status;
    if (changes.priority && !PRIORITIES.includes(changes.priority)) delete changes.priority;
    if (changes.title !== undefined) changes.title = String(changes.title).trim() || 'Sem título';
    if (changes.tags !== undefined && !Array.isArray(changes.tags)) delete changes.tags;

    state.nodes[idx] = { ...state.nodes[idx], ...changes };
    save();
    notify('node:update', state.nodes[idx]);
    return state.nodes[idx];
  }

  function deleteNode(id) {
    const before = state.nodes.length;
    state.nodes = state.nodes.filter(n => n.id !== id);

    if (state.nodes.length === before) throw new Error(`Nó não encontrado: ${id}`);

    // Remove arestas conectadas
    const removedEdges = state.edges.filter(e => e.source === id || e.target === id);
    state.edges = state.edges.filter(e => e.source !== id && e.target !== id);

    if (state.selectedId === id) state.selectedId = null;

    save();
    notify('node:delete', { id, removedEdges });
    return id;
  }

  function getNode(id) {
    return state.nodes.find(n => n.id === id) ?? null;
  }

  function getNodes() {
    return [...state.nodes];
  }

  /* ═══════════════════════════════════════════════
     EDGES — CRUD
  ════════════════════════════════════════════════ */

  function addEdge(partial = {}) {
    const { source, target, edgeType = 'relaciona', directed = true } = partial;

    if (!source || !target)                throw new Error('source e target obrigatórios');
    if (source === target)                 throw new Error('Self-loop não permitido');
    if (!EDGE_TYPES.includes(edgeType))    throw new Error(`edgeType inválido: ${edgeType}`);
    if (!getNode(source))                  throw new Error(`Nó source não encontrado: ${source}`);
    if (!getNode(target))                  throw new Error(`Nó target não encontrado: ${target}`);

    // Evita duplicata (mesma direção)
    const exists = state.edges.some(
      e => e.source === source && e.target === target && e.edgeType === edgeType
    );
    if (exists) throw new Error('Aresta duplicada');

    const edge = edgeDefaults({ source, target, edgeType, directed });
    state.edges.push(edge);
    save();
    notify('edge:add', edge);
    return edge;
  }

  function deleteEdge(id) {
    const before = state.edges.length;
    state.edges = state.edges.filter(e => e.id !== id);
    if (state.edges.length === before) throw new Error(`Aresta não encontrada: ${id}`);
    save();
    notify('edge:delete', { id });
    return id;
  }

  function getEdges() {
    return [...state.edges];
  }

  /* ═══════════════════════════════════════════════
     SELEÇÃO
  ════════════════════════════════════════════════ */

  function selectNode(id) {
    state.selectedId = id;
    notify('selection:change', id);
  }

  function clearSelection() {
    state.selectedId = null;
    notify('selection:change', null);
  }

  function getSelectedNode() {
    return state.selectedId ? getNode(state.selectedId) : null;
  }

  /* ═══════════════════════════════════════════════
     FILTRO / BUSCA
  ════════════════════════════════════════════════ */

  function setFilter(changes = {}) {
    state.filter = { ...state.filter, ...changes };
    notify('filter:change', state.filter);
  }

  function getFilter() {
    return { ...state.filter };
  }

  /**
   * Retorna ids dos nós que PASSAM no filtro atual.
   * Retorna Set<string> para lookup O(1).
   */
  function getVisibleNodeIds() {
    const { text, type, status, tags } = state.filter;
    const q = text.trim().toLowerCase();

    return new Set(
      state.nodes
        .filter(n => {
          if (type && type !== 'all' && n.type !== type) return false;
          if (status && n.status !== status) return false;
          // Todas as tags ativas devem estar presentes no nó
          if (tags.length > 0 && !tags.every(t => n.tags.includes(t))) return false;
          if (q) {
            const haystack = [n.title, n.description, ...n.tags].join(' ').toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        })
        .map(n => n.id)
    );
  }

  /* ═══════════════════════════════════════════════
     POSIÇÃO (sync com Cytoscape drag)
  ════════════════════════════════════════════════ */

  function updateNodePosition(id, x, y) {
    const idx = state.nodes.findIndex(n => n.id === id);
    if (idx === -1) return;
    state.nodes[idx].x = Math.round(x);
    state.nodes[idx].y = Math.round(y);
    // Sem notify (chamado em alta frequência durante drag) — save throttled
    _debouncedSave();
  }

  /* ═══════════════════════════════════════════════
     PERSISTÊNCIA — LocalStorage
  ════════════════════════════════════════════════ */

  let _saveTimer = null;

  function _debouncedSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(save, 800);
  }

  function save() {
    try {
      const snapshot = {
        version:   1,
        savedAt:   Date.now(),
        nodes:     state.nodes,
        edges:     state.edges,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('[Store] Falha ao salvar:', err);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;

      const snapshot = JSON.parse(raw);
      if (!snapshot?.nodes || !Array.isArray(snapshot.nodes)) return false;

      // Migra / sanitisa cada nó
      state.nodes = snapshot.nodes.map(n => nodeDefaults(n));
      state.edges = (snapshot.edges ?? [])
        .filter(e => e.source && e.target)
        .map(e => edgeDefaults(e));

      return true;
    } catch (err) {
      console.warn('[Store] Falha ao carregar:', err);
      return false;
    }
  }

  /* ═══════════════════════════════════════════════
     EXPORT / IMPORT JSON
  ════════════════════════════════════════════════ */

  function exportJSON() {
    const snapshot = {
      version:   1,
      exportedAt: new Date().toISOString(),
      nodes:     state.nodes,
      edges:     state.edges,
    };

    const blob = new Blob(
      [JSON.stringify(snapshot, null, 2)],
      { type: 'application/json' }
    );

    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `graphmind_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    notify('io:export', { count: state.nodes.length });
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.type !== 'application/json') {
        return reject(new Error('Arquivo inválido. Use um .json exportado pelo GraphMind.'));
      }

      const reader = new FileReader();

      reader.onload = evt => {
        try {
          const snapshot = JSON.parse(evt.target.result);
          if (!Array.isArray(snapshot?.nodes)) throw new Error('Formato inválido');

          // Substitui estado
          state.nodes = snapshot.nodes.map(n => nodeDefaults(n));
          state.edges = (snapshot.edges ?? [])
            .filter(e => e.source && e.target)
            .map(e => edgeDefaults(e));
          state.selectedId = null;

          save();
          notify('io:import', { count: state.nodes.length });
          resolve(state.nodes.length);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsText(file);
    });
  }

  /* ═══════════════════════════════════════════════
     BULK / UTILS
  ════════════════════════════════════════════════ */

  /** Retorna snapshot puro do estado (sem referências) */
  function getSnapshot() {
    return {
      nodes: state.nodes.map(n => ({ ...n, tags: [...n.tags] })),
      edges: state.edges.map(e => ({ ...e })),
      selectedId: state.selectedId,
      filter: { ...state.filter },
    };
  }

  /** Reseta tudo (útil em testes / import destrutivo) */
  function reset() {
    state.nodes      = [];
    state.edges      = [];
    state.selectedId = null;
    save();
    notify('store:reset', null);
  }

  /** Seed de dados de exemplo (primeira vez) */
  function seed() {
    const p1 = addNode({ type: 'problema',  title: 'Performance degradada', description: 'API responde > 2s em pico de carga.', status: 'andamento', priority: 'alta',  tags: ['backend', 'api'],        x: 300, y: 200 });
    const p2 = addNode({ type: 'problema',  title: 'UX confusa no onboarding', description: 'Taxa de abandono 60% no passo 3.', status: 'pendente',  priority: 'alta',  tags: ['ux', 'onboarding'],      x: 620, y: 150 });
    const s1 = addNode({ type: 'solucao',   title: 'Cache Redis na camada de serviço', description: 'TTL 5min para queries quentes.',   status: 'pendente',  priority: 'alta',  tags: ['backend', 'cache'],      x: 200, y: 400 });
    const s2 = addNode({ type: 'solucao',   title: 'Refatorar fluxo de onboarding', description: 'Reduzir de 5 para 3 passos.',          status: 'pendente',  priority: 'media', tags: ['ux'],                    x: 700, y: 350 });
    const g1 = addNode({ type: 'agrupador', title: 'Sprint Q3 — Infraestrutura',   description: 'Épico de infra e performance.',         status: 'andamento', priority: 'media', tags: ['sprint', 'infra'],       x: 450, y: 480 });

    addEdge({ source: s1.id, target: p1.id, edgeType: 'resolve',     directed: true });
    addEdge({ source: s2.id, target: p2.id, edgeType: 'resolve',     directed: true });
    addEdge({ source: p1.id, target: p2.id, edgeType: 'relaciona',   directed: false });
    addEdge({ source: g1.id, target: s1.id, edgeType: 'dependencia', directed: true });
    addEdge({ source: g1.id, target: s2.id, edgeType: 'dependencia', directed: true });
  }

  /* ═══════════════════════════════════════════════
     Metadados
  ════════════════════════════════════════════════ */

  function setShowNodeMeta(val) {
    state.showNodeMeta = val;
    notify('display:nodeMeta', val);
  }

  function getShowNodeMeta() {
    return state.showNodeMeta;
  }

  function getAllTags() {
    const set = new Set();
    state.nodes.forEach(n => n.tags.forEach(t => set.add(t)));
    return [...set].sort();
  }

  /* ═══════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════ */

  function init() {
    const loaded = load();
    if (!loaded) seed();          // primeira vez: dados de exemplo
    notify('store:ready', getSnapshot());
  }

  /* ─── API pública ─────────────────────────────── */
  return {
    // lifecycle
    init,
    reset,
    seed,

    // nodes
    addNode,
    updateNode,
    deleteNode,
    getNode,
    getNodes,
    updateNodePosition,
    getAllTags,

    // edges
    addEdge,
    deleteEdge,
    getEdges,

    // selection
    selectNode,
    clearSelection,
    getSelectedNode,
    setShowNodeMeta,
    getShowNodeMeta,

    // filter
    setFilter,
    getFilter,
    getVisibleNodeIds,

    // persistence
    save,
    load,
    exportJSON,
    importJSON,

    // observer
    subscribe,

    // debug
    getSnapshot,

    // constants (readonly)
    NODE_TYPES,
    EDGE_TYPES,
    STATUSES,
    PRIORITIES,
  };

})();