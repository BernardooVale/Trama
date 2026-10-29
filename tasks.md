# Tarefas: Customização Visual de Vértices, Arestas e Correção da Alça de Curvatura

Base: main
Branch: tasks/customizacao-visual

Legenda: [ ] aberta | [~] aguardando verificação | [x] verificada | [!] falhou

## T1 — Correção da Exibição Imediata da Alça de Curvatura (`store.js`, `graph.js`)
- [~] Status
- Arquivos: `store.js`, `graph.js`
- Descrição: Corrigir o problema em que a alça de controle de curvatura da aresta só aparecia após começar a mexer o mouse, sincronizando a ordem de eventos em `Store.selectEdge` e impedindo que `selection:change` oculte indevidamente a alça.
- Check rápido: `python -c "import pathlib; s=pathlib.Path('store.js').read_text('utf-8'); g=pathlib.Path('graph.js').read_text('utf-8'); assert 'notify(\'selection:change\', null);\n    notify(\'selection:edgeChange\', id);' in s or 'notify(\"selection:change\", null)' in s"`
- Critérios:
  - Em `store.js`, o método `selectEdge(id)` notifica a desmarcação de nós (`selection:change, null`) antes de notificar a seleção da aresta (`selection:edgeChange, id`), assegurando que a alça seja acionada por último.
  - Em `graph.js`, o tratador de `selection:change` somente executa `GraphEdgeHandle.hide()` se um nó foi efetivamente selecionado (`payload` não nulo) ou se nenhuma aresta estiver selecionada no `Store`.
  - Ao selecionar uma aresta pelo evento `tap` no Cytoscape ou pela API do `Store`, `GraphEdgeHandle.update(cy)` é invocado de forma síncrona, exibindo o elemento `#edge-handle` imediatamente sobre a aresta selecionada.
- Notas do executor: Invertida ordem de notificação em Store.selectEdge para desmarcar nó antes de selecionar aresta; ajustado tratador de selection:change em graph.js para não ocultar GraphEdgeHandle quando payload for nulo e houver aresta selecionada.
- Notas do verificador:

## T2 — Suporte a Dimensões, Tipografia e Angulação no Store e Cytoscape (`store.js`, `graph.js`, `js/graph/styles.js`)
- [~] Status
- Arquivos: `store.js`, `graph.js`, `js/graph/styles.js`
- Descrição: Expandir as definições padrão de nós e arestas e mapear estilos no Cytoscape para suportar largura e altura customizadas de nós, tamanhos de fonte configuráveis e rotação livre/presets do texto da aresta.
- Check rápido: `python -c "import pathlib; s=pathlib.Path('js/graph/styles.js').read_text('utf-8'); st=pathlib.Path('store.js').read_text('utf-8'); assert 'customWidth' in st and 'labelRotation' in st and 'customWidth' in s and 'labelRotation' in s"`
- Critérios:
  - `store.js` expande `nodeDefaults` e `updateNode` com os campos `customWidth` (número ou `null`), `customHeight` (número ou `null`) e `fontSize` (número ou `null`), onde `null` preserva o cálculo automático baseado no texto.
  - `store.js` expande `edgeDefaults` e `updateEdge` com os campos `labelRotation` (string ou número: `'autorotate'`, `'none'`/`'0'` ou ângulo em graus) e `fontSize` (número ou `null`).
  - `graph.js` repassa `customWidth`, `customHeight`, `fontSize` e `labelRotation` nas funções de conversão `nodeToEl`, `edgeToEl` e nos tratadores de evento `node:update` e `edge:update`.
  - `js/graph/styles.js` define mappers dinâmicos de estilo: `'width'` e `'height'` para nós usam o valor numérico de `customWidth`/`customHeight` quando presente ou `'label'` como padrão; `'font-size'` de nós usa `data(fontSize)` ou `13px`; `'text-rotation'` de arestas mapeia `'autorotate'`, `'none'` (0°) ou o ângulo em graus formatado; `'font-size'` de arestas usa `data(fontSize)` ou `11px`.
- Notas do executor: Suporte adicionado a customWidth, customHeight, fontSize e labelRotation em Store e repasse em Graph; mappers funcionais criados em js/graph/styles.js com suporte a graus/presets e fallback para rótulo automático.
- Notas do verificador:

