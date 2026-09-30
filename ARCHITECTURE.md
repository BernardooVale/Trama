# Documentação Técnica e Arquitetura — Trama

Este documento serve como mapa de engenharia do repositório **Trama**, detalhando o propósito de cada arquivo, sua responsabilidade no sistema e a especificação completa de cada função interna (assinatura, descrição do que faz e retorno).

---

## 1. Visão Geral dos Arquivos do Diretório Raiz

| Arquivo / Diretório | Função Principal / Responsabilidade |
| :--- | :--- |
| `index.html` | Estrutura de interface da aplicação: barra de ferramentas superior, container Cytoscape, sidebar de propriedades, banner de criação de arestas, controle de zoom e containers de menu de contexto e toast. |
| `style.css` | Folha de estilos: variáveis de tema (dark/light), layout flex/grid, abas de grafos com destaque para aba fixa principal, componentes de formulário, animações e regras visuais do canvas e sidebar. |
| `store.js` | **Camada de Estado Central (Model)**: módulo Singleton `Store` enxuto. Orquestra nós, arestas, filtros e pub/sub de eventos delegando responsabilidades para submódulos especializados em `js/store/`. |
| `graph.js` | **Camada do Grafo Central (Cytoscape Controller)**: módulo Singleton `Graph` enxuto. Inicializa e gerencia a instância do Cytoscape.js, interações com a tela e eventos delegando estilos, foco e desenho de arestas para submódulos em `js/graph/`. |
| `main.js` | **Camada de UI & Aplicação (App Controller)**: módulo Singleton `App`. Orquestrador enxuto que integra os componentes modulares, alternância de temas, atalhos de teclado, clipboard e sincronização com `Store` e `Graph`. |
| `js/` | Diretório contendo todos os submódulos desacoplados do sistema. Possui seu próprio documento detalhado de arquitetura em [`js/ARCHITECTURE.md`](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/ARCHITECTURE.md). |
| `js/store/` | Submódulos da camada de dados: histórico atômico (`history.js`), DAG e abas (`tabsManager.js`) e persistência (`storage.js`). |
| `js/graph/` | Submódulos de renderização visual: folha de estilos Cytoscape (`styles.js`), modo foco dinâmico (`focus.js`) e modo interativo de arestas (`edgeMode.js`). |
| `js/components/` | Componentes de interface desacoplados: abas (`tabs.js`), busca (`search.js`), sidebar (`sidebar.js`) e menus de contexto (`contextMenu.js`). |

---

## 2. Módulo `Store` (`store.js`)

Gerencia os dados da aplicação e notifica os ouvintes sobre qualquer alteração.

### Constantes e Estrutura Interna
- `LS_KEY`: Chave do LocalStorage (`'trama_v1'`).
- `NODE_TYPES`: Tipos de nós permitidos (`['problema', 'solucao', 'agrupador', 'neutro', 'subgrafo', 'texto']`).
- `EDGE_TYPES`: Tipos de arestas permitidas (`['dependencia', 'resolve', 'relaciona', 'neutra']`).
- `PRIORITIES`: Prioridades válidas (`['alta', 'media', 'baixa']`).
- `state`: Objeto de estado contendo `version` (2), `activeTabId`, `tabs` (Array<{ id, name, nodes, edges }>), `selectedId`, `selectedEdgeId`, `showNodeMeta` e `filter`.

### Funções Internas e Métodos Públicos

#### `getTabs()`
- **Assinatura:** `getTabs(): Array<{ id: string, name: string, isMain: boolean }>`
- **Descrição:** Retorna lista de todas as abas cadastradas no projeto. A primeira aba (`idx === 0`) possui a flag `isMain: true`, designando-a como a aba fixa principal.
- **Retorno:** Array de objetos com `id`, `name` e `isMain`.

#### `getActiveTab()`
- **Assinatura:** `getActiveTab(): Tab | null`
- **Descrição:** Retorna o objeto da aba ativa atual com seus nós e arestas.
- **Retorno:** Objeto `Tab` ou `null`.

#### `getActiveTabId()`
- **Assinatura:** `getActiveTabId(): string | null`
- **Descrição:** Retorna o identificador da aba ativa.
- **Retorno:** String com ID da aba ou `null`.

#### `createTab(name)`
- **Assinatura:** `createTab(name?: string): Tab`
- **Descrição:** Cria uma nova aba independente dentro do projeto com nome customizado ou gerado automaticamente (`Aba N`), torna-a ativa, persiste e notifica `tabs:change`.
- **Retorno:** Objeto `Tab` recém-criado.

#### `renameTab(tabId, newName)`
- **Assinatura:** `renameTab(tabId: string, newName: string): Tab`
- **Descrição:** Altera o nome de uma aba (inclusive a aba principal fixa), sincroniza títulos em nós de subgrafo que a referenciam e notifica `tabs:change`.
- **Retorno:** Objeto `Tab` atualizado.

