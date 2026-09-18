# Documentação Técnica e Arquitetura — Diretório `js/components/`

Este documento detalha o propósito, as responsabilidades e a especificação completa de cada função interna (assinatura, descrição e retorno) dos arquivos contidos na pasta `js/components/`.

---

## 1. Visão Geral dos Arquivos

| Arquivo | Função Principal / Responsabilidade |
| :--- | :--- |
| `tabs.js` | Renderização da barra de abas de grafos, aba fixa permanente (`Principal`), renomeação inline, menu contextual e atalhos. |
| `search.js` | Busca unificada por texto e etiquetas (`#tags`), chips de filtros ativos e lista suspensa com navegação por teclado. |
| `sidebar.js` | Painel lateral de propriedades e edição detalhada de vértices e arestas, debounce de digitação e gerenciamento de tags. |
| `contextMenu.js` | Menus contextuais acionados pelo botão direito do mouse no canvas, nós ou arestas (criação rápida, cópia, colagem e importação). |

---

## 2. `tabs.js` (`TabsUI`)

Gerencia a barra de abas de grafos inspirada no CircuitVerse / navegadores web, incluindo a aba fixa principal, alternância, renomeação inline, menu de contexto e remoção.

### Funções Internas e Métodos Públicos

#### `render()`
- **Assinatura:** `render(): void`
- **Descrição:** Constrói os elementos DOM das abas no `#tabs-list`. Aplica classe `.tab-item--main`, ícone `★` e badge `Fixa` permanente na aba de índice 0 (`Principal`). Insere divisor vertical `.tab-separator` entre a aba principal fixa e as secundárias. Associa listeners de clique para troca de aba, duplo-clique para renomeação inline e clique com botão direito para menu de contexto da aba.
- **Retorno:** `undefined`.

#### `startInlineRename(tabId, spanEl)`
- **Assinatura:** `startInlineRename(tabId: string, spanEl: HTMLElement): void`
- **Descrição:** Converte o texto do título da aba em um `<input>` inline para renomeação ágil, confirmando em `Enter` ou `blur` e cancelando em `Esc`.
- **Retorno:** `undefined`.

#### `renameActiveTabPrompt()`
- **Assinatura:** `renameActiveTabPrompt(): void`
- **Descrição:** Exibe diálogo modal ou foca no input inline para renomear a aba atualmente ativa (atalho `Ctrl+E`).
- **Retorno:** `undefined`.

#### `deleteTabPrompt(tabId)`
- **Assinatura:** `deleteTabPrompt(tabId: string): void`
- **Descrição:** Valida se a aba é a principal fixa (bloqueando a exclusão e exibindo aviso) ou pede confirmação do usuário antes de acionar `Store.deleteTab(tabId)`.
- **Retorno:** `undefined`.

#### `showTabContextMenu(tabId, cx, cy)`
- **Assinatura:** `showTabContextMenu(tabId: string, cx: number, cy: number): void`
- **Descrição:** Abre menu de contexto posicionado em `(cx, cy)` com opções de renomear (`Ctrl+E`), criar nova aba (`Ctrl+Shift+T`) e fechar aba (`Ctrl+Shift+W`, desabilitado para a aba principal).
- **Retorno:** `undefined`.

#### `bind()`
- **Assinatura:** `bind(): void`
- **Descrição:** Conecta o botão de adicionar aba (`#btn-tab-add`) ao `Store.createTab()`.
- **Retorno:** `undefined`.

---

## 3. `search.js` (`Search`)

Gerencia o campo de busca unificado para filtrar vértices por nome/descrição e etiquetas (`#tags`).

### Funções Internas e Métodos Públicos

#### `renderChips()`
- **Assinatura:** `renderChips(): void`
- **Descrição:** Renderiza chips interativos com as etiquetas atualmente ativas no filtro de busca.
- **Retorno:** `undefined`.

#### `addTagFilter(tag)`
- **Assinatura:** `addTagFilter(tag: string): void`
- **Descrição:** Adiciona uma etiqueta ao filtro global e reaplica o filtro no grafo.
- **Retorno:** `undefined`.

#### `removeTagFilter(tag)`
- **Assinatura:** `removeTagFilter(tag: string): void`
- **Descrição:** Remove a etiqueta especificada do filtro e atualiza a visualização.
- **Retorno:** `undefined`.

#### `clearAll()`
- **Assinatura:** `clearAll(): void`
- **Descrição:** Limpa texto de busca e todas as tags selecionadas.
- **Retorno:** `undefined`.

#### `showDropdown(items)`
- **Assinatura:** `showDropdown(items: Array<{ type: string, text: string, id?: string, tag?: string }>): void`
- **Descrição:** Renderiza e exibe a lista suspensa com sugestões de nós e tags correspondentes à pesquisa.
- **Retorno:** `undefined`.

#### `hideDropdown()`
- **Assinatura:** `hideDropdown(): void`
- **Descrição:** Oculta e esvazia o dropdown de sugestões de busca.
- **Retorno:** `undefined`.

#### `navigate(dir)`
- **Assinatura:** `navigate(dir: 1 | -1): void`
- **Descrição:** Move a seleção ativa na lista suspensa através das teclas de seta (Cima / Baixo).
- **Retorno:** `undefined`.

