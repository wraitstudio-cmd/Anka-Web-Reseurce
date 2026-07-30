const { ipcMain, app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

const CURRENT_VERSION = "1.4.5";
const UPDATE_URL = "https://raw.githubusercontent.com/wraitstudio-cmd/Anka-Web/main/latest.yml";

let isListenersRegistered = false;

async function checkUpdates(win) {
    if (!win || win.isDestroyed()) return;

    win.on('close', (e) => {
        if (win.isDownloading) {
            e.preventDefault();
            win.webContents.send('download-alert', 'İndirme devam ediyor, lütfen bekleyin.');
        } else {
            app.exit(0);
        }
    });

    https.get(`${UPDATE_URL}?t=${Date.now()}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const config = {};
                data.split('\n').forEach(line => {
                    const cleanLine = line.trim();
                    if (!cleanLine || cleanLine.startsWith('#')) return;
                    const index = cleanLine.indexOf(':');
                    if (index !== -1) {
                        const key = cleanLine.substring(0, index).trim();
                        const val = cleanLine.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
                        if (key) config[key] = val;
                    }
                });

                if (config.version && config.version !== CURRENT_VERSION) {
                    const targetUrl = process.platform === 'win32' ? config.url_win : config.url_linux;
                    if (targetUrl) {
                        win.webContents.send('update-available', {
                            version: config.version,
                            url: targetUrl,
                            notes: config.notes || ''
                        });
                    }
                }
            } catch (e) { console.error(e); }
        });
    }).on('error', (err) => console.error(err));

    if (!isListenersRegistered) {
        ipcMain.on('start-download', (event, url) => {
            if (!url) return;
            win.isDownloading = true;

            const updatePath = path.join(app.getPath('temp'), `AnkaUpdate.${process.platform === 'win32' ? 'exe' : 'deb'}`);
            if (fs.existsSync(updatePath)) fs.unlinkSync(updatePath);

            const file = fs.createWriteStream(updatePath);

            function downloadFile(downloadUrl) {
                https.get(downloadUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
                    if (response.statusCode >= 300 && response.headers.location) {
                        downloadFile(response.headers.location);
                        return;
                    }

                    const total = parseInt(response.headers['content-length'], 10) || 0;
                    let downloaded = 0;

                    response.on('data', (chunk) => {
                        downloaded += chunk.length;
                        file.write(chunk);
                        if (total > 0) {
                            event.sender.send('download-progress', Math.round((downloaded / total) * 100));
                        }
                    });

                    response.on('end', () => {
                        file.end();
                        event.sender.send('download-progress', 100);
                        
                        setTimeout(() => {
                            if (process.platform === 'win32') {
                                shell.openPath(updatePath).then(() => app.exit(0));
                            } else {
                                exec(`pkexec dpkg -i "${updatePath}"`, (err) => {
                                    if (!err) app.exit(0);
                                });
                            }
                        }, 3000);
                    });
                }).on('error', (err) => {
                    win.isDownloading = false;
                    event.sender.send('download-error', err.message);
                });
            }
            downloadFile(url);
        });

        ipcMain.on('hide-update-banner', () => { win.isDownloading = false; });
        isListenersRegistered = true;
    }
}

module.exports = { checkUpdates };