# Documentação Técnica e Arquitetura — Diretório `js/graph/`

Este documento detalha o propósito, as responsabilidades e a especificação completa de cada função interna (assinatura, descrição e retorno) dos arquivos contidos na pasta `js/graph/`.

---

## 1. Visão Geral dos Arquivos

| Arquivo | Função Principal / Responsabilidade |
| :--- | :--- |
| `styles.js` | Folha de estilos do Cytoscape, tokens visuais, paleta de cores e sincronização de temas (`dark`/`light`). |
| `focus.js` | Modo de foco dinâmico com temporização de repouso (hover prolongado) e inversão de sentido com tecla Shift. |
| `edgeMode.js` | Fluxo interativo de criação de arestas na interface (banner, seleção origem/destino, cancelamento). |
| `edgeHandle.js` | Alça interativa on-canvas para manipulação direta de pontos de inflexão, curvatura Bézier e dobra de 90° em arestas. |

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
- **Descrição:** Constrói o array com todas as regras de estilo de nós (problema, solução, agrupador, neutro, subgrafo, texto), compound nodes (`:parent` e `:parent:selected`), dimensionamento dinâmico (`width`, `height`, `text-max-width`, `min-width`, `min-height` via `customWidth`/`customHeight`), tipografia configurável (`font-size` em nós e arestas), rotação e angulação customizadas de rótulos de aresta (`text-rotation` mapeando 'autorotate', 'none'/0° ou ângulo livre em graus), arestas, seleções e estados de foco, pulso de diagnóstico e esmaecimento.
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

---

## 5. `edgeHandle.js` (`GraphEdgeHandle`)

Gerencia a alça interativa on-canvas para manipulação direta de pontos de inflexão, curvatura Bézier e posições de dobra de 90° em arestas selecionadas.

### Funções Internas e Métodos Públicos

#### `init(cyInstance)`
- **Assinatura:** `init(cyInstance: cytoscape.Core): void`
- **Descrição:** Armazena a referência para a instância do Cytoscape, obtém referências dos elementos DOM da alça (`#edge-handle`, `#edge-handle-grip`, `#edge-handle-tooltip`, `#edge-guide-svg`, `#edge-guide-line`) e vincula o listener de início de arraste (`mousedown`).
- **Retorno:** `undefined`.

#### `isDragging()`
- **Assinatura:** `isDragging(): boolean`
- **Descrição:** Informa se o usuário está atualmente arrastando a alça do ponto de inflexão/curva no canvas.
- **Retorno:** `true` se em processo de arraste; `false` caso contrário.

#### `hide()`
- **Assinatura:** `hide(): void`
- **Descrição:** Oculta a alça e a linha guia SVG, redefinindo o identificador da aresta ativa (ignora se estiver no meio de um arraste).
- **Retorno:** `undefined`.

#### `update(cy)`
- **Assinatura:** `update(cy?: cytoscape.Core): void`
- **Descrição:** Recalcula a posição renderizada em coordenadas de tela da alça com base na aresta selecionada no `Store`, aplicando as projeções de geometria da curva (`unbundled-bezier`, `segments`, `taxi` ou reta/bézier padrão) e sincronizando o ícone e tooltip da alça. É acionada de forma síncrona e imediata na seleção de arestas (`selection:edgeChange`), sem necessitar de movimentação do cursor.
- **Retorno:** `undefined`.

#### `getContainerRect()`
- **Assinatura:** `getContainerRect(): DOMRect | { left: number, top: number, width: number, height: number }`
- **Descrição:** Função utilitária interna que retorna os limites retangulares da viewport do contêiner Cytoscape (`#cy`).
- **Retorno:** Retângulo delimitador do contêiner.

#### `onMouseDown(e)`
- **Assinatura:** `onMouseDown(e: MouseEvent): void`
- **Descrição:** Trata o clique inicial na alça da aresta. Desativa pan e box-selection temporariamente no Cytoscape, promove arestas retas/bézier simples para `unbundled-bezier` se necessário, captura posições iniciais dos nós e registra listeners globais de movimentação e liberação do mouse.
- **Retorno:** `undefined`.

#### `onMouseMove(e)`
- **Assinatura:** `onMouseMove(e: MouseEvent): void`
- **Descrição:** Trata o movimento do mouse durante o arraste da alça. Projeta a coordenada do mouse no espaço do modelo do grafo, calcula a distância ortogonal $d$ e peso tangencial $w$ (para curvas) ou a porcentagem $t$ da dobra ortogonal (para curvas taxi de 90°), atualiza a geometria da aresta em tempo real a 60 FPS, posiciona a alça e guia SVG e reflete os valores nos inputs da barra lateral.
- **Retorno:** `undefined`.

#### `onMouseUp(e)`
- **Assinatura:** `onMouseUp(e: MouseEvent): void`
- **Descrição:** Finaliza a operação de arraste da alça. Remove os listeners globais de mouse, reabilita pan do Cytoscape, oculta guias e persiste atomicamente as alterações no `Store` via `Store.updateEdge()` com registro no histórico de desfazer/refazer.
- **Retorno:** `undefined`.