## T3 — Controles de Dimensões e Tipografia de Vértices na Barra Lateral (`index.html`, `style.css`, `js/components/sidebar.js`)
- [~] Status
- Arquivos: `index.html`, `style.css`, `js/components/sidebar.js`
- Descrição: Criar campos na sidebar de nós para alterar largura, altura (em px) e tamanho da fonte, com botão para alternar e resetar as dimensões para o modo automático.
- Check rápido: `python -c "import pathlib; h=pathlib.Path('index.html').read_text('utf-8'); js=pathlib.Path('js/components/sidebar.js').read_text('utf-8'); assert 'sb-node-width' in h and 'sb-node-height' in h and 'sb-node-font-size' in h and 'sb-node-width' in js"`
- Critérios:
  - `index.html` inclui no formulário `#sb-node-fields` controles de dimensão contendo `#sb-node-width`, `#sb-node-height`, botão `#btn-node-size-auto` ("Automático") e controle de tamanho da fonte `#sb-node-font-size` com indicador de valor em px.
  - `style.css` estiliza a seção de dimensões do vértice mantendo consistência com o tema dark/light da barra lateral.
  - `js/components/sidebar.js` vincula a abertura da sidebar populando os inputs com as dimensões do nó selecionado (ou indicando modo "Auto" e desabilitando ou limpando campos quando nulos).
  - Alterações nos inputs disparam `Store.updateNode()` com histórico atômico, aplicando redimensionamento e tamanho de fonte imediatamente no nó sem quebrar o layout interno de texto.
  - Clicar em `#btn-node-size-auto` reseta `customWidth` e `customHeight` para `null`, restaurando a largura e altura automáticas do vértice.
- Notas do executor: Adicionada seção de Dimensões & Tipografia em index.html e style.css com inputs de largura, altura e tamanho da fonte; implementada lógica reativa no sidebar.js com alternância automática e reset.
- Notas do verificador:

## T4 — Controles de Angulação e Tipografia do Texto da Aresta na Barra Lateral (`index.html`, `style.css`, `js/components/sidebar.js`)
- [~] Status
- Arquivos: `index.html`, `style.css`, `js/components/sidebar.js`
- Descrição: Criar controles na sidebar de arestas com botões de atalho (Seguir aresta, Horizontal 0°, Vertical 90°), slider para ajuste fino de ângulo (-90° a +90°) e ajuste de tamanho de fonte do rótulo.
- Check rápido: `python -c "import pathlib; h=pathlib.Path('index.html').read_text('utf-8'); js=pathlib.Path('js/components/sidebar.js').read_text('utf-8'); assert 'sb-edge-rot-slider' in h and 'sb-edge-font-size' in h and 'sb-edge-rot-slider' in js"`
- Critérios:
  - `index.html` inclui na seção `#sb-edge-fields` grupo de rotação do texto contendo botões de preset (`#btn-edge-rot-autorotate`, `#btn-edge-rot-horizontal`, `#btn-edge-rot-vertical`), slider de ângulo livre `#sb-edge-rot-slider` (-90 a 90) com label de graus, e slider de tamanho da fonte `#sb-edge-font-size` (9px a 20px).
  - `style.css` implementa o layout em grade/flex para os botões de preset e sliders de texto da aresta.
  - `js/components/sidebar.js` popula os controles ao selecionar uma aresta: se `labelRotation === 'autorotate'`, ativa o botão correspondente; se for ângulo fixo (ex.: `0` ou `90`), ativa o botão correspondente e atualiza o slider.
  - Interagir com os botões de preset ou arrastar o slider de ângulo atualiza a aresta via `Store.updateEdge()` com a nova propriedade `labelRotation` em tempo real.
  - Alterar `#sb-edge-font-size` atualiza o tamanho da fonte do rótulo da aresta de forma reativa no Cytoscape.
- Notas do executor: Adicionados botões de preset de rotação de texto (Seguir Aresta, Horizontal, 90°), slider fino de ângulo (-90° a 90°) e slider de fonte em index.html, style.css e sidebar.js com sincronização em tempo real.
- Notas do verificador:

## T5 — Atualização da Documentação Técnica de Arquitetura (`ARCHITECTURE.md`)
- [~] Status
- Arquivos: `ARCHITECTURE.md`, `js/ARCHITECTURE.md`, `js/components/ARCHITECTURE.md`
- Descrição: Atualizar a documentação arquitetural em todos os níveis registrando os novos campos do modelo de dados (`customWidth`, `customHeight`, `fontSize`, `labelRotation`), os novos seletores dinâmicos de estilo no Cytoscape e os novos controles da sidebar.
- Check rápido: `python -c "import pathlib; a=pathlib.Path('ARCHITECTURE.md').read_text('utf-8'); c=pathlib.Path('js/components/ARCHITECTURE.md').read_text('utf-8'); assert 'labelRotation' in a and 'customWidth' in a and 'sb-node-width' in c"`
- Critérios:
  - `ARCHITECTURE.md` e `js/ARCHITECTURE.md` detalham a estrutura atualizada dos objetos de nó e aresta no `Store` e a lógica de renderização dinâmica em `js/graph/styles.js`.
  - `js/components/ARCHITECTURE.md` documenta os novos métodos de manipulação de dimensão e rotação em `sidebar.js`.
  - Documentação do ciclo de vida da alça `GraphEdgeHandle` esclarece a exibição imediata na seleção de arestas.
- Notas do executor: Documentados os novos campos (customWidth, customHeight, fontSize, labelRotation) e métodos auxiliares em ARCHITECTURE.md, js/graph/ARCHITECTURE.md e js/components/ARCHITECTURE.md.
- Notas do verificador:
