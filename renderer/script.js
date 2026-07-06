const { Terminal } = require('xterm');
const { FitAddon } = require('xterm-addon-fit');
const { ipcRenderer } = require('electron');

const term = new Terminal({
  cursorBlink: true,
  cursorStyle: 'bar',
  fontSize: 14,
  fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
  lineHeight: 1.3,
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

term.open(document.getElementById('terminal'));

function fit() {
  try {
    fitAddon.fit();
  } catch (_) {
    const el = document.getElementById('terminal');
    if (el) {
      const cols = Math.max(10, Math.floor(el.clientWidth / 10));
      const rows = Math.max(5, Math.floor(el.clientHeight / 18));
      term.resize(cols, rows);
    }
  }
  ipcRenderer.send('terminal-resize', { cols: term.cols, rows: term.rows });
}

window.addEventListener('resize', fit);
new ResizeObserver(fit).observe(document.getElementById('terminal'));

ipcRenderer.on('terminal-data', (_event, data) => term.write(data));

ipcRenderer.on('terminal-exit', (_event, { exitCode, signal }) => {
  document.getElementById('status-indicator').style.background = '#cc4444';
  document.getElementById('status-text').textContent = `Exited (${exitCode})`;
});

term.onData((data) => ipcRenderer.send('terminal-input', data));

setTimeout(fit, 200);
