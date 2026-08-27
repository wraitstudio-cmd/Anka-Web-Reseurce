// src/downloads-manager.js

const popupStyle = `
#downloads-popup {
    position: absolute;
    width: 390px;
    max-height: 490px;
    background: var(--bg-secondary, #18181b);
    color: var(--text-color, #f4f4f5);
    border: 1px solid var(--border-color, #27272a);
    border-radius: 12px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.5);
    z-index: 100000;
    display: none;
    flex-direction: column;
    font-family: 'Segoe UI', system-ui, sans-serif;
    overflow: hidden;
    box-sizing: border-box;
}
#downloads-popup * { box-sizing: border-box; }
.dl-popup-header {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-color, #27272a);
    font-weight: 600;
    font-size: 14px;
    background: var(--bg-primary, #121214);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.dl-clear-all {
    font-size: 11px;
    color: var(--text-secondary, #a1a1aa);
    cursor: pointer;
    font-weight: 500;
}
.dl-clear-all:hover { color: var(--accent, #ff4757); }
.dl-popup-body {
    overflow-y: auto;
    flex-grow: 1;
    padding: 4px 0;
    background: var(--bg-secondary, #18181b);
}
.dl-popup-item {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-color, #27272a);
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: background 0.2s;
}
.dl-popup-item:hover { background: var(--bg-primary, #121214); }
.dl-popup-item:last-child { border-bottom: none; }
.dl-file-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-color, #f4f4f5);
    cursor: pointer;
    word-break: break-all;
}
.dl-file-title:hover { color: var(--accent, #ff4757); }
.dl-file-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.dl-file-info { font-size: 11px; color: var(--text-secondary, #a1a1aa); line-height: 1.4; }
.dl-file-info.error-text { color: #f28b82; font-weight: 500; }
.dl-btn-group { display: flex; gap: 6px; }
.dl-popup-btn {
    background: var(--bg-tertiary, #27272a);
    border: 1px solid var(--border-color, #3f3f46);
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-color, #f4f4f5);
    font-weight: 600;
    transition: background 0.2s;
}
.dl-popup-btn:hover { background: var(--border-color, #3f3f46); }
.dl-popup-btn.cancel { color: #ffffff; background: var(--accent, #ff4757); border-color: transparent; }
.dl-popup-btn.cancel:hover { opacity: 0.9; }
.dl-progress-bg { background: var(--bg-tertiary, #3f3f46); border-radius: 4px; height: 5px; width: 100%; margin-top: 4px; overflow: hidden; display: none; }
.dl-progress-fill { background: var(--accent, #ff4757); height: 100%; width: 0%; transition: width 0.15s; }
.dl-progress-fill.interrupted { background: #ff9800; }
.dl-empty { padding: 40px 20px; text-align: center; color: var(--text-secondary, #a1a1aa); font-size: 13px; }
`;

function updatePopupPosition() {
    const popup = document.getElementById('downloads-popup');
    const btn = document.getElementById('downloads-btn');
    if (!popup || !btn || popup.style.display !== 'flex') return;

    const rect = btn.getBoundingClientRect();
    popup.style.top = (rect.bottom + 8) + 'px';
    popup.style.left = (rect.right - 390) + 'px'; 
}

function injectDownloadsPopup() {
    if (document.getElementById('downloads-popup')) return;

    const styleTag = document.createElement('style');
    styleTag.textContent = popupStyle;
    document.head.appendChild(styleTag);

    const popupDiv = document.createElement('div');
    popupDiv.id = 'downloads-popup';
    popupDiv.innerHTML = `
        <div class="dl-popup-header">
            <span>📥 İndirilenler</span>
            <span class="dl-clear-all" onclick="clearDownloadList()">Geçmişi Temizle</span>
        </div>
        <div class="dl-popup-body" id="dl-popup-list"></div>
    `;
    document.body.appendChild(popupDiv);

    document.addEventListener('click', (e) => {
        const popup = document.getElementById('downloads-popup');
        const btn = document.getElementById('downloads-btn');
        if (popup && popup.style.display === 'flex' && !popup.contains(e.target) && !btn.contains(e.target)) {
            popup.style.display = 'none';
        }
    });

    window.addEventListener('resize', updatePopupPosition);

    window.addEventListener('online', async () => {
        const { ipcRenderer } = require('electron');
        const list = await ipcRenderer.invoke('get-downloads-list');
        list.forEach(item => {
            if (item.state === 'interrupted' || item.state === 'interrupted-error') {
                ipcRenderer.send('resume-download', item.id);
            }
        });
        setTimeout(renderPopupItems, 500);
    });

    setupIpcListeners();
}

async function openDownloadsPage() {
    const popup = document.getElementById('downloads-popup');
    if (!popup) return;

    if (popup.style.display === 'flex') {
        popup.style.display = 'none';
    } else {
        popup.style.display = 'flex';
        updatePopupPosition();
        await renderPopupItems();
        updatePopupPosition();
    }
}

