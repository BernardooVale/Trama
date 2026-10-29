/**
 * Sidebar Component — Trama
 * Gerencia a barra lateral de propriedades de nós e arestas, debounce de digitação e tags.
 */
const Sidebar = (() => {
  let tTimer = null;
  let elTimer = null;
  let dTimer = null;
  let urlTimer = null;

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function getEl(id){ return document.getElementById(id); }

  function renderMarkdown(md){
    if(!md || !md.trim()) return '<p class="desc-empty">Nenhuma descrição informada. Alterne para <strong>Editar</strong> para escrever.</p>';
    let html = esc(md);
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="md-h3">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="md-h2">$1</h2>');
    // Checklists
    html = html.replace(/^- \[x\] (.*$)/gim, '<div class="md-check-item is-checked"><span class="md-cb">✓</span> <span>$1</span></div>');
    html = html.replace(/^- \[ \] (.*$)/gim, '<div class="md-check-item"><span class="md-cb">○</span> <span>$1</span></div>');
    // Bullet lists
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1 ↗</a>');
    // Line breaks
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br />');
    return `<div class="md-content"><p>${html}</p></div>`;
  }

  function setDescMode(mode){
    const editBtn = getEl('btn-desc-edit');
    const prevBtn = getEl('btn-desc-preview');
    const textarea = getEl('sb-desc');
    const preview = getEl('sb-desc-preview');
    if(!editBtn || !prevBtn || !textarea || !preview) return;

    if(mode === 'preview'){
      editBtn.classList.remove('active');
      prevBtn.classList.add('active');
      textarea.hidden = true;
      preview.hidden = false;
      const n = Store.getSelectedNode();
      preview.innerHTML = renderMarkdown(textarea.value || (n ? n.description : ''));
    } else {
      prevBtn.classList.remove('active');
      editBtn.classList.add('active');
      preview.hidden = true;
      textarea.hidden = false;
    }
  }

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
    if(urlTimer){
      clearTimeout(urlTimer);
      urlTimer = null;
      const n = Store.getSelectedNode();
      if(n) Store.updateNode(n.id, { url: getEl('sb-url').value }, { skipHistory: true });
    }
    getEl('sidebar')?.classList.remove('open');
  }

  function populate(node){
    const badge = getEl('sb-type-badge');
    if(badge){
      badge.textContent = node.type;
      badge.dataset.type = node.type;
    }

    const typeSelect = getEl('sb-type-select');
    if(typeSelect){
      typeSelect.value = node.type;
    }

    if(document.activeElement !== getEl('sb-title')){
      getEl('sb-title').value = node.title ?? '';
    }
    if(document.activeElement !== getEl('sb-desc')){
      getEl('sb-desc').value = node.description ?? '';
    }
    setDescMode('edit');

    getEl('sb-priority-selector').querySelectorAll('.priority-btn')
      .forEach(b => b.classList.toggle('active', b.dataset.priority === node.priority));

    renderTags(node.tags);

    // Contêiner / Grupo
    const cSelect = getEl('sb-container-select');
    const cRow = getEl('sb-container-row');
    if(cSelect && cRow){
      if(node.type === 'agrupador'){
        cRow.hidden = true;
      } else {
        cRow.hidden = false;
        const containers = Store.getContainers().filter(c => c.id !== node.id);
        cSelect.innerHTML = '<option value="">Nenhum (Livre)</option>' +
          containers.map(c => `<option value="${esc(c.id)}">${esc(c.title || 'Contêiner')}</option>`).join('');
        cSelect.value = node.parentId || '';
      }
    }

    // Link Externo
    const urlInput = getEl('sb-url');
    const urlOpen = getEl('sb-url-open');
    if(urlInput) urlInput.value = node.url || '';
    if(urlOpen){
      const hasUrl = Boolean(node.url);
      urlOpen.hidden = !hasUrl;
      if(hasUrl) urlOpen.href = node.url;
    }

    const isTexto = node.type === 'texto';
    getEl('sb-priority-row').hidden = isTexto;
    getEl('sb-tags-row').hidden = isTexto;

    if(node.type === 'subgrafo'){
      getEl('sb-subgraph-fields').hidden = false;
      const sgSelect = getEl('sb-subgraph-select');
      if(sgSelect){
        const importable = (typeof Store.getImportableTabs === 'function') ? Store.getImportableTabs() : [];
        sgSelect.innerHTML = '<option value="">Nenhuma (Selecione uma aba...)</option>' +
          importable.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
        sgSelect.value = node.subgraphTabId || '';
      }
      const jumpBtn = getEl('btn-jump-tab');
      if(jumpBtn){
        jumpBtn.disabled = !node.subgraphTabId;
        jumpBtn.style.opacity = node.subgraphTabId ? '1' : '0.5';
      }
    } else {
      getEl('sb-subgraph-fields').hidden = true;
    }

    // Dimensões & Tipografia do Vértice
    const fsSlider = getEl('sb-node-font-size');
    const fsVal = getEl('sb-node-font-size-val');
    const curFs = node.fontSize || 13;
    if(fsSlider) fsSlider.value = curFs;
    if(fsVal) fsVal.textContent = `${curFs}px`;

    const wInput = getEl('sb-node-width');
    const hInput = getEl('sb-node-height');
    if(wInput) wInput.value = node.customWidth ?? '';
    if(hInput) hInput.value = node.customHeight ?? '';

    const autoBtn = getEl('btn-node-size-auto');
    if(autoBtn) autoBtn.classList.toggle('active', !node.customWidth && !node.customHeight);

    const d = new Date(node.createdAt).toLocaleDateString('pt-BR');
    let usageStr = '';
    if(typeof Store.getTabs === 'function' && typeof ExplorerManager !== 'undefined'){
      const usage = ExplorerManager.getEntityUsage(Store.getTabs(), node.id);
      if(usage.length > 1){
        usageStr = ` · Usado em ${usage.length} bases/grafos`;
      }
    }
    getEl('sb-meta').textContent = `ID: ${node.id} · ${d}${usageStr}`;
  }

  function updateEdgeRotationUI(rot){
    const slider = getEl('sb-edge-rot-slider');
    const valEl = getEl('sb-edge-rot-val');
    const btnAuto = getEl('btn-edge-rot-autorotate');
    const btnHoriz = getEl('btn-edge-rot-horizontal');
    const btnVert = getEl('btn-edge-rot-vertical');

    const isAuto = rot === 'autorotate' || !rot;
    const isHoriz = rot === '0' || rot === 'horizontal' || rot === 'none' || rot === 0;
    const isVert = rot === '90' || rot === 'vertical' || rot === 90;

    btnAuto?.classList.toggle('active', isAuto);
    btnHoriz?.classList.toggle('active', isHoriz);
    btnVert?.classList.toggle('active', isVert);

    if(isAuto){
      if(valEl) valEl.textContent = 'Auto';
    } else {
      const num = parseInt(rot, 10);
      const valStr = `${isNaN(num) ? 0 : num}°`;
      if(valEl) valEl.textContent = valStr;
      if(slider && !isNaN(num)) slider.value = num;
    }
  }

  function setEdgeRotation(rot){
    const ed = Store.getSelectedEdge();
    if(!ed) return;
    updateEdgeRotationUI(rot);
    Store.updateEdge(ed.id, { labelRotation: rot });
  }

  function populateEdge(edge){
    const badge = getEl('sb-edge-type-badge');
    if(badge){
      badge.textContent = edge.edgeType;
      badge.dataset.type = edge.edgeType;
    }
    const edgeTypeSelect = getEl('sb-edge-type-select');
    if(edgeTypeSelect){
      edgeTypeSelect.value = edge.edgeType;
    }
    if(document.activeElement !== getEl('sb-edge-label')){
      getEl('sb-edge-label').value = edge.label ?? '';
    }
    const src = Store.getNode(edge.source)?.title ?? edge.source;
    const tgt = Store.getNode(edge.target)?.title ?? edge.target;
    getEl('sb-edge-endpoints').textContent = `${src} → ${tgt}`;
    getEl('sb-meta').textContent = `ID: ${edge.id}`;

    // Tipografia e Angulação do Rótulo
    updateEdgeRotationUI(edge.labelRotation || 'autorotate');

    const edgeFs = edge.fontSize || 11;
    const edgeFsSlider = getEl('sb-edge-font-size');
    const edgeFsVal = getEl('sb-edge-font-size-val');
    if(edgeFsSlider) edgeFsSlider.value = edgeFs;
    if(edgeFsVal) edgeFsVal.textContent = `${edgeFs}px`;

    // Estilo Visual da Curva
    const curveStyle = edge.curveStyle || 'bezier';
    const curveSelect = getEl('sb-edge-curve-style');
    if(curveSelect) curveSelect.value = curveStyle;

    const taxiBox = getEl('sb-edge-taxi-controls');
    const inflectBox = getEl('sb-edge-inflection-controls');
    if(taxiBox) taxiBox.hidden = curveStyle !== 'taxi';
    if(inflectBox) inflectBox.hidden = (curveStyle !== 'unbundled-bezier' && curveStyle !== 'segments');

    // Taxi controls
    const taxiDir = getEl('sb-edge-taxi-dir');
    if(taxiDir) taxiDir.value = edge.taxiDirection || 'auto';
    const taxiTurn = parseInt(edge.taxiTurn || '50', 10) || 50;
    const taxiTurnEl = getEl('sb-edge-taxi-turn');
    if(taxiTurnEl) taxiTurnEl.value = taxiTurn;
    const taxiTurnVal = getEl('sb-edge-taxi-turn-val');
    if(taxiTurnVal) taxiTurnVal.textContent = `${taxiTurn}%`;

    // Inflection controls
    const cpDist = Number(edge.controlPointDistance ?? 40);
    const cpDistEl = getEl('sb-edge-cp-distance');
    if(cpDistEl) cpDistEl.value = cpDist;
    const cpDistVal = getEl('sb-edge-cp-distance-val');
    if(cpDistVal) cpDistVal.textContent = `${cpDist >= 0 ? '+' : ''}${cpDist}px`;

    const cpWeight = Math.round((edge.controlPointWeight ?? 0.5) * 100);
    const cpWeightEl = getEl('sb-edge-cp-weight');
    if(cpWeightEl) cpWeightEl.value = cpWeight;
    const cpWeightVal = getEl('sb-edge-cp-weight-val');
    if(cpWeightVal) cpWeightVal.textContent = `${cpWeight}%`;

    // Padrão do Traço e Direção de Setas
    const linePatSelect = getEl('sb-edge-line-pattern');
    if(linePatSelect) linePatSelect.value = edge.linePattern || 'default';

    const arrowDirSelect = getEl('sb-edge-arrow-dir');
    if(arrowDirSelect) arrowDirSelect.value = edge.arrowDirection || (edge.directed === false ? 'none' : 'target');
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

    getEl('btn-desc-edit')?.addEventListener('click', () => setDescMode('edit'));
    getEl('btn-desc-preview')?.addEventListener('click', () => setDescMode('preview'));

    getEl('sb-type-select')?.addEventListener('change', e => {
      const n = Store.getSelectedNode();
      if(!n) return;
      const newType = e.target.value;
      if(newType === n.type) return;
      try {
        const cy = (typeof Graph !== 'undefined' && Graph.getInstance) ? Graph.getInstance() : null;
        const selectedNodes = cy ? cy.$('node:selected').map(el => el.id()) : [];
        const targetIds = (selectedNodes.length > 1 && selectedNodes.includes(n.id))
          ? selectedNodes
          : [n.id];

        Store.batch(() => {
          targetIds.forEach(id => Store.updateNode(id, { type: newType }));
        });

        if(typeof App !== 'undefined' && App.toast){
          App.toast(targetIds.length > 1
            ? `${targetIds.length} vértices alterados para "${newType}"`
            : `Tipo alterado para "${newType}"`
          );
        }
      } catch(err){
        if(typeof App !== 'undefined' && App.toast) App.toast(err.message);
        e.target.value = n.type;
      }
    });

    getEl('sb-edge-type-select')?.addEventListener('change', e => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      const newType = e.target.value;
      if(newType === ed.edgeType) return;
      try {
        const cy = (typeof Graph !== 'undefined' && Graph.getInstance) ? Graph.getInstance() : null;
        const selectedEdges = cy ? cy.$('edge:selected').map(el => el.id()) : [];
        const targetIds = (selectedEdges.length > 1 && selectedEdges.includes(ed.id))
          ? selectedEdges
          : [ed.id];

        Store.batch(() => {
          targetIds.forEach(id => Store.updateEdge(id, { edgeType: newType }));
        });

        if(typeof App !== 'undefined' && App.toast){
          App.toast(targetIds.length > 1
            ? `${targetIds.length} arestas alteradas para "${newType}"`
            : `Tipo alterado para "${newType}"`
          );
        }
      } catch(err){
        if(typeof App !== 'undefined' && App.toast) App.toast(err.message);
        e.target.value = ed.edgeType;
      }
    });

    // Formato de Curva
    // Rotação do rótulo da aresta
    getEl('btn-edge-rot-autorotate')?.addEventListener('click', () => setEdgeRotation('autorotate'));
    getEl('btn-edge-rot-horizontal')?.addEventListener('click', () => setEdgeRotation('0'));
    getEl('btn-edge-rot-vertical')?.addEventListener('click', () => setEdgeRotation('90'));
    getEl('btn-edge-rot-reset')?.addEventListener('click', () => setEdgeRotation('autorotate'));

    getEl('sb-edge-rot-slider')?.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      const ed = Store.getSelectedEdge(); if(!ed) return;
      updateEdgeRotationUI(String(val));
      Store.updateEdge(ed.id, { labelRotation: String(val) }, { skipHistory: true });
    });

    getEl('sb-edge-rot-slider')?.addEventListener('change', e => {
      const val = parseInt(e.target.value, 10);
      const ed = Store.getSelectedEdge(); if(!ed) return;
      Store.updateEdge(ed.id, { labelRotation: String(val) });
    });

    // Tamanho da fonte do rótulo da aresta
    getEl('sb-edge-font-size')?.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      const valEl = getEl('sb-edge-font-size-val');
      if(valEl) valEl.textContent = `${val}px`;
      const ed = Store.getSelectedEdge(); if(!ed) return;
      Store.updateEdge(ed.id, { fontSize: val }, { skipHistory: true });
    });

    getEl('sb-edge-font-size')?.addEventListener('change', e => {
      const val = parseInt(e.target.value, 10);
      const ed = Store.getSelectedEdge(); if(!ed) return;
      Store.updateEdge(ed.id, { fontSize: val });
    });

    getEl('btn-edge-font-size-reset')?.addEventListener('click', () => {
      const slider = getEl('sb-edge-font-size');
      const valEl = getEl('sb-edge-font-size-val');
      if(slider) slider.value = 11;
      if(valEl) valEl.textContent = '11px';
      const ed = Store.getSelectedEdge(); if(!ed) return;
      Store.updateEdge(ed.id, { fontSize: null });
    });

    getEl('sb-edge-curve-style')?.addEventListener('change', e => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      const newCurve = e.target.value;
      const changes = { curveStyle: newCurve };
      if((newCurve === 'unbundled-bezier' || newCurve === 'segments') && !ed.controlPointDistance){
        changes.controlPointDistance = 40;
        changes.segmentDistance = 40;
      }
      try {
        const cy = (typeof Graph !== 'undefined' && Graph.getInstance) ? Graph.getInstance() : null;
        const selectedEdges = cy ? cy.$('edge:selected').map(el => el.id()) : [];
        const targetIds = (selectedEdges.length > 1 && selectedEdges.includes(ed.id))
          ? selectedEdges
          : [ed.id];

        Store.batch(() => {
          targetIds.forEach(id => Store.updateEdge(id, changes));
        });

        const taxiBox = getEl('sb-edge-taxi-controls');
        const inflectBox = getEl('sb-edge-inflection-controls');
        if(taxiBox) taxiBox.hidden = newCurve !== 'taxi';
        if(inflectBox) inflectBox.hidden = (newCurve !== 'unbundled-bezier' && newCurve !== 'segments');
      } catch(err){
        if(typeof App !== 'undefined' && App.toast) App.toast(err.message);
      }
    });

    // Taxi Direção
    getEl('sb-edge-taxi-dir')?.addEventListener('change', e => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      Store.updateEdge(ed.id, { taxiDirection: e.target.value });
    });

    // Taxi Giro / Dobra
    getEl('sb-edge-taxi-turn')?.addEventListener('input', e => {
      const val = `${e.target.value}%`;
      const valEl = getEl('sb-edge-taxi-turn-val');
      if(valEl) valEl.textContent = val;
      const cy = (typeof Graph !== 'undefined' && Graph.getInstance) ? Graph.getInstance() : null;
      const ed = Store.getSelectedEdge();
      if(cy && ed){
        const ce = cy.getElementById(ed.id);
        if(ce && ce.length) ce.data('taxiTurn', val);
        if(typeof GraphEdgeHandle !== 'undefined') GraphEdgeHandle.update(cy);
      }
    });
    getEl('sb-edge-taxi-turn')?.addEventListener('change', e => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      Store.updateEdge(ed.id, { taxiTurn: `${e.target.value}%` });
    });

    // Inflexão Curvatura / Distância
    getEl('sb-edge-cp-distance')?.addEventListener('input', e => {
      const num = Number(e.target.value);
      const valEl = getEl('sb-edge-cp-distance-val');
      if(valEl) valEl.textContent = `${num >= 0 ? '+' : ''}${num}px`;
      const cy = (typeof Graph !== 'undefined' && Graph.getInstance) ? Graph.getInstance() : null;
      const ed = Store.getSelectedEdge();
      if(cy && ed){
        const ce = cy.getElementById(ed.id);
        if(ce && ce.length){
          ce.data('controlPointDistance', num);
          ce.data('segmentDistance', num);
        }
        if(typeof GraphEdgeHandle !== 'undefined') GraphEdgeHandle.update(cy);
      }
    });
    getEl('sb-edge-cp-distance')?.addEventListener('change', e => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      const num = Number(e.target.value);
      Store.updateEdge(ed.id, { controlPointDistance: num, segmentDistance: num });
    });

    // Resetar Inflexão para zero
    getEl('btn-reset-cp-dist')?.addEventListener('click', () => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      const rangeEl = getEl('sb-edge-cp-distance');
      if(rangeEl) rangeEl.value = 0;
      const valEl = getEl('sb-edge-cp-distance-val');
      if(valEl) valEl.textContent = '0px';
      Store.updateEdge(ed.id, { controlPointDistance: 0, segmentDistance: 0 });
    });

    // Inflexão Posição / Peso
    getEl('sb-edge-cp-weight')?.addEventListener('input', e => {
      const num = Number(e.target.value);
      const valEl = getEl('sb-edge-cp-weight-val');
      if(valEl) valEl.textContent = `${num}%`;
      const cy = (typeof Graph !== 'undefined' && Graph.getInstance) ? Graph.getInstance() : null;
      const ed = Store.getSelectedEdge();
      if(cy && ed){
        const ce = cy.getElementById(ed.id);
        if(ce && ce.length){
          ce.data('controlPointWeight', num / 100);
          ce.data('segmentWeight', num / 100);
        }
        if(typeof GraphEdgeHandle !== 'undefined') GraphEdgeHandle.update(cy);
      }
    });
    getEl('sb-edge-cp-weight')?.addEventListener('change', e => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      const weight = Number(e.target.value) / 100;
      Store.updateEdge(ed.id, { controlPointWeight: weight, segmentWeight: weight });
    });

    // Padrão do Traço
    getEl('sb-edge-line-pattern')?.addEventListener('change', e => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      Store.updateEdge(ed.id, { linePattern: e.target.value });
    });

    // Direção das Setas
    getEl('sb-edge-arrow-dir')?.addEventListener('change', e => {
      const ed = Store.getSelectedEdge();
      if(!ed) return;
      Store.updateEdge(ed.id, { arrowDirection: e.target.value, directed: e.target.value !== 'none' });
    });

    getEl('sb-subgraph-select')?.addEventListener('change', e => {
      const n = Store.getSelectedNode();
      if(!n) return;
      const targetTabId = e.target.value || null;
      try {
        Store.updateNode(n.id, { subgraphTabId: targetTabId });
        if(targetTabId && (!n.title || n.title === 'Novo vértice' || n.title === 'Subgrafo')){
          const targetTab = Store.getTabs().find(t => t.id === targetTabId);
          if(targetTab){
            Store.updateNode(n.id, { title: targetTab.name });
          }
        }
        const jumpBtn = getEl('btn-jump-tab');
        if(jumpBtn){
          jumpBtn.disabled = !targetTabId;
          jumpBtn.style.opacity = targetTabId ? '1' : '0.5';
        }
        if(typeof App !== 'undefined' && App.toast) App.toast('Subgrafo vinculado com sucesso');
      } catch(err){
        if(typeof App !== 'undefined' && App.toast) App.toast(err.message);
        e.target.value = n.subgraphTabId || '';
      }
    });

    getEl('sb-container-select')?.addEventListener('change', e => {
      const n = Store.getSelectedNode();
      if(!n) return;
      Store.updateNode(n.id, { parentId: e.target.value || null });
    });

    let urlStarted = false;
    getEl('sb-url')?.addEventListener('input', e => {
      if(!urlStarted){
        Store.recordHistory();
        urlStarted = true;
      }
      clearTimeout(urlTimer);
      const val = e.target.value.trim();
      const urlOpen = getEl('sb-url-open');
      if(urlOpen){
        urlOpen.hidden = !val;
        urlOpen.href = val;
      }
      urlTimer = setTimeout(() => {
        urlTimer = null;
        const n = Store.getSelectedNode(); if(!n) return;
        Store.updateNode(n.id, { url: val }, { skipHistory: true });
      }, 300);
    });

    getEl('sb-url')?.addEventListener('blur', e => {
      if(urlTimer){
        clearTimeout(urlTimer);
        urlTimer = null;
      }
      urlStarted = false;
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { url: e.target.value.trim() }, { skipHistory: true });
    });

    getEl('sb-priority-selector')?.addEventListener('click', e => {
      const btn = e.target.closest('.priority-btn'); if(!btn) return;
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { priority: btn.dataset.priority });
      getEl('sb-priority-selector').querySelectorAll('.priority-btn')
        .forEach(b => b.classList.toggle('active', b === btn));
    });

    // Font size do nó
    getEl('sb-node-font-size')?.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      const valEl = getEl('sb-node-font-size-val');
      if(valEl) valEl.textContent = `${val}px`;
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { fontSize: val }, { skipHistory: true });
    });

    getEl('sb-node-font-size')?.addEventListener('change', e => {
      const val = parseInt(e.target.value, 10);
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { fontSize: val });
    });

    getEl('btn-node-font-size-reset')?.addEventListener('click', () => {
      const slider = getEl('sb-node-font-size');
      const valEl = getEl('sb-node-font-size-val');
      if(slider) slider.value = 13;
      if(valEl) valEl.textContent = '13px';
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { fontSize: null });
    });

    // Dimensões do nó
    const applyNodeDimensions = (recordHist = true) => {
      const n = Store.getSelectedNode(); if(!n) return;
      const wVal = getEl('sb-node-width')?.value.trim();
      const hVal = getEl('sb-node-height')?.value.trim();
      const w = wVal ? Math.max(40, parseInt(wVal, 10) || 0) : null;
      const h = hVal ? Math.max(30, parseInt(hVal, 10) || 0) : null;
      const autoBtn = getEl('btn-node-size-auto');
      if(autoBtn) autoBtn.classList.toggle('active', !w && !h);
      Store.updateNode(n.id, { customWidth: w, customHeight: h }, { skipHistory: !recordHist });
    };

    getEl('sb-node-width')?.addEventListener('change', () => applyNodeDimensions(true));
    getEl('sb-node-height')?.addEventListener('change', () => applyNodeDimensions(true));

    getEl('btn-node-size-auto')?.addEventListener('click', () => {
      const wInput = getEl('sb-node-width');
      const hInput = getEl('sb-node-height');
      if(wInput) wInput.value = '';
      if(hInput) hInput.value = '';
      const autoBtn = getEl('btn-node-size-auto');
      if(autoBtn) autoBtn.classList.add('active');
      const n = Store.getSelectedNode(); if(!n) return;
      Store.updateNode(n.id, { customWidth: null, customHeight: null });
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
