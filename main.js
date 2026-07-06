const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const pty = require('node-pty');

const shells = new Map();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'Opencode Desktop',
    icon: path.join(__dirname, 'icon.icns'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const opencodePath = path.join(os.homedir(), '.opencode', 'bin', 'opencode');
  let shell;

  try {
    shell = pty.spawn(opencodePath, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: process.env.HOME,
      env: { ...process.env, TERM: 'xterm-256color' },
    });
  } catch (err) {
    dialog.showErrorBox('Failed to start opencode', err.message);
    win.close();
    return win;
  }

  const id = win.webContents.id;
  shells.set(id, shell);

  shell.onData((data) => {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal-data', data);
      }
    } catch (_) {}
  });

  shell.onExit(({ exitCode, signal }) => {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal-exit', { exitCode, signal });
      }
    } catch (_) {}
    shells.delete(id);
  });

  win.on('closed', () => {
    if (shell) {
      try { shell.kill(); } catch (_) {}
    }
    shells.delete(id);
  });

  return win;
}

ipcMain.on('terminal-input', (_event, data) => {
  const shell = shells.get(_event.sender.id);
  if (shell) shell.write(data);
});

ipcMain.on('terminal-resize', (_event, { cols, rows }) => {
  const shell = shells.get(_event.sender.id);
  if (shell) shell.resize(cols, rows);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => { app.quit(); });

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
