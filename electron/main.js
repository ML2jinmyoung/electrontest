const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ── Auto Update ───────────────────────────────────────────

function setupAutoUpdater() {
  if (isDev) return;

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-status', 'available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update-status', 'downloading', Math.round(progress.percent));
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-status', 'ready');
  });

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err.message);
  });
}

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// ── Folder ────────────────────────────────────────────────

function readFolderContents(folderPath) {
  const results = [];

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          results.push({ name: entry.name, path: fullPath, type: 'directory' });
          walk(fullPath);
        } else {
          results.push({ name: entry.name, path: fullPath, type: 'file' });
        }
      }
    } catch (err) {
      console.error(`Error reading ${dir}:`, err.message);
    }
  }

  walk(folderPath);
  return results;
}

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const folderPath = result.filePaths[0];
  return {
    folderName: path.basename(folderPath),
    folderPath,
    files: readFolderContents(folderPath),
  };
});

ipcMain.handle('open-path', async (_e, p) => {
  const err = await shell.openPath(p);
  return err ? { success: false, error: err } : { success: true };
});

ipcMain.handle('show-in-folder', async (_e, p) => {
  shell.showItemInFolder(p);
  return { success: true };
});

// ── Lifecycle ─────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
