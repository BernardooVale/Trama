# Documentação Técnica e Arquitetura — Diretório `js/components/`

Este documento detalha o propósito, as responsabilidades e a especificação completa de cada função interna (assinatura, descrição e retorno) dos arquivos contidos na pasta `js/components/`.

---

## 1. Visão Geral dos Arquivos

| Arquivo | Função Principal / Responsabilidade |
| :--- | :--- |
| `explorer.js` | Barra lateral esquerda retrátil estilo VS Code Explorer: árvore hierárquica de pastas (bases de dados) e grafos, além do painel de entidades únicas ("o dado é único"). |
| `tabs.js` | Renderização da barra de abas de grafos, aba fixa permanente (`Principal`), renomeação inline, menu contextual e atalhos. |
| `search.js` | Busca unificada por texto e etiquetas (`#tags`), chips de filtros ativos e lista suspensa com navegação por teclado. |
| `sidebar.js` | Painel lateral de propriedades e edição detalhada de vértices e arestas, debounce de digitação e gerenciamento de tags. |
| `contextMenu.js` | Menus contextuais acionados pelo botão direito do mouse no canvas, nós ou arestas (criação rápida, cópia, colagem, importação de subgrafo e inserção de dados do banco). |
| `terminalPrompt.js` | Gerador de documentação da DSL e montagem de snapshot contextual em Markdown para IA com cópia para a área de transferência. |
| `terminalEngine.js` | Interpretador e motor de execução da DSL do Trama com resolução de referências, cálculo geométrico híbrido e transações em lote. |
| `terminal.js` | Controlador de interface do terminal inferior retrátil estilo VS Code, console de logs, redimensionamento por arraste e atalhos. |

---

## 2. `explorer.js` (`ExplorerUI`)

Gerencia o explorador lateral estilo VS Code (`#explorer-sidebar`), renderizando o seletor de projetos com dropdown interativo, criação, alternância e exclusão de projetos, árvore hierárquica de pastas e grafos, ações de criação/renomeação/exclusão e o painel de entidades únicas do projeto ativo.

### Funções Internas e Métodos Públicos

#### `toggleSidebar(forceState)`
- **Assinatura:** `toggleSidebar(forceState?: boolean): void`
- **Descrição:** Alterna o estado de visibilidade da barra lateral esquerda do explorador (adicionando/removendo a classe `.collapsed` e redimensionando o Cytoscape). Pode ser disparado por `Ctrl+B`.
- **Retorno:** `undefined`.

#### `openSidebar()`
- **Assinatura:** `openSidebar(): void`
- **Descrição:** Força a abertura da barra lateral do explorador.
- **Retorno:** `undefined`.

#### `closeSidebar()`
- **Assinatura:** `closeSidebar(): void`
- **Descrição:** Recolhe a barra lateral do explorador.
- **Retorno:** `undefined`.

#### `renderProjectName()`
- **Assinatura:** `renderProjectName(): void`
- **Descrição:** Atualiza o rótulo do projeto ativo exibido no cabeçalho do explorador.
- **Retorno:** `undefined`.

#### `toggleProjectDropdown(forceOpen)`
- **Assinatura:** `toggleProjectDropdown(forceOpen?: boolean): void`
- **Descrição:** Abre ou fecha o menu dropdown do projeto, renderizando a lista de projetos salvos e ações disponíveis.
- **Retorno:** `undefined`.

#### `renderProjectDropdown()`
- **Assinatura:** `renderProjectDropdown(): void`
- **Descrição:** Constrói as opções do menu dropdown de projetos: botão "+ Novo Projeto...", listagem dos projetos existentes no navegador com número de grafos e dados, indicador visual do projeto ativo (`✓`) e ações de importar, exportar, renomear e excluir projeto.
- **Retorno:** `undefined`.

#### `promptCreateProject()`
- **Assinatura:** `promptCreateProject(): void`
- **Descrição:** Solicita o nome do novo projeto ao usuário e cria uma nova estrutura de projeto completamente isolada com sua pasta inicial, grafo principal e pool de dados vazio.
- **Retorno:** `undefined`.

#### `promptRenameProject()`
- **Assinatura:** `promptRenameProject(): void`
- **Descrição:** Abre diálogo para renomear o projeto ativo.
- **Retorno:** `undefined`.

