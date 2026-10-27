# Documentação Técnica e Arquitetura — Diretório `js/store/`

Este documento detalha o propósito, as responsabilidades e a especificação completa de cada função interna (assinatura, descrição e retorno) dos arquivos contidos na pasta `js/store/`.

---

## 1. Visão Geral dos Arquivos

| Arquivo | Função Principal / Responsabilidade |
| :--- | :--- |
| `history.js` | Gerencia a pilha de estados anteriores (desfazer/undo), controle de snapshots profundos e suporte a operações em lote (`batch`). |
| `tabsManager.js` | Gerencia modelo de múltiplas abas, algoritmo de prevenção de ciclos em DAG (`canImportTab`) e exclusão em cascata de subgrafos. |
| `explorerManager.js` | Gerencia a hierarquia de pastas (bases de dados/módulos), movimentação de itens e o pool central de entidades únicas ("o dado é único"). |
| `storage.js` | Gerencia a persistência no `localStorage` de múltiplos projetos isolados, indexação de projetos, chave ativa e exportação/importação JSON. |

---

## 2. `history.js` (`StoreHistory`)

Módulo responsável por gerenciar a pilha de estados anteriores (desfazer/undo) e agrupar mutações atômicas em lote (`batch`).

### Funções Internas e Métodos Públicos

#### `isBatching()`
- **Assinatura:** `isBatching(): boolean`
- **Descrição:** Informa se uma operação em lote está em andamento para suprimir gravações redundantes ou intermediárias no histórico.
- **Retorno:** `true` se estiver executando transação em lote; `false` caso contrário.

#### `record(activeTab)`
- **Assinatura:** `record(activeTab: Tab): void`
- **Descrição:** Captura um snapshot profundo dos nós e arestas da aba ativa informada e o insere na pilha de desfazer (limitado a no máximo 50 registros).
- **Retorno:** `undefined`.

#### `batch(fn, activeTabGetter)`
- **Assinatura:** `batch(fn: Function, activeTabGetter?: () => Tab): void`
- **Descrição:** Executa a função `fn` como uma única transação atômica, registrando o snapshot antes de iniciar as mutações e restaurando o estado de lote no bloco `finally`.
- **Retorno:** `undefined`.

#### `canUndo()`
- **Assinatura:** `canUndo(): boolean`
- **Descrição:** Verifica se existem snapshots salvos na pilha de desfazer.
- **Retorno:** `true` se houver estados anteriores para restaurar; `false` se a pilha estiver vazia.

#### `canRedo()`
- **Assinatura:** `canRedo(): boolean`
- **Descrição:** Verifica se existem snapshots salvos na pilha de refazer.
- **Retorno:** `true` se houver estados para avançar/refazer; `false` caso contrário.

#### `undo(activeTab)`
- **Assinatura:** `undo(activeTab: Tab): Snapshot | null`
- **Descrição:** Salva o estado atual na pilha de refazer (`redoStack`) e desempilha o snapshot anterior da pilha de desfazer (`undoStack`).
- **Retorno:** Objeto de snapshot contendo `tabId`, `nodes` e `edges`, ou `null` se vazia.

#### `redo(activeTab)`
- **Assinatura:** `redo(activeTab: Tab): Snapshot | null`
- **Descrição:** Salva o estado atual na pilha de desfazer (`undoStack`) e desempilha o snapshot da pilha de refazer (`redoStack`).
- **Retorno:** Objeto de snapshot contendo `tabId`, `nodes` e `edges`, ou `null` se vazia.

#### `pop()`
- **Assinatura:** `pop(): Snapshot | null`
- **Descrição:** Remove e retorna o último snapshot salvo da pilha de desfazer.
- **Retorno:** Objeto de snapshot contendo `tabId`, `nodes` e `edges`, ou `null` se vazia.

#### `clear()`
- **Assinatura:** `clear(): void`
- **Descrição:** Limpa as pilhas de desfazer e refazer.
- **Retorno:** `undefined`.

---

## 3. `tabsManager.js` (`TabsManager`)

Gerencia o modelo de abas múltiplas, geração de identificadores de aba, detecção de dependências cíclicas em DAG e exclusão em cascata de subgrafos.

### Funções Internas e Métodos Públicos

#### `tabUid()`
- **Assinatura:** `tabUid(): string`
- **Descrição:** Gera um ID alfanumérico único para uma aba com prefixo `tab_`.
- **Retorno:** String contendo o identificador único.

#### `getTabs(tabs)`
- **Assinatura:** `getTabs(tabs: Tab[]): Array<{ id: string, name: string, isMain: boolean }>`
- **Descrição:** Retorna a lista de abas identificando a primeira aba (`idx === 0`) como a aba principal permanente (`isMain: true`).
- **Retorno:** Array de objetos com metadados de cada aba.

