const { app, BrowserWindow, session, ipcMain, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { checkUpdates } = require('./updater');

let win = null;
const downloads = new Map();

function getAppDataFile(name) {
    return path.join(app.getPath('userData'), name);
}

function readAppState() {
    try {
        return JSON.parse(fs.readFileSync(getAppDataFile('anka-settings.json'), 'utf8')) || {};
    } catch (err) {
        return {};
    }
}

function writeAppState(state) {
    try {
        fs.mkdirSync(app.getPath('userData'), { recursive: true });
        fs.writeFileSync(getAppDataFile('anka-settings.json'), JSON.stringify(state), 'utf8');
        return true;
    } catch (err) {
        return false;
    }
}

function saveDrawingPng(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) return false;
    try {
        fs.mkdirSync(app.getPath('userData'), { recursive: true });
        fs.writeFileSync(getAppDataFile('anka-drawing.png'), Buffer.from(dataUrl.slice(22), 'base64'));
        return true;
    } catch (err) {
        return false;
    }
}

async function captureAppScreen() {
    if (!win || win.isDestroyed()) return '';
    try {
        const image = await win.capturePage();
        const picturesPath = app.getPath('pictures');
        fs.mkdirSync(picturesPath, { recursive: true });
        const filePath = path.join(picturesPath, `anka-ekran-${Date.now()}.png`);
        fs.writeFileSync(filePath, image.toPNG());
        return filePath;
    } catch (err) {
        return '';
    }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (win && !win.isDestroyed()) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });
}



function applyPerformanceFlags() {
    app.commandLine.appendSwitch('disable-dev-shm-usage');
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-ipc-flooding-protection');
    app.commandLine.appendSwitch('disable-site-isolation-trials');
    app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
    app.commandLine.appendSwitch('log-level', '3');
    app.commandLine.appendSwitch('enable-pointer-events');
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,CanvasOopRasterization');

    if (process.platform === 'linux') {
        app.commandLine.appendSwitch('enable-gpu-rasterization');
        app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
    } else if (process.platform === 'win32') {
        app.commandLine.appendSwitch('high-dpi-support', 'true');
        app.commandLine.appendSwitch('force-device-scale-factor', '1');
    }
}

applyPerformanceFlags();

function createWindow() {
    if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const isMac = process.platform === 'darwin';

    win = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        minWidth: 760,
        minHeight: 480,
        frame: false,
        transparent: process.platform !== 'linux',
        backgroundColor: '#00000000',
        titleBarStyle: isMac ? 'hiddenInset' : 'default',
        icon: path.join(__dirname, '../../icons/logo.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            webviewTag: true,
            nodeIntegrationInSubFrames: true,
            sandbox: false,
            backgroundThrottling: false,
            allowRunningInsecureContent: true,
            spellcheck: false,
            offscreen: false
        }
    });

    const indexPath = path.join(app.getAppPath(), 'src/renderer/index.html');

    win.loadURL(pathToFileURL(indexPath).href).catch(mainErr => {
        if (mainErr && mainErr.code !== 'ERR_ABORTED') {
            console.error(mainErr);
        }
    });

    win.once('ready-to-show', () => {
        if (win && !win.isDestroyed()) {
            win.show();
            win.focus();
            if (typeof checkUpdates === 'function') {
                checkUpdates(win);
            }
        }
    });

    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(`
            console.log("%cDİKKAT!", "color: red; font-size: 30px; font-weight: bold;");
            console.log("%cBURAYA BİR ŞEY YAPIŞTIRMADAN ÖNCE OKUYUN: Buraya yabancı kodlar yapıştırmanız, kötü niyetli kişilerin hesaplarınıza ve tüm kişisel verilerinize tam erişim sağlamasına neden olabilir.", "color: orange; font-size: 14px; font-weight: bold;");
        `).catch(() => {});
    });

    win.on('maximize', () => {
        if (win && !win.isDestroyed()) {
            win.webContents.send('window-state-change', 'maximized');
        }
    });

    win.on('unmaximize', () => {
        if (win && !win.isDestroyed()) {
            win.webContents.send('window-state-change', 'restored');
        }
    });

    win.on('closed', () => {
        win = null;
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (win && !win.isDestroyed()) {
            win.webContents.send('open-new-tab', url);
        }
        return { action: 'deny' };
    });
}

