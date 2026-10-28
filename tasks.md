# Tarefas: Terminal de Comandos e Ponte de Contexto para IA

Base: main
Branch: tasks/terminal-ia

Legenda: [ ] aberta | [~] aguardando verificação | [x] verificada | [!] falhou

## T1 — Gerador de Prompt e Especificação da DSL (`terminalPrompt.js`)
- [~] Status
- Arquivos: `js/components/terminalPrompt.js`, `index.html`
- Descrição: Criar o módulo `TerminalPrompt` responsável por gerar o documento Markdown completo (manual de sintaxe da DSL + snapshot resumido do estado atual do projeto com pastas, abas, IDs, títulos e tipos dos nós/arestas da aba ativa) e copiá-lo para a área de transferência para uso em qualquer LLM.
- Check rápido: `python -c "import pathlib; p=pathlib.Path('js/components/terminalPrompt.js'); assert p.exists() and 'TerminalPrompt' in p.read_text('utf-8')"`
- Critérios:
  - `TerminalPrompt.buildPrompt()` retorna uma string Markdown contendo a especificação dos comandos (`NODE`, `UPDATE_NODE`, `DELETE_NODE`, `CONNECT`, `DELETE_EDGE`, `GROUP`, `UNGROUP`, `FOLDER`, `TAB`, `USE_TAB`, `USE_ENTITY`, `LAYOUT`), regras de uso de aliases/IDs e a listagem dos elementos atuais do projeto e da aba ativa.
  - `TerminalPrompt.copyToClipboard()` copia o Markdown gerado para `navigator.clipboard` (com fallback para `textarea` temporário) e retorna `Promise<boolean>`.
  - O script `js/components/terminalPrompt.js` está referenciado em `index.html` antes de `main.js`.
- Notas do executor: Criado módulo TerminalPrompt com buildPrompt() gerando Markdown contextual completo (regras da DSL, pastas, abas, nós, conexões e entidades) e copyToClipboard() com fallback; incluído no index.html.
- Notas do verificador:

