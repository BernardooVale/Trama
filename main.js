/* ═══════════════════════════════════════════════════
   main.js — Orquestrador: sidebar, filtros, I/O, tema
════════════════════════════════════════════════════ */

const App = (() => {

  /* ═══════════════════════════════════════════════
     ELEMENTOS DOM (cache único)
  ════════════════════════════════════════════════ */
  const DOM = {};

  function cacheDOM() {
    const ids = [
      'sidebar', 'sidebar-title', 'sidebar-close',
      'sb-type-badge', 'sb-title', 'sb-desc', 'sb-meta',
      'sb-status-selector', 'sb-priority-selector',
      'tags-list', 'sb-tags',
      'search-input', 'search-clear',
      'btn-export', 'btn-import',
      'btn-theme', 'icon-theme',
      'toast',
      'canvas-wrap',
    ];
    ids.forEach(id => {
      DOM[id] = document.getElementById(id);
    });
  }

  /* ═══════════════════════════════════════════════
     TOAST
  ════════════════════════════════════════════════ */
  let _toastTimer = null;

  function toast(msg, duration = 2800) {
    const el = DOM['toast'];
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  /* ═══════════════════════════════════════════════
     TEMA
  ════════════════════════════════════════════════ */
  function initTheme() {
    const saved = localStorage.getItem('graphmind_theme') ?? 'dark';
    setTheme(saved);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('graphmind_theme', theme);
    Graph.syncTheme();

    // Troca ícone sol ↔ lua
    const icon = DOM['icon-theme'];
    if (theme === 'dark') {
      icon.innerHTML = `
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1"  x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1"  y1="12" x2="3"  y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
    } else {
      icon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3
          7 7 0 0 0 21 12.79z"/>`;
    }
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* ═══════════════════════════════════════════════
     SIDEBAR — abrir / fechar
  ════════════════════════════════════════════════ */
  function openSidebar(nodeId) {
    const node = Store.getNode(nodeId);
    if (!node) return;

    populateSidebar(node);
    DOM['sidebar'].classList.add('open');
  }

  function closeSidebar() {
    DOM['sidebar'].classList.remove('open');
    Store.clearSelection();
  }

  /* ═══════════════════════════════════════════════
     SIDEBAR — popular campos
  ════════════════════════════════════════════════ */
  function populateSidebar(node) {
    // Título do painel
    DOM['sidebar-title'].textContent = 'Propriedades';

    // Type badge
    const badge = DOM['sb-type-badge'];
    badge.textContent = node.type;
    badge.dataset.type = node.type;

    // Título
    DOM['sb-title'].value = node.title;

    // Descrição
    DOM['sb-desc'].value = node.description;

    // Status
    DOM['sb-status-selector']
      .querySelectorAll('.status-btn')
      .forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === node.status);
      });

    // Prioridade
    DOM['sb-priority-selector']
      .querySelectorAll('.priority-btn')
      .forEach(btn => {
        btn.classList.toggle('active', btn.dataset.priority === node.priority);
      });

    // Tags
    renderTags(node.tags);

    // Meta
    const date = new Date(node.createdAt).toLocaleDateString('pt-BR');
    DOM['sb-meta'].textContent = `ID: ${node.id} · Criado em ${date}`;
  }

  /* ═══════════════════════════════════════════════
     TAGS
  ════════════════════════════════════════════════ */
  function renderTags(tags) {
    const list = DOM['tags-list'];
    list.innerHTML = '';
    tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${escHtml(tag)}<button data-tag="${escHtml(tag)}" title="Remover tag">✕</button>`;
      chip.querySelector('button').addEventListener('click', () => removeTag(tag));
      list.appendChild(chip);
    });
  }

  function addTag(raw) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag) return;

    const node = Store.getSelectedNode();
    if (!node) return;

    if (node.tags.includes(tag)) {
      toast(`Tag "${tag}" já existe`);
      return;
    }

    const newTags = [...node.tags, tag];
    Store.updateNode(node.id, { tags: newTags });
    renderTags(newTags);
    DOM['sb-tags'].value = '';
  }

  function removeTag(tag) {
    const node = Store.getSelectedNode();
    if (!node) return;
    const newTags = node.tags.filter(t => t !== tag);
    Store.updateNode(node.id, { tags: newTags });
    renderTags(newTags);
  }

  /* ═══════════════════════════════════════════════
     SIDEBAR — bind inputs (edita Store em tempo real)
  ════════════════════════════════════════════════ */
  function bindSidebarInputs() {

    /* Título — debounced */
    let titleTimer = null;
    DOM['sb-title'].addEventListener('input', e => {
      clearTimeout(titleTimer);
      titleTimer = setTimeout(() => {
        const node = Store.getSelectedNode();
        if (!node) return;
        Store.updateNode(node.id, { title: e.target.value });
      }, 300);
    });

    /* Descrição — debounced */
    let descTimer = null;
    DOM['sb-desc'].addEventListener('input', e => {
      clearTimeout(descTimer);
      descTimer = setTimeout(() => {
        const node = Store.getSelectedNode();
        if (!node) return;
        Store.updateNode(node.id, { description: e.target.value });
      }, 400);
    });

    /* Status buttons */
    DOM['sb-status-selector'].addEventListener('click', e => {
      const btn = e.target.closest('.status-btn');
      if (!btn) return;
      const node = Store.getSelectedNode();
      if (!node) return;

      Store.updateNode(node.id, { status: btn.dataset.status });

      DOM['sb-status-selector']
        .querySelectorAll('.status-btn')
        .forEach(b => b.classList.toggle('active', b === btn));
    });

    /* Priority buttons */
    DOM['sb-priority-selector'].addEventListener('click', e => {
      const btn = e.target.closest('.priority-btn');
      if (!btn) return;
      const node = Store.getSelectedNode();
      if (!node) return;

      Store.updateNode(node.id, { priority: btn.dataset.priority });

      DOM['sb-priority-selector']
        .querySelectorAll('.priority-btn')
        .forEach(b => b.classList.toggle('active', b === btn));
    });

    /* Tags: Enter ou vírgula adicionam */
    DOM['sb-tags'].addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(DOM['sb-tags'].value.replace(',', ''));
      }
    });

    /* Fechar sidebar */
    DOM['sidebar-close'].addEventListener('click', closeSidebar);
  }

  /* ═══════════════════════════════════════════════
     ADD NÓ (toolbar canvas)
  ════════════════════════════════════════════════ */
  function bindAddNodeButtons() {
    document.querySelectorAll('.btn-tool[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const node = Graph.addNodeAtCenter(type);
            Store.selectNode(node.id);
            openSidebar(node.id);
            // Foca e seleciona título para edição imediata
            requestAnimationFrame(() => {
                DOM['sb-title'].focus();
                DOM['sb-title'].select();
            });
            toast(`Nó "${node.title}" criado — edite o título`);
        });
    });
  }

  /* ═══════════════════════════════════════════════
     SEARCH + FILTROS
  ════════════════════════════════════════════════ */
  function bindFilters() {

    /* Search input */
    let searchTimer = null;
    DOM['search-input'].addEventListener('input', e => {
      const val = e.target.value;

      // Mostra/oculta botão clear
      DOM['search-clear'].classList.toggle('visible', val.length > 0);

      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        Store.setFilter({ text: val });
      }, 200);
    });

    /* Clear button */
    DOM['search-clear'].addEventListener('click', () => {
      DOM['search-input'].value = '';
      DOM['search-clear'].classList.remove('visible');
      Store.setFilter({ text: '' });
      DOM['search-input'].focus();
    });

    /* Type pills */
    document.getElementById('filter-type').addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill || pill.dataset.filter !== 'type') return;

      document.querySelectorAll('#filter-type .pill')
        .forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      Store.setFilter({ type: pill.dataset.value });
    });

    /* Status pills (toggle) */
    document.getElementById('filter-status').addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill || pill.dataset.filter !== 'status') return;

      const isActive = pill.classList.contains('active');

      document.querySelectorAll('#filter-status .pill')
        .forEach(p => p.classList.remove('active'));

      if (isActive) {
        // Toggle off → sem filtro de status
        Store.setFilter({ status: null });
      } else {
        pill.classList.add('active');
        Store.setFilter({ status: pill.dataset.value });
      }
    });

    FilterTags.bind();
  }

  /* ═══════════════════════════════════════════════
     EXPORT / IMPORT
  ════════════════════════════════════════════════ */
  function bindIO() {

    /* Export */
    DOM['btn-export'].addEventListener('click', () => {
      try {
        Store.exportJSON();
        toast('Grafo exportado com sucesso');
      } catch (err) {
        toast(`Erro ao exportar: ${err.message}`);
      }
    });

    /* Import */
    DOM['btn-import'].addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const count = await Store.importJSON(file);
        toast(`Importado: ${count} nós carregados`);
        closeSidebar();
      } catch (err) {
        toast(`Erro ao importar: ${err.message}`);
      } finally {
        // Reset input para permitir reimport do mesmo arquivo
        e.target.value = '';
      }
    });
  }

  /* ═══════════════════════════════════════════════
     STORE OBSERVER → UI reactions
  ════════════════════════════════════════════════ */
  function bindStoreObserver() {
    Store.subscribe((event, payload) => {
      switch (event) {

        /* Seleção muda → abre/fecha sidebar */
        case 'selection:change':
            if (!payload) closeSidebar();
            // sidebar abre só via dbltap — não abre aqui
            break;

        /* Nó atualizado → re-popula sidebar se for o selecionado */
        case 'node:update': {
          const node = Store.getSelectedNode();
          if (node && node.id === payload.id) {
            populateSidebar(payload);
          }
          break;
        }

        /* Nó deletado → fecha sidebar */
        case 'node:delete':
            // Fecha sidebar sem chamar Store.clearSelection (evita loop com o batch do cy)
            DOM['sidebar'].classList.remove('open');
            toast('Nó removido');
            break;

        /* Aresta adicionada */
        case 'edge:add':
          toast(`Aresta "${payload.edgeType}" criada`);
          break;

        /* Aresta deletada */
        case 'edge:delete':
          toast('Aresta removida');
          break;

        /* Import completo */
        case 'io:import':
          Graph.applyFilter();
          break;

        /* Store pronto */
        case 'store:ready':
          toast(`GraphMind carregado · ${payload.nodes.length} nós`, 2000);
          break;
      }
    });
  }

  /* ═══════════════════════════════════════════════
     GRAPH CUSTOM EVENTS → vêm de graph.js
  ════════════════════════════════════════════════ */
  function bindGraphEvents() {

    /* Sidebar via double-tap */
    document.addEventListener('graph:openSidebar', () => {
      const node = Store.getSelectedNode();
      if (node) openSidebar(node.id);
    });

    /* Erro de aresta (ex: duplicata, self-loop) */
    document.addEventListener('graph:error', e => {
      toast(`⚠ ${e.detail}`);
    });

    /* Aresta selecionada → toast com info */
    document.addEventListener('graph:edgeSelected', e => {
      const edges = Store.getEdges();
      const edge  = edges.find(ed => ed.id === e.detail.edgeId);
      if (!edge) return;
      const src = Store.getNode(edge.source)?.title ?? edge.source;
      const tgt = Store.getNode(edge.target)?.title ?? edge.target;
      toast(`Aresta: ${src} → ${tgt} [${edge.edgeType}]  ·  Del para remover`);
      // Seleciona no Cytoscape para que Delete funcione
      const cy = Graph.getInstance();
      cy.$(':selected').unselect();
      cy.getElementById(edge.id).select();
    });
  }

  /* ═══════════════════════════════════════════════
     LAYOUT BUTTON feedback visual
  ════════════════════════════════════════════════ */
  function bindLayoutButton() {
    document.getElementById('btn-layout').addEventListener('click', () => {
      toast('Organizando layout…');
    });
  }

  /* ═══════════════════════════════════════════════
     KEYBOARD GLOBAL
  ════════════════════════════════════════════════ */
  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

      /* Ctrl/Cmd + E → exportar */
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        Store.exportJSON();
        toast('Grafo exportado');
      }

      /* Ctrl/Cmd + F → foca busca */
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        DOM['search-input'].focus();
        DOM['search-input'].select();
      }

      /* / → foca busca (sem Ctrl, fora de input) */
      if (e.key === '/' && !inInput) {
        e.preventDefault();
        DOM['search-input'].focus();
      }

      /* T → toggle tema (fora de input) */
      if (e.key === 't' && !inInput) {
        toggleTheme();
      }

      /* L → layout (fora de input) */
      if (e.key === 'l' && !inInput) {
        Graph.runForceLayout();
        toast('Organizando layout…');
      }

      /* 1 / 2 / 3 → adicionar nó (fora de input) */
      if (!inInput && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') document.querySelector('[data-type="problema"]')?.click();
        if (e.key === '2') document.querySelector('[data-type="solucao"]')?.click();
        if (e.key === '3') document.querySelector('[data-type="agrupador"]')?.click();
      }
    });
  }

  /* ═══════════════════════════════════════════════
     TOOLTIP de atalhos (hint inicial)
  ════════════════════════════════════════════════ */
  function showHints() {
    setTimeout(() => {
      toast('Dica: duplo-clique no nó abre propriedades · / para buscar · L para layout', 4000);
    }, 2200);
  }

  /* ═══════════════════════════════════════════════
     UTILS
  ════════════════════════════════════════════════ */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════
   FILTER TAGS
    ════════════════════════════════════════════════ */
    const FilterTags = (() => {
        let activeTags = [];
        let autocompleteIndex = -1;
        let dropdownEl = null;

        function getInput()  { return document.getElementById('filter-tags-input'); }
        function getList()   { return document.getElementById('filter-tags-list'); }

        function renderChips() {
            const list = getList();
            list.innerHTML = '';
            activeTags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'filter-tag-chip';
            chip.innerHTML = `${escHtml(tag)}<button data-tag="${escHtml(tag)}" title="Remover">✕</button>`;
            chip.querySelector('button').addEventListener('click', () => removeTag(tag));
            list.appendChild(chip);
            });
        }

        function addTag(tag) {
            tag = tag.trim().toLowerCase();
            if (!tag || activeTags.includes(tag)) return;
            // Só permite tags que existem em algum nó
            if (!Store.getAllTags().includes(tag)) return;
            activeTags.push(tag);
            Store.setFilter({ tags: [...activeTags] });
            renderChips();
            getInput().value = '';
            hideDropdown();
        }

        function removeTag(tag) {
            activeTags = activeTags.filter(t => t !== tag);
            Store.setFilter({ tags: [...activeTags] });
            renderChips();
        }

        function clearAll() {
            activeTags = [];
            Store.setFilter({ tags: [] });
            renderChips();
        }

        /* ── Autocomplete ──────────────────────────── */
        function showDropdown(matches) {
            hideDropdown();
            if (!matches.length) return;

            dropdownEl = document.createElement('div');
            dropdownEl.className = 'tags-autocomplete';
            autocompleteIndex = -1;

            matches.forEach((tag, i) => {
            const item = document.createElement('div');
            item.className = 'tags-autocomplete-item';
            item.innerHTML = `<span class="dot"></span>${escHtml(tag)}`;
            item.addEventListener('mousedown', e => {
                e.preventDefault(); // evita blur antes do click
                addTag(tag);
            });
            item.dataset.index = i;
            dropdownEl.appendChild(item);
            });

            // Posiciona relativo ao wrap
            getInput().closest('.filter-tags-wrap').appendChild(dropdownEl);
        }

        function hideDropdown() {
            if (dropdownEl) { dropdownEl.remove(); dropdownEl = null; }
            autocompleteIndex = -1;
        }

        function navigateDropdown(dir) {
            if (!dropdownEl) return;
            const items = dropdownEl.querySelectorAll('.tags-autocomplete-item');
            if (!items.length) return;
            items[autocompleteIndex]?.classList.remove('active');
            autocompleteIndex = (autocompleteIndex + dir + items.length) % items.length;
            items[autocompleteIndex]?.classList.add('active');
        }

        function confirmDropdown() {
            if (!dropdownEl) return false;
            const active = dropdownEl.querySelector('.tags-autocomplete-item.active');
            if (active) { addTag(active.textContent.trim()); return true; }
            return false;
        }

        /* ── Bind ──────────────────────────────────── */
        function bind() {
            const input = getInput();

            input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            if (!q) { hideDropdown(); return; }

            const all = Store.getAllTags();
            const matches = all.filter(t =>
                t.includes(q) && !activeTags.includes(t)
            );
            showDropdown(matches);
            });

            input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); navigateDropdown(1); return; }
            if (e.key === 'ArrowUp')   { e.preventDefault(); navigateDropdown(-1); return; }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (confirmDropdown()) return;
                addTag(input.value);
                return;
            }
            if (e.key === 'Backspace' && !input.value && activeTags.length) {
                removeTag(activeTags[activeTags.length - 1]);
                return;
            }
            if (e.key === 'Escape') { hideDropdown(); }
            });

            input.addEventListener('blur', () => {
            // Delay para permitir mousedown no dropdown
            setTimeout(hideDropdown, 150);
            });
        }

        return { bind, clearAll, addTag, removeTag };
    })();

  /* ═══════════════════════════════════════════════
     INIT — ordem importa
  ════════════════════════════════════════════════ */
  function init() {
    cacheDOM();
    initTheme();

    // Store primeiro (fonte de verdade)
    Store.init();

    // Observer antes do Graph (captura store:ready)
    bindStoreObserver();

    // Graph monta Cytoscape com dados do Store
    Graph.init();

    // Eventos graph.js → main.js
    bindGraphEvents();

    // UI
    bindSidebarInputs();
    bindAddNodeButtons();
    bindFilters();
    bindIO();
    bindLayoutButton();
    bindKeyboard();

    // Botão tema
    DOM['btn-theme'].addEventListener('click', toggleTheme);

    const btnMeta = document.getElementById('btn-toggle-meta');
        // Estado inicial: ativo (meta visível)
        btnMeta.classList.add('active');
        btnMeta.addEventListener('click', () => {
        const current = Store.getShowNodeMeta();
        Store.setShowNodeMeta(!current);
        btnMeta.classList.toggle('active', !current);
        toast(!current ? 'Metadados visíveis nos nós' : 'Metadados ocultos nos nós');
    });

    // Hints
    showHints();
  }

  /* ─── API pública (debug) ─────────────────────── */
  return { init, toast, openSidebar, closeSidebar };

})();

/* ─── Bootstrap ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', App.init);