/**
 * TerminalEngine Component — Trama
 * Interpretador e executor de comandos da DSL do Trama.
 * Processa scripts linha a linha dentro de um único Store.batch(),
 * resolve referências por alias, ID ou título, e posiciona nós de forma híbrida.
 */
const TerminalEngine = (() => {

  /**
   * Extrai parâmetros no formato chave="valor com espaços" ou chave=valor
   * @param {string} text
   * @returns {Record<string, string>}
   */
  function parseAttributes(text) {
    const attrs = {};
    if (!text) return attrs;

    // Regex para capturar chave="valor" ou chave='valor' ou chave=valor_sem_espaco
    const regex = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const key = match[1].toLowerCase();
      const val = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : match[4]);
      attrs[key] = val;
    }
    return attrs;
  }

  /**
   * Faz o parsing de um script de texto, ignorando linhas vazias,
   * cercas markdown (```) e comentários (# ou //).
   * @param {string} scriptText
   * @returns {Array<{ raw: string, cmd: string, argsText: string, attrs: Record<string, string> }>}
   */
  function parse(scriptText) {
    if (!scriptText || typeof scriptText !== 'string') return [];
    const rawLines = scriptText.split('\n');
    const commands = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      // Ignorar cercas markdown, linhas vazias e comentários
      if (!line) continue;
      if (line.startsWith('```') || line.endsWith('```')) continue;
      if (line.startsWith('#') || line.startsWith('//')) continue;

      // Identifica o comando primário
      const spaceIdx = line.indexOf(' ');
      const cmd = (spaceIdx === -1 ? line : line.slice(0, spaceIdx)).toUpperCase();
      const argsText = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1).trim();
      const attrs = parseAttributes(argsText);

      commands.push({
        lineIndex: i + 1,
        raw: line,
        cmd,
        argsText,
        attrs
      });
    }

    return commands;
  }

  /**
   * Resolve o ID de um nó a partir de um alias da sessão, ID real ou título.
   * @param {string} ref
   * @param {Map<string, string>} aliasMap
   * @returns {string|null}
   */
  function resolveNodeId(ref, aliasMap) {
    if (!ref) return null;
    const cleanRef = String(ref).trim().replace(/^["']|["']$/g, '');

    // 1. Checa no mapa de aliases da sessão
    if (aliasMap && aliasMap.has(cleanRef)) {
      return aliasMap.get(cleanRef);
    }

    // 2. Checa se o nó existe diretamente pelo ID no Store
    if (typeof Store.getNode === 'function') {
      const nodeById = Store.getNode(cleanRef);
      if (nodeById) return nodeById.id;
    }

    // 3. Busca por título exato nos nós da aba ativa
    if (typeof Store.getNodes === 'function') {
      const allNodes = Store.getNodes();
      const byExactTitle = allNodes.find(n => n.title && n.title.trim().toLowerCase() === cleanRef.toLowerCase());
      if (byExactTitle) return byExactTitle.id;
    }

    return null;
  }

  /**
   * Resolve ID de uma pasta por ID ou nome
   */
  function resolveFolderId(ref) {
    if (!ref) return null;
    const clean = String(ref).trim().replace(/^["']|["']$/g, '');
    if (typeof Store.getFolders === 'function') {
      const folders = Store.getFolders();
      const byId = folders.find(f => f.id === clean);
      if (byId) return byId.id;
      const byName = folders.find(f => f.name.toLowerCase() === clean.toLowerCase());
      if (byName) return byName.id;
    }
    return null;
  }

  /**
   * Resolve ID de uma aba por ID ou nome
   */
  function resolveTabId(ref) {
    if (!ref) return null;
    const clean = String(ref).trim().replace(/^["']|["']$/g, '');
    if (typeof Store.getTabs === 'function') {
      const tabs = Store.getTabs();
      const byId = tabs.find(t => t.id === clean);
      if (byId) return byId.id;
      const byName = tabs.find(t => t.name.toLowerCase() === clean.toLowerCase());
      if (byName) return byName.id;
    }
    return null;
  }

  /**
   * Calcula posição híbrida (perto do nó de referência ou em espiral no centro)
   */
  function computePosition(refNodeId, spawnIndex) {
    let basePos = null;

    if (refNodeId && typeof Store.getNode === 'function') {
      const refNode = Store.getNode(refNodeId);
      if (refNode && typeof refNode.x === 'number' && typeof refNode.y === 'number') {
        basePos = { x: refNode.x, y: refNode.y };
      }
    }

    if (basePos) {
      // Posiciona em círculo/espiral ao redor do nó de referência
      const angle = (spawnIndex * 1.35);
      const distance = 160 + (spawnIndex * 15);
      return {
        x: Math.round(basePos.x + Math.cos(angle) * distance),
        y: Math.round(basePos.y + Math.sin(angle) * distance)
      };
    }

    // Posição no centro do viewport do modelo
    let center = { x: 400, y: 300 };
    if (typeof Graph !== 'undefined' && typeof Graph.getModelCenter === 'function') {
      center = Graph.getModelCenter();
    }

    const angle = (spawnIndex * 1.5);
    const radius = spawnIndex === 0 ? 0 : 50 + (spawnIndex * 40);
    return {
      x: Math.round(center.x + Math.cos(angle) * radius),
      y: Math.round(center.y + Math.sin(angle) * radius)
    };
  }

  /**
   * Executa a lista de comandos no Store dentro de um Store.batch() atômico.
   * @param {string} scriptText
   * @returns {{ total: number, successCount: number, errorCount: number, logs: Array<{ line: number, status: 'ok'|'warn'|'error', message: string }> }}
   */
  function execute(scriptText) {
    const parsedCmds = parse(scriptText);
    const aliasMap = new Map();
    const logs = [];
    let successCount = 0;
    let errorCount = 0;
    let spawnCount = 0;
    let pendingLayout = null;

    if (parsedCmds.length === 0) {
      return { total: 0, successCount: 0, errorCount: 0, logs: [{ line: 0, status: 'warn', message: 'Nenhum comando válido encontrado para executar.' }] };
    }

    // Executa em lote atômico no Store
    const runner = () => {
      for (const item of parsedCmds) {
        const { cmd, argsText, attrs, lineIndex, raw } = item;

        try {
          switch (cmd) {

            // ==========================================
            // 1. NODE
            // ==========================================
            case 'NODE': {
              // Suporta sintaxe: NODE type="..." title="..." ou NODE problem "Título" ...
              let type = attrs.type;
              let title = attrs.title;

              // Parse posicional se atributos não vieram nomeados
              if (!type || !title) {
                const parts = argsText.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
                if (!type && parts[0] && !parts[0].includes('=')) {
                  type = parts[0].replace(/['"]/g, '');
                }
                if (!title && parts[1] && !parts[1].includes('=')) {
                  title = parts[1].replace(/['"]/g, '');
                }
              }

              type = (type || 'neutro').toLowerCase();
              title = title || 'Sem título';

              const parentRef = attrs.parent;
              const parentId = parentRef ? resolveNodeId(parentRef, aliasMap) : null;

              const nearRef = attrs.near || parentRef;
              const refId = nearRef ? resolveNodeId(nearRef, aliasMap) : null;

              const pos = computePosition(refId, spawnCount++);

              const nodeData = {
                type,
                title,
                description: attrs.desc || attrs.description || '',
                priority: attrs.priority ? attrs.priority.toLowerCase() : null,
                tags: attrs.tags ? attrs.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                parentId: parentId || null,
                x: attrs.x !== undefined ? parseFloat(attrs.x) : pos.x,
                y: attrs.y !== undefined ? parseFloat(attrs.y) : pos.y
              };

              if (attrs.subgraph) {
                const subTabId = resolveTabId(attrs.subgraph);
                if (subTabId) nodeData.subgraphTabId = subTabId;
              }

              const created = Store.addNode(nodeData);

              // Salva alias se fornecido
              if (attrs.id) {
                aliasMap.set(attrs.id, created.id);
              }

              logs.push({ line: lineIndex, status: 'ok', message: `Nó criado [${created.id}]: "${title}" (${type})` });
              successCount++;
              break;
            }

            // ==========================================
            // 2. UPDATE_NODE
            // ==========================================
            case 'UPDATE_NODE': {
              const targetRef = attrs.target || attrs.id;
              const targetId = resolveNodeId(targetRef, aliasMap);
              if (!targetId) {
                throw new Error(`Nó alvo "${targetRef}" não encontrado.`);
              }

              const changes = {};
              if (attrs.title !== undefined) changes.title = attrs.title;
              if (attrs.type !== undefined) changes.type = attrs.type.toLowerCase();
              if (attrs.desc !== undefined) changes.description = attrs.desc;
              if (attrs.description !== undefined) changes.description = attrs.description;
              if (attrs.priority !== undefined) changes.priority = attrs.priority.toLowerCase();
              if (attrs.tags !== undefined) changes.tags = attrs.tags.split(',').map(t => t.trim()).filter(Boolean);
              if (attrs.parent !== undefined) {
                changes.parentId = attrs.parent === 'none' || attrs.parent === 'null' ? null : resolveNodeId(attrs.parent, aliasMap);
              }

              Store.updateNode(targetId, changes);
              logs.push({ line: lineIndex, status: 'ok', message: `Nó atualizado [${targetId}]` });
              successCount++;
              break;
            }

            // ==========================================
            // 3. DELETE_NODE
            // ==========================================
            case 'DELETE_NODE': {
              const targetRef = attrs.target || attrs.id || argsText.replace(/['"]/g, '').trim();
              const targetId = resolveNodeId(targetRef, aliasMap);
              if (!targetId) {
                throw new Error(`Nó "${targetRef}" não encontrado para exclusão.`);
              }
              Store.deleteNode(targetId);
              logs.push({ line: lineIndex, status: 'ok', message: `Nó excluído [${targetId}]` });
              successCount++;
              break;
            }

            // ==========================================
            // 4. CONNECT / EDGE
            // ==========================================
            case 'CONNECT':
            case 'EDGE': {
              let sourceRef = attrs.source || attrs.from;
              let targetRef = attrs.target || attrs.to;

              // Suporte a sintaxe com seta: CONNECT alias1 -> alias2
              if (!sourceRef || !targetRef) {
                const arrowMatch = argsText.match(/([^\s]+)\s*->\s*([^\s]+)/);
                if (arrowMatch) {
                  sourceRef = arrowMatch[1];
                  targetRef = arrowMatch[2];
                }
              }

              const sourceId = resolveNodeId(sourceRef, aliasMap);
              const targetId = resolveNodeId(targetRef, aliasMap);

              if (!sourceId) throw new Error(`Origem da conexão "${sourceRef}" não encontrada.`);
              if (!targetId) throw new Error(`Destino da conexão "${targetRef}" não encontrado.`);

              const edgeData = {
                source: sourceId,
                target: targetId,
                edgeType: (attrs.type || 'relaciona').toLowerCase(),
                label: attrs.label || '',
                curveStyle: attrs.curve || 'bezier',
                linePattern: attrs.pattern || 'default',
                arrowDirection: attrs.arrow || 'target'
              };

              const createdEdge = Store.addEdge(edgeData);
              if (attrs.id) {
                aliasMap.set(attrs.id, createdEdge.id);
              }

              logs.push({ line: lineIndex, status: 'ok', message: `Conexão criada: [${sourceId}] -> [${targetId}] (${edgeData.edgeType})` });
              successCount++;
              break;
            }

            // ==========================================
            // 5. DELETE_EDGE
            // ==========================================
            case 'DELETE_EDGE': {
              let edgeId = attrs.id;
              if (!edgeId) {
                const arrowMatch = argsText.match(/([^\s]+)\s*->\s*([^\s]+)/);
                if (arrowMatch) {
                  const sId = resolveNodeId(arrowMatch[1], aliasMap);
                  const tId = resolveNodeId(arrowMatch[2], aliasMap);
                  const edge = Store.getEdges().find(e => e.source === sId && e.target === tId);
                  if (edge) edgeId = edge.id;
                }
              }

              if (!edgeId) throw new Error('Aresta não encontrada para remoção.');
              Store.deleteEdge(edgeId);
              logs.push({ line: lineIndex, status: 'ok', message: `Conexão removida [${edgeId}]` });
              successCount++;
              break;
            }

            // ==========================================
            // 6. GROUP & UNGROUP
            // ==========================================
            case 'GROUP': {
              const title = attrs.title || 'Contêiner';
              const nodesRaw = attrs.nodes || '';
              const nodeIds = nodesRaw.split(',')
                .map(r => resolveNodeId(r.trim(), aliasMap))
                .filter(Boolean);

              if (nodeIds.length === 0) {
                throw new Error('Nenhum nó válido fornecido para o grupo.');
              }

              const container = Store.groupNodes(nodeIds, title);
              if (container && attrs.id) {
                aliasMap.set(attrs.id, container.id);
              }

              logs.push({ line: lineIndex, status: 'ok', message: `Grupo criado "${title}" com ${nodeIds.length} nós.` });
              successCount++;
              break;
            }

            case 'UNGROUP': {
              const targetRef = attrs.target || attrs.id || argsText.replace(/['"]/g, '').trim();
              const targetId = resolveNodeId(targetRef, aliasMap);
              if (!targetId) throw new Error(`Grupo "${targetRef}" não encontrado.`);
              Store.ungroupParent(targetId);
              logs.push({ line: lineIndex, status: 'ok', message: `Grupo desagrupado [${targetId}]` });
              successCount++;
              break;
            }

            // ==========================================
            // 7. FOLDER, TAB & USE_TAB
            // ==========================================
            case 'FOLDER': {
              const name = attrs.name || 'Nova Pasta';
              const parentFolderId = attrs.parent ? resolveFolderId(attrs.parent) : null;
              const folder = Store.createFolder(name, parentFolderId);
              if (attrs.id) aliasMap.set(attrs.id, folder.id);
              logs.push({ line: lineIndex, status: 'ok', message: `Pasta criada: "${folder.name}" [${folder.id}]` });
              successCount++;
              break;
            }

            case 'TAB': {
              const name = attrs.name || 'Novo Grafo';
              const tab = Store.createTab(name);
              if (attrs.folder) {
                const folderId = resolveFolderId(attrs.folder);
                if (folderId && typeof Store.moveItem === 'function') {
                  Store.moveItem('tab', tab.id, folderId);
                }
              }
              if (attrs.id) aliasMap.set(attrs.id, tab.id);
              logs.push({ line: lineIndex, status: 'ok', message: `Aba criada: "${tab.name}" [${tab.id}]` });
              successCount++;
              break;
            }

            case 'USE_TAB': {
              const targetRef = attrs.target || attrs.name || attrs.id || argsText.replace(/['"]/g, '').trim();
              const tabId = resolveTabId(targetRef);
              if (!tabId) throw new Error(`Aba "${targetRef}" não encontrada.`);
              Store.openTab(tabId);
              logs.push({ line: lineIndex, status: 'ok', message: `Aba ativa alternada para [${tabId}]` });
              successCount++;
              break;
            }

            // ==========================================
            // 8. USE_ENTITY
            // ==========================================
            case 'USE_ENTITY': {
              const entityRef = attrs.entity || attrs.id || argsText.replace(/['"]/g, '').trim();
              let entityId = null;
              if (typeof Store.getEntity === 'function' && Store.getEntity(entityRef)) {
                entityId = entityRef;
              } else if (typeof Store.getEntitiesList === 'function') {
                const found = Store.getEntitiesList().find(e => e.title && e.title.toLowerCase() === entityRef.toLowerCase());
                if (found) entityId = found.id;
              }

              if (!entityId) throw new Error(`Entidade "${entityRef}" não encontrada no banco do projeto.`);

              const nearRef = attrs.near;
              const refId = nearRef ? resolveNodeId(nearRef, aliasMap) : null;
              const pos = computePosition(refId, spawnCount++);

              const created = Store.addExistingEntityToTab(entityId, { x: pos.x, y: pos.y });
              if (attrs.alias || attrs.id) {
                aliasMap.set(attrs.alias || attrs.id, created.id);
              }
              logs.push({ line: lineIndex, status: 'ok', message: `Entidade inserida no grafo [${created.id}]: "${created.title}"` });
              successCount++;
              break;
            }

            // ==========================================
            // 9. LAYOUT
            // ==========================================
            case 'LAYOUT': {
              const layoutType = (attrs.type || argsText || 'cose').replace(/['"]/g, '').trim().toLowerCase();
              pendingLayout = layoutType;
              logs.push({ line: lineIndex, status: 'ok', message: `Layout agendado: ${layoutType}` });
              successCount++;
              break;
            }

            default:
              logs.push({ line: lineIndex, status: 'warn', message: `Comando não reconhecido ignorado: "${raw}"` });
              break;
          }
        } catch (err) {
          errorCount++;
          logs.push({ line: lineIndex, status: 'error', message: `Erro na linha ${lineIndex}: ${err.message}` });
        }
      }
    };

    // Executa atomicamente em batch se o Store suportar
    if (typeof Store.batch === 'function') {
      Store.batch(runner);
    } else {
      runner();
    }

    // Se houve comando de layout agendado, executa após o lote
    if (pendingLayout && typeof Graph !== 'undefined' && typeof Graph.runLayout === 'function') {
      try {
        Graph.runLayout(pendingLayout);
      } catch (err) {
        console.warn('[TerminalEngine] Erro ao aplicar layout:', err);
      }
    }

    return {
      total: parsedCmds.length,
      successCount,
      errorCount,
      logs
    };
  }

  return {
    parse,
    parseAttributes,
    execute
  };
})();