#### `canImportTab(tabs, targetTabId, candidateTabId)`
- **Assinatura:** `canImportTab(tabs: Tab[], targetTabId: string, candidateTabId: string): boolean`
- **Descrição:** Executa busca em largura (BFS) no grafo direcionado acíclico (DAG) das abas para verificar se importar a aba `candidateTabId` na aba `targetTabId` causaria uma referência circular direta ou indireta.
- **Retorno:** `true` se a importação for válida e livre de ciclos; `false` se causar ciclo ou for a mesma aba.

#### `getImportableTabs(tabs, targetTabId)`
- **Assinatura:** `getImportableTabs(tabs: Tab[], targetTabId: string): Array<{ id: string, name: string }>`
- **Descrição:** Filtra a lista de abas do projeto retornando somente aquelas que podem ser importadas na aba de destino sem causar ciclos.
- **Retorno:** Array com as abas elegíveis para importação como subgrafo.

#### `cascadeDeleteSubgraphs(tabs, deletedTabId)`
- **Assinatura:** `cascadeDeleteSubgraphs(tabs: Tab[], deletedTabId: string): void`
- **Descrição:** Realiza exclusão em cascata, percorrendo todas as outras abas e removendo qualquer vértice do tipo `subgrafo` (e suas respectivas arestas conectadas) que referenciava a aba excluída.
- **Retorno:** `undefined`.

---

## 4. `explorerManager.js` (`ExplorerManager`)

Gerencia o esquema de pastas (bases de dados/módulos), árvore hierárquica e o pool central de entidades canônicas ("o dado é único").

### Funções Internas e Métodos Públicos

#### `folderUid()`
- **Assinatura:** `folderUid(): string`
- **Descrição:** Gera um ID alfanumérico único para uma pasta com prefixo `fld_`.
- **Retorno:** String com o identificador único.

#### `syncEntitiesFromTabs(entitiesMap, tabs)`
- **Assinatura:** `syncEntitiesFromTabs(entitiesMap: Record<string, Entity>, tabs: Tab[]): Record<string, Entity>`
- **Descrição:** Itera sobre todos os nós de todas as abas e garante que cada nó único exista no pool central com suas propriedades canônicas (título, descrição, prioridade, tags, url).
- **Retorno:** Objeto `entitiesMap` atualizado e indexado por ID.

#### `mergeNodeWithEntity(entity, localNode)`
- **Assinatura:** `mergeNodeWithEntity(entity: Entity, localNode?: Partial<Node>): Node`
- **Descrição:** Mescla os metadados canônicos da entidade central com propriedades posicionais específicas do grafo (coordenadas x, y e contêiner pai).
- **Retorno:** Objeto de nó completo normalizado.

#### `getEntityUsage(tabs, entityId)`
- **Assinatura:** `getEntityUsage(tabs: Tab[], entityId: string): Array<{ id: string, name: string }>`
- **Descrição:** Identifica em quais grafos/abas uma entidade específica está instanciada.
- **Retorno:** Array com o ID e o nome das abas que utilizam o dado.

#### `ensureDefaultFolder(folders, tabs)`
- **Assinatura:** `ensureDefaultFolder(folders: Folder[], tabs: Tab[]): Folder[]`
- **Descrição:** Garante a existência de uma pasta raiz padrão caso o projeto ainda não possua nenhuma e associa abas órfãs a ela.
- **Retorno:** Array de pastas atualizado.

#### `createFolder(folders, name, parentId)`
- **Assinatura:** `createFolder(folders: Folder[], name?: string, parentId?: string | null): Folder`
- **Descrição:** Cria uma nova pasta com nome personalizado ou padrão, vinculando-a a uma pasta pai opcional (subpasta).
- **Retorno:** O novo objeto `Folder`.

#### `renameFolder(folders, folderId, newName)`
- **Assinatura:** `renameFolder(folders: Folder[], folderId: string, newName: string): Folder`
- **Descrição:** Renomeia uma pasta existente.
- **Retorno:** Objeto `Folder` atualizado.

#### `deleteFolder(folders, tabs, folderId)`
- **Assinatura:** `deleteFolder(folders: Folder[], tabs: Tab[], folderId: string): void`
- **Descrição:** Exclui uma pasta realocando suas subpastas e grafos para o nível imediatamente superior (ou raiz) sem perda de dados.
- **Retorno:** `undefined`.

#### `buildTree(folders, tabs)`
- **Assinatura:** `buildTree(folders: Folder[], tabs: Tab[]): { rootFolders: FolderTreeItem[], rootTabs: TabTreeItem[], allFolders: FolderTreeItem[] }`
- **Descrição:** Constrói a estrutura hierárquica em árvore contendo pastas aninhadas e arquivos de grafos para renderização no Explorer estilo VS Code.
- **Retorno:** Objeto com raízes e listagem completa.

