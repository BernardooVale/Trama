# Trama - Organizador Visual

Trama é uma ferramenta visual baseada em grafos para conectar problemas, encontrar soluções base e visualizar arquiteturas de projetos. Ele permite mapear dependências, organizar ideias e entender como diferentes desafios e soluções se relacionam em uma interface simples e interativa.

## 🚀 Funcionalidades

* **Grafo Dinâmico**: Crie nós (problemas, soluções, agrupadores) e conecte-os com arestas direcionais ou bidirecionais (dependências, resoluções, relações).
* **Interação Livre**: Navegue pelo canvas usando zoom e pan. Arraste e solte os nós para organizar seu mapa mental da forma que preferir.
* **Metadados Completos**: Cada nó possui um painel lateral rico (estilo Notion) contendo:
  * Título e Descrição detalhada.
  * Status (Pendente, Em Andamento, Concluído).
  * Prioridade (Alta, Média, Baixa).
  * Tags personalizáveis para fácil categorização.
* **Persistência Segura**: Todo o seu progresso é salvo automaticamente no `LocalStorage` do navegador. Você nunca perde seus dados ao fechar a aba.
* **Importação e Exportação**: Exporte seu grafo completo como um arquivo `.json` para backup ou compartilhamento, e importe-o de volta quando precisar.
* **Filtros Poderosos**: Encontre exatamente o que procura através da barra de pesquisa ou filtrando por tags, status e tipos de nós. Os nós irrelevantes são ocultados para focar no que importa.
* **Organização Automática**: Um clique no botão de layout aplica um algoritmo *force-directed* que reorganiza todos os nós de forma limpa e espaçada.
* **Tema Escuro/Claro**: Alternância nativa para o tema que melhor se adapta ao seu ambiente de trabalho.

## 🛠 Tech Stack

* **Front-end**: HTML5, CSS3 (com variáveis nativas e flexbox/grid) e JavaScript ES6+ Puro (Vanilla JS).
* **Renderização do Grafo**: [Cytoscape.js](https://js.cytoscape.org/) para a matemática vetorial, renderização do canvas e algoritmos de layout.
* **Sem Frameworks UI**: Leve, rápido e sem dependências complexas como React, Vue ou Angular.

## 📦 Como Usar

Nenhuma instalação de servidor, build ou dependência Node.js é necessária. 

1. Faça o download ou clone este repositório.
2. Abra a pasta do projeto.
3. Clique duas vezes no arquivo `index.html` para abri-lo em qualquer navegador moderno.

---

# Trama - Visual Organizer

Trama is a graph-based visual tool for connecting problems, finding base solutions, and visualizing project architectures. It allows you to map dependencies, organize ideas, and understand how different challenges and solutions relate in a simple, interactive interface.

## 🚀 Features

* **Dynamic Graph**: Create nodes (problems, solutions, groupers) and connect them with directional or bidirectional edges (dependencies, resolutions, relations).
* **Free Interaction**: Navigate the canvas using zoom and pan. Drag and drop nodes to organize your mental map however you prefer.
* **Rich Metadata**: Each node features a rich sidebar panel (Notion-style) containing:
  * Title and detailed Description.
  * Status (Pending, In Progress, Completed).
  * Priority (High, Medium, Low).
  * Customizable Tags for easy categorization.
* **Secure Persistence**: All your progress is automatically saved to the browser's `LocalStorage`. You never lose your data when closing the tab.
* **Import and Export**: Export your complete graph as a `.json` file for backup or sharing, and import it back whenever you need.
* **Powerful Filters**: Find exactly what you're looking for via the search bar or by filtering by tags, status, and node types. Irrelevant nodes are hidden so you can focus on what matters.
* **Automatic Layout**: A single click on the layout button applies a *force-directed* algorithm that cleanly reorganizes and spaces out all nodes.
* **Dark/Light Theme**: Native toggle for the theme that best suits your work environment.

## 🛠 Tech Stack

* **Front-end**: HTML5, CSS3 (with native variables and flexbox/grid), and Pure JavaScript ES6+ (Vanilla JS).
* **Graph Rendering**: [Cytoscape.js](https://js.cytoscape.org/) for vector math, canvas rendering, and layout algorithms.
* **No UI Frameworks**: Lightweight, fast, and free of complex dependencies like React, Vue, or Angular.

## 📦 How to Use

No server installation, build process, or Node.js dependencies are required.

1. Download or clone this repository.
2. Open the project folder.
3. Double-click the `index.html` file to open it in any modern browser.