function sanitizeDownloadItem(item) {
    return {
        id: item.id,
        fileName: item.fileName,
        totalBytes: item.totalBytes,
        receivedBytes: item.receivedBytes,
        state: item.state,
        savePath: item.savePath,
        isPaused: item.isPaused,
        url: item.url
    };
}

function setupDownloadManager() {
    const ses = session.defaultSession;

    ses.on('will-download', (event, item) => {
        const downloadId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const fileName = item.getFilename();
        const totalBytes = item.getTotalBytes();
        const savePath = item.getSavePath();
        const url = item.getURL();

        const downloadData = {
            id: downloadId,
            fileName: fileName,
            totalBytes: totalBytes,
            receivedBytes: 0,
            state: 'progressing',
            savePath: savePath,
            isPaused: false,
            url: url,
            _rawItem: item
        };

        downloads.set(downloadId, downloadData);

        if (win && !win.isDestroyed()) {
            win.webContents.send('download-start', {
                id: downloadId,
                fileName: fileName,
                totalBytes: totalBytes
            });
            win.webContents.send('download-created', sanitizeDownloadItem(downloadData));
        }

        item.on('updated', (evt, state) => {
            downloadData.receivedBytes = item.getReceivedBytes();
            downloadData.totalBytes = item.getTotalBytes();
            downloadData.isPaused = item.isPaused();
            downloadData.savePath = item.getSavePath();

            if (state === 'interrupted') {
                downloadData.state = 'interrupted';
            } else if (state === 'progressing') {
                downloadData.state = item.isPaused() ? 'paused' : 'progressing';
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
                win.webContents.send('download-updated', {
                    id: downloadId,
                    receivedBytes: downloadData.receivedBytes,
                    state: downloadData.state,
                    isPaused: downloadData.isPaused
                });
            }
        });

        item.once('done', (evt, state) => {
            downloadData.state = state === 'completed' ? 'completed' : 'cancelled';
            downloadData.savePath = item.getSavePath();
            delete downloadData._rawItem;

            if (win && !win.isDestroyed()) {
                win.webContents.send('download-done', {
                    id: downloadId,
                    state: state,
                    savePath: downloadData.savePath
                });
                win.webContents.send('download-completed', {
                    id: downloadId,
                    state: downloadData.state,
                    savePath: downloadData.savePath
                });
            }
        });
    });
}

function setupSessionHandlers() {
    const ses = session.defaultSession;

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
}

