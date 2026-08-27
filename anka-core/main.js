const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const { checkUpdates } = require('./updater');
const os = require('os');

let win;
const downloads = new Map();

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
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization,VaapiVideoDecoder,ParallelDownloading,SmoothScrolling');
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
            nodeIntegrationInSubFrames: true,
            sandbox: false,
            backgroundThrottling: false,
            offscreen: false,
            v8CacheOptions: 'code'
        }
    });

    win.loadFile('index.html');

    win.once('ready-to-show', () => {
        if (win && !win.isDestroyed()) {
            win.show();
            win.focus();
            checkUpdates(win);
        }
    });

    win.on('closed', () => { win = null; });
}

function registerDefaultBrowserHandlers() {
    ipcMain.on('set-as-default-browser', () => {
        try {
            if (process.defaultApp) {
                if (process.argv.length >= 2) {
                    app.setAsDefaultProtocolClient('http', process.execPath, [process.argv]);
                    app.setAsDefaultProtocolClient('https', process.execPath, [process.argv]);
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

// Güvenli veri aktarımı için ham objeleri temizleyerek listeler
ipcMain.handle('get-downloads-list', () => {
    return Array.from(downloads.values()).map(item => ({
        id: item.id,
        fileName: item.fileName,
        totalBytes: item.totalBytes,
        receivedBytes: item.receivedBytes,
        state: item.state,
        savePath: item.savePath,
        isPaused: item.isPaused,
        url: item.url
    }));
});

ipcMain.on('open-download-item', (event, filePath) => {
    if (filePath) shell.openPath(filePath);
});

ipcMain.on('show-download-in-folder', (event, filePath) => {
    if (filePath) shell.showItemInFolder(filePath);
});

// GELİŞMİŞ İNDİRME KONTROLLERİ
ipcMain.on('pause-download', (event, id) => {
    const item = downloads.get(id);
    if (item && item._rawItem && item.state === 'progressing') {
        item._rawItem.pause();
        item.isPaused = true;
    }
});

ipcMain.on('resume-download', (event, id) => {
    const item = downloads.get(id);
    if (item && item._rawItem && item._rawItem.isPaused()) {
        item._rawItem.resume();
        item.isPaused = false;
        item.state = 'progressing';
    }
});

ipcMain.on('cancel-download', (event, id) => {
    const item = downloads.get(id);
    if (item && item._rawItem) {
        item._rawItem.cancel();
        item.state = 'cancelled';
    }
});

ipcMain.on('restart-download', (event, id) => {
    const item = downloads.get(id);
    if (item && item.url) {
        // Hatalı veya yarıda kalan indirmeyi URL üzerinden sıfırdan tetikler
        if (win && !win.isDestroyed()) {
            win.webContents.downloadURL(item.url);
            downloads.delete(id); // Eski hatalı kaydı temizle
        }
    }
});

ipcMain.on('clear-download-history', () => {
    // Sadece aktif olmayan geçmişi temizler
    for (const [id, item] of downloads.entries()) {
        if (item.state !== 'progressing') {
            downloads.delete(id);
        }
    }
});

ipcMain.on('window-minimize', () => { 
    if (win && !win.isDestroyed()) win.minimize(); 
});

ipcMain.on('window-maximize', () => {
    if (win && !win.isDestroyed()) {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    }
});

ipcMain.on('window-close', () => { 
    if (win && !win.isDestroyed()) win.close(); 
});

ipcMain.on('set-fullscreen', (event, val) => {
    if (win && !win.isDestroyed()) win.setFullScreen(!!val);
});

app.whenReady().then(() => {
    const ses = session.defaultSession;

    ses.on('will-download', (event, item) => {
        const downloadId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const fileName = item.getFilename();
        const totalBytes = item.getTotalBytes();
        const downloadUrl = item.getURL();

        const downloadData = {
            id: downloadId,
            fileName: fileName,
            totalBytes: totalBytes,
            receivedBytes: 0,
            state: 'progressing',
            savePath: item.getSavePath(),
            isPaused: false,
            url: downloadUrl,
            _rawItem: item
        };

        downloads.set(downloadId, downloadData);

        if (win && !win.isDestroyed()) {
            win.webContents.send('download-start', {
                id: downloadId,
                fileName: fileName,
                totalBytes: totalBytes
            });
        }

        item.on('updated', (evt, state) => {
            downloadData.receivedBytes = item.getReceivedBytes();
            downloadData.totalBytes = item.getTotalBytes();
            downloadData.isPaused = item.isPaused();
            downloadData.savePath = item.getSavePath();
            
            // Eğer internet koptuysa veya ağ hatası varsa durumu 'interrupted' (kesildi) yapıyoruz
            if (state === 'interrupted') {
                downloadData.state = 'interrupted';
            } else {
                downloadData.state = state;
            }

            if (win && !win.isDestroyed()) {
                win.webContents.send('download-progress', {
                    id: downloadId,
                    receivedBytes: downloadData.receivedBytes,
                    totalBytes: downloadData.totalBytes,
                    isPaused: downloadData.isPaused,
                    state: downloadData.state
                });
            }
        });

        item.once('done', (evt, state) => {
            downloadData.state = state;
            downloadData.savePath = item.getSavePath();
            delete downloadData._rawItem; // Bellek sızıntısını önlemek için ham referansı temizle

            if (win && !win.isDestroyed()) {
                win.webContents.send('download-done', {
                    id: downloadId,
                    state: state,
                    savePath: downloadData.savePath
                });
            }
        });
    });

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        const headers = { ...details.requestHeaders };
        const url = details.url || '';

        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

        if (url.includes('youtube.com')) {
            headers['Origin'] = 'https://youtube.com';
            headers['Referer'] = 'https://youtube.com/';
        }

        if (url.includes('://google.com')) {
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
        
        Object.keys(responseHeaders).forEach((key) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'x-frame-options' || lowerKey === 'content-security-policy') {
                delete responseHeaders[key];
            }
        });

        callback({ responseHeaders });
    });

    ses.setPermissionRequestHandler((webContents, permission, callback) => {
        const ALLOWED = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock', 'notifications', 'media'];
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
    if (error.message && (error.message.includes('Render frame was disposed') || error.message.includes('Object has been destroyed'))) {
        return;
    }
    console.error('Beklenmeyen hata:', error);
});
