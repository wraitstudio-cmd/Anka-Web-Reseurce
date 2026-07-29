const AI_TAB_ID = 'tab-ai-assistant';
let activeTabId = null;
const MAX_TABS = 5;

const BLOCKED_DOMAINS = [
    'adult', 'porn', 'sex', 'casino', 'bet', 'gambling',
    'illegal', 'warez', 'hack', 'crack', 'torrents'
];

function sanitizeUrl(inputUrl) {
    let clean = inputUrl.trim();
    if (!clean) return 'https://www.google.com';
    
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        const isUrlPattern = /^([a-zA-Z0-9(-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(clean);
        if (isUrlPattern) {
            clean = 'https://' + clean;
        } else {
            clean = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
        }
    }

    try {
        const parsed = new URL(clean);
        const domain = parsed.hostname.toLowerCase();
        
        for (let b of BLOCKED_DOMAINS) {
            if (domain.includes(b)) {
                showNotification("⚠️ Bu site güvenlik politikaları gereği engellendi.");
                return 'https://www.google.com/search?q=Guvenli+Arama+Aktif';
            }
        }
    } catch (err) {
        return 'https://www.google.com';
    }

    return clean;
}

function applyMandatorySecurity(vw) {
    vw.addEventListener('did-navigate', (e) => {
        const url = e.url.toLowerCase();
        let newUrl = url;
        let shouldReload = false;

        try {
            const parsed = new URL(url);
            const domain = parsed.hostname;

            for (let b of BLOCKED_DOMAINS) {
                if (domain.includes(b)) {
                    showNotification("🚨 Zararlı veya yasaklı içerik engellendi!");
                    vw.loadURL('https://www.google.com');
                    return;
                }
            }

            if (domain.includes('google.com') && !url.includes('safe=active')) {
                newUrl = url.includes('?') ? url + '&safe=active' : url + '?safe=active';
                shouldReload = true;
            } else if (domain.includes('youtube.com')) {
                const hasSafety = url.includes('persist_safety_mode=1') && url.includes('safe=active');
                if (!hasSafety) {
                    newUrl = url.includes('?') ? url + '&persist_safety_mode=1&safe=active' : url + '?persist_safety_mode=1&safe=active';
                    shouldReload = true;
                }
            } else if (domain.includes('bing.com') && !url.includes('adlt=strict')) {
                newUrl = url.includes('?') ? url + '&adlt=strict' : url + '?adlt=strict';
                shouldReload = true;
            }
        } catch (err) {
            console.error('Güvenlik kontrolü hatası:', err);
        }

        if (shouldReload) vw.loadURL(newUrl);
    });
}

function getFaviconUrl(url) {
    try { 
        return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; 
    } catch (e) { 
        return 'assets/icons/logo.png'; 
    }
}

function createNewTab(url = 'https://www.google.com') {
    if (document.querySelectorAll('.tab').length >= MAX_TABS) {
        showNotification("🔒 Maksimum 5 sekme sınırına ulaşıldı.");
        return;
    }

    const secureUrl = sanitizeUrl(url);
    const id = 'tab-' + Date.now();
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = 'btn-' + id;
    tab.innerHTML = `
        <img src="${getFaviconUrl(secureUrl)}" class="tab-icon" alt="">
        <span class="tab-title">Yükleniyor...</span>
        <div class="tab-controls" style="display: flex; align-items: center; gap: 4px; margin-left: auto;">
            <div class="mute-tab" onclick="toggleMute('${id}', event)" title="Sesi Aç/Kapat" style="cursor: pointer; font-size: 13px; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">🔇</div>
            <div class="close-tab" onclick="closeTab('${id}', event)" title="Sekmeyi Kapat" style="cursor: pointer; font-size: 15px; padding: 2px 6px; background: rgba(255,71,87,0.2); color: #ff4757; border-radius: 4px;">✕</div>
        </div>
    `;
    tab.onclick = () => switchTab(id);
    document.getElementById('tab-bar').appendChild(tab);

    const vw = document.createElement('webview');
    vw.id = id;
    vw.src = secureUrl;
    vw.className = 'browser-view';
    vw.style.cssText = "display:none; width:100%; height:100%; flex:1;";
    document.getElementById('wv-container').appendChild(vw);

    applyMandatorySecurity(vw);

    vw.addEventListener('page-favicon-updated', (e) => {
        if (e.favicons && e.favicons.length > 0) {
            tab.querySelector('.tab-icon').src = e.favicons[0];
        }
    });

    vw.addEventListener('did-stop-loading', () => {
        try {
            const title = vw.getTitle() || "Yeni Sayfa";
            tab.querySelector('.tab-title').innerText = title.substring(0, 15) + (title.length > 15 ? '...' : '');
            if (id === activeTabId) {
                document.getElementById('url-input').value = vw.getURL();
            }
        } catch (err) {
            console.error(err);
        }
    });

    switchTab(id);
}

function toggleMute(id, e) {
    if (e) e.stopPropagation();
    const vw = document.getElementById(id);
    if (!vw) return;
    const isMuted = vw.isAudioMuted();
    vw.setAudioMuted(!isMuted);
    const btn = document.querySelector(`#btn-${id} .mute-tab`);
    if (btn) {
        btn.innerText = isMuted ? '🔇' : '🔊';
    }
}

function openAISession() {
    if (document.getElementById(AI_TAB_ID)) {
        switchTab(AI_TAB_ID);
        return;
    }

    const id = AI_TAB_ID;
    const tab = document.createElement('div');
    tab.className = 'tab ai-tab';
    tab.id = 'btn-' + id;
    tab.innerHTML = `
        <img src="https://chatgpt.com/favicon.ico" class="tab-icon" alt="">
        <span class="tab-title">ChatGPT Asistan</span>
        <div class="tab-controls" style="display: flex; align-items: center; gap: 4px; margin-left: auto;">
            <div class="mute-tab" onclick="toggleMute('${id}', event)" title="Sesi Aç/Kapat" style="cursor: pointer; font-size: 13px; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">🔇</div>
            <div class="close-tab" onclick="closeTab('${id}', event)" title="Sekmeyi Kapat" style="cursor: pointer; font-size: 15px; padding: 2px 6px; background: rgba(255,71,87,0.2); color: #ff4757; border-radius: 4px;">✕</div>
        </div>
    `;
    tab.onclick = () => switchTab(id);
    document.getElementById('tab-bar').appendChild(tab);

    const vw = document.createElement('webview');
    vw.id = id;
    vw.src = 'https://chatgpt.com';
    vw.className = 'browser-view';
    vw.style.cssText = "display:none; width:100%; height:100%; flex:1;";
    document.getElementById('wv-container').appendChild(vw);

    switchTab(id);
}

function switchTab(id) {
    activeTabId = id;
    document.querySelectorAll('webview').forEach(el => {
        const isActive = el.id === id;
        el.style.display = isActive ? 'flex' : 'none';
        el.classList.toggle('active', isActive);
    });
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.id === 'btn-' + id));
    
    const activeVw = document.getElementById(id);
    if (activeVw) {
        try {
            document.getElementById('url-input').value = activeVw.getURL();
        } catch (err) {
            console.error(err);
        }
    }
}