#### `confirmSelection()`
- **Assinatura:** `confirmSelection(): boolean`
- **Descrição:** Confirma a sugestão destacada no dropdown ao pressionar a tecla `Enter`.
- **Retorno:** `true` se confirmou item; `false` caso contrário.

#### `buildSuggestions(query)`
- **Assinatura:** `buildSuggestions(query: string): Array<any>`
- **Descrição:** Filtra os nós da aba ativa e suas tags gerando a lista de correspondências sugeridas.
- **Retorno:** Array de itens sugeridos.

#### `bind()`
- **Assinatura:** `bind(): void`
- **Descrição:** Registra os ouvintes de digitação, limpeza e navegação de teclado na barra de busca.
- **Retorno:** `undefined`.

---

## 4. `sidebar.js` (`Sidebar`)

Gerencia o painel lateral de propriedades e edição detalhada de nós e arestas.

### Funções Internas e Métodos Públicos

#### `open(nodeId, autoSelectText = false)`
- **Assinatura:** `open(nodeId: string, autoSelectText?: boolean): void`
- **Descrição:** Exibe o painel lateral com as propriedades do vértice (`#sb-node-fields`). Se `autoSelectText === true` (na criação de novo nó), seleciona o texto do campo de título.
- **Retorno:** `undefined`.

#### `openEdge(edgeId, autoSelectText = false)`
- **Assinatura:** `openEdge(edgeId: string, autoSelectText?: boolean): void`
- **Descrição:** Exibe o painel lateral com os campos da aresta (`#sb-edge-fields`). Se `autoSelectText === true`, seleciona o texto do rótulo.
- **Retorno:** `undefined`.

#### `close()`
- **Assinatura:** `close(): void`
- **Descrição:** Salva imediatamente quaisquer alterações pendentes nos inputs e fecha o painel lateral.
- **Retorno:** `undefined`.

#### `populate(node)`
- **Assinatura:** `populate(node: Node): void`
- **Descrição:** Preenche os campos do formulário lateral com título, descrição, tipo, prioridade e tags do nó selecionado. Para nós do tipo `subgrafo`, exibe campos de navegação para a aba associada.
- **Retorno:** `undefined`.

#### `populateEdge(edge)`
- **Assinatura:** `populateEdge(edge: Edge): void`
- **Descrição:** Preenche os campos de rótulo, tipo de aresta e endpoints (origem → destino).
- **Retorno:** `undefined`.

#### `renderTags(tags)`
- **Assinatura:** `renderTags(tags: string[]): void`
- **Descrição:** Renderiza chips visuais de tags com botões de exclusão individual.
- **Retorno:** `undefined`.

#### `addTag(raw)`
- **Assinatura:** `addTag(raw: string): void`
- **Descrição:** Higieniza e inclui uma nova tag no nó selecionado.
- **Retorno:** `undefined`.

#### `removeTag(tag)`
- **Assinatura:** `removeTag(tag: string): void`
- **Descrição:** Remove a tag indicada do nó ativo.
- **Retorno:** `undefined`.

#### `bind()`
- **Assinatura:** `bind(): void`
- **Descrição:** Associa listeners de input com debounce de 200ms para título e descrição de nó e rótulo de aresta, salvando ao fechar e permitindo títulos nulos/vazios.
- **Retorno:** `undefined`.

---

## 5. `contextMenu.js` (`ContextMenu`)

Controla menus de contexto flutuantes disparados pelo botão direito do mouse no canvas, nós ou arestas.

### Funções Internas e Métodos Públicos

#### `hide()`
- **Assinatura:** `hide(): void`
- **Descrição:** Oculta e limpa o menu de contexto.
- **Retorno:** `undefined`.

#### `position(x, y)`
- **Assinatura:** `position(x: number, y: number): void`
- **Descrição:** Posiciona o menu no ponto indicado ajustando para não ultrapassar as bordas da viewport.
- **Retorno:** `undefined`.

#### `showNodeMenu(id, cx, cy)`
- **Assinatura:** `showNodeMenu(id: string, cx: number, cy: number): void`
- **Descrição:** Abre o menu de contexto do vértice com opções para criar arestas conectadas, copiar ou excluir o nó.
- **Retorno:** `undefined`.

#### `showEdgeMenu(id, cx, cy)`
- **Assinatura:** `showEdgeMenu(id: string, cx: number, cy: number): void`
- **Descrição:** Abre o menu de contexto da aresta com opções de editar propriedades ou excluir aresta.
- **Retorno:** `undefined`.

#### `showCoreMenu(gx, gy, cx, cy)`
- **Assinatura:** `showCoreMenu(gx: number, gy: number, cx: number, cy: number): void`
- **Descrição:** Abre o menu de contexto do fundo do canvas com opções de criar vértices (Problema, Solução, Agrupador, Neutro), colar clipboard, desfazer e importar subgrafos de outras abas livres de ciclos.
- **Retorno:** `undefined`.

#### `bind()`
- **Assinatura:** `bind(): void`
- **Descrição:** Associa cliques nos botões do menu contextual e fecha o menu ao clicar fora.
- **Retorno:** `undefined`.
