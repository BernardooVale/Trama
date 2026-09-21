# Documentação Técnica e Arquitetura — Diretório `js/graph/`

Este documento detalha o propósito, as responsabilidades e a especificação completa de cada função interna (assinatura, descrição e retorno) dos arquivos contidos na pasta `js/graph/`.

---

## 1. Visão Geral dos Arquivos

| Arquivo | Função Principal / Responsabilidade |
| :--- | :--- |
| `styles.js` | Folha de estilos do Cytoscape, tokens visuais, paleta de cores e sincronização de temas (`dark`/`light`). |
| `focus.js` | Modo de foco dinâmico com temporização de repouso (hover prolongado) e inversão de sentido com tecla Shift. |
| `edgeMode.js` | Fluxo interativo de criação de arestas na interface (banner, seleção origem/destino, cancelamento). |

---

## 2. `styles.js` (`GraphStyles`)

Centraliza os tokens visuais, paleta de cores e a geração da folha de estilos do Cytoscape.

### Funções Internas e Métodos Públicos

#### `syncTheme(cy)`
- **Assinatura:** `syncTheme(cy: cytoscape.Core | null): void`
- **Descrição:** Sincroniza as cores do canvas Cytoscape (bordas, fundos e textos) de acordo com o atributo `data-theme` do DOM (`dark` ou `light`).
- **Retorno:** `undefined`.

#### `buildStyle()`
- **Assinatura:** `buildStyle(): Array<cytoscape.Stylesheet>`
- **Descrição:** Constrói o array com todas as regras de estilo de nós (problema, solução, agrupador, neutro, subgrafo, texto), arestas, seleções e estados de foco e esmaecimento.
- **Retorno:** Array de regras de estilo Cytoscape.

---

## 3. `focus.js` (`GraphFocus`)

Controla o modo de foco do grafo ativado após repouso do cursor do mouse sobre um vértice.

### Funções Internas e Métodos Públicos

#### `init()`
- **Assinatura:** `init(): void`
- **Descrição:** Registra listeners globais para atualizar a posição do mouse e detectar estados de botões pressionados (`mousedown`/`mouseup`) para cancelar temporizadores de foco durante cliques ou arrastos.
- **Retorno:** `undefined`.

#### `activate(cy, nodeId, inbound, allPaths)`
- **Assinatura:** `activate(cy: cytoscape.Core, nodeId: string, inbound: boolean, allPaths?: boolean): void`
- **Descrição:** Destaca o nó sob foco e sua vizinhança ou todos os caminhos alcançáveis (diretos ou invertidos dependendo de `inbound`; se `allPaths === true`, percorre recursivamente via BFS todos os caminhos a partir do nó ou até ele), esmaecendo o restante do grafo com `.focus-dim`.
- **Retorno:** `undefined`.

#### `clearClasses(cy)`
- **Assinatura:** `clearClasses(cy: cytoscape.Core | null): void`
- **Descrição:** Remove as classes `.focus-highlight` e `.focus-dim` de todos os elementos do canvas.
- **Retorno:** `undefined`.

#### `clear(cy)`
- **Assinatura:** `clear(cy: cytoscape.Core | null): void`
- **Descrição:** Desativa o modo foco, limpa classes e oculta a dica flutuante de teclado.
- **Retorno:** `undefined`.

#### `cancelTimer()`
- **Assinatura:** `cancelTimer(): void`
- **Descrição:** Cancela o timer pendente de ativação do foco.
- **Retorno:** `undefined`.

#### `onNodeMouseOver(cy, nodeId, grabbed)`
- **Assinatura:** `onNodeMouseOver(cy: cytoscape.Core, nodeId: string, grabbed: boolean): void`
- **Descrição:** Agenda a ativação do foco após 750ms caso o cursor permaneça sobre o vértice (evento nativo do Cytoscape) sem que nenhuma ação conflitante ocorra (ignora se houver clique, botão do mouse pressionado, nó agarrado/arrastado ou modo de aresta ativo).
- **Retorno:** `undefined`.

#### `onNodeMouseOut(cy)`
- **Assinatura:** `onNodeMouseOut(cy: cytoscape.Core): void`
- **Descrição:** Cancela o timer de foco e restaura o grafo ao estado normal.
- **Retorno:** `undefined`.

#### `getLastMousePos()`
- **Assinatura:** `getLastMousePos(): { x: number, y: number }`
- **Descrição:** Retorna as coordenadas da última posição registrada do mouse na viewport.
- **Retorno:** Objeto com coordenadas `{ x, y }`.

#### `isFocusActive()`
- **Assinatura:** `isFocusActive(): boolean`
- **Descrição:** Informa se o modo foco está atualmente ativo.
- **Retorno:** `true` se ativo; `false` caso contrário.

#### `getFocusNodeId()`
- **Assinatura:** `getFocusNodeId(): string | null`
- **Descrição:** Retorna o identificador do nó que originou o foco atual.
- **Retorno:** String com o ID do nó ou `null`.

---

## 4. `edgeMode.js` (`GraphEdgeMode`)

Gerencia o modo interativo de criação de arestas entre vértices no canvas.

### Funções Internas e Métodos Públicos

#### `isActive()`
- **Assinatura:** `isActive(): boolean`
- **Descrição:** Informa se o modo de criação de arestas está aguardando cliques de conexão.
- **Retorno:** `true` se ativo; `false` caso contrário.

#### `getEdgeType()`
- **Assinatura:** `getEdgeType(): string | null`
- **Descrição:** Retorna o tipo de aresta em criação (`dependencia`, `resolve`, `relaciona`, `neutra`).
- **Retorno:** String com o tipo ou `null`.

#### `start(type)`
- **Assinatura:** `start(type: string): void`
- **Descrição:** Inicia o modo de aresta para o tipo especificado, exibindo o banner superior e alterando o cursor do canvas.
- **Retorno:** `undefined`.

#### `cancel(cy)`
- **Assinatura:** `cancel(cy: cytoscape.Core | null): void`
- **Descrição:** Cancela a criação de aresta, oculta o banner e restaura as classes dos nós.
- **Retorno:** `undefined`.

#### `handleClick(cy, id)`
- **Assinatura:** `handleClick(cy: cytoscape.Core, id: string): void`
- **Descrição:** Processa clique em um vértice durante o modo de aresta: no primeiro clique define a origem; no segundo clique cria a aresta conectando àquele destino.
- **Retorno:** `undefined`.

#### `startFromContext(cy, type, sourceId)`
- **Assinatura:** `startFromContext(cy: cytoscape.Core, type: string, sourceId: string): void`
- **Descrição:** Inicia o modo de aresta já com o nó de origem pré-selecionado a partir de uma opção do menu de contexto.
- **Retorno:** `undefined`.
