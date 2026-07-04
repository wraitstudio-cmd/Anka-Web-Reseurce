<<<<<<< HEAD
const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

const CURRENT_VERSION = "1.4.1";
const UPDATE_URL = "https://raw.githubusercontent.com/wraitstudio-cmd/Anka-Web/main/latest.yml";

let isListenersRegistered = false;

async function checkUpdates(win) {
    if (!win || win.isDestroyed()) return;

    win.on('close', (e) => {
        if (win.isDownloading) {
            e.preventDefault();
        } else {
            app.exit(0);
        }
    });

    https.get(`${UPDATE_URL}?t=${Date.now()}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
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
            } catch (e) {
                console.error(e);
            }
        });
    }).on('error', (err) => console.error(err));

    if (!isListenersRegistered) {
        ipcMain.on('start-download', (event, url) => {
            if (!url) {
                event.sender.send('download-error', 'URL bos olamaz.');
                return;
            }

            win.isDownloading = true;
            
            let fileExtension = 'exe';
            try {
                const urlPath = new URL(url).pathname;
                const detectedExt = path.extname(urlPath).replace('.', '');
                if (detectedExt && detectedExt.length <= 4) {
                    fileExtension = detectedExt;
                } else {
                    fileExtension = process.platform === 'win32' ? 'exe' : 'deb';
                }
            } catch (urlErr) {
                fileExtension = process.platform === 'win32' ? 'exe' : 'deb';
            }

            const updatePath = path.join(app.getPath('temp'), `AnkaUpdate.${fileExtension}`);
            
            if (fs.existsSync(updatePath)) {
                try {
                    fs.unlinkSync(updatePath);
                } catch (err) {
                    console.error(err);
                }
            }

            const file = fs.createWriteStream(updatePath, { highWaterMark: 1024 * 1024 });

            function downloadFile(downloadUrl) {
                const options = {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': '*/*',
                        'Connection': 'keep-alive'
                    }
                };

                https.get(downloadUrl, options, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        downloadFile(response.headers.location);
                        return;
                    }

                    if (response.statusCode !== 200) {
                        win.isDownloading = false;
                        file.end();
                        event.sender.send('download-error', `Sunucu hatasi: ${response.statusCode}`);
                        return;
                    }

                    const total = parseInt(response.headers['content-length'], 10) || 0;
                    let downloaded = 0;
                    let lastProgressTime = 0;

                    response.on('data', (chunk) => {
                        downloaded += chunk.length;
                        file.write(chunk);
                        
                        const now = Date.now();
                        if (now - lastProgressTime > 100) {
                            if (total > 0) {
                                event.sender.send('download-progress', Math.round((downloaded / total) * 100));
                            } else {
                                event.sender.send('download-progress', -1);
                            }
                            lastProgressTime = now;
                        }
                    });

                    response.on('end', () => {
                        file.end();
                        
                        if (total > 0 && downloaded !== total) {
                            win.isDownloading = false;
                            if (fs.existsSync(updatePath)) fs.unlinkSync(updatePath);
                            event.sender.send('download-error', 'Dosya eksik indirildi.');
                            return;
                        }

                        event.sender.send('download-progress', 100);
                        event.sender.send('download-complete', updatePath);
                        
                        const escapedPath = updatePath.replace(/"/g, '\\"');
                        const cmd = process.platform === 'win32'
                            ? `"${escapedPath}"`
                            : `pkexec dpkg -i "${escapedPath}"`;

                        exec(cmd, (err) => {
                            if (!err) {
                                setTimeout(() => { app.quit(); }, 500);
                            } else {
                                win.isDownloading = false;
                                event.sender.send('install-error', err.message);
                            }
                        });
                    });
                }).on('error', (err) => {
                    win.isDownloading = false;
                    file.end();
                    if (fs.existsSync(updatePath)) fs.unlinkSync(updatePath);
                    event.sender.send('download-error', err.message);
                });
            }

            downloadFile(url);
        });

        ipcMain.on('hide-update-banner', () => {
            win.isDownloading = false;
        });

        isListenersRegistered = true;
    }
}

ipcMain.on('close-app-for-update', () => {
    app.exit(0);
=======
const { ipcMain, net, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const CURRENT_VERSION = "2.3.0"; 

function checkUpdates(win) {
    const request = net.request('https://raw.githubusercontent.com/wraitstudio-cmd/Anka-Web/main/latest.yml');
    
    request.on('error', (err) => {
        console.error("Bağlantı hatası:", err.message);
    });

    request.on('response', (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
            try {
                const lines = data.split('\n').filter(line => line.trim() !== '');
                const latestVersion = lines[0].split(': ')[1].replace(/"/g, '').trim();
                const downloadUrl = lines[2].split(': ')[1].replace(/"/g, '').trim();

                if (latestVersion !== CURRENT_VERSION) {
                    win.webContents.send('update-available', { 
                        version: latestVersion, 
                        url: downloadUrl 
                    });
                }
            } catch (e) {
                console.error("YAML okuma hatası:", e);
            }
        });
    });
    request.end();
}

ipcMain.on('start-download', (event, url) => {
    const filePath = path.join(app.getPath('temp'), 'anka-setup.exe');
    
    if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
    }

    const file = fs.createWriteStream(filePath);
    const request = net.request(url);

    request.on('error', (err) => {
        event.sender.send('download-error', err.message);
    });

    request.on('response', (response) => {
        const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
        let downloadedBytes = 0;

        if (response.statusCode !== 200) {
            event.sender.send('download-error', `Sunucu hatası: ${response.statusCode}`);
            return;
        }

        response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            file.write(chunk);
            
            if (totalBytes > 0) {
                const progress = Math.round((downloadedBytes / totalBytes) * 100);
                event.sender.send('download-progress', progress);
            }
        });

        response.on('end', () => {
            file.end();
            event.sender.send('download-complete');
            
            setTimeout(() => {
                const installCmd = process.platform === 'win32' ? `"${filePath}" /S` : `open "${filePath}"`;
                
                exec(installCmd, (err) => {
                    if (!err) {
                        app.isQuitting = true;
                        setTimeout(() => app.quit(), 500);
                    } else {
                        event.sender.send('download-error', "Kurulum başlatılamadı.");
                    }
                });
            }, 1500);
        });
    });
    request.end();
>>>>>>> origin/main
});

module.exports = { checkUpdates };