function registerDefaultBrowserHandlers() {
    ipcMain.handle('load-app-state', () => readAppState());
    ipcMain.on('save-app-setting', (event, payload) => {
        if (!payload || typeof payload.id !== 'string') return;
        const state = readAppState();
        state.settings = state.settings || {};
        state.settings[payload.id] = payload.val;
        writeAppState(state);
    });
    ipcMain.on('reset-app-settings', () => {
        try {
            fs.rmSync(getAppDataFile('anka-settings.json'), { force: true });
        } catch (err) {}
    });
    ipcMain.on('save-drawing-png', (event, dataUrl) => saveDrawingPng(dataUrl));
    ipcMain.handle('capture-app-screen', captureAppScreen);
    ipcMain.handle('load-drawing-png', () => {
        try {
            const data = fs.readFileSync(getAppDataFile('anka-drawing.png'));
            return 'data:image/png;base64,' + data.toString('base64');
        } catch (err) {
            return '';
        }
    });
    ipcMain.on('clear-drawing-png', () => {
        try {
            fs.rmSync(getAppDataFile('anka-drawing.png'), { force: true });
        } catch (err) {}
    });

    ipcMain.handle('window-minimize', windowMinimize);
    ipcMain.handle('window-maximize', windowMaximize);
    ipcMain.handle('window-close', windowClose);
    ipcMain.handle('is-window-maximized', () => (win && !win.isDestroyed()) ? win.isMaximized() : false);

    ipcMain.handle('get-downloads', getDownloadsList);
    ipcMain.handle('get-downloads-list', getDownloadsList);

    ipcMain.on('open-download-item', (event, filePath) => openDownloadItem(filePath));
    ipcMain.handle('open-download-item', (event, filePath) => openDownloadItem(filePath));

    ipcMain.on('show-download-in-folder', (event, filePath) => showDownloadInFolder(filePath));
    ipcMain.handle('show-download-in-folder', (event, filePath) => showDownloadInFolder(filePath));

    ipcMain.on('pause-download', (event, id) => pauseDownload(id));
    ipcMain.handle('pause-download', (event, id) => pauseDownload(id));

    ipcMain.on('resume-download', (event, id) => resumeDownload(id));
    ipcMain.handle('resume-download', (event, id) => resumeDownload(id));

    ipcMain.on('cancel-download', (event, id) => cancelDownload(id));
    ipcMain.handle('cancel-download', (event, id) => cancelDownload(id));

    ipcMain.on('clear-download-history', clearDownloadHistory);
    ipcMain.handle('clear-download-history', clearDownloadHistory);

    ipcMain.on('restart-download', (event, id) => {
        const item = downloads.get(id);
        if (item && item.url) {
            if (win && !win.isDestroyed()) {
                win.webContents.downloadURL(item.url);
                downloads.delete(id);
            }
        }
    });

    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    ipcMain.on('set-fullscreen', (event, val) => setFullscreen(val));

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
            console.error(err);
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

function getDownloadsList() {
    return Array.from(downloads.values()).map(sanitizeDownloadItem);
}

function openDownloadItem(filePath) {
    if (filePath) {
        shell.openPath(filePath).catch(err => console.error(err));
    }
}

function showDownloadInFolder(filePath) {
    if (filePath) {
        shell.showItemInFolder(filePath);
    }
}

function pauseDownload(id) {
    const item = downloads.get(id);
    if (item && item._rawItem && item.state === 'progressing') {
        item._rawItem.pause();
        item.isPaused = true;
        item.state = 'paused';
    }
}

function resumeDownload(id) {
    const item = downloads.get(id);
    if (item && item._rawItem && item._rawItem.isPaused()) {
        item._rawItem.resume();
        item.isPaused = false;
        item.state = 'progressing';
    }
}

function cancelDownload(id) {
    const item = downloads.get(id);
    if (item && item._rawItem) {
        item._rawItem.cancel();
        item.state = 'cancelled';
    }
}

function clearDownloadHistory() {
    for (const [id, item] of downloads.entries()) {
        if (item.state !== 'progressing') {
            downloads.delete(id);
        }
    }
}

function windowMinimize() {
    if (win && !win.isDestroyed()) {
        win.minimize();
    }
}

function windowMaximize() {
    if (win && !win.isDestroyed()) {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
}

function windowClose() {
    if (win && !win.isDestroyed()) {
        win.close();
    }
}

function setFullscreen(val) {
    if (win && !win.isDestroyed()) {
        win.setFullScreen(!!val);
    }
}

app.whenReady().then(() => {
    setupSessionHandlers();
    setupDownloadManager();
    registerDefaultBrowserHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.handle('find-in-page', (event, text, options) => {
    if (win && !win.isDestroyed()) {
        return win.webContents.findInPage(text, options);
    }
});

ipcMain.handle('stop-find-in-page', (event, action) => {
    if (win && !win.isDestroyed()) {
        return win.webContents.stopFindInPage(action);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    if (error && error.message && (error.message.includes('Render frame was disposed') || error.message.includes('Object has been destroyed'))) {
        return;
    }
    console.error(error);
});

process.on('unhandledRejection', (reason) => {
    console.error(reason);
});

module.exports = {
    createWindow,
    registerDefaultBrowserHandlers,
    getDownloadsList,
    openDownloadItem,
    showDownloadInFolder,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    windowMinimize,
    windowMaximize,
    windowClose,
    setFullscreen
};