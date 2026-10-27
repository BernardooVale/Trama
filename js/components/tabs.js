/**
 * TabsUI Component — Trama
 * Gerencia a barra de abas de arquivos abertos (estilo VS Code / navegadores),
 * alternância, fechamento de aba (sem deletar arquivo), renomeação inline e menu contextual.
 */
const TabsUI = (() => {
  function getListEl(){ return document.getElementById('tabs-list'); }
  function esc(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function render(){
    const listEl = getListEl();
    if(!listEl) return;
    const openTabs = (typeof Store.getOpenTabs === 'function') ? Store.getOpenTabs() : Store.getTabs();
    const activeId = Store.getActiveTabId();

    listEl.innerHTML = '';
    openTabs.forEach((tab, index) => {
      // Separador visual após a primeira aba se for principal
      if(index === 1 && openTabs[0].isMain){
        const sep = document.createElement('div');
        sep.className = 'tab-separator';
        listEl.appendChild(sep);
      }

      const item = document.createElement('div');
      item.className = `tab-item${tab.id === activeId ? ' active' : ''}${tab.isMain ? ' tab-item--main' : ''}`;
      item.dataset.tabId = tab.id;
      item.title = `${tab.name} (Duplo-clique para renomear)`;

      if(tab.isMain){
        const lockIcon = document.createElement('span');
        lockIcon.className = 'tab-main-icon';
        lockIcon.innerHTML = '★';
        lockIcon.title = 'Arquivo Principal do Projeto';
        item.appendChild(lockIcon);
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = tab.name;
      item.appendChild(titleSpan);

      // Botão de fechar aba (apenas fecha a aba no topo, NÃO exclui o arquivo!)
      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.title = 'Fechar aba (Ctrl+W) — O arquivo continua no Explorador';
      closeBtn.innerHTML = '✕';
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        Store.closeTab(tab.id);
        if(typeof App !== 'undefined' && App.toast){
          App.toast(`Aba "${tab.name}" fechada (arquivo preservado no Explorador)`);
        }
      });
      item.appendChild(closeBtn);

      // Clique para alternar aba
      item.addEventListener('click', () => {
        if(tab.id !== Store.getActiveTabId()){
          Store.switchTab(tab.id);
        }
      });

      // Duplo clique para renomear inline
      titleSpan.addEventListener('dblclick', e => {
        e.stopPropagation();
        startInlineRename(tab.id, titleSpan);
      });

      // Botão direito na aba (menu de contexto da aba)
      item.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        showTabContextMenu(tab.id, e.clientX, e.clientY);
      });

      listEl.appendChild(item);
    });

    const activeEl = listEl.querySelector('.tab-item.active');
    if(activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  function startInlineRename(tabId, spanEl){
    const currentName = spanEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-title-input';
    input.value = currentName;

    function finish(){
      const val = input.value.trim();
      if(val && val !== currentName){
        Store.renameTab(tabId, val);
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

  function renameActiveTabPrompt(){
    const activeTab = Store.getActiveTab();
    if(!activeTab) return;
    const activeItem = getListEl()?.querySelector(`.tab-item[data-tab-id="${activeTab.id}"] .tab-title`);
    if(activeItem){
      startInlineRename(activeTab.id, activeItem);
    } else {
      const newName = prompt('Novo nome do grafo:', activeTab.name);
      if(newName && newName.trim()){
        Store.renameTab(activeTab.id, newName.trim());
      }
    }
  }

  function deleteTabPrompt(tabId){
    const tabs = Store.getTabs();
    const targetTab = tabs.find(t => t.id === tabId);
    if(!targetTab) return;
    if(targetTab.isMain){
      if(typeof App !== 'undefined' && App.toast) App.toast('O arquivo principal é fixo e não pode ser excluído.');
      return;
    }
    const isEmpty = Store.isTabEmpty ? Store.isTabEmpty(tabId) : false;
    if(isEmpty || confirm(`Deseja excluir permanentemente o arquivo "${targetTab.name}" do projeto?\n(Subgrafos associados em outras telas serão removidos).`)){
      Store.deleteTab(tabId);
      if(typeof App !== 'undefined' && App.toast) App.toast(`Arquivo "${targetTab.name}" excluído do projeto.`);
    }
  }

  function showTabContextMenu(tabId, cx, cy){
    const cm = document.getElementById('context-menu');
    if(!cm) return;
    const tab = Store.getTabs().find(t => t.id === tabId);
    if(!tab) return;

    cm.innerHTML = `
      <div class="cm-item" style="font-size:10px;text-transform:uppercase;color:var(--text-muted);pointer-events:none">Aba: ${esc(tab.name)}${tab.isMain ? ' (Principal)' : ''}</div>
      <button class="cm-item" data-action="tab-close" data-tab-id="${tabId}">Fechar Aba <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Ctrl+W</span></button>
      <button class="cm-item" data-action="tab-close-others" data-tab-id="${tabId}">Fechar Outras Abas</button>
      <button class="cm-item" data-action="tab-close-all">Fechar Todas as Abas</button>
      <div class="cm-divider"></div>
      <button class="cm-item" data-action="tab-rename" data-tab-id="${tabId}">Renomear Arquivo <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Ctrl+E</span></button>
      <button class="cm-item" data-action="tab-duplicate">Novo Arquivo de Grafo <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Ctrl+Shift+T</span></button>
      ${!tab.isMain ? `
        <div class="cm-divider"></div>
        <button class="cm-item cm-item--danger" data-action="tab-delete" data-tab-id="${tabId}">Excluir Arquivo Definitivamente</button>
      ` : ''}
    `;

    cm.hidden = false;
    const rect = cm.getBoundingClientRect();
    const left = (cx + rect.width > window.innerWidth) ? window.innerWidth - rect.width - 10 : cx;
    const top  = (cy + rect.height > window.innerHeight) ? window.innerHeight - rect.height - 10 : cy;
    cm.style.left = `${Math.max(10, left)}px`;
    cm.style.top  = `${Math.max(10, top)}px`;
  }

  function bind(){
    document.getElementById('btn-tab-add')?.addEventListener('click', () => {
      Store.createTab();
    });
  }

  return { render, bind, renameActiveTabPrompt, deleteTabPrompt, startInlineRename, showTabContextMenu };
})();
