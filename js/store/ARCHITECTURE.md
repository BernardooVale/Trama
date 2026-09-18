# Documentação Técnica e Arquitetura — Diretório `js/store/`

Este documento detalha o propósito, as responsabilidades e a especificação completa de cada função interna (assinatura, descrição e retorno) dos arquivos contidos na pasta `js/store/`.

---

## 1. Visão Geral dos Arquivos

| Arquivo | Função Principal / Responsabilidade |
| :--- | :--- |
| `history.js` | Gerencia a pilha de estados anteriores (desfazer/undo), controle de snapshots profundos e suporte a operações em lote (`batch`). |
| `tabsManager.js` | Gerencia modelo de múltiplas abas, algoritmo de prevenção de ciclos em DAG (`canImportTab`) e exclusão em cascata de subgrafos. |
| `storage.js` | Gerencia a persistência no `localStorage`, migração retroativa e serialização/desserialização de arquivos `.json`. |

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

#### `pop()`
- **Assinatura:** `pop(): Snapshot | null`
- **Descrição:** Remove e retorna o último snapshot salvo da pilha de desfazer.
- **Retorno:** Objeto de snapshot contendo `tabId`, `nodes` e `edges`, ou `null` se vazia.

#### `clear()`
- **Assinatura:** `clear(): void`
- **Descrição:** Limpa toda a pilha de histórico.
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

## 4. `storage.js` (`StoreStorage`)

Responsável pela persistência do estado no `localStorage` e pela serialização e desserialização de arquivos `.json`.

### Funções Internas e Métodos Públicos

#### `save(state)`
- **Assinatura:** `save(state: State): void`
- **Descrição:** Serializa as abas e o estado da aplicação e grava sob a chave `'trama_v1'` do `localStorage`.
- **Retorno:** `undefined`.

#### `load(nodeDefaultsFn, edgeDefaultsFn)`
- **Assinatura:** `load(nodeDefaultsFn: Function, edgeDefaultsFn: Function): { tabs: Tab[], activeTabId: string } | null`
- **Descrição:** Lê o `localStorage`, aplicando normalização através das funções de fallback e garantindo compatibilidade retroativa com esquemas v1.
- **Retorno:** Objeto com array de abas e ID da aba ativa, ou `null` se vazio ou inválido.

#### `exportJSON(state)`
- **Assinatura:** `exportJSON(state: State): void`
- **Descrição:** Empacota o projeto em formato JSON v2 e inicia o download do arquivo no navegador com carimbo de data/hora.
- **Retorno:** `undefined`.

#### `parseImportFile(file, nodeDefaultsFn, edgeDefaultsFn)`
- **Assinatura:** `parseImportFile(file: File, nodeDefaultsFn: Function, edgeDefaultsFn: Function): Promise<{ tabs: Tab[], activeTabId: string }>`
- **Descrição:** Lê assincronamente um arquivo `.json` via `FileReader`, validando o formato (v1 ou v2) e instanciando o estado das abas.
- **Retorno:** `Promise` que resolve com as abas importadas ou rejeita com erro descritivo.
