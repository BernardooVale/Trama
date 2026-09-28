/**
 * ContextMenu Component — Trama
 * Gerencia o menu de contexto flutuante para nós, arestas, tela (core) e abas.
 */
const ContextMenu = (() => {
  function getEl(){ return document.getElementById('context-menu'); }
  let targetId = null;
  let targetPos = null;

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function hide(){
    const el = getEl();
    if(el) el.hidden = true;
    targetId = null;
    targetPos = null;
  }

  function position(x, y){
    const el = getEl();
    if(!el) return;
    el.hidden = false;
    const rect = el.getBoundingClientRect();
    const left = (x + rect.width > window.innerWidth) ? window.innerWidth - rect.width - 10 : x;
    const top  = (y + rect.height > window.innerHeight) ? window.innerHeight - rect.height - 10 : y;
    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;
  }

  function showNodeMenu(id, cx, cy){
    targetId = id;
    const el = getEl();
    if(!el) return;
    const node = Store.getNode(id);
    const hasParent = Boolean(node && node.parentId);
    const isParent = Boolean(node && node.type === 'agrupador');

    let compoundActions = '';
    if(isParent){
      compoundActions = `<button class="cm-item" data-action="ungroup-parent">Desagrupar Contêiner</button>`;
    } else {
      if(hasParent){
        compoundActions = `<button class="cm-item" data-action="ungroup">Remover do Contêiner</button>`;
      }
      compoundActions += `<button class="cm-item" data-action="group">Agrupar em Contêiner</button>`;
    }

    el.innerHTML = `
      <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Ações Rápidas</div>
      <button class="cm-item" data-action="quick-child">⚡ Criar Filho Conectado <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Tab</span></button>
      <div class="cm-divider"></div>
      <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Nova Aresta</div>
      <button class="cm-item" data-action="edge" data-edge="dependencia">Dependência</button>
      <button class="cm-item" data-action="edge" data-edge="resolve">Resolve</button>
      <button class="cm-item" data-action="edge" data-edge="relaciona">Relaciona</button>
      <button class="cm-item" data-action="edge" data-edge="neutra">Neutra</button>
      <div class="cm-divider"></div>
      ${compoundActions}
      <button class="cm-item" data-action="copy">Copiar Vértice <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Ctrl+C</span></button>
      <button class="cm-item" data-action="delete" style="color:var(--node-problema)">Excluir Vértice</button>
    `;
    position(cx, cy);
  }

  function showEdgeMenu(id, cx, cy){
    targetId = id;
    const el = getEl();
    if(!el) return;
    const edge = Store.getEdge(id);
    const label = edge ? (edge.label || edge.edgeType) : 'Aresta';
    el.innerHTML = `
      <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Aresta: ${esc(label)}</div>
      <button class="cm-item" data-action="edit-edge">Editar Propriedades</button>
      <div class="cm-divider"></div>
      <button class="cm-item" data-action="delete-edge" style="color:var(--node-problema)">Excluir Aresta</button>
    `;
    position(cx, cy);
  }

  function showCoreMenu(gx, gy, cx, cy){
    targetPos = { x: gx, y: gy };
    const el = getEl();
    if(!el) return;
    const canPaste = App.hasClipboard();
    const importableTabs = Store.getImportableTabs();

    let importTabsHtml = '';
    if(importableTabs.length > 0){
      importTabsHtml = `
        <div class="cm-divider"></div>
        <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Importar Subgrafo</div>
        ${importableTabs.map(t => `
          <button class="cm-item" data-action="import-tab" data-tab-id="${esc(t.id)}" data-tab-name="${esc(t.name)}">
            <span class="dd-dot" style="background:var(--node-subgrafo)"></span>${esc(t.name)}
          </button>
        `).join('')}
      `;
    }

    el.innerHTML = `
      <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Novo Vértice</div>
      <button class="cm-item" data-action="add" data-type="problema"><span class="dd-dot dd-dot--problema"></span>Problema</button>
      <button class="cm-item" data-action="add" data-type="solucao"><span class="dd-dot dd-dot--solucao"></span>Solução</button>
      <button class="cm-item" data-action="add" data-type="agrupador"><span class="dd-dot dd-dot--agrupador"></span>Contêiner / Agrupador</button>
      <button class="cm-item" data-action="add" data-type="neutro"><span class="dd-dot dd-dot--neutro"></span>Neutro</button>
      <button class="cm-item" data-action="add" data-type="texto"><span class="dd-dot dd-dot--texto"></span>Texto <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">T</span></button>
      ${importTabsHtml}
      <div class="cm-divider"></div>
      <button class="cm-item" data-action="paste" ${canPaste ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}>
        Colar Vértice <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Ctrl+V</span>
      </button>
      <button class="cm-item" data-action="undo" ${Store.canUndo() ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}>
        Desfazer <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Ctrl+Z</span>
      </button>
      <button class="cm-item" data-action="redo" ${Store.canRedo() ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}>
        Refazer <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Ctrl+Y</span>
      </button>
      <div class="cm-divider"></div>
      <button class="cm-item" data-action="diagnostics">Diagnóstico de Arquitetura 🩺</button>
      <button class="cm-item" data-action="zen">Modo Zen <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Z</span></button>
    `;
    position(cx, cy);
  }

  function bind(){
    const el = getEl();
    if(!el) return;

    el.addEventListener('click', e => {
      const btn = e.target.closest('.cm-item');
      if(!btn || btn.dataset.action === undefined || btn.disabled) return;
      
      const action = btn.dataset.action;
      const currentTargetId = targetId;
      const currentTargetPos = targetPos;
      hide();

      if(action === 'add' && currentTargetPos){
        const node = Graph.addNodeAtPos(btn.dataset.type, currentTargetPos.x, currentTargetPos.y);
        Store.selectNode(node.id);
        Sidebar.open(node.id, true);
      }
      else if(action === 'quick-child' && currentTargetId){
        Graph.createQuickChild(currentTargetId);
      }
      else if(action === 'group'){
        const cy = Graph.getInstance();
        const selectedIds = cy ? cy.$('node:selected').map(n => n.id()) : [];
        const targetIds = selectedIds.length ? selectedIds : (currentTargetId ? [currentTargetId] : []);
        if(targetIds.length){
          const container = Store.groupNodes(targetIds);
          if(container){
            Store.selectNode(container.id);
            Sidebar.open(container.id, true);
          }
        }
      }
      else if(action === 'ungroup' && currentTargetId){
        Store.ungroupNode(currentTargetId);
      }
      else if(action === 'ungroup-parent' && currentTargetId){
        Store.ungroupParent(currentTargetId);
      }
      else if(action === 'import-tab' && currentTargetPos){
        const tabId = btn.dataset.tabId;
        const tabName = btn.dataset.tabName;
        const node = Store.addNode({
          type: 'subgrafo',
          title: tabName,
          subgraphTabId: tabId,
          x: currentTargetPos.x,
          y: currentTargetPos.y,
        });
        Store.selectNode(node.id);
        if(typeof App !== 'undefined' && App.toast) App.toast(`Subgrafo "${tabName}" importado`);
      }
      else if(action === 'edge' && currentTargetId){
        Graph.startEdgeModeFromContext(btn.dataset.edge, currentTargetId);
      }
      else if(action === 'copy'){
        if(currentTargetId){
          Store.selectNode(currentTargetId);
        }
        App.copySelection();
      }
      else if(action === 'paste' && currentTargetPos){
        App.pasteClipboard(currentTargetPos);
      }
      else if(action === 'undo'){
        App.undoAction();
      }
      else if(action === 'redo'){
        App.redoAction();
      }
      else if(action === 'diagnostics'){
        App.openDiagnostics();
      }
      else if(action === 'zen'){
        App.toggleZenMode();
      }
      else if(action === 'delete' && currentTargetId){
        Store.deleteNode(currentTargetId);
      }
      else if(action === 'edit-edge' && currentTargetId){
        Store.selectEdge(currentTargetId);
        Sidebar.openEdge(currentTargetId);
      }
      else if(action === 'delete-edge' && currentTargetId){
        Store.deleteEdge(currentTargetId);
      }
      else if(action === 'tab-rename' && btn.dataset.tabId){
        const tId = btn.dataset.tabId;
        const activeItem = document.getElementById('tabs-list')?.querySelector(`.tab-item[data-tab-id="${tId}"] .tab-title`);
        if(activeItem) TabsUI.startInlineRename(tId, activeItem);
      }
      else if(action === 'tab-duplicate'){
        Store.createTab();
      }
      else if(action === 'tab-delete' && btn.dataset.tabId){
        TabsUI.deleteTabPrompt(btn.dataset.tabId);
      }
    });

    document.addEventListener('click', e => {
      if(!e.target.closest('#context-menu')) hide();
    });

    const cyEl = document.getElementById('cy');
    if(cyEl){
      cyEl.addEventListener('contextmenu', e => {
        e.preventDefault();
      });
    }
  }

  return { showNodeMenu, showEdgeMenu, showCoreMenu, hide, bind };
})();