#### `moveItem(folders, tabs, itemType, itemId, targetFolderId)`
- **Assinatura:** `moveItem(folders: Folder[], tabs: Tab[], itemType: 'tab' | 'folder', itemId: string, targetFolderId: string | null): boolean`
- **Descrição:** Move uma aba ou subpasta para uma nova pasta de destino, prevenindo ciclos de aninhamento.
- **Retorno:** `true` se movido com sucesso; `false` se inválido ou ciclo detectado.

---

## 5. `storage.js` (`StoreStorage`)

Responsável pela persistência e indexação de múltiplos projetos isolados no `localStorage` (`trama_projects_index`, `trama_active_project_id`, `trama_proj_<id>` e espelhamento em `trama_v1`) e pela serialização/desserialização de arquivos `.json`.

### Funções Internas e Métodos Públicos

#### `getProjectsList()`
- **Assinatura:** `getProjectsList(): Array<{ id: string, name: string, updatedAt: number, tabCount: number, entityCount: number }>`
- **Descrição:** Retorna a listagem de projetos salvos no navegador a partir do índice `trama_projects_index`. Caso o índice não exista, inicializa automaticamente registrando o projeto default ativo do storage.
- **Retorno:** Array de metadados dos projetos cadastrados.

#### `saveProjectsList(list)`
- **Assinatura:** `saveProjectsList(list: ProjectMeta[]): void`
- **Descrição:** Persiste o índice de projetos no `localStorage`.
- **Retorno:** `undefined`.

#### `getActiveProjectId()`
- **Assinatura:** `getActiveProjectId(): string`
- **Descrição:** Retorna o ID do projeto atualmente ativo no navegador ou o primeiro projeto da lista.
- **Retorno:** String com o identificador do projeto ativo.

#### `setActiveProjectId(id)`
- **Assinatura:** `setActiveProjectId(id: string): void`
- **Descrição:** Grava no `localStorage` o identificador do projeto ativo.
- **Retorno:** `undefined`.

#### `save(state)`
- **Assinatura:** `save(state: State): void`
- **Descrição:** Serializa o projeto ativo sob a chave `trama_proj_<projectId>`, atualiza o índice de projetos e espelha o snapshot em `trama_v1` para retrocompatibilidade.
- **Retorno:** `undefined`.

#### `loadProject(projectId, nodeDefaultsFn, edgeDefaultsFn)`
- **Assinatura:** `loadProject(projectId: string, nodeDefaultsFn: Function, edgeDefaultsFn: Function): ProjectState | null`
- **Descrição:** Carrega o snapshot isolado de um projeto específico a partir de sua chave no `localStorage`.
- **Retorno:** Objeto de estado do projeto ou `null`.

#### `load(nodeDefaultsFn, edgeDefaultsFn)`
- **Assinatura:** `load(nodeDefaultsFn: Function, edgeDefaultsFn: Function): ProjectState | null`
- **Descrição:** Carrega o projeto atualmente ativo registrado em `trama_active_project_id`.
- **Retorno:** Objeto com estado carregado ou `null`.

#### `deleteProject(projectId)`
- **Assinatura:** `deleteProject(projectId: string): boolean`
- **Descrição:** Exclui um projeto salvo e seu registro no índice de projetos.
- **Retorno:** `true` se excluído com sucesso; `false` caso contrário.

#### `exportJSON(state, filename)`
- **Assinatura:** `exportJSON(state: State, filename?: string): Promise<boolean>`
- **Descrição:** Exporta o estado do projeto ativo utilizando a File System Access API ou acionando download via Blob.
- **Retorno:** `Promise<boolean>` indicando se a exportação foi bem-sucedida.

#### `parseJSONContent(snap, nodeDefaultsFn, edgeDefaultsFn)`
- **Assinatura:** `parseJSONContent(snap: any, nodeDefaultsFn: Function, edgeDefaultsFn: Function): ProjectState | null`
- **Descrição:** Processa um objeto JSON em formato v1, v2 ou v3, extraindo abas, pastas e populando o pool central de entidades únicas.
- **Retorno:** Objeto normalizado com abas, pastas e entidades.

#### `parseImportFile(file, nodeDefaultsFn, edgeDefaultsFn)`
- **Assinatura:** `parseImportFile(file: File, nodeDefaultsFn: Function, edgeDefaultsFn: Function): Promise<ProjectState>`
- **Descrição:** Lê assincronamente um arquivo `.json` via `FileReader`, validando e instanciando o estado do projeto importado.
- **Retorno:** `Promise` que resolve com os dados importados ou rejeita com erro descritivo.