#### `switchTab(tabId)`
- **Assinatura:** `switchTab(tabId: string): void`
- **Descrição:** Alterna a aba ativa para `tabId`, limpa seleções ativas, salva e dispara `tabs:switch`.
- **Retorno:** `undefined`.

#### `deleteTab(tabId)`
- **Assinatura:** `deleteTab(tabId: string): void`
- **Descrição:** Exclui a aba informada (bloqueando e emitindo erro caso seja a aba fixa principal `idx === 0` ou a única existente). Executa **exclusão em cascata** removendo nós em outras abas que a importavam como subgrafo. Seleciona aba adjacente e notifica `tabs:change` e `tabs:switch`.
- **Retorno:** `undefined`.

#### `isTabEmpty(tabId)`
- **Assinatura:** `isTabEmpty(tabId: string): boolean`
- **Descrição:** Informa se uma aba está completamente vazia (sem vértices ou arestas cadastrados), permitindo exclusão direta sem prompt de confirmação.
- **Retorno:** `true` se vazia ou inexistente; `false` se contiver itens.

#### `canImportTab(targetTabId, candidateTabId)`
- **Assinatura:** `canImportTab(targetTabId: string, candidateTabId: string): boolean`
- **Descrição:** Executa algoritmo de detecção de ciclo / DAG para prevenir auto-importação ou dependência circular direta/indireta entre abas.
- **Retorno:** `true` se a importação for válida e livre de ciclos; `false` se causar ciclo ou for a mesma aba.

#### `getImportableTabs(targetTabId)`
- **Assinatura:** `getImportableTabs(targetTabId?: string): Array<{ id: string, name: string }>`
- **Descrição:** Retorna a lista de abas que podem ser importadas como subgrafo na aba de destino especificada.
- **Retorno:** Array de abas importáveis.

#### `subscribe(fn)`
- **Assinatura:** `subscribe(fn: Function): Function`
- **Descrição:** Registra uma função ouvinte para os eventos disparados pelo Store.
- **Retorno:** Função de cancelamento da inscrição `() => listeners.delete(fn)`.

#### `notify(event, payload)`
- **Assinatura:** `notify(event: string, payload: any): void`
- **Descrição:** Executa todas as funções ouvintes registradas, passando o tipo de evento e seus dados.
- **Retorno:** `undefined`.

#### `uid()`
- **Assinatura:** `uid(): string`
- **Descrição:** Gera um ID alfanumérico único para nós com prefixo `n_`.
- **Retorno:** String com ID único.

#### `edgeUid()`
- **Assinatura:** `edgeUid(): string`
- **Descrição:** Gera um ID alfanumérico único para arestas com prefixo `e_`.
- **Retorno:** String com ID único.

#### `nodeDefaults(p = {})`
- **Assinatura:** `nodeDefaults(p?: Partial<Node>): Node`
- **Descrição:** Mescla valores parciais com os padrões exigidos para um vértice (id, type, title, description, priority, tags, x, y, createdAt). Permite títulos vazios (`''`) sem forçar valor default.
- **Retorno:** Objeto de nó normalizado.

#### `edgeDefaults(p = {})`
- **Assinatura:** `edgeDefaults(p?: Partial<Edge>): Edge`
- **Descrição:** Mescla valores parciais com os padrões exigidos para uma aresta (id, source, target, edgeType, label, directed).
- **Retorno:** Objeto de aresta normalizado.

#### `addNode(partial = {})`
- **Assinatura:** `addNode(partial?: Partial<Node>): Node`
- **Descrição:** Cria um novo nó, adiciona-o ao array `state.nodes`, salva o estado no Storage e dispara `node:add`.
- **Retorno:** Objeto `Node` recém-criado.

#### `updateNode(id, changes = {})`
- **Assinatura:** `updateNode(id: string, changes?: Partial<Node>): Node`
- **Descrição:** Aplica modificações a um nó existente (validando tipo e prioridade, preservando strings de título inclusive vazias), persiste e dispara `node:update`.
- **Retorno:** Objeto `Node` atualizado. Lança erro se o nó não existir.

#### `deleteNode(id)`
- **Assinatura:** `deleteNode(id: string): string`
- **Descrição:** Remove o nó especificado e todas as arestas conectadas a ele. Se o nó for um contêiner/agrupador, preserva integralmente os nós filhos (desassociando-os com `parentId = null` no Store e Cytoscape), permitindo excluir o agrupador sem deletar os vértices contidos. Limpa a seleção caso estivesse selecionado. Salva e dispara `node:delete`.
- **Retorno:** ID do nó removido (`string`).

#### `getNode(id)`
- **Assinatura:** `getNode(id: string): Node | null`
- **Descrição:** Localiza um nó pelo seu ID.
- **Retorno:** Objeto `Node` correspondente ou `null`.

