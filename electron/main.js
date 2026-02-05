const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

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

/**
 * Recursively read folder contents.
 * Skips hidden directories and node_modules.
 */
function readFolderContents(folderPath) {
  const results = [];

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }
          results.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
          });
          walk(fullPath);
        } else {
          results.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          });
        }
      }
    } catch (err) {
      console.error(`Error reading ${dir}:`, err.message);
    }
  }

  walk(folderPath);
  return results;
}

// ── IPC Handlers ──────────────────────────────────────────

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const folderPath = result.filePaths[0];
  const folderName = path.basename(folderPath);
  const files = readFolderContents(folderPath);

  return { folderName, folderPath, files };
});

ipcMain.handle('open-path', async (_event, filePath) => {
  try {
    const err = await shell.openPath(filePath);
    if (err) return { success: false, error: err };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-in-folder', async (_event, filePath) => {
  shell.showItemInFolder(filePath);
  return { success: true };
});

// ── App lifecycle ─────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
