const AI_TAB_ID = 'tab-ai-assistant';
let activeTabId = null;
let isSplitMode = false;
const MAX_TABS = 5;

function applyMandatorySecurity(vw) {
    vw.addEventListener('did-navigate', (e) => {
        const url = e.url.toLowerCase();
        let shouldReload = false;
        let newUrl = url;

        if (url.includes('google.com') && !url.includes('safe=active')) {
            newUrl = url.includes('?') ? url + '&safe=active' : url + '?safe=active';
            shouldReload = true;
        } else if (url.includes('youtube.com')) {
            if (!url.includes('persist_safety_mode=1')) {
                newUrl = url.includes('?') ? url + '&persist_safety_mode=1&safe=active' : url + '?persist_safety_mode=1&safe=active';
                shouldReload = true;
            }
        }
        if (shouldReload) vw.loadURL(newUrl);
    });
}

function createNewTab(url = 'https://www.google.com') {
    if (document.querySelectorAll('.tab').length >= MAX_TABS) return;
    const id = 'tab-' + Date.now();
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = 'btn-' + id;
    tab.innerHTML = `<span class="tab-title">Yükleniyor...</span><div class="mute-tab" onclick="toggleMute('${id}', event)">🔊</div><div class="close-tab" onclick="closeTab('${id}', event)">×</div>`;
    tab.onclick = () => switchTab(id);
    document.getElementById('tab-bar').appendChild(tab);

    const vw = document.createElement('webview');
    vw.id = id; vw.src = url; vw.className = 'browser-view';
    vw.style.cssText = "display:none; width:100%; height:100%; flex:1;";
    document.getElementById('wv-container').appendChild(vw);
    applyMandatorySecurity(vw);
    switchTab(id);
}

function switchTab(id) {
    if (isSplitMode) toggleSplitScreen();
    activeTabId = id;
    document.querySelectorAll('webview').forEach(el => {
        const isActive = el.id === id;
        el.style.display = isActive ? 'flex' : 'none';
        el.classList.toggle('active', isActive);
    });
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.id === 'btn-' + id));
}

function closeTab(id, e) {
    if (e) e.stopPropagation();
    document.getElementById('btn-' + id)?.remove();
    document.getElementById(id)?.remove();
    if (activeTabId === id) {
        const remaining = document.querySelectorAll('.tab');
        if (remaining.length > 0) switchTab(remaining[remaining.length - 1].id.replace('btn-', ''));
        else createNewTab();
    }
}

function toggleMute(id, e) {
    e.stopPropagation();
    const vw = document.getElementById(id);
    const muted = vw.isAudioMuted();
    vw.setAudioMuted(!muted);
    event.target.innerText = muted ? '🔊' : '🔇';
}

document.addEventListener('DOMContentLoaded', () => { createNewTab(); });