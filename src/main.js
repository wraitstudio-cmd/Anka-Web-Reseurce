const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const { checkUpdates } = require('./updater');

let win;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });
}

app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization,VaapiVideoDecoder');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 760,
        minHeight: 480,
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
            offscreen: false,
            v8CacheOptions: 'code'
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

    win.on('closed', () => { win = null; });
}

function registerDefaultBrowserHandlers() {
    ipcMain.on('set-as-default-browser', () => {
        try {
            if (process.defaultApp) {
                if (process.argv.length >= 2) {
                    app.setAsDefaultProtocolClient('http', process.execPath, [process.argv[1]]);
                    app.setAsDefaultProtocolClient('https', process.execPath, [process.argv[1]]);
                }
            } else {
                app.setAsDefaultProtocolClient('http');
                app.setAsDefaultProtocolClient('https');
            }

            if (process.platform === 'win32') {
                shell.openExternal('ms-settings:defaultapps');
            }
        } catch (err) {
            console.error('Varsayılan tarayıcı ayarlanamadı:', err);
        }
    });

    ipcMain.handle('check-default-browser', async () => {
        try {
            return app.isDefaultProtocolClient('http') && app.isDefaultProtocolClient('https');
        } catch (err) {
            return false;
        }
    });
}

ipcMain.on('window-minimize', () => { if (win) win.minimize(); });

ipcMain.on('window-maximize', () => {
    if (win) {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    }
});

ipcMain.on('window-close', () => { if (win) win.close(); });

ipcMain.on('set-fullscreen', (event, val) => {
    if (win) win.setFullScreen(!!val);
});

ipcMain.on('hide-update-banner', () => {});

ipcMain.on('settings-update', (event, { id, val }) => {
    if (id === 'fps-meter' || id === 'ai-mode-active') return;
});

app.whenReady().then(() => {
    const ses = session.defaultSession;

ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    const url = details.url || '';

    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    if (url.includes('youtube.com')) {
        headers['Origin'] = 'https://www.youtube.com';
        headers['Referer'] = 'https://www.youtube.com/';
        headers['YouTube-Restricted-Mode'] = 'on';
    } else {
        delete headers['Origin'];
        delete headers['Referer'];
    }

    if (url.includes('accounts.google.com')) {
        headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
        headers['Accept-Language'] = 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7';
        delete headers['Sec-Ch-Ua'];
        delete headers['Sec-Ch-Ua-Mobile'];
        delete headers['Sec-Ch-Ua-Platform'];
    }

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

    ses.setPermissionRequestHandler((webContents, permission, callback) => {
        const ALLOWED = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock'];
        callback(ALLOWED.includes(permission));
    });

    registerDefaultBrowserHandlers();
    createWindow();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
    if (error.message && error.message.includes('Render frame was disposed')) {
        return;
    }
    console.error('Beklenmeyen hata:', error);
});