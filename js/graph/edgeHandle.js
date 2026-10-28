/**
 * GraphEdgeHandle — Trama
 * Gerencia a alça interativa sobre a linha da aresta para ajuste direto e visual
 * do ponto de inflexão (distância e peso em curvas) e posição de dobra (curvas de 90°).
 */
const GraphEdgeHandle = (() => {
  let _cy = null;
  let _handleEl = null;
  let _gripEl = null;
  let _iconEl = null;
  let _tooltipEl = null;
  let _svgGuideEl = null;
  let _lineGuideEl = null;

  let _isDragging = false;
  let _activeEdgeId = null;
  let _curveStyle = null;
  let _startData = null;

  const ICONS = {
    inflection: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
      <path d="M4 12c4-8 12-8 16 0"/>
      <circle cx="12" cy="8" r="2.2" fill="currentColor"/>
    </svg>`,
    taxi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
      <path d="M5 6v8a2 2 0 0 0 2 2h12"/>
      <polyline points="15 12 19 16 15 20"/>
    </svg>`,
    segments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
      <polyline points="4 18 12 6 20 18"/>
      <circle cx="12" cy="6" r="2.2" fill="currentColor"/>
    </svg>`,
    curve: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
      <path d="M3 12c3-4 6-4 9 0s6 4 9 0"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>`,
  };

  function init(cyInstance){
    _cy = cyInstance;
    _handleEl = document.getElementById('edge-handle');
    _gripEl = document.getElementById('edge-handle-grip');
    _tooltipEl = document.getElementById('edge-handle-tooltip');
    _svgGuideEl = document.getElementById('edge-guide-svg');
    _lineGuideEl = document.getElementById('edge-guide-line');

    if(_gripEl){
      _gripEl.addEventListener('mousedown', onMouseDown);
    }
  }

  function isDragging(){
    return _isDragging;
  }

  function hide(){
    if(_isDragging) return;
    if(_handleEl) _handleEl.hidden = true;
    if(_svgGuideEl) _svgGuideEl.hidden = true;
    _activeEdgeId = null;
  }

  function getContainerRect(){
    const el = document.getElementById('cy');
    return el ? el.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
  }

  function update(cy){
    if(_isDragging) return;
    if(!_cy && cy) _cy = cy;
    if(!_cy || !_handleEl) return;

    if(typeof GraphEdgeMode !== 'undefined' && GraphEdgeMode.isActive()){
      hide();
      return;
    }

    const selEdge = Store.getSelectedEdge();
    if(!selEdge){
      hide();
      return;
    }

    const cyEdge = _cy.getElementById(selEdge.id);
    if(!cyEdge.length || cyEdge.hidden()){
      hide();
      return;
    }

    const srcNode = cyEdge.source();
    const tgtNode = cyEdge.target();
    if(!srcNode.length || !tgtNode.length || srcNode.hidden() || tgtNode.hidden()){
      hide();
      return;
    }

    _activeEdgeId = selEdge.id;
    _curveStyle = selEdge.curveStyle || 'bezier';

    const p1 = srcNode.position();
    const p2 = tgtNode.position();
    const pan = _cy.pan();
    const zoom = _cy.zoom();

    let renderX = 0;
    let renderY = 0;

    if(_curveStyle === 'unbundled-bezier' || _curveStyle === 'segments'){
      const w = selEdge.controlPointWeight !== undefined ? Number(selEdge.controlPointWeight) : 0.5;
      const d = selEdge.controlPointDistance !== undefined ? Number(selEdge.controlPointDistance) : 40;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const L = Math.hypot(dx, dy) || 1;

      const xBase = p1.x + w * dx;
      const yBase = p1.y + w * dy;
      const xCp = xBase - d * (dy / L);
      const yCp = yBase + d * (dx / L);

      renderX = xCp * zoom + pan.x;
      renderY = yCp * zoom + pan.y;

      _gripEl.innerHTML = (_curveStyle === 'segments') ? ICONS.segments : ICONS.inflection;
      _gripEl.title = 'Clique e arraste para modificar o ponto de inflexão e curvatura';
    }
    else if(_curveStyle === 'taxi'){
      const t = (parseInt(selEdge.taxiTurn || '50', 10) || 50) / 100;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dir = selEdge.taxiDirection || 'auto';
      const isHorizontal = (dir === 'horizontal') || (dir === 'auto' && Math.abs(dx) >= Math.abs(dy));

      let xTurn, yTurn;
      if(isHorizontal){
        xTurn = p1.x + t * dx;
        yTurn = p1.y + 0.5 * dy;
      } else {
        xTurn = p1.x + 0.5 * dx;
        yTurn = p1.y + t * dy;
      }

      renderX = xTurn * zoom + pan.x;
      renderY = yTurn * zoom + pan.y;

      _gripEl.innerHTML = ICONS.taxi;
      _gripEl.title = 'Clique e arraste para ajustar a posição da dobra de 90°';
    }
    else {
      // Bézier ou reta: exibe alça no ponto médio permitindo puxar inflexão
      const xMid = (p1.x + p2.x) / 2;
      const yMid = (p1.y + p2.y) / 2;

      renderX = xMid * zoom + pan.x;
      renderY = yMid * zoom + pan.y;

      _gripEl.innerHTML = ICONS.curve;
      _gripEl.title = 'Clique e arraste para curvar a linha';
    }

    _handleEl.style.left = `${Math.round(renderX)}px`;
    _handleEl.style.top  = `${Math.round(renderY)}px`;
    _handleEl.hidden = false;
  }

  function onMouseDown(e){
    if(e.button !== 0) return; // apenas botão esquerdo
    e.preventDefault();
    e.stopPropagation();

    const selEdge = Store.getSelectedEdge();
    if(!selEdge || !_cy) return;

    const cyEdge = _cy.getElementById(selEdge.id);
    if(!cyEdge.length) return;

    _isDragging = true;
    _activeEdgeId = selEdge.id;
    _curveStyle = selEdge.curveStyle || 'bezier';

    _handleEl.classList.add('dragging');
    _cy.userPanningEnabled(false);
    _cy.boxSelectionEnabled(false);

    // Se a aresta era reta ou bezier tradicional, promove para unbundled-bezier com arrasto
    if(_curveStyle === 'straight' || _curveStyle === 'bezier'){
      _curveStyle = 'unbundled-bezier';
      cyEdge.data('curveStyle', 'unbundled-bezier');
      const csSelect = document.getElementById('sb-edge-curve-style');
      if(csSelect) csSelect.value = 'unbundled-bezier';
      const inflectBox = document.getElementById('sb-edge-inflection-controls');
      if(inflectBox) inflectBox.hidden = false;
    }

    _startData = {
      p1: { ...cyEdge.source().position() },
      p2: { ...cyEdge.target().position() },
      controlPointDistance: Number(selEdge.controlPointDistance ?? 40),
      controlPointWeight: Number(selEdge.controlPointWeight ?? 0.5),
      taxiTurn: parseInt(selEdge.taxiTurn || '50', 10) || 50,
      taxiDirection: selEdge.taxiDirection || 'auto',
    };

    if(_tooltipEl) _tooltipEl.hidden = false;
    if(_svgGuideEl && (_curveStyle === 'unbundled-bezier' || _curveStyle === 'segments')){
      _svgGuideEl.hidden = false;
    }

    window.addEventListener('mousemove', onMouseMove, { capture: true });
    window.addEventListener('mouseup', onMouseUp, { capture: true });
  }

  function onMouseMove(e){
    if(!_isDragging || !_cy || !_activeEdgeId) return;
    e.preventDefault();

    const cyEdge = _cy.getElementById(_activeEdgeId);
    if(!cyEdge.length) return;

    const rect = getContainerRect();
    const pan = _cy.pan();
    const zoom = _cy.zoom();

    const mouseModel = {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top  - pan.y) / zoom,
    };

    const p1 = _startData.p1;
    const p2 = _startData.p2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const L = Math.hypot(dx, dy) || 1;

    if(_curveStyle === 'taxi'){
      const isHorizontal = (_startData.taxiDirection === 'horizontal') ||
        (_startData.taxiDirection === 'auto' && Math.abs(dx) >= Math.abs(dy));

      let t = 0.5;
      if(isHorizontal){
        t = dx !== 0 ? (mouseModel.x - p1.x) / dx : 0.5;
      } else {
        t = dy !== 0 ? (mouseModel.y - p1.y) / dy : 0.5;
      }

      t = Math.max(0.18, Math.min(0.82, t));
      const pct = Math.round(t * 100);
      const pctStr = `${pct}%`;

      cyEdge.data('taxiTurn', pctStr);

      let xTurn, yTurn;
      if(isHorizontal){
        xTurn = p1.x + t * dx;
        yTurn = p1.y + 0.5 * dy;
      } else {
        xTurn = p1.x + 0.5 * dx;
        yTurn = p1.y + t * dy;
      }

      const rx = xTurn * zoom + pan.x;
      const ry = yTurn * zoom + pan.y;

      _handleEl.style.left = `${Math.round(rx)}px`;
      _handleEl.style.top  = `${Math.round(ry)}px`;

      if(_tooltipEl) _tooltipEl.textContent = `Dobra: ${pct}%`;

      const taxiInput = document.getElementById('sb-edge-taxi-turn');
      const taxiVal = document.getElementById('sb-edge-taxi-turn-val');
      if(taxiInput) taxiInput.value = pct;
      if(taxiVal) taxiVal.textContent = pctStr;
    }
    else {
      // unbundled-bezier ou segments
      const vx = mouseModel.x - p1.x;
      const vy = mouseModel.y - p1.y;

      let w = (vx * dx + vy * dy) / (L * L);
      w = Math.max(0.15, Math.min(0.85, w));

      let d = (-vx * dy + vy * dx) / L;
      d = Math.max(-200, Math.min(200, d));
      const roundedD = Math.round(d);
      const roundedW = Math.round(w * 100) / 100;

      cyEdge.data('controlPointDistance', roundedD);
      cyEdge.data('controlPointWeight', roundedW);
      cyEdge.data('segmentDistance', roundedD);
      cyEdge.data('segmentWeight', roundedW);

      // Posição base na reta de conexão
      const xBase = p1.x + roundedW * dx;
      const yBase = p1.y + roundedW * dy;
      const rxBase = xBase * zoom + pan.x;
      const ryBase = yBase * zoom + pan.y;

      const rxCp = e.clientX - rect.left;
      const ryCp = e.clientY - rect.top;

      _handleEl.style.left = `${Math.round(rxCp)}px`;
      _handleEl.style.top  = `${Math.round(ryCp)}px`;

      if(_lineGuideEl){
        _lineGuideEl.setAttribute('x1', Math.round(rxBase));
        _lineGuideEl.setAttribute('y1', Math.round(ryBase));
        _lineGuideEl.setAttribute('x2', Math.round(rxCp));
        _lineGuideEl.setAttribute('y2', Math.round(ryCp));
      }

      if(_tooltipEl){
        _tooltipEl.textContent = `${roundedD >= 0 ? '+' : ''}${roundedD}px · ${Math.round(roundedW * 100)}%`;
      }

      // Sincroniza sliders da barra lateral em tempo real
      const dInput = document.getElementById('sb-edge-cp-distance');
      const dVal = document.getElementById('sb-edge-cp-distance-val');
      const wInput = document.getElementById('sb-edge-cp-weight');
      const wVal = document.getElementById('sb-edge-cp-weight-val');
      if(dInput) dInput.value = roundedD;
      if(dVal) dVal.textContent = `${roundedD >= 0 ? '+' : ''}${roundedD}px`;
      if(wInput) wInput.value = Math.round(roundedW * 100);
      if(wVal) wVal.textContent = `${Math.round(roundedW * 100)}%`;
    }
  }

  function onMouseUp(e){
    if(!_isDragging) return;
    _isDragging = false;

    window.removeEventListener('mousemove', onMouseMove, { capture: true });
    window.removeEventListener('mouseup', onMouseUp, { capture: true });

    _handleEl.classList.remove('dragging');
    if(_tooltipEl) _tooltipEl.hidden = true;
    if(_svgGuideEl) _svgGuideEl.hidden = true;

    if(_cy){
      _cy.userPanningEnabled(true);
      _cy.boxSelectionEnabled(false);
    }

    if(!_activeEdgeId) return;

    const cyEdge = _cy.getElementById(_activeEdgeId);
    if(!cyEdge.length) return;

    const changes = {};

    if(_curveStyle === 'taxi'){
      changes.taxiTurn = cyEdge.data('taxiTurn');
    } else {
      changes.curveStyle = _curveStyle;
      changes.controlPointDistance = cyEdge.data('controlPointDistance');
      changes.controlPointWeight = cyEdge.data('controlPointWeight');
      changes.segmentDistance = cyEdge.data('segmentDistance');
      changes.segmentWeight = cyEdge.data('segmentWeight');
    }

    try {
      Store.updateEdge(_activeEdgeId, changes);
    } catch(err){
      console.warn('Erro ao salvar alteração visual da aresta:', err);
    }

    update(_cy);
  }

  return { init, update, hide, isDragging };
})();