#### `getNodes()`
- **Assinatura:** `getNodes(): Node[]`
- **Descrição:** Obtém cópia superficial de todos os nós.
- **Retorno:** Array de objetos `Node`.

#### `getContainers()`
- **Assinatura:** `getContainers(): Node[]`
- **Descrição:** Retorna a lista de nós do tipo `'agrupador'` existentes na aba ativa.
- **Retorno:** Array de nós agrupadores.

#### `groupNodes(nodeIds, parentTitle = 'Contêiner')`
- **Assinatura:** `groupNodes(nodeIds: string[], parentTitle?: string): Node | null`
- **Descrição:** Cria um novo nó composto (`agrupador`) na posição média dos nós selecionados e vincula todos os `nodeIds` a ele como filhos (`parentId`). Registra a operação atomicamente no histórico e atualiza a hierarquia no Cytoscape.
- **Retorno:** O nó contêiner criado, ou `null` se nenhum nó foi fornecido.

#### `ungroupNode(nodeId)`
- **Assinatura:** `ungroupNode(nodeId: string): void`
- **Descrição:** Desvincula o nó especificado do seu nó contêiner pai (`parentId = null`), atualizando o Cytoscape e o histórico.
- **Retorno:** `undefined`.

#### `ungroupParent(parentId)`
- **Assinatura:** `ungroupParent(parentId: string): void`
- **Descrição:** Remove o nó contêiner pai sem deletar os nós filhos; apenas desassocia todos os seus nós descendentes (`parentId = null`) e exclui o agrupador.
- **Retorno:** `undefined`.

#### `addEdge(partial = {})`
- **Assinatura:** `addEdge(partial: { source: string, target: string, edgeType?: string, label?: string, directed?: boolean }): Edge`
- **Descrição:** Valida a conexão (impede nós inexistentes, self-loops e arestas duplicadas do mesmo tipo), cria e salva a aresta, disparando `edge:add`.
- **Retorno:** Objeto `Edge` criado.

#### `updateEdge(id, changes = {})`
- **Assinatura:** `updateEdge(id: string, changes?: Partial<Edge>): Edge`
- **Descrição:** Atualiza propriedades da aresta (ex: tipo, label/rótulo), salva e dispara `edge:update`.
- **Retorno:** Objeto `Edge` atualizado.

#### `deleteEdge(id)`
- **Assinatura:** `deleteEdge(id: string): string`
- **Descrição:** Remove a aresta do estado. Limpa seleção se estiver selecionada. Salva e dispara `edge:delete`.
- **Retorno:** ID da aresta removida (`string`).

#### `getEdge(id)`
- **Assinatura:** `getEdge(id: string): Edge | null`
- **Descrição:** Busca uma aresta pelo ID.
- **Retorno:** Objeto `Edge` correspondente ou `null`.

#### `getEdges()`
- **Assinatura:** `getEdges(): Edge[]`
- **Descrição:** Obtém cópia superficial de todas as arestas.
- **Retorno:** Array de objetos `Edge`.

#### `selectNode(id)`
- **Assinatura:** `selectNode(id: string): void`
- **Descrição:** Define o nó selecionado (`state.selectedId`), desmarcando qualquer aresta selecionada, e notifica `selection:change`.
- **Retorno:** `undefined`.

#### `selectEdge(id)`
- **Assinatura:** `selectEdge(id: string): void`
- **Descrição:** Define a aresta selecionada (`state.selectedEdgeId`), desmarcando qualquer nó selecionado, e notifica `selection:edgeChange`.
- **Retorno:** `undefined`.

#### `clearSelection()`
- **Assinatura:** `clearSelection(): void`
- **Descrição:** Reseta as seleções de nó e de aresta para `null`, notificando ambos os eventos.
- **Retorno:** `undefined`.

#### `getSelectedNode()`
- **Assinatura:** `getSelectedNode(): Node | null`
- **Descrição:** Retorna o nó atualmente selecionado.
- **Retorno:** `Node` ou `null`.

#### `getSelectedEdge()`
- **Assinatura:** `getSelectedEdge(): Edge | null`
- **Descrição:** Retorna a aresta atualmente selecionada.
- **Retorno:** `Edge` ou `null`.

#### `setFilter(changes = {})`
- **Assinatura:** `setFilter(changes: Partial<Filter>): void`
- **Descrição:** Atualiza critérios do filtro global (texto, tipo, prioridade, tags) e dispara `filter:change`.
- **Retorno:** `undefined`.

#### `getFilter()`
- **Assinatura:** `getFilter(): Filter`
- **Descrição:** Retorna cópia dos filtros atuais.
- **Retorno:** Objeto de filtro.

#### `getVisibleNodeIds()`
- **Assinatura:** `getVisibleNodeIds(): Set<string>`
- **Descrição:** Avalia todos os nós contra os filtros atuais e retorna o conjunto de IDs visíveis.
- **Retorno:** Instância de `Set<string>`.

#### `setShowNodeMeta(val)`
- **Assinatura:** `setShowNodeMeta(val: boolean): void`
- **Descrição:** Alterna a flag de exibição de metadados visuais nos nós e dispara `display:nodeMeta`.
- **Retorno:** `undefined`.

#### `getShowNodeMeta()`
- **Assinatura:** `getShowNodeMeta(): boolean`
- **Descrição:** Retorna se metadados (ícone de prioridade) devem ser exibidos nos rótulos.
- **Retorno:** `boolean`.

#### `updateNodePosition(id, x, y)`
- **Assinatura:** `updateNodePosition(id: string, x: number, y: number): void`
- **Descrição:** Atualiza as coordenadas x e y do nó em memória e agenda salvamento em disco via debounce.
- **Retorno:** `undefined`.

#### `_debouncedSave()`
- **Assinatura:** `_debouncedSave(): void`
- **Descrição:** Adia a chamada a `save()` em 800ms para evitar escrita excessiva durante arrastes.
- **Retorno:** `undefined`.

#### `getAllTags()`
- **Assinatura:** `getAllTags(): string[]`
- **Descrição:** Extrai todas as tags únicas de todos os nós em ordem alfabética.
- **Retorno:** Array de strings ordenado.

#### `save()`
- **Assinatura:** `save(): void`
- **Descrição:** Serializa `state.nodes` e `state.edges` em JSON no `localStorage`.
- **Retorno:** `undefined`.

#### `load()`
- **Assinatura:** `load(): boolean`
- **Descrição:** Lê e desserializa o snapshot do `localStorage`. Normaliza os registros.
- **Retorno:** `true` se dados foram carregados; `false` se vazio ou corrompido.

#### `exportJSON()`
- **Assinatura:** `exportJSON(): void`
- **Descrição:** Cria arquivo blob para download contendo o estado completo da rede.
- **Retorno:** `undefined`.

#### `importJSON(file)`
- **Assinatura:** `importJSON(file: File): Promise<number>`
- **Descrição:** Lê arquivo `.json`, valida formato, substitui o grafo atual e persiste.
- **Retorno:** Promessa resolvida com a quantidade de nós importados.

#### `getSnapshot()`
- **Assinatura:** `getSnapshot(): Snapshot`
- **Descrição:** Retorna um clone de dados limpo para renderização inicial ou exportação.
- **Retorno:** Objeto com `nodes`, `edges`, `selectedId`, `filter`.

#### `reset()`
- **Assinatura:** `reset(): void`
- **Descrição:** Limpa todo o grafo e dispara `store:reset`.
- **Retorno:** `undefined`.

#### `seed()`
- **Assinatura:** `seed(): void`
- **Descrição:** Popula o estado com os dados de demonstração iniciais quando não há storage prévio.
- **Retorno:** `undefined`.

#### `recordHistory()`
- **Assinatura:** `recordHistory(): void`
- **Descrição:** Tira um snapshot profundo da lista atual de nós e arestas e armazena na pilha `undoStack` (limite máximo de 50 estados), a menos que uma transação em lote via `batch()` esteja ativa.
- **Retorno:** `undefined`.

#### `batch(fn)`
- **Assinatura:** `batch(fn: () => T): T`
- **Descrição:** Executa uma função atômica agrupando todas as mutações no grafo (múltiplos nós/arestas colados ou excluídos) sob um único snapshot de histórico de Undo.
- **Retorno:** Retorno da função executada (`T`).

#### `canUndo()`
- **Assinatura:** `canUndo(): boolean`
- **Descrição:** Informa se existe algum estado prévio na pilha de desfazer.
- **Retorno:** `boolean`.

#### `undo()`
- **Assinatura:** `undo(): boolean`
- **Descrição:** Desempilha o estado anterior, restaura a coleção de nós e arestas, persiste no `localStorage` e notifica o evento `store:restore`.
- **Retorno:** `true` se desfez com sucesso, `false` se a pilha estava vazia.

#### `canRedo()`
- **Assinatura:** `canRedo(): boolean`
- **Descrição:** Informa se existe algum estado na pilha de refazer (ações desfeitas que podem ser reaplicadas).
- **Retorno:** `boolean`.

#### `redo()`
- **Assinatura:** `redo(): boolean`
- **Descrição:** Desempilha o estado mais recente da pilha de refazer, restaura o snapshot no grafo da aba ativa, move o estado atual para o histórico de desfazer, persiste no storage e dispara `store:restore`.
- **Retorno:** `true` se refez a ação com sucesso, `false` se não havia ações na pilha de refazer.

#### `getDiagnostics()`
- **Assinatura:** `getDiagnostics(): { openProblems: Node[], orphanSolutions: Node[], isolatedNodes: Node[], bottlenecks: Array<{ node: Node, count: number }>, cycles: string[][], totalNodes: number, totalEdges: number }`
- **Descrição:** Linter e analisador de integridade arquitetural da aba ativa. Detecta problemas em aberto (sem aresta 'resolve'), soluções órfãs (sem aresta 'resolve'), nós desconectados/isolados, gargalos de dependência (nós receptores de 3+ dependências) e ciclos de dependências circulares via busca em profundidade (DFS).
- **Retorno:** Objeto com métricas estruturais e coleções de nós anômalos.

#### `init()`
- **Assinatura:** `init(): void`
- **Descrição:** Tenta carregar do Storage; se não houver dados, executa `seed()`. Notifica `store:ready`.
- **Retorno:** `undefined`.

---

## 3. Módulo `Graph` (`graph.js`)

Controlador responsável pela renderização física com Cytoscape.js e tratamento de interação direta no canvas.

### Constantes e Variáveis de Estado do Módulo
- `cy`: Instância ativa do Cytoscape.
- `C`: Paleta de cores espelhada do CSS para sincronização de nós, arestas e fundos.
- `edgeMode`: Objeto de controle `{ active, edgeType, sourceId }` para conexão interativa.
- `_focusActive`, `_focusNodeId`, `FOCUS_DELAY`: Controle do modo de foco por hover prolongado (750ms).

### Funções Internas e Métodos Públicos

#### `syncTheme()`
- **Assinatura:** `syncTheme(): void`
- **Descrição:** Lê o tema atual do HTML (`data-theme`), atualiza o objeto `C` e reaplica o stylesheet no Cytoscape.
- **Retorno:** `undefined`.

#### `buildStyle()`
- **Assinatura:** `buildStyle(): Array<CytoscapeStyleRule>`
- **Descrição:** Gera o array de seletores e estilos visuais do Cytoscape para nós, arestas, estados selecionados, hover e classes de foco/dimming.
- **Retorno:** Array de regras de estilo do Cytoscape.

#### `nodeToEl(n)`
- **Assinatura:** `nodeToEl(n: Node): CytoscapeNodeElement`
- **Descrição:** Converte um objeto `Node` do Store para o formato de elemento Cytoscape.
- **Retorno:** Objeto com `group: 'nodes'`, `data` e `position`.

#### `edgeToEl(e)`
- **Assinatura:** `edgeToEl(e: Edge): CytoscapeEdgeElement`
- **Descrição:** Converte um objeto `Edge` do Store para o formato de elemento Cytoscape.
- **Retorno:** Objeto com `group: 'edges'` e `data`.

#### `buildLabel(n)`
- **Assinatura:** `buildLabel(n: Node): string`
- **Descrição:** Monta a string do rótulo do nó (adicionando indicador de prioridade ↑, ·, ↓ se habilitado). Se o título for vazio, preserva string vazia.
- **Retorno:** String do rótulo.

#### `init()`
- **Assinatura:** `init(): void`
- **Descrição:** Inicializa a biblioteca Cytoscape no `#cy`, vincula eventos do canvas, escuta o Store e ajusta o zoom inicial (`cy.fit`).
- **Retorno:** `undefined`.

#### `_activateFocus(nodeId, inbound)`
- **Assinatura:** `_activateFocus(nodeId: string, inbound: boolean): void`
- **Descrição:** Aplica classes CSS de highlight para a vizinhança do nó especificado (direcionado ou invertido com Shift) e dimming para o restante.
- **Retorno:** `undefined`.

#### `_clearFocusClasses()`
- **Assinatura:** `_clearFocusClasses(): void`
- **Descrição:** Remove as classes `focus-highlight` e `focus-dim` de todos os elementos.
- **Retorno:** `undefined`.

#### `_clearFocus()`
- **Assinatura:** `_clearFocus(): void`
- **Descrição:** Desativa o modo foco, limpa classes e esconde a dica de Shift.
- **Retorno:** `undefined`.

#### `_bindCyEvents()`
- **Assinatura:** `_bindCyEvents(): void`
- **Descrição:** Registra listeners do Cytoscape: hover com timer de foco, clique em nó, clique em aresta, clique duplo (dbltap) em nó ou aresta para seleção automática de título/rótulo na sidebar, clique no fundo, arraste de nó, clique direito (`cxttap`) em nós, arestas e tela, além de controle de threshold de pan, suporte a Shift multi-seleção e suporte dinâmico a Shift (sentido inverso) e Ctrl (todos os caminhos alcançáveis) no modo foco.
- **Retorno:** `undefined`.