function closeTab(id, e) {
    if (e) e.stopPropagation();
    const tabBtn = document.getElementById('btn-' + id);
    const tabVw = document.getElementById(id);
    if (tabVw) tabVw.remove();
    if (tabBtn) tabBtn.remove();
    
    if (activeTabId === id) {
        const remaining = document.querySelectorAll('.tab');
        if (remaining.length > 0) {
            switchTab(remaining[remaining.length - 1].id.replace('btn-', ''));
        } else {
            createNewTab();
        }
    }
}

function showNotification(msg) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const note = document.createElement('div');
    note.style.cssText = "background: rgba(30,30,46,0.95); border: 1px solid rgba(137, 180, 250, 0.3); color: #cdd6f4; padding: 12px 24px; border-radius: 12px; margin-top: 10px; z-index: 9999; font-size: 13px; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 8px; animation: fadeIn 0.2s ease-in-out;";
    note.innerHTML = `🛡️ <span>${msg}</span>`;
    container.appendChild(note);
    setTimeout(() => {
        note.style.opacity = '0';
        note.style.transition = 'opacity 0.3s ease';
        setTimeout(() => note.remove(), 300);
    }, 2500);
}

function goBack() {
    const activeVw = document.getElementById(activeTabId);
    if (activeVw && typeof activeVw.canGoBack === 'function' && activeVw.canGoBack()) {
        activeVw.goBack();
    }
}

function goForward() {
    const activeVw = document.getElementById(activeTabId);
    if (activeVw && typeof activeVw.canGoForward === 'function' && activeVw.canGoForward()) {
        activeVw.goForward();
    }
}

function reloadPage() {
    const activeVw = document.getElementById(activeTabId);
    if (activeVw && typeof activeVw.reload === 'function') {
        activeVw.reload();
    }
}

document.getElementById('url-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const val = e.target.value.trim();
        const activeVw = document.getElementById(activeTabId);
        if (activeVw) {
            const finalUrl = sanitizeUrl(val);
            activeVw.loadURL(finalUrl);
        }
        e.target.blur();
    }
});