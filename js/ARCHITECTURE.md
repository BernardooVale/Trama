# Documentação Técnica e Arquitetura — Diretório `js/`

Este documento descreve a organização e o propósito de cada subdiretório contido em `js/`.

Como cada pasta possui seus próprios arquivos e funções especializadas, a documentação detalhada das funções internas (assinatura, o que faz e retorno) está isolada no `ARCHITECTURE.md` de cada respectivo subdiretório.

---

## 1. Visão Geral dos Subdiretórios

| Diretório | Função Principal / Responsabilidade | Documentação Detalhada |
| :--- | :--- | :--- |
| [`js/store/`](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/store/) | **Camada de Dados & Persistência**: submódulos especializados da Store responsáveis pelo histórico atômico (`history.js`), gerenciamento de múltiplas abas e ciclo acíclico DAG (`tabsManager.js`), gerenciamento de pastas e pool de dados únicos (`explorerManager.js`), e persistência em `localStorage` e arquivos JSON (`storage.js`). | [js/store/ARCHITECTURE.md](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/store/ARCHITECTURE.md) |
| [`js/graph/`](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/graph/) | **Camada Visual do Grafo**: submódulos dedicados à renderização no Cytoscape, abrangendo a folha de estilos e temas (`styles.js`), modo foco dinâmico por hover (`focus.js`), fluxo de desenho de arestas (`edgeMode.js`) e alça interativa de ponto de inflexão/curva (`edgeHandle.js`). | [js/graph/ARCHITECTURE.md](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/graph/ARCHITECTURE.md) |
| [`js/components/`](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/components/) | **Componentes Modulares de Interface (UI)**: módulos desacoplados de interface do usuário, contendo o explorador lateral estilo VS Code (`explorer.js`), barra de abas (`tabs.js`), campo de busca inteligente (`search.js`), painel lateral de propriedades (`sidebar.js`), menus de contexto (`contextMenu.js`) e o terminal integrado com gerador de prompt para IA (`terminal.js`, `terminalPrompt.js`, `terminalEngine.js`). | [js/components/ARCHITECTURE.md](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/components/ARCHITECTURE.md) |
 
---
 
## 2. Mapa de Navegação da Documentação
 
- Para consultar funções de histórico, abas, pastas, pool de entidades e persistência: veja [`js/store/ARCHITECTURE.md`](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/store/ARCHITECTURE.md).
- Para consultar funções de estilos, foco e arestas do Cytoscape: veja [`js/graph/ARCHITECTURE.md`](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/graph/ARCHITECTURE.md).
- Para consultar funções dos componentes de tela (explorador, abas, busca, sidebar, menus e terminal integrado de IA): veja [`js/components/ARCHITECTURE.md`](file:///c:/Users/Bernardo/Documents/GitHub/Trama/js/components/ARCHITECTURE.md).
- Para consultar os módulos raiz (`store.js`, `graph.js`, `main.js`, etc.): veja [`ARCHITECTURE.md`](file:///c:/Users/Bernardo/Documents/GitHub/Trama/ARCHITECTURE.md).