#### `_deleteSelected()`
- **Assinatura:** `_deleteSelected(): void`
- **Descrição:** Remove do Store todos os nós e arestas atualmente marcados com `:selected` ou em `_selectedCyId`.
- **Retorno:** `undefined`.

#### `_bindStoreEvents()`
- **Assinatura:** `_bindStoreEvents(): void`
- **Descrição:** Inscreve o Cytoscape nos eventos do `Store` (`node:add`, `node:update`, `node:delete`, `edge:add`, `edge:update`, `edge:delete`, `selection:change`, `selection:edgeChange`, etc.).
- **Retorno:** `undefined`.

#### `_bindUIEvents()`
- **Assinatura:** `_bindUIEvents(): void`
- **Descrição:** Vincula botões de zoom (+, -, fit) e botões da barra de ferramentas de arestas.
- **Retorno:** `undefined`.

#### `startEdgeMode(type)`
- **Assinatura:** `startEdgeMode(type: string): void`
- **Descrição:** Ativa o modo de criação de aresta por clique, exibindo o banner informativo e alterando o cursor do canvas.
- **Retorno:** `undefined`.

#### `cancelEdgeMode()`
- **Assinatura:** `cancelEdgeMode(): void`
- **Descrição:** Cancela o modo de conexão de aresta, resetando fontes e banners.
- **Retorno:** `undefined`.

#### `_handleEdgeModeClick(id)`
- **Assinatura:** `_handleEdgeModeClick(id: string): void`
- **Descrição:** Lida com os cliques sucessivos em vértices no modo aresta (primeiro clique define origem; segundo clique define destino, cria a aresta no Store e dispara evento de seleção com abertura de sidebar).
- **Retorno:** `undefined`.

#### `applyFilter()`
- **Assinatura:** `applyFilter(): void`
- **Descrição:** Consulta `Store.getVisibleNodeIds()` e oculta ou exibe os nós e arestas correspondentes no Cytoscape.
- **Retorno:** `undefined`.

#### `_center()`
- **Assinatura:** `_center(): { x: number, y: number }`
- **Descrição:** Calcula o ponto central em pixels do container do canvas.
- **Retorno:** Objeto com coordenadas `{ x, y }`.

#### `addNodeAtCenter(type)`
- **Assinatura:** `addNodeAtCenter(type: string): Node`
- **Descrição:** Adiciona um novo nó do tipo especificado no centro visível do viewport do grafo.
- **Retorno:** O objeto `Node` criado.

#### `addNodeAtPos(type, x, y)`
- **Assinatura:** `addNodeAtPos(type: string, x: number, y: number): Node`
- **Descrição:** Cria um nó na posição exata de coordenadas fornecidas (usado pelo clique direito / menu de contexto).
- **Retorno:** O objeto `Node` criado.

#### `focusNode(id)`
- **Assinatura:** `focusNode(id: string): void`
- **Descrição:** Centraliza e aproxima suavemente o viewport no nó informado, aplicando efeito visual de destaque rápido.
- **Retorno:** `undefined`.

#### `getInstance()`
- **Assinatura:** `getInstance(): cytoscape.Core`
- **Descrição:** Fornece acesso à instância interna do Cytoscape.
- **Retorno:** Objeto `cy`.

#### `startEdgeModeFromContext(type, sourceId)`
- **Assinatura:** `startEdgeModeFromContext(type: string, sourceId: string): void`
- **Descrição:** Inicia criação de aresta tendo o nó de origem pré-definido via clique com botão direito.
- **Retorno:** `undefined`.

#### `createQuickChild(sourceId)`
- **Assinatura:** `createQuickChild(sourceId: string): Node | null`
- **Descrição:** Cria instantaneamente um nó filho conectado ao nó de origem especificado. Infere o tipo complementar (`problema` cria filho `solucao` com aresta `resolve`; qualquer outro tipo cria `problema` com aresta `dependencia`). Oculta e suspende a exibição da alça rápida para não atrapalhar a visualização/foco, posiciona o novo nó a +190px no eixo X e abre a sidebar selecionando o novo título para digitação imediata.
- **Retorno:** Objeto `Node` recém-criado ou `null`.

#### `runLayout(layoutName)`
- **Assinatura:** `runLayout(layoutName?: 'hierarchical-vertical' | 'hierarchical-horizontal' | 'cose' | 'concentric' | 'grid'): void`
- **Descrição:** Motor multi-layout da aplicação. Salva o snapshot atual no histórico de desfazer e recalcula a disposição geométrica dos nós. Suporta Hierárquico Vertical (DAG Top-Down), Hierárquico Horizontal (Left-to-Right), Orgânico / Física (`cose` com repulsão calibrada em 450.000 para rótulos largos), Concêntrico e Grade regular. Ao término da animação, sincroniza e persiste as novas coordenadas de todos os nós no `Store`.
- **Retorno:** `undefined`.

