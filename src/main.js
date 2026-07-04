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
    if (process.platform !== 'darwin') app.quit();});
