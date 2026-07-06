const { Terminal } = require('xterm');
const { FitAddon } = require('xterm-addon-fit');
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const configDir = path.join(os.homedir(), '.opencode-desktop');
const configPath = path.join(configDir, 'config.json');

function loadSavedTheme() {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (data.selected && window.THEMES[data.selected]) return data.selected;
  } catch (_) {}
  return 'Dark (Default)';
}

function saveTheme(name) {
  try {
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    let data = {};
    try { data = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (_) {}
    data.selected = name;
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  } catch (_) {}
}

const currentTheme = loadSavedTheme();

const term = new Terminal({
  cursorBlink: true,
  cursorStyle: 'bar',
  fontSize: 14,
  fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
  lineHeight: 1.3,
  theme: window.THEMES[currentTheme].terminal,
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

function applyTheme(name, initial) {
  const t = window.THEMES[name];
  if (!t) return;
  term.options.theme = t.terminal;
  const termEl = document.getElementById('terminal');
  if (termEl) {
    termEl.style.background = t.terminal.background;
    const xterm = termEl.querySelector('.xterm');
    if (xterm) {
      xterm.style.background = t.terminal.background;
      const vp = xterm.querySelector('.xterm-viewport');
      if (vp) vp.style.background = t.terminal.background;
      const screen = xterm.querySelector('.xterm-screen');
      if (screen) screen.style.background = t.terminal.background;
    }
  }
  const bar = document.getElementById('status-bar');
  bar.style.background = t.ui.bar;
  document.getElementById('status-indicator').style.background = t.ui.indicator;
  const tn = document.getElementById('theme-name');
  tn.textContent = name;
  tn.style.color = t.ui.barText;
  document.getElementById('status-text').style.color = t.ui.barText;
  saveTheme(name);
  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === name);
  });
}

function buildThemePicker() {
  const list = document.getElementById('theme-list');
  window.THEME_NAMES.forEach(name => {
    const t = window.THEMES[name];
    const div = document.createElement('div');
    div.className = 'theme-option';
    div.dataset.theme = name;
    const dot = document.createElement('span');
    dot.className = 'preview-dot';
    dot.style.background = t.terminal.background;
    div.appendChild(dot);
    const label = document.createElement('span');
    label.textContent = name;
    div.appendChild(label);
    div.addEventListener('click', () => {
      applyTheme(name);
      document.getElementById('theme-picker').classList.add('hidden');
    });
    list.appendChild(div);
  });
}

term.open(document.getElementById('terminal'));
applyTheme(currentTheme);
buildThemePicker();

document.getElementById('theme-name').addEventListener('click', () => {
  document.getElementById('theme-picker').classList.toggle('hidden');
});

document.getElementById('theme-picker').addEventListener('click', (e) => {
  if (e.target === document.getElementById('theme-picker')) {
    document.getElementById('theme-picker').classList.add('hidden');
  }
});

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