#### `runForceLayout()`
- **Assinatura:** `runForceLayout(): void`
- **Descrição:** Alias de conveniência que delega a execução para `runLayout('cose')`.
- **Retorno:** `undefined`.

#### `pulseNode(id)`
- **Assinatura:** `pulseNode(id: string): void`
- **Descrição:** Centraliza o viewport no nó especificado e dispara animação CSS com classe `.pulse-highlight` (borda pulsante de alta visibilidade durante 2,4s), usado principalmente para navegação direta a partir do relatório de diagnóstico.
- **Retorno:** `undefined`.

#### `resize()`
- **Assinatura:** `resize(): void`
- **Descrição:** Força o Cytoscape a recalcular as dimensões físicas do contêiner (`cy.resize()`), útil após redimensionamento da janela ou transições de entrada/saída do Modo Zen.
- **Retorno:** `undefined`.

#### `getCursorModelPos()`
- **Assinatura:** `getCursorModelPos(): { x: number, y: number }`
- **Descrição:** Converte a posição atual do ponteiro do mouse na tela para as coordenadas espaciais do grafo (modelo do Cytoscape), respeitando pan e zoom vigentes.
- **Retorno:** Objeto com coordenadas `{ x, y }`.

#### `getModelCenter()`
- **Assinatura:** `getModelCenter(): { x: number, y: number }`
- **Descrição:** Calcula o ponto central do viewport visível atual em coordenadas do modelo do grafo.
- **Retorno:** Objeto com coordenadas `{ x, y }`.

---

## 4. Módulo `App` (`main.js`)

Orquestrador geral enxuto da aplicação, responsável por integrar os componentes, gerenciar clipboard, atalhos de teclado globais, alternância de temas e sincronizar o ciclo de vida do `Store` com o `Graph`.

### Funções Internas e Métodos Públicos

#### `cacheDOM()`
- **Assinatura:** `cacheDOM(): void`
- **Descrição:** Localiza e armazena referências dos elementos DOM estáticos no mapa `DOM`.
- **Retorno:** `undefined`.

#### `toast(msg, dur = 2600)`
- **Assinatura:** `toast(msg: string, dur?: number): void`
- **Descrição:** Exibe mensagem flutuante temporária no rodapé da aplicação.
- **Retorno:** `undefined`.

#### `initTheme()`
- **Assinatura:** `initTheme(): void`
- **Descrição:** Carrega tema gravado no `localStorage` (padrão 'dark') e aplica.
- **Retorno:** `undefined`.

#### `setTheme(theme)`
- **Assinatura:** `setTheme(theme: 'dark' | 'light'): void`
- **Descrição:** Define atributo `data-theme` no `document.documentElement`, persiste no Storage, altera o ícone SVG e sincroniza as cores do canvas Cytoscape.
- **Retorno:** `undefined`.

#### `toggleTheme()`
- **Assinatura:** `toggleTheme(): void`
- **Descrição:** Alterna entre os temas `'dark'` e `'light'`.
- **Retorno:** `undefined`.

#### `openSidebar(nodeId, autoSelectText = false)`
- **Assinatura:** `openSidebar(nodeId: string, autoSelectText?: boolean): void`
- **Descrição:** Delega abertura de barra lateral do nó para `Sidebar.open(nodeId, autoSelectText)`.
- **Retorno:** `undefined`.

#### `openEdgeSidebar(edgeId, autoSelectText = false)`
- **Assinatura:** `openEdgeSidebar(edgeId: string, autoSelectText?: boolean): void`
- **Descrição:** Delega abertura de barra lateral de aresta para `Sidebar.openEdge(edgeId, autoSelectText)`.
- **Retorno:** `undefined`.

#### `closeSidebar()`
- **Assinatura:** `closeSidebar(): void`
- **Descrição:** Delega fechamento da barra lateral para `Sidebar.close()`.
- **Retorno:** `undefined`.

#### `bindStoreObserver()`
- **Assinatura:** `bindStoreObserver(): void`
- **Descrição:** Conecta a interface às notificações do Store (fechar sidebar quando item selecionado for excluído, atualizar badges, etc.).
- **Retorno:** `undefined`.

#### `bindGraphEvents()`
- **Assinatura:** `bindGraphEvents(): void`
- **Descrição:** Registra listeners para eventos customizados disparados pelo módulo `Graph` (`graph:openSidebar`, `graph:edgeSelected`, `graph:contextNode`, `graph:contextEdge`, `graph:contextCore`, `graph:error`).
- **Retorno:** `undefined`.

#### `bindIO()`
- **Assinatura:** `bindIO(): void`
- **Descrição:** Conecta botões de importação e exportação de JSON.
- **Retorno:** `undefined`.