function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function renderPopupItems() {
    const { ipcRenderer } = require('electron');
    const listContainer = document.getElementById('dl-popup-list');
    if (!listContainer) return;

    const list = await ipcRenderer.invoke('get-downloads-list');

    if (!list || list.length === 0) {
        listContainer.innerHTML = '<div class="dl-empty">Henüz bir indirme yok.</div>';
        return;
    }

    listContainer.innerHTML = '';
    list.reverse().forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dl-popup-item';
        itemDiv.id = 'pdl-' + item.id;

        let metaText = '';
        let isProgressing = item.state === 'progressing';
        let isInterrupted = item.state === 'interrupted' || item.state === 'interrupted-error';
        let isError = item.state === 'interrupted' && !navigator.onLine;
        
        const percent = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0;
        const currentSize = formatBytes(item.receivedBytes);
        const totalSize = item.totalBytes > 0 ? formatBytes(item.totalBytes) : 'Bilinmeyen boyut';

        let infoClass = 'dl-file-info';

        if (isProgressing) {
            metaText = percent + '% • ' + currentSize + ' / ' + totalSize;
            if (item.isPaused) metaText += ' (Duraklatıldı)';
        } else if (item.state === 'completed') {
            metaText = 'Tamamlandı • ' + formatBytes(item.totalBytes || item.receivedBytes);
        } else if (isInterrupted) {
            infoClass = 'dl-file-info error-text';
            metaText = isError ? 'Bağlantı Kesildi! İnternet bekleniyor...' : 'Hata oluştu! İndirme yarıda kaldı.';
        } else {
            metaText = 'İptal Edildi';
        }

        const safePath = item.savePath ? item.savePath.replace(/\\/g, '\\\\') : '';

        let actionButtons = '';
        if (isProgressing) {
            if (item.isPaused) {
                actionButtons = '<button class="dl-popup-btn" onclick="const {ipcRenderer}=require(\'electron\'); ipcRenderer.send(\'resume-download\', \'' + item.id + '\'); setTimeout(renderPopupItems, 200);">Devam Et</button>';
            } else {
                actionButtons = '<button class="dl-popup-btn" onclick="const {ipcRenderer}=require(\'electron\'); ipcRenderer.send(\'pause-download\', \'' + item.id + '\'); setTimeout(renderPopupItems, 200);">Duraklat</button>';
            }
            actionButtons += '<button class="dl-popup-btn cancel" onclick="const {ipcRenderer}=require(\'electron\'); ipcRenderer.send(\'cancel-download\', \'' + item.id + '\');">İptal</button>';
        } else if (isInterrupted || item.state === 'cancelled') {
            actionButtons = '<button class="dl-popup-btn" onclick="const {ipcRenderer}=require(\'electron\'); ipcRenderer.send(\'restart-download\', \'' + item.id + '\'); setTimeout(renderPopupItems, 300);">Yeniden Başlat</button>';
        } else {
            actionButtons = '<button class="dl-popup-btn" onclick="const {ipcRenderer}=require(\'electron\'); ipcRenderer.send(\'show-download-in-folder\', \'' + safePath + '\')">Klasörde Göster</button>';
        }

        itemDiv.innerHTML = '<div class="dl-file-title" onclick="const {ipcRenderer}=require(\'electron\'); ipcRenderer.send(\'open-download-item\', \'' + safePath + '\')">' + item.fileName + '</div>' +
            '<div class="dl-file-row">' +
                '<div class="' + infoClass + '" id="pmeta-' + item.id + '">' + metaText + '</div>' +
                '<div class="dl-btn-group" id="paction-' + item.id + '">' + actionButtons + '</div>' +
            '</div>' +
            '<div class="dl-progress-bg" id="pprog-container-' + item.id + '" style="display: ' + ((isProgressing || isInterrupted) ? 'block' : 'none') + '">' +
                '<div class="dl-progress-fill ' + (isInterrupted ? 'interrupted' : '') + '" id="pbar-' + item.id + '" style="width: ' + percent + '%"></div>' +
            '</div>';
            
        listContainer.appendChild(itemDiv);
    });
}

function clearDownloadList() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('clear-download-history');
    setTimeout(renderPopupItems, 200);
}

function setupIpcListeners() {
    const { ipcRenderer } = require('electron');

    ipcRenderer.on('download-progress', (e, data) => {
        const container = document.getElementById('pprog-container-' + data.id);
const bar = document.getElementById('pbar-' + data.id);const meta = document.getElementById('pmeta-' + data.id);if (bar && meta) {const percent = data.totalBytes > 0 ? Math.round((data.receivedBytes / data.totalBytes) * 100) : 0;const currentSize = formatBytes(data.receivedBytes);const totalSize = data.totalBytes > 0 ? formatBytes(data.totalBytes) : '...';let statusString = '';if (data.state === 'interrupted') {meta.parentElement.firstElementChild.className = 'dl-file-info error-text';statusString = !navigator.onLine ? 'Bağlantı Kesildi! İnternet bekleniyor...' : 'Hata oluştu! İndirme yarıda kaldı.';bar.className = 'dl-progress-fill interrupted';} else {meta.parentElement.firstElementChild.className = 'dl-file-info';statusString = percent + '% • ' + currentSize + ' / ' + totalSize;if (data.isPaused) statusString += ' (Duraklatıldı)';bar.className = 'dl-progress-fill';}meta.innerText = statusString;if (container) container.style.display = 'block';bar.style.width = percent + '%';}});ipcRenderer.on('download-done', () => {const popup = document.getElementById('downloads-popup');if (popup && popup.style.display === 'flex') {renderPopupItems();}});}document.addEventListener('DOMContentLoaded', injectDownloadsPopup);