## T2 — Parser e Motor de Execução da DSL com Posicionamento Híbrido (`terminalEngine.js`)
- [~] Status
- Arquivos: `js/components/terminalEngine.js`, `index.html`
- Descrição: Criar o módulo `TerminalEngine` que interpreta scripts de comandos linha a linha, resolve referências por alias criado no lote, ID real ou título exato do nó, calcula posições relativas (próximo ao nó pai/origem ou em espiral no centro do viewport sem sobrepor nós existentes) e executa todas as operações dentro de um único `Store.batch()`.
- Check rápido: `python -c "import pathlib; p=pathlib.Path('js/components/terminalEngine.js'); assert p.exists() and 'TerminalEngine' in p.read_text('utf-8')"`
- Critérios:
  - `TerminalEngine.parse(scriptText)` ignora linhas vazias, cercas de código Markdown (```` ``` ````) e comentários (`#` ou `//`), extraindo comandos e parâmetros chave-valor (ex.: `title="Texto"`, `tags=a,b`, `id=alias1`) e sintaxe de seta (`origem -> destino`).
  - `TerminalEngine.execute(scriptText)` executa em `Store.batch()` os comandos de nós (`NODE`, `UPDATE_NODE`, `DELETE_NODE`, `USE_ENTITY`), arestas (`CONNECT`, `DELETE_EDGE`), contêineres (`GROUP`, `UNGROUP`), estrutura (`FOLDER`, `TAB`, `USE_TAB`) e organização (`LAYOUT`), permitindo desfazer toda a execução com um único `Ctrl+Z`.
  - Novos nós sem coordenadas explícitas são posicionados de forma híbrida: num raio deslocado ao redor do nó de referência (`near`, `parent` ou nó de origem na conexão) ou em grade/espiral no centro do viewport atual (`Graph.getModelCenter()`), sem alterar a posição dos nós já existentes a menos que o comando `LAYOUT` seja executado.
  - Retorna objeto `{ total, successCount, errorCount, logs: Array<{ line, status, message }> }` detalhando o resultado de cada comando processado.
- Notas do executor: Criado TerminalEngine com parse de chave-valor e sintaxe com seta, resolução de nós por alias/ID/título, cálculo geométrico híbrido sem sobreposição, execução em Store.batch() e suporte a NODE, CONNECT, GROUP, FOLDER, TAB, USE_ENTITY e LAYOUT.
- Notas do verificador:

## T3 — Estrutura HTML e Estilização do Painel Inferior do Terminal (`index.html`, `style.css`)
- [~] Status
- Arquivos: `index.html`, `style.css`
- Descrição: Adicionar botões de acesso rápido no cabeçalho superior e construir o painel retrátil inferior estilo terminal integrado do VS Code com editor de comandos, console de saída colorido e barra de ações.
- Check rápido: `python -c "import pathlib; h=pathlib.Path('index.html').read_text('utf-8'); c=pathlib.Path('style.css').read_text('utf-8'); assert 'terminal-panel' in h and 'btn-copy-ai-prompt' in h and '.terminal-panel' in c"`
- Critérios:
  - `index.html` contém na `.header-actions` o botão `#btn-copy-ai-prompt` ("Copiar Contexto para IA") e o botão `#btn-toggle-terminal` ("Terminal de Comandos").
  - `index.html` contém o painel `#terminal-panel` (inicialmente oculto/recolhido) com cabeçalho, alça de redimensionamento (`#terminal-resize-handle`), área de entrada (`#terminal-input`), painel de logs (`#terminal-output`) e botões `#btn-terminal-run`, `#btn-terminal-copy-prompt`, `#btn-terminal-clear` e `#btn-terminal-close`.
  - `style.css` define os estilos do `.terminal-panel` integrado ao layout flex/grid, suportando tanto `[data-theme="dark"]` quanto `[data-theme="light"]`, ocultação automática em `.zen-mode` e cores semânticas para logs de sucesso, aviso e erro.
- Notas do executor: Adicionados botões no header e estrutura do painel inferior retrátil com resize handle, textarea e log; estilos adicionados em style.css com suporte a temas, zen-mode e feedback cromático.
- Notas do verificador:

## T4 — Controlador de Interface do Terminal e Integração Global (`terminal.js`, `main.js`)
- [~] Status
- Arquivos: `js/components/terminal.js`, `main.js`, `index.html`
- Descrição: Implementar o módulo `TerminalUI` para controlar a abertura/fechamento, redimensionamento vertical por arraste, execução de lotes via `Ctrl+Enter`, renderização do histórico de logs e integração com `App` e atalhos globais de teclado.
- Check rápido: `python -c "import pathlib; p=pathlib.Path('js/components/terminal.js'); m=pathlib.Path('main.js').read_text('utf-8'); assert p.exists() and 'TerminalUI' in p.read_text('utf-8') and 'TerminalUI' in m"`
- Critérios:
  - `TerminalUI.toggle()`, `TerminalUI.open()` e `TerminalUI.close()` abrem/recolhem o painel inferior, alternam a classe `.active` em `#btn-toggle-terminal` e acionam `Graph.resize()` para ajustar o canvas do Cytoscape.
  - Clicar em `#btn-copy-ai-prompt` (no header) ou `#btn-terminal-copy-prompt` (no terminal) aciona `TerminalPrompt.copyToClipboard()` e exibe confirmação via `App.toast()`.
  - Pressionar `Ctrl+Enter` dentro de `#terminal-input` ou clicar em `#btn-terminal-run` executa o script via `TerminalEngine.execute()`, exibe os resultados linha a linha em `#terminal-output`, atualiza o estado dos botões Undo/Redo (`App.updateUndoRedoUI()`) e exibe resumo em toast.
  - O atalho global `Ctrl+J` (ou `` Ctrl+` ``) alterna a visibilidade do painel do terminal a partir de qualquer lugar da aplicação.
- Notas do executor: Criado TerminalUI com redimensionamento vertical por arraste, execução com Ctrl+Enter, log de resultados e feedback em toast; integrado em main.js com atalho global Ctrl+J/Ctrl+` e Esc.
- Notas do verificador:

## T5 — Atualização da Documentação de Arquitetura (`ARCHITECTURE.md`)
- [~] Status
- Arquivos: `ARCHITECTURE.md`, `js/ARCHITECTURE.md`, `js/components/ARCHITECTURE.md`
- Descrição: Documentar os novos componentes (`terminalPrompt.js`, `terminalEngine.js`, `terminal.js`) e os novos métodos/atalhos em `main.js` seguindo o padrão da documentação técnica hierárquica do repositório.
- Check rápido: `python -c "import pathlib; c=pathlib.Path('js/components/ARCHITECTURE.md').read_text('utf-8'); assert 'terminalPrompt.js' in c and 'terminalEngine.js' in c and 'terminal.js' in c"`
- Critérios:
  - `js/components/ARCHITECTURE.md` inclui na tabela de visão geral e nas seções detalhadas todas as funções públicas e internas de `terminalPrompt.js`, `terminalEngine.js` e `terminal.js` com assinatura, descrição e retorno.
  - `js/ARCHITECTURE.md` e `ARCHITECTURE.md` refletem os novos arquivos de componente e os novos binds/atalhos no módulo `App` (`main.js`).
- Notas do executor: Documentadas todas as funções públicas e internas dos 3 módulos em js/components/ARCHITECTURE.md; atualizadas as tabelas e referências em ARCHITECTURE.md e js/ARCHITECTURE.md.
- Notas do verificador:
