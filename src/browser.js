const AI_TAB_ID = 'tab-ai-assistant';
let activeTabId = null;
const MAX_TABS = 5;

function applyMandatorySecurity(vw) {
    vw.addEventListener('did-navigate', (e) => {
        const url = e.url.toLowerCase();
        let newUrl = url;
        let shouldReload = false;

        if (url.includes('google.com') && !url.includes('safe=active')) {
            newUrl = url.includes('?') ? url + '&safe=active' : url + '?safe=active';
            shouldReload = true;
        } else if (url.includes('youtube.com')) {
            const hasSafety = url.includes('persist_safety_mode=1') && url.includes('safe=active');
            if (!hasSafety) {
                newUrl = url.includes('?') ? url + '&persist_safety_mode=1&safe=active' : url + '?persist_safety_mode=1&safe=active';
                shouldReload = true;
            }
        } else if (url.includes('bing.com') && !url.includes('adlt=strict')) {
            newUrl = url.includes('?') ? url + '&adlt=strict' : url + '?adlt=strict';
            shouldReload = true;
        }

        if (shouldReload) vw.loadURL(newUrl);
    });
}

function getFaviconUrl(url) {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } 
    catch (e) { return 'assets/icons/logo.png'; }
}

function createNewTab(url = 'https://www.google.com') {
    if (document.querySelectorAll('.tab').length >= MAX_TABS) {
        showNotification("Maksimum 5 sekme sınırına ulaşıldı.");
        return;
    }

    const id = 'tab-' + Date.now();
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = 'btn-' + id;
    tab.innerHTML = `
        <img src="${getFaviconUrl(url)}" class="tab-icon">
        <span class="tab-title">Yükleniyor...</span>
        <div class="tab-controls" style="display: flex; align-items: center; gap: 4px; margin-left: auto;">
            <div class="mute-tab" onclick="toggleMute('${id}', event)" style="cursor: pointer; font-size: 14px; padding: 2px;">🔊</div>
            <div class="close-tab" onclick="closeTab('${id}', event)" style="cursor: pointer; font-size: 16px; padding: 2px;">×</div>
        </div>    `;
    tab.onclick = () => switchTab(id);
    document.getElementById('tab-bar').appendChild(tab);

    const vw = document.createElement('webview');
    vw.id = id;
    vw.src = url;
    vw.className = 'browser-view';
    vw.style.cssText = "display:none; width:100%; height:100%; flex:1;";
    document.getElementById('wv-container').appendChild(vw);

    applyMandatorySecurity(vw);

    vw.addEventListener('page-favicon-updated', (e) => {
        if (e.favicons && e.favicons.length > 0) tab.querySelector('.tab-icon').src = e.favicons[0];
    });

    vw.addEventListener('did-stop-loading', () => {
        const title = vw.getTitle() || "Yeni Sayfa";
        tab.querySelector('.tab-title').innerText = title.substring(0, 15) + (title.length > 15 ? '...' : '');
        if (id === activeTabId) document.getElementById('url-input').value = vw.getURL();    });

    switchTab(id);
}

function toggleMute(id, e) {
    if (e) e.stopPropagation();
    const vw = document.getElementById(id);
    if (!vw) return;
    const isMuted = vw.isAudioMuted();
    vw.setAudioMuted(!isMuted);
    const btn = document.querySelector(`#btn-${id} .mute-tab`);
    btn.innerText = isMuted ? '🔊' : '🔇';
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
        <img src="https://chatgpt.com/favicon.ico" class="tab-icon">
        <span class="tab-title">ChatGPT</span>
        <div class="tab-controls">
            <div class="mute-tab" onclick="toggleMute('${id}', event)">🔊</div>
            <div class="close-tab" onclick="closeTab('${id}', event)">×</div>
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
    if (activeVw) document.getElementById('url-input').value = activeVw.getURL();
}

function closeTab(id, e) {
    if (e) e.stopPropagation();
    const tabBtn = document.getElementById('btn-' + id);
    const tabVw = document.getElementById(id);
    if (tabVw) tabVw.remove();
    if (tabBtn) tabBtn.remove();
    if (activeTabId === id) {
        const remaining = document.querySelectorAll('.tab');
        if (remaining.length > 0) switchTab(remaining[remaining.length - 1].id.replace('btn-', ''));
        else createNewTab();
    }
}

function showNotification(msg) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const note = document.createElement('div');
    note.style.cssText = "background:rgba(255,71,87,0.9); color:white; padding:10px 20px; border-radius:20px; margin-top:10px; z-index:9999; font-size:12px;";
    note.innerText = msg;
    container.appendChild(note);
    setTimeout(() => note.remove(), 2000);
}

document.getElementById('url-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const val = e.target.value.trim();
        const activeVw = document.getElementById(activeTabId);
        if (activeVw) {
            const isUrl = val.includes('.') && !val.includes(' ');
            let finalUrl = val;

            if (!val.startsWith('http://') && !val.startsWith('https://')) {
                finalUrl = isUrl ? `https://${val}` : `https://www.google.com/search?q=${encodeURIComponent(val)}`;
            }

            activeVw.loadURL(finalUrl);
        }
        e.target.blur();    }
});
