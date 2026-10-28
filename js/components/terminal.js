/**
 * TerminalUI Component — Trama
 * Gerencia o painel inferior retrátil do terminal integrado (estilo VS Code),
 * entrada de comandos, histórico de logs, redimensionamento por arraste e atalhos.
 */
const TerminalUI = (() => {

  let _panelEl = null;
  let _inputEl = null;
  let _outputEl = null;
  let _toggleBtn = null;
  let _statusBadge = null;
  let _isDragging = false;
  let _startY = 0;
  let _startHeight = 250;

  function cacheElements() {
    _panelEl = document.getElementById('terminal-panel');
    _inputEl = document.getElementById('terminal-input');
    _outputEl = document.getElementById('terminal-output');
    _toggleBtn = document.getElementById('btn-toggle-terminal');
    _statusBadge = document.getElementById('terminal-status-badge');
  }

  function isOpen() {
    return _panelEl ? !_panelEl.hidden : false;
  }

  function open() {
    if (!_panelEl) cacheElements();
    if (!_panelEl) return;

    _panelEl.hidden = false;
    if (_toggleBtn) _toggleBtn.classList.add('active');

    if (typeof Graph !== 'undefined' && typeof Graph.resize === 'function') {
      Graph.resize();
    }

    if (_inputEl) {
      setTimeout(() => _inputEl.focus(), 50);
    }
  }

  function close() {
    if (!_panelEl) cacheElements();
    if (!_panelEl) return;

    _panelEl.hidden = true;
    if (_toggleBtn) _toggleBtn.classList.remove('active');

    if (typeof Graph !== 'undefined' && typeof Graph.resize === 'function') {
      Graph.resize();
    }
  }

  function toggle(forceState) {
    if (typeof forceState === 'boolean') {
      forceState ? open() : close();
    } else {
      isOpen() ? close() : open();
    }
  }

  async function copyPrompt() {
    if (typeof TerminalPrompt !== 'undefined' && typeof TerminalPrompt.copyToClipboard === 'function') {
      const ok = await TerminalPrompt.copyToClipboard();
      if (typeof App !== 'undefined' && typeof App.toast === 'function') {
        App.toast(ok ? 'Contexto e regras para IA copiados com sucesso!' : 'Erro ao copiar prompt para IA.');
      }
    }
  }

  function clear() {
    if (_inputEl) _inputEl.value = '';
    if (_outputEl) {
      _outputEl.innerHTML = '<div class="terminal-log-empty">Nenhum comando executado nesta sessão.</div>';
    }
    if (_statusBadge) {
      _statusBadge.textContent = 'Pronto';
      _statusBadge.style.borderColor = '';
      _statusBadge.style.color = '';
    }
  }

  function renderLogs(logs, summary) {
    if (!_outputEl) return;
    _outputEl.innerHTML = '';

    if (!logs || logs.length === 0) {
      _outputEl.innerHTML = '<div class="terminal-log-empty">Execução concluída sem logs.</div>';
      return;
    }

    for (const log of logs) {
      const row = document.createElement('div');
      row.className = `terminal-log-item terminal-log--${log.status}`;

      const badge = document.createElement('span');
      badge.className = 'terminal-log-badge';
      badge.textContent = log.status === 'ok' ? 'OK' : (log.status === 'warn' ? 'AVISO' : 'ERRO');

      const msg = document.createElement('span');
      msg.className = 'terminal-log-msg';
      msg.textContent = log.message;

      row.appendChild(badge);
      row.appendChild(msg);
      _outputEl.appendChild(row);
    }

    // Rola para o final dos logs
    _outputEl.scrollTop = _outputEl.scrollHeight;

    if (_statusBadge) {
      _statusBadge.textContent = `${summary.successCount} OK / ${summary.errorCount} Erros`;
      if (summary.errorCount > 0) {
        _statusBadge.style.borderColor = 'var(--node-problema)';
        _statusBadge.style.color = 'var(--node-problema)';
      } else {
        _statusBadge.style.borderColor = 'var(--node-solucao)';
        _statusBadge.style.color = 'var(--node-solucao)';
      }
    }
  }

  function run() {
    if (!_inputEl) cacheElements();
    const script = _inputEl ? _inputEl.value : '';
    if (!script.trim()) {
      if (typeof App !== 'undefined' && typeof App.toast === 'function') {
        App.toast('Digite ou cole comandos para executar.');
      }
      return;
    }

    if (_statusBadge) _statusBadge.textContent = 'Executando...';

    if (typeof TerminalEngine !== 'undefined' && typeof TerminalEngine.execute === 'function') {
      const result = TerminalEngine.execute(script);
      renderLogs(result.logs, result);

      if (typeof App !== 'undefined') {
        if (typeof App.updateUndoRedoUI === 'function') {
          App.updateUndoRedoUI();
        }
        if (typeof App.toast === 'function') {
          if (result.errorCount === 0) {
            App.toast(`${result.successCount} comando(s) executado(s) com sucesso!`);
          } else {
            App.toast(`Executado: ${result.successCount} sucesso(s), ${result.errorCount} erro(s).`);
          }
        }
      }
    }
  }

  function initResizeHandle() {
    const handle = document.getElementById('terminal-resize-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', e => {
      _isDragging = true;
      _startY = e.clientY;
      const computedHeight = _panelEl ? parseInt(window.getComputedStyle(_panelEl).height, 10) : 250;
      _startHeight = isNaN(computedHeight) ? 250 : computedHeight;
      handle.classList.add('active');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = ev => {
        if (!_isDragging || !_panelEl) return;
        const deltaY = _startY - ev.clientY;
        const newHeight = Math.max(120, Math.min(window.innerHeight * 0.75, _startHeight + deltaY));
        _panelEl.style.setProperty('--terminal-height', `${newHeight}px`);
        if (typeof Graph !== 'undefined' && typeof Graph.resize === 'function') {
          Graph.resize();
        }
      };

      const onMouseUp = () => {
        _isDragging = false;
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        if (typeof Graph !== 'undefined' && typeof Graph.resize === 'function') {
          Graph.resize();
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  function bind() {
    cacheElements();
    initResizeHandle();

    // Botões no topo
    _toggleBtn?.addEventListener('click', () => toggle());
    document.getElementById('btn-copy-ai-prompt')?.addEventListener('click', () => copyPrompt());

    // Botões no painel do terminal
    document.getElementById('btn-terminal-copy-prompt')?.addEventListener('click', () => copyPrompt());
    document.getElementById('btn-terminal-run')?.addEventListener('click', () => run());
    document.getElementById('btn-terminal-clear')?.addEventListener('click', () => clear());
    document.getElementById('btn-terminal-close')?.addEventListener('click', () => close());

    // Execução por atalho Ctrl+Enter no textarea
    _inputEl?.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    });
  }

  return {
    bind,
    isOpen,
    open,
    close,
    toggle,
    copyPrompt,
    clear,
    run
  };
})();
