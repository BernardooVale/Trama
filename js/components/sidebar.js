/**
 * Sidebar Component — Trama
 * Gerencia a barra lateral de propriedades de nós e arestas, debounce de digitação e tags.
 */
const Sidebar = (() => {
  let tTimer = null;
  let elTimer = null;
  let dTimer = null;

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function getEl(id){ return document.getElementById(id); }

  function open(nodeId, autoSelectText = false){
    const node = Store.getNode(nodeId);
    if(!node) return;
    getEl('sidebar-title').textContent = 'Propriedades do Vértice';
    getEl('sb-node-fields').hidden = false;
    getEl('sb-edge-fields').hidden = true;
    populate(node);
    getEl('sidebar').classList.add('open');
    if(autoSelectText){
      setTimeout(() => {
        getEl('sb-title').focus();
        getEl('sb-title').select();
      }, 50);
    }
  }

  function openEdge(edgeId, autoSelectText = false){
    const edge = Store.getEdge(edgeId);
    if(!edge) return;
    getEl('sidebar-title').textContent = 'Propriedades da Aresta';
    getEl('sb-node-fields').hidden = true;
    getEl('sb-edge-fields').hidden = false;
    populateEdge(edge);
    getEl('sidebar').classList.add('open');
    if(autoSelectText){
      setTimeout(() => {
        getEl('sb-edge-label').focus();
        getEl('sb-edge-label').select();
      }, 50);
    }
  }

  function close(){
    if(tTimer){
      clearTimeout(tTimer);
      tTimer = null;
      const n = Store.getSelectedNode();
      if(n) Store.updateNode(n.id, { title: getEl('sb-title').value }, { skipHistory: true });
    }
    if(elTimer){
      clearTimeout(elTimer);
      elTimer = null;
      const ed = Store.getSelectedEdge();
      if(ed) Store.updateEdge(ed.id, { label: getEl('sb-edge-label').value }, { skipHistory: true });
    }
    if(dTimer){
      clearTimeout(dTimer);
      dTimer = null;
      const n = Store.getSelectedNode();
      if(n) Store.updateNode(n.id, { description: getEl('sb-desc').value }, { skipHistory: true });
    }
    getEl('sidebar')?.classList.remove('open');
  }

  function populate(node){
    const badge = getEl('sb-type-badge');
    badge.textContent = node.type;
    badge.dataset.type = node.type;

    if(document.activeElement !== getEl('sb-title')){
      getEl('sb-title').value = node.title ?? '';
    }
    if(document.activeElement !== getEl('sb-desc')){
      getEl('sb-desc').value = node.description ?? '';
    }
    getEl('sb-priority-selector').querySelectorAll('.priority-btn')
      .forEach(b => b.classList.toggle('active', b.dataset.priority === node.priority));

    renderTags(node.tags);

    const isTexto = node.type === 'texto';
    getEl('sb-priority-row').hidden = isTexto;
    getEl('sb-tags-row').hidden = isTexto;

    if(node.type === 'subgrafo' && node.subgraphTabId){
      getEl('sb-subgraph-fields').hidden = false;
    } else {
      getEl('sb-subgraph-fields').hidden = true;
    }

    const d = new Date(node.createdAt).toLocaleDateString('pt-BR');
    getEl('sb-meta').textContent = `ID: ${node.id} · ${d}`;
  }

  function populateEdge(edge){
    const badge = getEl('sb-edge-type-badge');
    badge.textContent = edge.edgeType;
    badge.dataset.type = edge.edgeType;
    if(document.activeElement !== getEl('sb-edge-label')){
      getEl('sb-edge-label').value = edge.label ?? '';
    }
    const src = Store.getNode(edge.source)?.title ?? edge.source;
    const tgt = Store.getNode(edge.target)?.title ?? edge.target;
    getEl('sb-edge-endpoints').textContent = `${src} → ${tgt}`;
    getEl('sb-meta').textContent = `ID: ${edge.id}`;
  }

  function renderTags(tags){
    const list = getEl('tags-list');
    list.innerHTML = '';
    (tags || []).forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${esc(tag)}<button data-tag="${esc(tag)}" title="Remover">✕</button>`;
      chip.querySelector('button').addEventListener('click', () => removeTag(tag));
      list.appendChild(chip);
    });
  }

  function addTag(raw){
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if(!tag) return;
    const node = Store.getSelectedNode();
    if(!node) return;
    if(node.tags.includes(tag)){
      if(typeof App !== 'undefined' && App.toast) App.toast(`Etiqueta "${tag}" já existe`);
      return;
    }
    const newTags = [...node.tags, tag];
    Store.updateNode(node.id, { tags: newTags });
    renderTags(newTags);
    getEl('sb-tags').value = '';
  }

  function removeTag(tag){
    const node = Store.getSelectedNode();
    if(!node) return;
    const newTags = node.tags.filter(t => t !== tag);
    Store.updateNode(node.id, { tags: newTags });
    renderTags(newTags);
  }

  function bind(){
    let tStarted = false;
    getEl('sb-title')?.addEventListener('input', e => {
      if(!tStarted){
        Store.recordHistory();
        tStarted = true;
      }
      clearTimeout(tTimer);
      tTimer = setTimeout(() => {
        tTimer = null;
        const n = Store.getSelectedNode(); if(!n) return;
        Store.updateNode(n.id, { title: e.target.value }, { skipHistory: true });
      }, 200);
    });

    getEl('sb-title')?.addEventListener('blur', e => {
      if(tTimer){
        clearTimeout(tTimer);
        tTimer = null;
      }
      tStarted = false;
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { title: e.target.value }, { skipHistory: true });
    });

    let elStarted = false;
    getEl('sb-edge-label')?.addEventListener('input', e => {
      if(!elStarted){
        Store.recordHistory();
        elStarted = true;
      }
      clearTimeout(elTimer);
      elTimer = setTimeout(() => {
        elTimer = null;
        const ed = Store.getSelectedEdge(); if(!ed) return;
        Store.updateEdge(ed.id, { label: e.target.value }, { skipHistory: true });
      }, 200);
    });

    getEl('sb-edge-label')?.addEventListener('blur', e => {
      if(elTimer){
        clearTimeout(elTimer);
        elTimer = null;
      }
      elStarted = false;
      const ed = Store.getSelectedEdge(); if(!ed) return;
      Store.updateEdge(ed.id, { label: e.target.value }, { skipHistory: true });
    });

    let dStarted = false;
    getEl('sb-desc')?.addEventListener('input', e => {
      if(!dStarted){
        Store.recordHistory();
        dStarted = true;
      }
      clearTimeout(dTimer);
      dTimer = setTimeout(() => {
        dTimer = null;
        const n = Store.getSelectedNode(); if(!n) return;
        Store.updateNode(n.id, { description: e.target.value }, { skipHistory: true });
      }, 300);
    });

    getEl('sb-desc')?.addEventListener('blur', e => {
      if(dTimer){
        clearTimeout(dTimer);
        dTimer = null;
      }
      dStarted = false;
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { description: e.target.value }, { skipHistory: true });
    });

    getEl('sb-priority-selector')?.addEventListener('click', e => {
      const btn = e.target.closest('.priority-btn'); if(!btn) return;
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { priority: btn.dataset.priority });
      getEl('sb-priority-selector').querySelectorAll('.priority-btn')
        .forEach(b => b.classList.toggle('active', b === btn));
    });

    getEl('sb-tags')?.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ','){
        e.preventDefault();
        addTag(getEl('sb-tags').value.replace(',', ''));
      }
    });

    getEl('sidebar-close')?.addEventListener('click', close);

    getEl('btn-jump-tab')?.addEventListener('click', () => {
      const n = Store.getSelectedNode();
      if(n && n.type === 'subgrafo' && n.subgraphTabId){
        Store.switchTab(n.subgraphTabId);
      }
    });
  }

  return { open, openEdge, close, populate, populateEdge, bind };
})();
