/**
 * ExplorerUI Component — Trama
 * Implementa a barra lateral esquerda retrátil estilo VS Code Explorer:
 * - Seletor e gerenciador de múltiplos projetos isolados no topo
 * - Criação, troca, exportação, renomeação e exclusão de projetos
 * - Árvore hierárquica de pastas (módulos do projeto) e arquivos de grafos (telas/abas)
 * - Criação de pastas, subpastas e grafos
 * - Renomeação inline e exclusão
 * - Painel de dados únicos escopados ao projeto ativo com busca e inserção direta no grafo
 */
const ExplorerUI = (() => {
  let isCollapsed = false;
  let entityFilterText = '';

  function getSidebarEl(){ return document.getElementById('explorer-sidebar'); }
  function getTreeEl(){ return document.getElementById('explorer-tree'); }
  function getEntitiesEl(){ return document.getElementById('explorer-entities-list'); }
  function getEntitiesBadgeEl(){ return document.getElementById('explorer-entities-count'); }
  function getProjectTitleEl(){ return document.getElementById('explorer-project-title'); }
  function getProjectDropdownEl(){ return document.getElementById('dd-project'); }
  function getProjectMenuEl(){ return document.getElementById('dd-project-menu'); }

  function esc(s){
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Alternar Visibilidade da Barra Lateral (Ctrl+B) ─ */
  function toggleSidebar(forceState){
    const el = getSidebarEl();
    if(!el) return;
    if(typeof forceState === 'boolean'){
      isCollapsed = !forceState;
    } else {
      isCollapsed = !isCollapsed;
    }
    el.classList.toggle('collapsed', isCollapsed);
    const toggleBtn = document.getElementById('btn-toggle-explorer');
    if(toggleBtn) toggleBtn.classList.toggle('active', !isCollapsed);

    // Ajusta o Cytoscape após redimensionamento da janela
    setTimeout(() => {
      const cy = (typeof Graph !== 'undefined') ? Graph.getInstance() : null;
      if(cy) cy.resize();
    }, 220);
  }

  function openSidebar(){ toggleSidebar(true); }
  function closeSidebar(){ toggleSidebar(false); }

  /* ── Gestão de Projetos (Dropdown & Modais) ─────── */
  function renderProjectName(){
    const el = getProjectTitleEl();
    if(el && typeof Store.getProjectName === 'function'){
      el.textContent = `PROJETO: ${Store.getProjectName()}`;
    }
  }

  function toggleProjectDropdown(forceOpen){
    const dd = getProjectDropdownEl();
    if(!dd) return;
    const shouldOpen = (typeof forceOpen === 'boolean') ? forceOpen : !dd.classList.contains('open');
    if(shouldOpen){
      renderProjectDropdown();
      dd.classList.add('open');
    } else {
      dd.classList.remove('open');
    }
  }

  function renderProjectDropdown(){
    const menuEl = getProjectMenuEl();
    if(!menuEl) return;

    menuEl.innerHTML = '';

    const currentId = Store.getProjectId ? Store.getProjectId() : 'proj_nobiu';
    const currentName = Store.getProjectName ? Store.getProjectName() : 'Nobiu';
    const projects = Store.getProjectsList ? Store.getProjectsList() : [];

    // 1. Botão Criar Novo Projeto
    const btnNew = document.createElement('button');
    btnNew.className = 'dd-action-btn dd-action-btn--primary';
    btnNew.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Novo Projeto...</span>
    `;
    btnNew.addEventListener('click', e => {
      e.stopPropagation();
      toggleProjectDropdown(false);
      promptCreateProject();
    });
    menuEl.appendChild(btnNew);

    // 2. Seção: Seus Projetos
    if(projects.length > 0){
      const secTitle = document.createElement('div');
      secTitle.className = 'dd-section-title';
      secTitle.textContent = 'SEUS PROJETOS';
      menuEl.appendChild(secTitle);

      projects.forEach(proj => {
        const item = document.createElement('div');
        const isActive = proj.id === currentId;
        item.className = `dd-proj-item${isActive ? ' active' : ''}`;
        item.title = `Alternar para o projeto "${proj.name}"`;

        const info = document.createElement('div');
        info.className = 'dd-proj-info';

        const nameSpan = document.createElement('div');
        nameSpan.className = 'dd-proj-name';
        nameSpan.textContent = proj.name;
        info.appendChild(nameSpan);

        const metaSpan = document.createElement('div');
        metaSpan.className = 'dd-proj-meta';
        const grafosCount = proj.tabCount || 1;
        const dadosCount = proj.entityCount || 0;
        metaSpan.textContent = `${grafosCount} ${grafosCount === 1 ? 'grafo' : 'grafos'} · ${dadosCount} ${dadosCount === 1 ? 'dado' : 'dados'}`;
        info.appendChild(metaSpan);

        item.appendChild(info);

        if(isActive){
          const check = document.createElement('span');
          check.className = 'dd-proj-check';
          check.innerHTML = '✓';
          item.appendChild(check);
        }

        item.addEventListener('click', e => {
          e.stopPropagation();
          toggleProjectDropdown(false);
          if(!isActive){
            Store.switchProject(proj.id);
            if(typeof App !== 'undefined' && App.toast) App.toast(`Projeto alterado para "${proj.name}"`);
          }
        });

        menuEl.appendChild(item);
      });
    }

    // 3. Seção: Ações do Projeto
    const secActions = document.createElement('div');
    secActions.className = 'dd-section-title';
    secActions.textContent = 'AÇÕES';
    menuEl.appendChild(secActions);

    // Importar Projeto
    const btnImport = document.createElement('button');
    btnImport.className = 'dd-action-btn';
    btnImport.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Importar Projeto (.json)...</span>
    `;
    btnImport.addEventListener('click', e => {
      e.stopPropagation();
      toggleProjectDropdown(false);
      promptImportProject();
    });
    menuEl.appendChild(btnImport);

    // Exportar Projeto
    const btnExport = document.createElement('button');
    btnExport.className = 'dd-action-btn';
    btnExport.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span>Exportar Projeto (.json)</span>
    `;
    btnExport.addEventListener('click', e => {
      e.stopPropagation();
      toggleProjectDropdown(false);
      Store.exportJSON();
    });
    menuEl.appendChild(btnExport);

    // Renomear Projeto
    const btnRename = document.createElement('button');
    btnRename.className = 'dd-action-btn';
    btnRename.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
      <span>Renomear Projeto...</span>
    `;
    btnRename.addEventListener('click', e => {
      e.stopPropagation();
      toggleProjectDropdown(false);
      promptRenameProject();
    });
    menuEl.appendChild(btnRename);

    // Excluir Projeto
    if(projects.length > 1){
      const btnDelete = document.createElement('button');
      btnDelete.className = 'dd-action-btn dd-action-btn--danger';
      btnDelete.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>Excluir Este Projeto...</span>
      `;
      btnDelete.addEventListener('click', e => {
        e.stopPropagation();
        toggleProjectDropdown(false);
        promptDeleteCurrentProject();
      });
      menuEl.appendChild(btnDelete);
    }
  }

  function promptCreateProject(){
    const name = prompt('Nome do novo projeto:', 'Novo Projeto');
    if(name && name.trim()){
      const cleanName = name.trim();
      const newId = Store.createProject(cleanName);
      renderProjectName();
      if(typeof App !== 'undefined' && App.toast){
        App.toast(`Projeto "${cleanName}" criado com sucesso!`);
      }
    }
  }

  function promptRenameProject(){
    const curr = (typeof Store.getProjectName === 'function') ? Store.getProjectName() : 'Nobiu';
    const next = prompt('Nome do Projeto:', curr);
    if(next && next.trim()){
      Store.setProjectName(next.trim());
      renderProjectName();
      if(typeof App !== 'undefined' && App.toast) App.toast(`Projeto renomeado para "${next.trim()}"`);
    }
  }

  function promptDeleteCurrentProject(){
    const currName = Store.getProjectName ? Store.getProjectName() : 'este projeto';
    const currId = Store.getProjectId ? Store.getProjectId() : null;
    if(!currId) return;

    if(confirm(`Deseja realmente excluir o projeto "${currName}"?\n(Esta ação removerá todas as pastas, grafos e dados exclusivos deste projeto).`)){
      try {
        Store.deleteProject(currId);
        if(typeof App !== 'undefined' && App.toast) App.toast(`Projeto "${currName}" excluído.`);
      } catch(err){
        alert(err.message);
      }
    }
  }

  function promptImportProject(){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if(!file) return;
      const asNew = confirm(`Deseja importar como um NOVO projeto?\n\n• Clique OK para criar um novo projeto separado.\n• Clique Cancelar para substituir o conteúdo do projeto atual.`);
      Store.importJSON(file, asNew).then(count => {
        if(typeof App !== 'undefined' && App.toast){
          App.toast(`Projeto importado (${count} nós carregados)`);
        }
      }).catch(err => {
        alert(err.message);
      });
    });
    input.click();
  }

  /* ── Renderização da Árvore de Pastas e Grafos ── */
  function renderTree(){
    const treeEl = getTreeEl();
    if(!treeEl) return;

    renderProjectName();

    const { rootFolders, rootTabs } = Store.getExplorerTree();
    const activeTabId = Store.getActiveTabId();

    treeEl.innerHTML = '';

    // Renderiza pastas raízes
    rootFolders.forEach(folder => {
      treeEl.appendChild(createFolderNode(folder, activeTabId, 0));
    });

    // Renderiza grafos na raiz (sem pasta)
    if(rootTabs.length > 0){
      rootTabs.forEach(tab => {
        treeEl.appendChild(createTabNode(tab, activeTabId, 0));
      });
    }

    if(rootFolders.length === 0 && rootTabs.length === 0){
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'explorer-empty';
      emptyMsg.innerHTML = 'Nenhuma pasta criada neste projeto.<br><button class="btn-link" id="btn-empty-create-fld">+ Criar Pasta</button>';
      treeEl.appendChild(emptyMsg);
      emptyMsg.querySelector('#btn-empty-create-fld')?.addEventListener('click', () => promptCreateFolder(null));
    }
  }

  function createFolderNode(folder, activeTabId, depth = 0){
    const folderWrap = document.createElement('div');
    folderWrap.className = 'tree-item-group';

    const row = document.createElement('div');
    row.className = `tree-row tree-row--folder${folder.isExpanded ? ' is-expanded' : ''}`;
    row.dataset.folderId = folder.id;
    row.style.paddingLeft = `${12 + depth * 14}px`;

    // Chevron
    const chevron = document.createElement('span');
    chevron.className = 'tree-chevron';
    chevron.innerHTML = folder.isExpanded ? '▾' : '▸';
    chevron.addEventListener('click', e => {
      e.stopPropagation();
      Store.toggleFolderExpand(folder.id);
    });
    row.appendChild(chevron);

    // Ícone de pasta
    const icon = document.createElement('span');
    icon.className = 'tree-icon tree-icon--folder';
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    row.appendChild(icon);

    // Nome da pasta
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tree-label';
    nameSpan.textContent = folder.name;
    nameSpan.title = `${folder.name} (Pasta do Projeto)`;
    row.appendChild(nameSpan);

    // Contagem de itens
    const countBadge = document.createElement('span');
    countBadge.className = 'tree-badge';
    const totalItems = (folder.childrenFolders?.length || 0) + (folder.childrenTabs?.length || 0);
    countBadge.textContent = totalItems > 0 ? String(totalItems) : '';
    row.appendChild(countBadge);

    // Ações de hover (Novo arquivo, Nova subpasta, Renomear, Excluir)
    const actions = document.createElement('div');
    actions.className = 'tree-row-actions';

    const btnNewFile = document.createElement('button');
    btnNewFile.className = 'tree-act-btn';
    btnNewFile.title = 'Novo Grafo nesta pasta';
    btnNewFile.innerHTML = '📄';
    btnNewFile.addEventListener('click', e => {
      e.stopPropagation();
      promptCreateGraph(folder.id);
    });

    const btnNewSub = document.createElement('button');
    btnNewSub.className = 'tree-act-btn';
    btnNewSub.title = 'Nova Subpasta';
    btnNewSub.innerHTML = '📁';
    btnNewSub.addEventListener('click', e => {
      e.stopPropagation();
      promptCreateFolder(folder.id);
    });

    const btnRename = document.createElement('button');
    btnRename.className = 'tree-act-btn';
    btnRename.title = 'Renomear pasta';
    btnRename.innerHTML = '✏️';
    btnRename.addEventListener('click', e => {
      e.stopPropagation();
      startInlineRenameFolder(folder.id, nameSpan);
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'tree-act-btn tree-act-btn--danger';
    btnDelete.title = 'Excluir pasta (itens serão mantidos)';
    btnDelete.innerHTML = '✕';
    btnDelete.addEventListener('click', e => {
      e.stopPropagation();
      promptDeleteFolder(folder.id);
    });

    actions.appendChild(btnNewFile);
    actions.appendChild(btnNewSub);
    actions.appendChild(btnRename);
    actions.appendChild(btnDelete);
    row.appendChild(actions);

    // Clique na linha expande/recolhe
    row.addEventListener('click', () => {
      Store.toggleFolderExpand(folder.id);
    });

    // Duplo clique renomeia
    nameSpan.addEventListener('dblclick', e => {
      e.stopPropagation();
      startInlineRenameFolder(folder.id, nameSpan);
    });

    // Menu de contexto com botão direito
    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      showFolderContextMenu(folder.id, e.clientX, e.clientY);
    });

    folderWrap.appendChild(row);

    // Se estiver expandida, renderiza filhos (subpastas e abas)
    if(folder.isExpanded){
      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'tree-children';

      if(Array.isArray(folder.childrenFolders)){
        folder.childrenFolders.forEach(sub => {
          childrenWrap.appendChild(createFolderNode(sub, activeTabId, depth + 1));
        });
      }

      if(Array.isArray(folder.childrenTabs)){
        folder.childrenTabs.forEach(tab => {
          childrenWrap.appendChild(createTabNode(tab, activeTabId, depth + 1));
        });
      }

      folderWrap.appendChild(childrenWrap);
    }

    return folderWrap;
  }

  function createTabNode(tab, activeTabId, depth = 0){
    const row = document.createElement('div');
    const isActive = tab.id === activeTabId;
    row.className = `tree-row tree-row--file${isActive ? ' is-active' : ''}`;
    row.dataset.tabId = tab.id;
    row.style.paddingLeft = `${26 + depth * 14}px`;

    // Ícone de arquivo de grafo
    const icon = document.createElement('span');
    icon.className = 'tree-icon tree-icon--file';
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><line x1="12" y1="7.5" x2="5" y2="16.5"/><line x1="12" y1="7.5" x2="19" y2="16.5"/><line x1="7.5" y1="19" x2="16.5" y2="19"/></svg>`;
    row.appendChild(icon);

    // Nome do grafo
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tree-label';
    nameSpan.textContent = tab.name;
    nameSpan.title = `${tab.name} (${tab.nodeCount} nós · ${tab.edgeCount} conexões)`;
    row.appendChild(nameSpan);

    // Contagem de nós
    const countBadge = document.createElement('span');
    countBadge.className = 'tree-badge';
    countBadge.textContent = tab.nodeCount > 0 ? `${tab.nodeCount}` : '';
    row.appendChild(countBadge);

    // Ações de hover (Renomear, Excluir)
    const actions = document.createElement('div');
    actions.className = 'tree-row-actions';

    const btnRename = document.createElement('button');
    btnRename.className = 'tree-act-btn';
    btnRename.title = 'Renomear grafo';
    btnRename.innerHTML = '✏️';
    btnRename.addEventListener('click', e => {
      e.stopPropagation();
      startInlineRenameTab(tab.id, nameSpan);
    });
    actions.appendChild(btnRename);

    if(!tab.isMain){
      const btnDelete = document.createElement('button');
      btnDelete.className = 'tree-act-btn tree-act-btn--danger';
      btnDelete.title = 'Excluir arquivo do projeto';
      btnDelete.innerHTML = '✕';
      btnDelete.addEventListener('click', e => {
        e.stopPropagation();
        promptDeleteTab(tab.id);
      });
      actions.appendChild(btnDelete);
    }

    row.appendChild(actions);

    // Clique abre o arquivo no topo (estilo VS Code) e alterna para ele
    row.addEventListener('click', () => {
      Store.openTab(tab.id);
    });

    // Duplo clique renomeia
    nameSpan.addEventListener('dblclick', e => {
      e.stopPropagation();
      startInlineRenameTab(tab.id, nameSpan);
    });

    // Menu de contexto com botão direito
    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      showTabContextMenu(tab.id, e.clientX, e.clientY);
    });

    return row;
  }

  /* ── Renomeação Inline ─────────────────────────── */
  function startInlineRenameFolder(folderId, spanEl){
    const currentName = spanEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-inline-input';
    input.value = currentName;

    function finish(){
      const val = input.value.trim();
      if(val && val !== currentName){
        Store.renameFolder(folderId, val);
        if(typeof App !== 'undefined' && App.toast) App.toast(`Pasta renomeada para "${val}"`);
      } else {
        spanEl.textContent = currentName;
      }
    }

    input.addEventListener('keydown', e => {
      if(e.key === 'Enter'){
        e.preventDefault();
        input.blur();
      } else if(e.key === 'Escape'){
        input.value = currentName;
        input.blur();
      }
    });
    input.addEventListener('blur', finish);

    spanEl.textContent = '';
    spanEl.appendChild(input);
    input.focus();
    input.select();
  }

  function startInlineRenameTab(tabId, spanEl){
    const currentName = spanEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-inline-input';
    input.value = currentName;

    function finish(){
      const val = input.value.trim();
      if(val && val !== currentName){
        Store.renameTab(tabId, val);
        if(typeof App !== 'undefined' && App.toast) App.toast(`Grafo renomeado para "${val}"`);
      } else {
        spanEl.textContent = currentName;
      }
    }

    input.addEventListener('keydown', e => {
      if(e.key === 'Enter'){
        e.preventDefault();
        input.blur();
      } else if(e.key === 'Escape'){
        input.value = currentName;
        input.blur();
      }
    });
    input.addEventListener('blur', finish);

    spanEl.textContent = '';
    spanEl.appendChild(input);
    input.focus();
    input.select();
  }

  /* ── Prompts de Pastas e Grafos ─────────────────── */
  function promptCreateFolder(parentId = null){
    const name = prompt('Nome da nova pasta / módulo do projeto:');
    if(name && name.trim()){
      const folder = Store.createFolder(name.trim(), parentId);
      if(typeof App !== 'undefined' && App.toast) App.toast(`Pasta "${folder.name}" criada`);
    }
  }

  function promptCreateGraph(folderId = null){
    const name = prompt('Nome do novo arquivo de grafo:');
    if(name !== null){
      const tab = Store.createTab(name.trim(), folderId);
      if(typeof App !== 'undefined' && App.toast) App.toast(`Grafo "${tab.name}" criado`);
    }
  }

  function promptDeleteFolder(folderId){
    const folder = Store.getFolder(folderId);
    if(!folder) return;
    if(confirm(`Deseja excluir a pasta "${folder.name}"?\n(Os grafos e subpastas serão movidos para o nível acima e nenhum dado será perdido).`)){
      Store.deleteFolder(folderId);
      if(typeof App !== 'undefined' && App.toast) App.toast(`Pasta "${folder.name}" excluída.`);
    }
  }

  function promptDeleteTab(tabId){
    if(typeof TabsUI !== 'undefined' && TabsUI.deleteTabPrompt){
      TabsUI.deleteTabPrompt(tabId);
    }
  }

  /* ── Painel de Dados Únicos do Projeto (Entidades) ── */
  function renderEntities(){
    const listEl = getEntitiesEl();
    const badgeEl = getEntitiesBadgeEl();
    if(!listEl) return;

    const entities = Store.getEntitiesList();
    if(badgeEl) badgeEl.textContent = String(entities.length);

    listEl.innerHTML = '';

    const filter = entityFilterText.trim().toLowerCase();
    const filtered = entities.filter(ent => {
      if(!filter) return true;
      const title = (ent.title || '').toLowerCase();
      const desc = (ent.description || '').toLowerCase();
      const tags = (ent.tags || []).join(' ').toLowerCase();
      const type = (ent.type || '').toLowerCase();
      return title.includes(filter) || desc.includes(filter) || tags.includes(filter) || type.includes(filter);
    });

    if(filtered.length === 0){
      const empty = document.createElement('div');
      empty.className = 'explorer-empty';
      empty.textContent = filter ? 'Nenhum dado encontrado para o filtro.' : 'Nenhum dado cadastrado neste projeto.';
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach(ent => {
      const item = document.createElement('div');
      item.className = 'entity-item';
      item.dataset.entityId = ent.id;

      // Ponto de cor por tipo
      const dot = document.createElement('span');
      dot.className = `entity-dot entity-dot--${ent.type}`;
      item.appendChild(dot);

      // Informações da entidade
      const info = document.createElement('div');
      info.className = 'entity-info';

      const title = document.createElement('div');
      title.className = 'entity-title';
      title.textContent = ent.title || 'Sem título';
      info.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'entity-meta';
      const usageCount = ent.usedIn ? ent.usedIn.length : 0;
      const usageText = usageCount === 0 ? 'Não usado' : (usageCount === 1 ? 'Em 1 grafo' : `Em ${usageCount} grafos deste projeto`);
      meta.textContent = `${ent.type} · ${usageText}`;
      info.appendChild(meta);

      item.appendChild(info);

      // Botão de adicionar ao grafo ativo
      const btnAdd = document.createElement('button');
      btnAdd.className = 'entity-btn-add';
      btnAdd.title = 'Inserir este dado no grafo atual';
      btnAdd.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
      btnAdd.addEventListener('click', e => {
        e.stopPropagation();
        try {
          const node = Store.addExistingEntityToTab(ent.id);
          if(typeof App !== 'undefined' && App.toast) App.toast(`"${node.title}" inserido no grafo!`);
        } catch(err){
          if(typeof App !== 'undefined' && App.toast) App.toast(err.message);
        }
      });
      item.appendChild(btnAdd);

      // Botão direito na entidade
      item.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        showEntityContextMenu(ent, e.clientX, e.clientY);
      });

      listEl.appendChild(item);
    });
  }

  /* ── Menus de Contexto do Explorer ─────────────── */
  function showFolderContextMenu(folderId, x, y){
    const menuEl = document.getElementById('context-menu');
    if(!menuEl) return;
    const folder = Store.getFolder(folderId);
    if(!folder) return;

    menuEl.innerHTML = '';
    const items = [
      { label: `📁 ${folder.name}`, header: true },
      { label: '📄 Novo Grafo nesta pasta', action: () => promptCreateGraph(folderId) },
      { label: '📁 Nova Subpasta', action: () => promptCreateFolder(folderId) },
      { separator: true },
      { label: '✏️ Renomear', action: () => {
        const row = getTreeEl()?.querySelector(`.tree-row[data-folder-id="${folderId}"] .tree-label`);
        if(row) startInlineRenameFolder(folderId, row);
      }},
      { label: '🗑️ Excluir Pasta', danger: true, action: () => promptDeleteFolder(folderId) },
    ];

    populateContextMenu(menuEl, items, x, y);
  }

  function showTabContextMenu(tabId, x, y){
    const menuEl = document.getElementById('context-menu');
    if(!menuEl) return;
    const tab = Store.getTabs().find(t => t.id === tabId);
    if(!tab) return;

    menuEl.innerHTML = '';
    const items = [
      { label: `🕸️ ${tab.name}`, header: true },
      { label: 'Abrir no Topo', action: () => Store.openTab(tabId) },
      { label: 'Fechar Aba Superior', action: () => Store.closeTab(tabId) },
      { label: '✏️ Renomear', action: () => {
        const row = getTreeEl()?.querySelector(`.tree-row[data-tab-id="${tabId}"] .tree-label`);
        if(row) startInlineRenameTab(tabId, row);
      }},
      { separator: true },
    ];

    if(!tab.isMain){
      items.push({ label: '🗑️ Excluir Arquivo do Projeto', danger: true, action: () => promptDeleteTab(tabId) });
    }

    populateContextMenu(menuEl, items, x, y);
  }

  function showEntityContextMenu(ent, x, y){
    const menuEl = document.getElementById('context-menu');
    if(!menuEl) return;

    menuEl.innerHTML = '';
    const items = [
      { label: `📌 ${ent.title || 'Dado'}`, header: true },
      { label: '➕ Inserir no grafo atual', action: () => {
        try {
          const node = Store.addExistingEntityToTab(ent.id);
          if(typeof App !== 'undefined' && App.toast) App.toast(`"${node.title}" inserido no grafo!`);
        } catch(err){
          if(typeof App !== 'undefined' && App.toast) App.toast(err.message);
        }
      }},
      { label: '📋 Copiar ID', action: () => {
        navigator.clipboard?.writeText(ent.id);
        if(typeof App !== 'undefined' && App.toast) App.toast(`ID copiado: ${ent.id}`);
      }},
      { separator: true },
      { label: '🗑️ Excluir deste Projeto', danger: true, action: () => {
        if(confirm(`Excluir permanentemente o dado "${ent.title}" de todas as pastas e grafos deste projeto?`)){
          Store.deleteEntityGlobal(ent.id);
          if(typeof App !== 'undefined' && App.toast) App.toast(`Dado excluído deste projeto.`);
        }
      }},
    ];

    populateContextMenu(menuEl, items, x, y);
  }

  function populateContextMenu(menuEl, items, x, y){
    items.forEach(it => {
      if(it.header){
        const h = document.createElement('div');
        h.className = 'cm-header';
        h.textContent = it.label;
        menuEl.appendChild(h);
      } else if(it.separator){
        const s = document.createElement('div');
        s.className = 'cm-sep';
        menuEl.appendChild(s);
      } else {
        const btn = document.createElement('button');
        btn.className = `cm-item${it.danger ? ' cm-item--danger' : ''}`;
        btn.textContent = it.label;
        btn.addEventListener('click', () => {
          menuEl.hidden = true;
          it.action?.();
        });
        menuEl.appendChild(btn);
      }
    });

    menuEl.hidden = false;
    const rect = menuEl.getBoundingClientRect();
    const pad = 8;
    const nx = Math.min(x, window.innerWidth - rect.width - pad);
    const ny = Math.min(y, window.innerHeight - rect.height - pad);
    menuEl.style.left = `${Math.max(pad, nx)}px`;
    menuEl.style.top = `${Math.max(pad, ny)}px`;
  }

  /* ── Inicialização e Event Listeners ───────────── */
  function bind(){
    document.getElementById('btn-explorer-close')?.addEventListener('click', closeSidebar);
    document.getElementById('btn-explorer-new-project')?.addEventListener('click', promptCreateProject);
    document.getElementById('btn-explorer-new-folder')?.addEventListener('click', () => promptCreateFolder(null));
    document.getElementById('btn-explorer-new-file')?.addEventListener('click', () => promptCreateGraph(null));
    document.getElementById('btn-explorer-collapse-all')?.addEventListener('click', () => {
      Store.getFolders().forEach(f => {
        if(f.isExpanded) Store.toggleFolderExpand(f.id);
      });
    });

    // Seletor de Projetos (Dropdown)
    const btnProjectMenu = document.getElementById('btn-project-menu');
    if(btnProjectMenu){
      btnProjectMenu.addEventListener('click', e => {
        e.stopPropagation();
        toggleProjectDropdown();
      });
    }

    // Seções colapsáveis no explorer
    document.querySelectorAll('.explorer-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const targetId = header.dataset.target;
        const body = document.getElementById(targetId);
        const icon = header.querySelector('.section-chevron');
        if(body){
          const isClosed = body.hidden;
          body.hidden = !isClosed;
          if(icon) icon.textContent = isClosed ? '▾' : '▸';
        }
      });
    });

    // Filtro de entidades únicas
    const entInput = document.getElementById('explorer-entity-search');
    if(entInput){
      entInput.addEventListener('input', e => {
        entityFilterText = e.target.value;
        renderEntities();
      });
    }

    // Fecha dropdown de projetos ao clicar fora
    document.addEventListener('click', e => {
      if(!e.target.closest('#dd-project')){
        const dd = getProjectDropdownEl();
        if(dd && dd.classList.contains('open')){
          dd.classList.remove('open');
        }
      }
    });

    // Observa eventos do Store
    Store.subscribe((event, payload) => {
      if(event === 'project:change' || event === 'project:switch' || event === 'project:listChange'){
        renderProjectName();
        renderProjectDropdown();
      }
      if(event === 'explorer:change' || event === 'tabs:change' || event === 'tabs:switch' || event === 'store:ready' || event === 'store:restore'){
        renderTree();
      }
      if(event === 'entities:change' || event === 'node:add' || event === 'node:update' || event === 'node:delete' || event === 'store:ready' || event === 'store:restore'){
        renderEntities();
      }
    });
  }

  return {
    bind,
    renderTree,
    renderEntities,
    renderProjectName,
    renderProjectDropdown,
    toggleProjectDropdown,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    promptCreateProject,
    promptCreateFolder,
    promptCreateGraph,
    promptRenameProject,
    promptDeleteCurrentProject,
  };
})();