#### `promptDeleteCurrentProject()`
- **Assinatura:** `promptDeleteCurrentProject(): void`
- **Descrição:** Solicita confirmação e remove o projeto ativo, alternando automaticamente para outro projeto disponível.
- **Retorno:** `undefined`.

#### `promptImportProject()`
- **Assinatura:** `promptImportProject(): void`
- **Descrição:** Permite selecionar um arquivo `.json` exportado e escolher se deseja importá-lo como um novo projeto separado ou sobrepor o projeto ativo.
- **Retorno:** `undefined`.

#### `renderTree()`
- **Assinatura:** `renderTree(): void`
- **Descrição:** Reconstrói o DOM da árvore de pastas e arquivos de grafos no contêiner `#explorer-tree`, destacando o grafo ativo e associando botões de ação e listeners de duplo-clique para renomeação inline.
- **Retorno:** `undefined`.

#### `renderEntities()`
- **Assinatura:** `renderEntities(): void`
- **Descrição:** Renderiza a lista de entidades únicas cadastradas no pool central deste projeto com indicador de cor, contagem de usos em grafos e botão `+` para inserção direta no grafo atualmente ativo.
- **Retorno:** `undefined`.

#### `promptCreateFolder(parentId)`
- **Assinatura:** `promptCreateFolder(parentId?: string | null): void`
- **Descrição:** Abre prompt para criar uma nova pasta raiz ou subpasta de base de dados.
- **Retorno:** `undefined`.

#### `promptCreateGraph(folderId)`
- **Assinatura:** `promptCreateGraph(folderId?: string | null): void`
- **Descrição:** Abre prompt para criar um novo arquivo de grafo vinculado à pasta especificada.
- **Retorno:** `undefined`.

#### `bind()`
- **Assinatura:** `bind(): void`
- **Descrição:** Registra os ouvintes do botão de novo projeto, seletor de projeto, botões do topo do explorador, seções colapsáveis, busca de entidades únicas e inscrição aos eventos do `Store`.
- **Retorno:** `undefined`.

---

## 3. `tabs.js` (`TabsUI`)

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
- **Descrição:** Valida se a aba é a principal fixa (bloqueando a exclusão e exibindo aviso). Se a aba estiver vazia (sem vértices ou arestas), exclui-a diretamente sem exibir caixa de confirmação. Se contiver itens, solicita confirmação do usuário antes de acionar `Store.deleteTab(tabId)`.
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

## 4. `search.js` (`Search`)

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

## 5. `sidebar.js` (`Sidebar`)

Gerencia o painel lateral de propriedades e edição detalhada de nós e arestas, incluindo visualização/edição Markdown e associação a contêineres e URLs externas.

### Funções Internas e Métodos Públicos

