<<<<<<< HEAD
const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { checkUpdates } = require('./updater');

let win;
function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        transparent: true,
        show: false,
        icon: path.join(__dirname, '../assets/icons/logo.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            sandbox: false
        }
    });

    win.loadFile('index.html');

    win.once('ready-to-show', () => {
        win.show();
        win.focus();
        checkUpdates(win);
    });

    setTimeout(() => {
        if (win && !win.isVisible()) {
            win.show();
            checkUpdates(win);
        }
    }, 1200);
}

app.whenReady().then(() => {
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        callback({ requestHeaders: { ...details.requestHeaders, 'Origin': '*' } });
    });
    createWindow();
});

ipcMain.on('window-minimize', () => {
    if (win) win.minimize();
});

ipcMain.on('window-maximize', () => {
    if (win) {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    }
});

ipcMain.on('window-close', () => {
    if (win) win.close();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
=======
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { checkUpdates } = require('./updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Anka Web - V1.0.0",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      enableRemoteModule: true
    }
  });

win.loadFile(path.join(__dirname, '../index.html'));

win.webContents.once('did-finish-load', () => {
    checkUpdates(win);
});

  const filter = {
    urls: [
      "*://www.google.com/*",
      "*://www.youtube.com/*",
      "*://*.google.com.tr/*"
    ]
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    if (details.url.includes("google.com")) {
      details.requestHeaders['X-SafeSearch'] = 'active';
    }
    
    if (details.url.includes("youtube.com")) {
      details.requestHeaders['YouTube-Restrict'] = 'Strict';
    }

    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  const forbiddenKeywords = ['yasaklısite1.com', 'kumar', 'bahis', 'poker', "memz"]; 
  
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url.toLowerCase();
    const isForbidden = forbiddenKeywords.some(keyword => url.includes(keyword));
    
    if (isForbidden) {
      console.log("Engellendi:", url);
      return callback({ cancel: true });
    }
    callback({ cancel: false });
  });

  win.loadFile(path.join(__dirname, '../index.html'));
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
>>>>>>> origin/main
});