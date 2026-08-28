const Store = (() => {
  const LS_KEY     = 'trama_v1';
  const NODE_TYPES  = ['problema','solucao','agrupador'];
  const EDGE_TYPES  = ['dependencia','resolve','relaciona'];
  const PRIORITIES  = ['alta','media','baixa'];

  let state = {
    nodes:        [],
    edges:        [],
    selectedId:   null,
    showNodeMeta: true,
    filter: {
      text:     '',
      type:     'all',
      priority: 'all',
      tags:     [],
    },
  };

  const listeners = new Set();
  function subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn) }
  function notify(event,payload){ listeners.forEach(fn=>fn(event,payload)) }

  function uid(){ return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}` }
  function edgeUid(){ return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}` }

  function nodeDefaults(p={}){
    return {
      id:          p.id          ?? uid(),
      type:        p.type        ?? 'problema',
      title:       p.title       ?? 'Novo vértice',
      description: p.description ?? '',
      priority:    p.priority    ?? 'media',
      tags:        Array.isArray(p.tags) ? [...p.tags] : [],
      x:           p.x           ?? 300 + Math.random()*400,
      y:           p.y           ?? 200 + Math.random()*300,
      createdAt:   p.createdAt   ?? Date.now(),
    };
  }

  function edgeDefaults(p={}){
    return {
      id:       p.id       ?? edgeUid(),
      source:   p.source,
      target:   p.target,
      edgeType: p.edgeType ?? 'relaciona',
      directed: p.directed ?? true,
    };
  }

  /* ── Nodes ─────────────────────────────────────── */
  function addNode(partial={}){
    const node = nodeDefaults(partial);
    state.nodes.push(node);
    save(); notify('node:add',node); return node;
  }

  function updateNode(id,changes={}){
    const idx = state.nodes.findIndex(n=>n.id===id);
    if(idx===-1) throw new Error(`Nó não encontrado: ${id}`);
    if(changes.type     && !NODE_TYPES.includes(changes.type))  delete changes.type;
    if(changes.priority && !PRIORITIES.includes(changes.priority)) delete changes.priority;
    if(changes.title!==undefined) changes.title=String(changes.title).trim()||'Sem título';
    if(changes.tags!==undefined && !Array.isArray(changes.tags)) delete changes.tags;
    state.nodes[idx]={...state.nodes[idx],...changes};
    save(); notify('node:update',state.nodes[idx]); return state.nodes[idx];
  }

  function deleteNode(id){
    const before=state.nodes.length;
    state.nodes=state.nodes.filter(n=>n.id!==id);
    if(state.nodes.length===before) throw new Error(`Nó não encontrado: ${id}`);
    const removedEdges=state.edges.filter(e=>e.source===id||e.target===id);
    state.edges=state.edges.filter(e=>e.source!==id&&e.target!==id);
    if(state.selectedId===id) state.selectedId=null;
    save(); notify('node:delete',{id,removedEdges}); return id;
  }

  function getNode(id){ return state.nodes.find(n=>n.id===id)??null }
  function getNodes(){ return [...state.nodes] }

  /* ── Edges ─────────────────────────────────────── */
  function addEdge(partial={}){
    const {source,target,edgeType='relaciona',directed=true}=partial;
    if(!source||!target)               throw new Error('source e target obrigatórios');
    if(source===target)                throw new Error('Self-loop não permitido');
    if(!EDGE_TYPES.includes(edgeType)) throw new Error(`edgeType inválido: ${edgeType}`);
    if(!getNode(source))               throw new Error(`Source não encontrado: ${source}`);
    if(!getNode(target))               throw new Error(`Target não encontrado: ${target}`);
    const exists=state.edges.some(e=>e.source===source&&e.target===target&&e.edgeType===edgeType);
    if(exists) throw new Error('Aresta duplicada');
    const edge=edgeDefaults({source,target,edgeType,directed});
    state.edges.push(edge); save(); notify('edge:add',edge); return edge;
  }

  function deleteEdge(id){
    const before=state.edges.length;
    state.edges=state.edges.filter(e=>e.id!==id);
    if(state.edges.length===before) throw new Error(`Aresta não encontrada: ${id}`);
    save(); notify('edge:delete',{id}); return id;
  }

  function getEdges(){ return [...state.edges] }

  /* ── Selection ─────────────────────────────────── */
  function selectNode(id){ state.selectedId=id; notify('selection:change',id) }
  function clearSelection(){ state.selectedId=null; notify('selection:change',null) }
  function getSelectedNode(){ return state.selectedId?getNode(state.selectedId):null }

  /* ── Filter ────────────────────────────────────── */
  function setFilter(changes={}){
    state.filter={...state.filter,...changes};
    notify('filter:change',state.filter);
  }
  function getFilter(){ return {...state.filter} }

  function getVisibleNodeIds(){
    const {text,type,priority,tags}=state.filter;
    const q=text.trim().toLowerCase();
    return new Set(
      state.nodes.filter(n=>{
        if(type&&type!=='all'&&n.type!==type) return false;
        if(priority&&priority!=='all'&&n.priority!==priority) return false;
        if(tags.length>0&&!tags.every(t=>n.tags.includes(t))) return false;
        if(q){
          const hay=[n.title,n.description,...n.tags].join(' ').toLowerCase();
          if(!hay.includes(q)) return false;
        }
        return true;
      }).map(n=>n.id)
    );
  }

  /* ── Display ───────────────────────────────────── */
  function setShowNodeMeta(val){ state.showNodeMeta=val; notify('display:nodeMeta',val) }
  function getShowNodeMeta(){ return state.showNodeMeta }

  /* ── Position ──────────────────────────────────── */
  let _saveTimer=null;
  function _debouncedSave(){ clearTimeout(_saveTimer); _saveTimer=setTimeout(save,800) }
  function updateNodePosition(id,x,y){
    const idx=state.nodes.findIndex(n=>n.id===id);
    if(idx===-1) return;
    state.nodes[idx].x=Math.round(x);
    state.nodes[idx].y=Math.round(y);
    _debouncedSave();
  }

  /* ── Tags ──────────────────────────────────────── */
  function getAllTags(){
    const set=new Set();
    state.nodes.forEach(n=>n.tags.forEach(t=>set.add(t)));
    return [...set].sort();
  }

  /* ── Persist ───────────────────────────────────── */
  function save(){
    try{
      localStorage.setItem(LS_KEY,JSON.stringify({version:1,savedAt:Date.now(),nodes:state.nodes,edges:state.edges}));
    }catch(e){console.warn('[Store] save:',e)}
  }

  function load(){
    try{
      const raw=localStorage.getItem(LS_KEY);
      if(!raw) return false;
      const snap=JSON.parse(raw);
      if(!Array.isArray(snap?.nodes)) return false;
      state.nodes=snap.nodes.map(n=>nodeDefaults(n));
      state.edges=(snap.edges??[]).filter(e=>e.source&&e.target).map(e=>edgeDefaults(e));
      return true;
    }catch(e){console.warn('[Store] load:',e);return false}
  }

  function exportJSON(){
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),nodes:state.nodes,edges:state.edges},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`trama_${Date.now()}.json`;a.click();
    URL.revokeObjectURL(url);
    notify('io:export',{count:state.nodes.length});
  }

  function importJSON(file){
    return new Promise((resolve,reject)=>{
      if(!file||file.type!=='application/json') return reject(new Error('Use um .json exportado pelo Trama.'));
      const reader=new FileReader();
      reader.onload=evt=>{
        try{
          const snap=JSON.parse(evt.target.result);
          if(!Array.isArray(snap?.nodes)) throw new Error('Formato inválido');
          state.nodes=snap.nodes.map(n=>nodeDefaults(n));
          state.edges=(snap.edges??[]).filter(e=>e.source&&e.target).map(e=>edgeDefaults(e));
          state.selectedId=null;
          save(); notify('io:import',{count:state.nodes.length}); resolve(state.nodes.length);
        }catch(e){reject(e)}
      };
      reader.onerror=()=>reject(new Error('Falha ao ler arquivo'));
      reader.readAsText(file);
    });
  }

  function getSnapshot(){
    return {
      nodes:state.nodes.map(n=>({...n,tags:[...n.tags]})),
      edges:state.edges.map(e=>({...e})),
      selectedId:state.selectedId,
      filter:{...state.filter},
    };
  }

  function reset(){ state.nodes=[];state.edges=[];state.selectedId=null;save();notify('store:reset',null) }

  function seed(){
    const p1=addNode({type:'problema', title:'Performance degradada',   description:'API responde >2s em pico.',        priority:'alta',  tags:['backend','api'],    x:320,y:200});
    const p2=addNode({type:'problema', title:'UX confusa no onboarding',description:'Abandono 60% no passo 3.',         priority:'alta',  tags:['ux','onboarding'],  x:640,y:160});
    const s1=addNode({type:'solucao',  title:'Cache Redis',             description:'TTL 5min para queries quentes.',   priority:'alta',  tags:['backend','cache'],  x:200,y:400});
    const s2=addNode({type:'solucao',  title:'Refatorar onboarding',    description:'Reduzir de 5 para 3 passos.',      priority:'media', tags:['ux'],               x:720,y:360});
    const g1=addNode({type:'agrupador',title:'Sprint Q3 — Infra',       description:'Épico de infra e performance.',    priority:'media', tags:['sprint','infra'],   x:460,y:490});
    addEdge({source:s1.id,target:p1.id,edgeType:'resolve',    directed:true});
    addEdge({source:s2.id,target:p2.id,edgeType:'resolve',    directed:true});
    addEdge({source:p1.id,target:p2.id,edgeType:'relaciona',  directed:false});
    addEdge({source:g1.id,target:s1.id,edgeType:'dependencia',directed:true});
    addEdge({source:g1.id,target:s2.id,edgeType:'dependencia',directed:true});
  }

  function init(){ if(!load()) seed(); notify('store:ready',getSnapshot()) }

  return {
    init,reset,seed,
    addNode,updateNode,deleteNode,getNode,getNodes,updateNodePosition,
    addEdge,deleteEdge,getEdges,
    selectNode,clearSelection,getSelectedNode,
    setFilter,getFilter,getVisibleNodeIds,
    setShowNodeMeta,getShowNodeMeta,
    save,load,exportJSON,importJSON,
    subscribe,getSnapshot,getAllTags,
    NODE_TYPES,EDGE_TYPES,PRIORITIES,
  };
})();