#### `renderMarkdown(md)`
- **Assinatura:** `renderMarkdown(md: string): string`
- **Descrição:** Parser leve em expressões regulares para conversão de texto Markdown em HTML seguro (escapando caracteres maliciosos). Suporta títulos (`#`, `##`, `###`), checklists (`- [ ]`, `- [x]`), listas com marcadores (`-` ou `*`), negrito (`**`), itálico (`*`), código inline (`` ` ``) e hiperlinks (`[texto](url)`).
- **Retorno:** String HTML formatada dentro de um container `<div class="md-content">`.

#### `setDescMode(mode)`
- **Assinatura:** `setDescMode(mode: 'edit' | 'preview'): void`
- **Descrição:** Alterna a visualização da descrição do nó entre o campo de edição de texto multilinhas (`#sb-desc`) e a renderização interativa Markdown (`#sb-desc-preview`).
- **Retorno:** `undefined`.

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
- **Descrição:** Salva imediatamente quaisquer alterações pendentes com debounce ativo nos inputs de título, descrição, URL externa e rótulo de aresta, fechando o painel lateral.
- **Retorno:** `undefined`.

#### `populate(node)`
- **Assinatura:** `populate(node: Node): void`
- **Descrição:** Preenche os campos do formulário lateral com seletor interativo de tipo (`#sb-type-select`), badge de cor do tipo, título, descrição, prioridade, tags, contêiner pai (`#sb-container-select`), seletor de aba vinculada para subgrafo (`#sb-subgraph-select`) e URL externa (`#sb-url` com botão de acesso direto `↗`). Exibe contagem de usos em bases/grafos caso o dado pertença a mais de um grafo. Redefine o modo de descrição para `'edit'`. Para nós do tipo `subgrafo`, exibe campos de navegação e seleção da aba associada.
- **Retorno:** `undefined`.

#### `populateEdge(edge)`
- **Assinatura:** `populateEdge(edge: Edge): void`
- **Descrição:** Preenche os campos do formulário lateral da aresta (`#sb-edge-fields`) com seletor interativo de tipo de conexão (`#sb-edge-type-select`), badge de cor da aresta, rótulo, endpoints e controles de estilização geométrica: seletor de formato da curva (`#sb-edge-curve-style`), controles contextuais para curva de 90° taxi (orientação `#sb-edge-taxi-dir` e posição da dobra `#sb-edge-taxi-turn`), controles contextuais de inflexão (slider de distância/curvatura `#sb-edge-cp-distance` com botão de zerar e slider de peso `#sb-edge-cp-weight`), estilo do traço (`#sb-edge-line-pattern`) e direção das setas (`#sb-edge-arrow-dir`).
- **Retorno:** `undefined`.

#### `renderTags(tags)`
- **Assinatura:** `renderTags(tags: string[]): void`
- **Descrição:** Renderiza chips visuais interativos para as tags atribuídas ao nó atualmente aberto.
- **Retorno:** `undefined`.

#### `addTag(tag)`
- **Assinatura:** `addTag(tag: string): void`
- **Descrição:** Normaliza e adiciona uma nova etiqueta ao nó selecionado, salvando e atualizando a interface.
- **Retorno:** `undefined`.

#### `removeTag(tag)`
- **Assinatura:** `removeTag(tag: string): void`
- **Descrição:** Remove a etiqueta informada do nó selecionado.
- **Retorno:** `undefined`.

#### `bind()`
- **Assinatura:** `bind(): void`
- **Descrição:** Inicializa os listeners de debounce nos inputs, alternância de preview de descrição, seletor de prioridade, seletores de tipos de vértice e aresta, além de todos os controles visuais de arestas (formato de curva, ângulo taxi, sliders interativos de inflexão e curvatura com pré-visualização contínua a 60fps no Cytoscape via evento `input` e persistência no histórico atômico via `change`, traço e setas).
- **Retorno:** `undefined`.

---

## 6. `contextMenu.js` (`ContextMenu`)

Gerencia menus contextuais acionados com botão direito no canvas, vértices e arestas, oferecendo criação rápida, modificação direta de tipo (com indicação visual do tipo ativo), ajuste do formato visual da curva da aresta, agrupamento, cópia/cola, diagnóstico e inserção de dados a partir do banco de dados global.

### Funções Internas e Métodos Públicos

#### `showNodeMenu(id, cx, cy)`
- **Assinatura:** `showNodeMenu(id: string, cx: number, cy: number): void`
- **Descrição:** Abre o menu de contexto de nó em `(cx, cy)` oferecendo ações rápidas (criar filho conectado, arestas, modificação direta do tipo do nó entre todos os 6 tipos disponíveis com indicador visual e marcação ativa, agrupamento em contêiner, copiar, remoção do grafo atual e exclusão permanente global).
- **Retorno:** `undefined`.

#### `showEdgeMenu(id, cx, cy)`
- **Assinatura:** `showEdgeMenu(id: string, cx: number, cy: number): void`
- **Descrição:** Abre o menu de contexto de aresta em `(cx, cy)` permitindo modificação direta do formato da curva (Bézier suave, reta, ortogonal 90°, inflexão unbundled ou segmentada), alteração do tipo da conexão (dependência, resolve, relaciona e neutra com indicador visual e marcação ativa), edição de propriedades e exclusão.
- **Retorno:** `undefined`.

#### `showCoreMenu(gx, gy, cx, cy)`
- **Assinatura:** `showCoreMenu(gx: number, gy: number, cx: number, cy: number): void`
- **Descrição:** Abre menu de contexto na tela limpa em `(cx, cy)` com criação rápida de nós, colagem, importação de subgrafos e inserção de nós disponíveis do banco único nas coordenadas `(gx, gy)`.
- **Retorno:** `undefined`.

#### `hide()`
- **Assinatura:** `hide(): void`
- **Descrição:** Oculta o menu de contexto flutuante.
- **Retorno:** `undefined`.

#### `bind()`
- **Assinatura:** `bind(): void`
- **Descrição:** Conecta a captura de cliques nos botões do menu (incluindo alteração atômica de tipos de nó e aresta em lote para seleções múltiplas) e fecha o menu ao clicar fora.
- **Retorno:** `undefined`.

---

## 7. `terminalPrompt.js` (`TerminalPrompt`)

Módulo gerador da especificação da DSL e do snapshot em Markdown com o estado do projeto (pastas, abas/grafos, nós, arestas e banco de dados único) para envio a qualquer LLM.

### Funções Internas e Métodos Públicos

#### `buildPrompt()`
- **Assinatura:** `buildPrompt(): string`
- **Descrição:** Extrai metadados do projeto ativo (`Store.getProjectName()`), lista de pastas, abas, nós e arestas da aba ativa, além de entidades cadastradas no pool de dados únicos, concatenando-os com as regras sintáticas e catálogo de comandos da DSL em formato Markdown.
- **Retorno:** String Markdown estruturada e pronta para área de transferência.

#### `copyToClipboard()`
- **Assinatura:** `copyToClipboard(): Promise<boolean>`
- **Descrição:** Executa a geração do prompt via `buildPrompt()` e copia o texto gerado para a área de transferência do sistema através da API `navigator.clipboard.writeText()`, recorrendo a um elemento `textarea` temporário invisível em ambientes com restrições de permissão.
- **Retorno:** Promessa resolvida com `true` se copiado com sucesso; `false` em caso de falha.

---

## 8. `terminalEngine.js` (`TerminalEngine`)

Motor de interpretação e execução de scripts da DSL do Trama. Processa lotes de comandos com resolução de referências, cálculo geométrico híbrido sem sobreposição de nós e execução atômica em transações do histórico.

### Funções Internas e Métodos Públicos

#### `parseAttributes(text)`
- **Assinatura:** `parseAttributes(text: string): Record<string, string>`
- **Descrição:** Extrai pares chave-valor a partir de strings de argumentos com suporte a aspas duplas (`key="valor"`), aspas simples e valores literais.
- **Retorno:** Objeto com propriedades e valores normalizados em minúsculas para as chaves.

#### `parse(scriptText)`
- **Assinatura:** `parse(scriptText: string): Array<{ lineIndex: number, raw: string, cmd: string, argsText: string, attrs: Record<string, string> }>`
- **Descrição:** Analisa linha a linha um script em texto bruto, filtrando comentários (`#` ou `//`), cercas de código Markdown (```` ``` ````) e linhas vazias, tokenizando o comando e extraindo atributos.
- **Retorno:** Array de objetos com comandos parseados e metadados de linha.

#### `resolveNodeId(ref, aliasMap)`
- **Assinatura:** `resolveNodeId(ref: string, aliasMap?: Map<string, string>): string | null`
- **Descrição:** Localiza o ID de um nó avaliando sucessivamente o mapa de aliases da sessão, o repositório central (`Store.getNode()`) e a busca por correspondência exata de título na aba ativa.
- **Retorno:** String com ID do nó ou `null` se não encontrado.

#### `resolveFolderId(ref)`
- **Assinatura:** `resolveFolderId(ref: string): string | null`
- **Descrição:** Localiza uma pasta por correspondência de ID ou por nome.
- **Retorno:** String com ID da pasta ou `null`.

#### `resolveTabId(ref)`
- **Assinatura:** `resolveTabId(ref: string): string | null`
- **Descrição:** Localiza uma aba por correspondência de ID ou por nome.
- **Retorno:** String com ID da aba ou `null`.

#### `computePosition(refNodeId, spawnIndex)`
- **Assinatura:** `computePosition(refNodeId: string | null, spawnIndex: number): { x: number, y: number }`
- **Descrição:** Calcula as coordenadas cartesianas para inserção de um nó novo. Se houver um nó de referência (`near` ou nó pai), posiciona ao redor dele em raio proporcional; caso contrário, posiciona em espiral no centro do modelo do viewport (`Graph.getModelCenter()`).
- **Retorno:** Coordenadas `{ x, y }`.

#### `execute(scriptText)`
- **Assinatura:** `execute(scriptText: string): { total: number, successCount: number, errorCount: number, logs: Array<{ line: number, status: 'ok' | 'warn' | 'error', message: string }> }`
- **Descrição:** Executa a lista de comandos dentro de uma transação atômica `Store.batch()`, suportando `NODE`, `UPDATE_NODE`, `DELETE_NODE`, `CONNECT`, `DELETE_EDGE`, `GROUP`, `UNGROUP`, `FOLDER`, `TAB`, `USE_TAB`, `USE_ENTITY` e `LAYOUT`. Se houver layout agendado, aciona `Graph.runLayout()`.
- **Retorno:** Relatório detalhado com contadores e logs de execução por linha.

---

## 9. `terminal.js` (`TerminalUI`)

Controlador de interface do terminal inferior retrátil. Gerencia o redimensionamento por arraste de mouse, comandos de teclado, console de logs e integração com o orquestrador `App`.

### Funções Internas e Métodos Públicos

#### `cacheElements()`
- **Assinatura:** `cacheElements(): void`
- **Descrição:** Mapeia e armazena em variáveis de módulo as referências do painel, inputs, área de log, badge de status e botões de controle.
- **Retorno:** `undefined`.

#### `isOpen()`
- **Assinatura:** `isOpen(): boolean`
- **Descrição:** Verifica se o painel do terminal está atualmente aberto e visível no DOM.
- **Retorno:** `boolean`.

#### `open()`
- **Assinatura:** `open(): void`
- **Descrição:** Exibe o painel do terminal (`#terminal-panel`), adiciona estado visual ativo no botão superior `#btn-toggle-terminal`, aciona `Graph.resize()` para recalcular o viewport do Cytoscape e foca no campo de texto de comandos.
- **Retorno:** `undefined`.

#### `close()`
- **Assinatura:** `close(): void`
- **Descrição:** Oculta o painel do terminal (`#terminal-panel`), remove classe `.active` do botão no cabeçalho e aciona `Graph.resize()` para expandir o canvas para a altura total.
- **Retorno:** `undefined`.

#### `toggle(forceState)`
- **Assinatura:** `toggle(forceState?: boolean): void`
- **Descrição:** Alterna ou força o estado de exibição do painel do terminal.
- **Retorno:** `undefined`.

#### `copyPrompt()`
- **Assinatura:** `copyPrompt(): Promise<void>`
- **Descrição:** Dispara a cópia do prompt de contexto para a área de transferência via `TerminalPrompt.copyToClipboard()` e exibe alerta de confirmação em `App.toast()`.
- **Retorno:** `Promise<void>`.

#### `clear()`
- **Assinatura:** `clear(): void`
- **Descrição:** Limpa o campo de entrada de texto e redefine o container de logs de saída para o estado inicial.
- **Retorno:** `undefined`.

#### `renderLogs(logs, summary)`
- **Assinatura:** `renderLogs(logs: Array<{ status: string, message: string }>, summary: { successCount: number, errorCount: number }): void`
- **Descrição:** Constrói os elementos HTML dos logs com badges semânticas coloridas (`OK`, `AVISO`, `ERRO`), rola a saída até o final e atualiza a badge de status no cabeçalho do terminal.
- **Retorno:** `undefined`.

#### `run()`
- **Assinatura:** `run(): void`
- **Descrição:** Lê o texto do script em `#terminal-input`, executa os comandos via `TerminalEngine.execute()`, renderiza os logs, atualiza os botões de Undo/Redo no `App` e emite mensagem de resumo em toast.
- **Retorno:** `undefined`.

#### `initResizeHandle()`
- **Assinatura:** `initResizeHandle(): void`
- **Descrição:** Conecta listeners de mouse na alça `#terminal-resize-handle` para permitir redimensionar verticalmente a altura do painel com limitação entre 120px e 75vh e atualização contínua do Cytoscape via `Graph.resize()`.
- **Retorno:** `undefined`.

#### `bind()`
- **Assinatura:** `bind(): void`
- **Descrição:** Inicializa referências DOM, listeners de redimensionamento, cliques de botões do cabeçalho e do terminal, além do atalho `Ctrl+Enter` para execução direta no textarea.
- **Retorno:** `undefined`.