#### `bindDropdowns()`
- **Assinatura:** `bindDropdowns(): void`
- **Descrição:** Conecta os dropdowns customizados na barra de ferramentas superior: filtro de tipos de nó (`#dd-type`), filtro de prioridades (`#dd-priority`) e seletor de layouts (`#dd-layout` com opções Hierárquico Vertical, Hierárquico Horizontal, Orgânico Cose, Concêntrico e Grade), configurando cliques de seleção e fechamento ao clicar fora.
- **Retorno:** `undefined`.

#### `copySelection()`
- **Assinatura:** `copySelection(): boolean`
- **Descrição:** Copia os vértices selecionados (único ou múltiplos) e quaisquer arestas que os conectem entre si para a área de transferência interna do aplicativo.
- **Retorno:** `true` se copiou itens, `false` se não havia seleção.

#### `pasteClipboard(targetPos = null)`
- **Assinatura:** `pasteClipboard(targetPos?: { x: number, y: number } | null): boolean`
- **Descrição:** Clona os vértices e arestas da área de transferência com novos IDs, posicionando-os no local do mouse ou com deslocamento a partir do centro, gerando um registro único na pilha de histórico de ações.
- **Retorno:** `true` se colou, `false` se a área de transferência estava vazia.

#### `undoAction()`
- **Assinatura:** `undoAction(): boolean`
- **Descrição:** Reverte o grafo para o estado imediatamente anterior via `Store.undo()`, sincroniza os botões de desfazer/refazer e emite um alerta flutuante (toast).
- **Retorno:** `true` se houve reversão, `false` caso contrário.

#### `redoAction()`
- **Assinatura:** `redoAction(): boolean`
- **Descrição:** Reaplica a ação revertida mais recente via `Store.redo()`, sincroniza os botões de desfazer/refazer e emite um alerta flutuante (toast).
- **Retorno:** `true` se houve reaplicação, `false` caso contrário.

#### `updateUndoRedoUI()`
- **Assinatura:** `updateUndoRedoUI(): void`
- **Descrição:** Atualiza a propriedade `disabled` dos botões `#btn-undo` e `#btn-redo` na barra de ferramentas conforme a disponibilidade de snapshots nas pilhas do histórico.
- **Retorno:** `undefined`.

#### `toggleZenMode()`
- **Assinatura:** `toggleZenMode(): void`
- **Descrição:** Alterna o Modo Zen de foco e apresentação. Aplica ou remove a classe `.zen-mode` no `document.body`, exibe/oculta a pílula flutuante de saída (`#btn-zen-exit`), fecha barras laterais abertas e aciona `Graph.resize()` para preenchimento total do canvas na tela.
- **Retorno:** `undefined`.

#### `isZenMode()`
- **Assinatura:** `isZenMode(): boolean`
- **Descrição:** Verifica se o aplicativo está atualmente operando em tela cheia/Modo Zen.
- **Retorno:** `boolean`.

#### `openDiagnostics()`
- **Assinatura:** `openDiagnostics(): void`
- **Descrição:** Executa `Store.getDiagnostics()`, renderiza os cartões de métricas e as listas de ocorrências arquiteturais (problemas em aberto, soluções órfãs, nós isolados, gargalos de dependência e ciclos) dentro do modal `#diagnostics-modal` e exibe o modal com backdrop. Permite clicar em qualquer nó listado para navegar diretamente e pulsá-lo na tela.
- **Retorno:** `undefined`.

#### `closeDiagnostics()`
- **Assinatura:** `closeDiagnostics(): void`
- **Descrição:** Fecha o modal de diagnósticos e remove o backdrop.
- **Retorno:** `undefined`.

#### `bindKeyboard()`
- **Assinatura:** `bindKeyboard(): void`
- **Descrição:** Mapeia atalhos globais de teclado (`Ctrl+Shift+T` nova aba, `Ctrl+Shift+W` fechar aba ativa, `Ctrl+E` renomear aba ativa, `Ctrl+S` exportar JSON, `Ctrl+C` copiar, `Ctrl+V` colar, `Ctrl+Z` desfazer, `Ctrl+Y` / `Ctrl+Shift+Z` refazer, `Tab` criar filho conectado, `Z` alternar Modo Zen, `Escape` sair do Modo Zen ou fechar diagnósticos, `Ctrl+F` ou `/` buscar, `T` alternar tema, `L` layout automático, `1-4` filtros), respeitando a digitação em inputs e textareas.
- **Retorno:** `undefined`.

#### `esc(s)`
- **Assinatura:** `esc(s: any): string`
- **Descrição:** Escapa caracteres HTML (`&`, `<`, `>`, `"`) para inserção segura no DOM.
- **Retorno:** String sanitizada.

#### `init()`
- **Assinatura:** `init(): void`
- **Descrição:** Ponto de entrada do sistema: executa cache de elementos, tema, Store, Graph, observers e todos os binds de interface.
- **Retorno:** Objeto com a interface pública do `App`.
