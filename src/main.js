const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { checkUpdates } = require('./updater');

let win;

app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-certificate-errors');

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        transparent: true,
        show: false,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, '../assets/icons/logo.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            sandbox: false,
            backgroundThrottling: false,
            offscreen: false
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
    const ses = session.defaultSession;

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        const headers = { ...details.requestHeaders };
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        headers['Origin'] = 'https://www.youtube.com';
        headers['Referer'] = 'https://www.youtube.com/';
        callback({ requestHeaders: headers });
    });

    ses.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        delete responseHeaders['x-frame-options'];
        delete responseHeaders['content-security-policy'];
        delete responseHeaders['access-control-allow-origin'];
        responseHeaders['access-control-allow-origin'] = ['*'];
        callback({ responseHeaders });
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
});