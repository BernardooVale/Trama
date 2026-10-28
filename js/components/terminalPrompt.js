/**
 * TerminalPrompt Component — Trama
 * Gera a especificação Markdown da DSL de comandos e o snapshot contextual
 * do projeto ativo para ser copiado para a área de transferência e usado com qualquer LLM.
 */
const TerminalPrompt = (() => {

  /**
   * Constrói o texto Markdown completo contendo as instruções da DSL
   * e o resumo contextual do estado do projeto e da aba ativa.
   * @returns {string} Markdown pronto para colar na LLM.
   */
  function buildPrompt() {
    const projectName = (typeof Store.getProjectName === 'function') ? Store.getProjectName() : 'Projeto';
    const activeTab = (typeof Store.getActiveTab === 'function') ? Store.getActiveTab() : null;
    const activeTabName = activeTab ? activeTab.name : 'Principal';
    const activeTabId = (typeof Store.getActiveTabId === 'function') ? Store.getActiveTabId() : '';

    // Pastas existentes
    const folders = (typeof Store.getFolders === 'function') ? Store.getFolders() : [];
    const folderLines = folders.map(f => {
      const parent = f.parentId ? ` (dentro de ${f.parentId})` : '';
      return `- [Pasta] id: "${f.id}", nome: "${f.name}"${parent}`;
    });

    // Abas / Grafos existentes
    const tabs = (typeof Store.getTabs === 'function') ? Store.getTabs() : [];
    const tabLines = tabs.map(t => {
      const isCurrent = t.id === activeTabId ? ' [ABA ATIVA]' : '';
      return `- [Aba/Grafo] id: "${t.id}", nome: "${t.name}"${isCurrent}`;
    });

    // Nós da aba ativa
    const nodes = (typeof Store.getNodes === 'function') ? Store.getNodes() : (activeTab ? activeTab.nodes : []);
    const nodeLines = (nodes || []).map(n => {
      const parts = [`id: "${n.id}"`, `tipo: ${n.type || 'neutro'}`, `título: "${n.title || '(sem título)'}"`];
      if (n.priority) parts.push(`prioridade: ${n.priority}`);
      if (Array.isArray(n.tags) && n.tags.length > 0) parts.push(`tags: [${n.tags.join(', ')}]`);
      if (n.parentId) parts.push(`parent: "${n.parentId}"`);
      if (n.subgraphTabId) parts.push(`subgrafoTabId: "${n.subgraphTabId}"`);
      return `- ${parts.join(' | ')}`;
    });

    // Arestas da aba ativa
    const edges = (typeof Store.getEdges === 'function') ? Store.getEdges() : (activeTab ? activeTab.edges : []);
    const edgeLines = (edges || []).map(e => {
      const label = e.label ? ` ("${e.label}")` : '';
      return `- ${e.source} -> ${e.target} [tipo: ${e.edgeType || 'relaciona'}${label}]`;
    });

    // Entidades únicas reutilizáveis do projeto
    const entitiesList = (typeof Store.getEntitiesList === 'function') ? Store.getEntitiesList() : [];
    const entityLines = entitiesList.slice(0, 50).map(ent => {
      return `- id: "${ent.id}", título: "${ent.title || ''}", tipo: ${ent.type || 'neutro'}`;
    });

    return `# MANUAL DE COMANDOS TRAMA (DSL PARA IA)

Você é um assistente de arquitetura e mapeamento visual conectado ao aplicativo Trama.
Sua tarefa é analisar o estado atual do grafo e a solicitação do usuário, e gerar **APENAS** uma lista de comandos no formato DSL abaixo.

### REGRAS OBRIGATÓRIAS:
1. Responda APENAS com o bloco de código contendo os comandos válidos (sem texto introdutório ou explicações).
2. Se criar nós conectados, defina aliases curtos via \`id=alias\` para referenciá-los em conexões seguintes (ex: \`id=p1\`).
3. Você pode se conectar a nós existentes usando os IDs reais listados na seção "ESTADO ATUAL" ou os títulos exatos.
4. Para textos com espaços, use aspas duplas (ex: \`title="Título com espaços"\`).

---

### ESPECIFICAÇÃO DOS COMANDOS DISPONÍVEIS:

#### 1. Criação e Edição de Nós
- \`NODE type="problema|solucao|agrupador|neutro|subgrafo|texto" title="Título" [id="alias"] [desc="Descrição markdown"] [priority="alta|media|baixa"] [tags="tag1,tag2"] [parent="id_ou_alias_pai"] [near="id_ou_alias_ref"] [subgraph="nome_ou_id_da_aba"]\`
- \`UPDATE_NODE target="id_ou_alias_ou_titulo" [title="Novo Título"] [type="..."] [desc="..."] [priority="..."] [tags="..."] [parent="id_pai|none"]\`
- \`DELETE_NODE target="id_ou_alias_ou_titulo"\`
- \`USE_ENTITY entity="id_ou_titulo_entidade" [near="id_ou_alias_ref"]\`

#### 2. Conexões / Arestas
- \`CONNECT origem -> destino [type="dependencia|resolve|relaciona|neutra"] [label="rótulo"] [curve="bezier|straight|taxi"] [pattern="solid|dashed|dotted"] [arrow="target|both|none"]\`
- \`DELETE_EDGE origem -> destino\`
- \`DELETE_EDGE id="id_da_aresta"\`

#### 3. Agrupadores / Contêineres
- \`GROUP title="Nome do Grupo" nodes="alias1,alias2,alias3" [id="alias_grupo"]\`
- \`UNGROUP target="id_ou_alias_do_grupo"\`

#### 4. Pastas e Abas / Grafos
- \`FOLDER name="Nome da Pasta" [parent="id_ou_nome_pasta_pai"]\`
- \`TAB name="Nome do Grafo" [folder="id_ou_nome_da_pasta"]\`
- \`USE_TAB target="id_ou_nome_da_aba"\` (muda a aba ativa para executar os próximos comandos nela)

#### 5. Layout e Alinhamento
- \`LAYOUT type="hierarchical-vertical|hierarchical-horizontal|cose|concentric|grid"\`
*(Opcional: novos nós já são posicionados perto dos nós conectados. Use LAYOUT ao gerar muitos nós novos se quiser reorganizar o diagrama inteiro).*

---

### ESTADO ATUAL DO PROJETO TRAMA:
- **Projeto:** ${projectName}
- **Aba Ativa:** "${activeTabName}" (id: \`${activeTabId}\`)

#### Pastas do Projeto:
${folderLines.length > 0 ? folderLines.join('\n') : '*(Nenhuma pasta criada)*'}

#### Abas / Grafos:
${tabLines.length > 0 ? tabLines.join('\n') : '*(Nenhuma aba adicional)*'}

#### Nós no Grafo Ativo:
${nodeLines.length > 0 ? nodeLines.join('\n') : '*(Grafo vazio)*'}

#### Conexões no Grafo Ativo:
${edgeLines.length > 0 ? edgeLines.join('\n') : '*(Nenhuma conexão)*'}

${entityLines.length > 0 ? `#### Entidades no Banco do Projeto (para reutilizar via USE_ENTITY):\n${entityLines.join('\n')}\n` : ''}
---

### SOLICITAÇÃO DO USUÁRIO:
[Escreva aqui o que você deseja criar ou alterar no grafo]
`;
  }

  /**
   * Copia o texto do prompt gerado para a área de transferência do sistema.
   * Suporta navigator.clipboard com fallback para textarea temporário.
   * @returns {Promise<boolean>} Sucesso da operação.
   */
  async function copyToClipboard() {
    const text = buildPrompt();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      // Fallback para ambientes restritos
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return Boolean(success);
    } catch (err) {
      console.error('[TerminalPrompt] Erro ao copiar prompt para área de transferência:', err);
      return false;
    }
  }

  return {
    buildPrompt,
    copyToClipboard
  };
})();
