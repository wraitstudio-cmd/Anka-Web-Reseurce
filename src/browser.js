const AI_TAB_ID = 'tab-ai-assistant';
let activeTabId = null;

const BLOCKED_DOMAINS = [
    'adult', 'porn', 'sex', 'porno', 'xxx', 'nsfw',
    'casino', 'bet', 'bahis', 'gambling', 'slot',
    'illegal', 'warez', 'hack', 'crack', 'torrents'
];

function getSetting(id, def) {
    const v = localStorage.getItem('set_' + id);
    return v === null ? def : v;
}

function getMaxTabs() {
    const n = parseInt(getSetting('max-tabs', '10'), 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
}

const ENGINES = {
    google:     { name: 'Google',    tpl: 'https://www.google.com/search?q=%s&safe=active' },
    yandex:     { name: 'Yandex',    tpl: 'https://yandex.com.tr/search/?text=%s' },
    bing:       { name: 'Bing',      tpl: 'https://www.bing.com/search?q=%s&adlt=strict' },
    duckduckgo: { name: 'DuckDuckGo', tpl: 'https://duckduckgo.com/?q=%s&kp=1' }
};

const AI_PROVIDERS = {
    'google-ai': { home: 'https://www.google.com/?udm=50&safe=active',   tpl: 'https://www.google.com/search?q=%s&udm=50&safe=active' },
    chatgpt:     { home: 'https://chatgpt.com',                         tpl: 'https://chatgpt.com/?q=%s' },
    gemini:      { home: 'https://gemini.google.com/app',               tpl: 'https://gemini.google.com/app' },
    perplexity:  { home: 'https://www.perplexity.ai',                   tpl: 'https://www.perplexity.ai/search?q=%s' }
};

function isAiModeActive() {
    return localStorage.getItem('ai-mode-active') === 'true';
}

function setAiMode(active) {
    localStorage.setItem('ai-mode-active', active ? 'true' : 'false');
    const btn = document.getElementById('ai-mode-btn');
    if (btn) btn.classList.toggle('active', active);
}

function toggleAiMode() {
    setAiMode(!isAiModeActive());
}

function buildSearchUrl(query) {
    if (isAiModeActive()) {
        const provId = getSetting('ai-provider', 'google-ai');
        const prov = AI_PROVIDERS[provId] || AI_PROVIDERS['google-ai'];
        return prov.tpl.replace('%s', encodeURIComponent(query));
    }
    const engineId = getSetting('search-engine', 'google');
    if (engineId === 'custom') {
        const custom = getSetting('custom-search-url', 'https://www.google.com/search?q=%s&safe=active');
        return custom.includes('%s') ? custom.replace('%s', encodeURIComponent(query)) : custom + encodeURIComponent(query);
    }
    const engine = ENGINES[engineId] || ENGINES.google;
    return engine.tpl.replace('%s', encodeURIComponent(query));
}

function sanitizeUrl(inputUrl) {
    let clean = inputUrl.trim();
    if (!clean) return 'newtab.html';

    if (clean === 'newtab.html' || clean === 'about:blank' || clean.startsWith('file:///')) {
        return clean;
    }

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        const isUrlPattern = /^([a-zA-Z0-9(-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(clean);
        if (isUrlPattern) {
            clean = 'https://' + clean;
        } else {
            clean = buildSearchUrl(clean);
        }
    }

    try {
        const parsed = new URL(clean);
        const domain = parsed.hostname.toLowerCase();
        const fullUrl = clean.toLowerCase();

        for (let b of BLOCKED_DOMAINS) {
            if (domain.includes(b) || fullUrl.includes('/' + b)) {
                showNotification("Bu site guvenlik politikalari geregi engellendi.");
                return 'about:blank';
            }
        }

        if (domain.includes('accounts.google.com')) {
            clean = 'https://accounts.google.com/signup';
        }
    } catch (err) {
        return 'newtab.html';
    }

    return clean;
}

function applyMandatorySecurity(vw) {
    if (!vw) return;

    if (typeof vw.addEventListener === 'function') {
        vw.addEventListener('did-navigate', (e) => {
            if (e && e.url) {
                checkUrlSecurity(e.url, vw);
                if (e.url.includes('accounts.google.com') && e.url.includes('error')) {
                    vw.loadURL('https://accounts.google.com/signup');
                }
            }
        });

        vw.addEventListener('did-navigate-in-page', (e) => {
            if (e && e.url) checkUrlSecurity(e.url, vw);
        });

        vw.addEventListener('dom-ready', () => {
            try {
                if (typeof vw.getURL === 'function') {
                    checkUrlSecurity(vw.getURL(), vw);
                }
                injectForcedRestrictions(vw);
            } catch (err) {}
        });
    }
}

function checkUrlSecurity(url, vw) {
    if (!url || !vw || typeof vw.loadURL !== 'function') return;

    try {
        const parsed = new URL(url);
        const domain = parsed.hostname.toLowerCase();
        const fullUrl = url.toLowerCase();

        for (let b of BLOCKED_DOMAINS) {
            if (domain.includes(b) || fullUrl.includes('/' + b)) {
                vw.loadURL('about:blank');
                showNotification("Bu içerik güvenlik politikası gereği engellenmiştir.");
                return;
            }
        }

        if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
            forceYouTubeRestrictedMode(vw);
        }
    } catch (err) {}
}

function forceYouTubeRestrictedMode(vw) {
    if (!vw || typeof vw.executeJavaScript !== 'function') return;

    try {
        vw.executeJavaScript(`
            try {
                if (window.location.hostname.includes('youtube.com')) {
                    const originalSetItem = localStorage.setItem;
                    localStorage.setItem = function(key, val) {
                        if (key === 'yt-player-restricted' || key.includes('restricted')) {
                            val = 'true';
                        }
                        return originalSetItem.apply(this, arguments);
                    };
                    
                    function enforceRestrict() {
                        let cookies = document.cookie.split(';');
                        let prefFound = false;
                        for (let c of cookies) {
                            let trimmed = c.trim();
                            if (trimmed.startsWith('PREF=')) {
                                prefFound = true;
                                if (!trimmed.includes('f2=8000000')) {
                                    document.cookie = trimmed + '&f2=8000000; path=/; domain=.youtube.com; secure';
                                }
                            }
                        }
                        if (!prefFound) {
                            document.cookie = 'PREF=f2=8000000; path=/; domain=.youtube.com; secure';
                        }
                    }
                    enforceRestrict();
                    setInterval(enforceRestrict, 1000);
                }
            } catch(e) {}
        `).catch(() => {});
    } catch (e) {}
}

function injectForcedRestrictions(vw) {
    if (!vw || typeof vw.executeJavaScript !== 'function') return;

    try {
        vw.executeJavaScript(`
            try {
                const currentHost = window.location.hostname;
                
                if (currentHost.includes('google.com')) {
                    if (!window.location.search.includes('safe=active')) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('safe', 'active');
                        if (url.href !== window.location.href) {
                            window.location.replace(url.href);
                        }
                    }
                }

                if (currentHost.includes('bing.com')) {
                    if (!window.location.search.includes('adlt=strict')) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('adlt', 'strict');
                        if (url.href !== window.location.href) {
                            window.location.replace(url.href);
                        }
                    }
                }

                if (window.location.href.includes('accounts.google.com') && document.body.innerText.includes('404')) {
                    window.location.href = 'https://accounts.google.com/signup';
                }
            } catch(e) {}
        `).catch(() => {});
    } catch (e) {}
}

function lockSettingsPermanently() {
    try {
        localStorage.setItem('set_search-engine', 'google');
        localStorage.setItem('ai-mode-active', 'false');
    } catch (e) {}
}

setInterval(lockSettingsPermanently, 1000);

function getFaviconUrl(url) {
    try {
        if (url.includes('newtab.html') || url.startsWith('file:///')) {
            return 'assets/icons/logo.png';
        }
        return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
    } catch (e) {
        return 'assets/icons/logo.png';
    }
}

(function injectContextMenuStyles() {
    if (document.getElementById('ctx-menu-styles')) return;
    const style = document.createElement('style');
    style.id = 'ctx-menu-styles';
    style.textContent = `
        #custom-context-menu { position:fixed; background:#1c1c20; border:1px solid #2c2c31; border-radius:10px;
            padding:6px; min-width:210px; z-index:2000000; box-shadow:0 12px 40px rgba(0,0,0,.55);
            font-family:'Segoe UI',system-ui,sans-serif; }
        .ctx-item { padding:9px 14px; font-size:13px; color:#e4e4e7; border-radius:6px; cursor:pointer; white-space:nowrap; }
        .ctx-item:hover { background:#2a2a2f; }
        .ctx-item.disabled { color:#52525b; cursor:default; }
        .ctx-item.disabled:hover { background:transparent; }
        .ctx-sep { height:1px; background:#2c2c31; margin:5px 6px; }
    `;
    document.head.appendChild(style);
})();

function closeContextMenu() {
    document.getElementById('custom-context-menu')?.remove();
}

function showContextMenu(x, y, items) {
    closeContextMenu();
    const menu = document.createElement('div');
    menu.id = 'custom-context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    items.forEach(it => {
        if (it === '---') {
            const sep = document.createElement('div');
            sep.className = 'ctx-sep';
            menu.appendChild(sep);
            return;
        }
        const row = document.createElement('div');
        row.className = 'ctx-item' + (it.disabled ? ' disabled' : '');
        row.textContent = it.label;
        if (!it.disabled) {
            row.onclick = () => { closeContextMenu(); it.action && it.action(); };
        }
        menu.appendChild(row);
    });

    document.body.appendChild(menu);
    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = Math.max(8, window.innerWidth - rect.width - 8) + 'px';
        if (rect.bottom > window.innerHeight) menu.style.top = Math.max(8, window.innerHeight - rect.height - 8) + 'px';
    });
}

window.addEventListener('click', (e) => {
    if (!e.target.closest('#custom-context-menu')) {
        closeContextMenu();
    }
});

window.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('webview') && !e.target.closest('.tab') && !e.target.closest('#custom-context-menu')) {
        closeContextMenu();
    }
});

window.addEventListener('blur', closeContextMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeContextMenu(); });

function attachWebviewContextMenu(vw) {
    if (!vw || typeof vw.addEventListener !== 'function') return;

    vw.addEventListener('context-menu', (e, paramsArg) => {
        const p = paramsArg || e.params || {};
        const x = (typeof p.x === 'number') ? p.x : (e.clientX || 100);
        const y = (typeof p.y === 'number') ? p.y : (e.clientY || 100);

        const items = [];
        items.push({ label: 'Geri', action: () => vw.canGoBack() && vw.goBack(), disabled: !(vw.canGoBack && vw.canGoBack()) });
        items.push({ label: 'İleri', action: () => vw.canGoForward() && vw.goForward(), disabled: !(vw.canGoForward && vw.canGoForward()) });
        items.push({ label: 'Yenile', action: () => vw.reload() });
        items.push('---');

        if (p.linkURL) {
            items.push({ label: 'Bağlantıyı yeni sekmede aç', action: () => createNewTab(p.linkURL) });
            items.push({ label: 'Bağlantı adresini kopyala', action: () => navigator.clipboard.writeText(p.linkURL).catch(() => {}) });
            items.push({ label: 'Bağlantıyı gizli sekmede aç', action: () => createIncognitoTab(p.linkURL) });
        }
        if (p.selectionText) {
            items.push({ label: 'Kopyala', action: () => vw.copy() });
            items.push({ label: 'Seçiliyi arayın', action: () => createNewTab(buildSearchUrl(p.selectionText)) });
            items.push({ label: 'Seçili metni panoya ekle ve kaydet', action: () => saveSelectedTextToStorage(p.selectionText) });
        }
        if (p.isEditable) {
            items.push({ label: 'Kes', action: () => vw.cut() });
            items.push({ label: 'Yapıştır', action: () => vw.paste() });
            items.push({ label: 'Tümünü Seç', action: () => vw.selectAll() });
        }
        if (p.hasImageContents && p.srcURL) {
            items.push('---');
            items.push({ label: 'Resmi yeni sekmede aç', action: () => createNewTab(p.srcURL) });
            items.push({ label: 'Resim adresini kopyala', action: () => navigator.clipboard.writeText(p.srcURL).catch(() => {}) });
        }
        items.push('---');
        items.push({ label: 'Sayfayı Kaydet', action: () => saveCurrentPage(vw) });
        items.push({ label: 'Geliştirici Araçları', action: () => { if(vw.isDevToolsOpened && !vw.isDevToolsOpened()) vw.openDevTools(); } });

        showContextMenu(x, y, items);
    });
}

document.getElementById('tab-bar')?.addEventListener('contextmenu', (e) => {
    const tabEl = e.target.closest('.tab');
    if (!tabEl) return;
    e.preventDefault();
    const id = tabEl.id.replace('btn-', '');
    const vw = document.getElementById(id);

    const items = [
        { label: 'Sekmeyi Yenile', action: () => vw && vw.reload() },
        { label: 'Sekmeyi Çoğalt', action: () => vw && createNewTab(vw.getURL()) },
        { label: (vw && vw.isAudioMuted && vw.isAudioMuted()) ? 'Sesi Aç' : 'Sesi Kapat', action: () => toggleMute(id) },
        '---',
        { label: 'Sabitle / Sabiti Kaldır', action: () => togglePinTab(id) },
        { label: 'Sekmeyi Kapat', action: () => closeTab(id, { stopPropagation() {} }) },
        { label: 'Diğer Sekmeleri Kapat', action: () => closeOtherTabs(id) },
        { label: 'Sağdaki Sekmeleri Kapat', action: () => closeTabsToRight(id) }
    ];
    showContextMenu(e.clientX, e.clientY, items);
});

function closeOtherTabs(keepId) {
    document.querySelectorAll('.tab').forEach(t => {
        const tid = t.id.replace('btn-', '');
        if (tid !== keepId) closeTab(tid, { stopPropagation() {} });
    });
}

function closeTabsToRight(targetId) {
    let found = false;
    document.querySelectorAll('.tab').forEach(t => {
        const tid = t.id.replace('btn-', '');
        if (tid === targetId) {
            found = true;
            return;
        }
        if (found) {
            closeTab(tid, { stopPropagation() {} });
        }
    });
}

function togglePinTab(id) {
    const tab = document.getElementById('btn-' + id);
    if (!tab) return;
    const isPinned = tab.classList.toggle('pinned');
    if (isPinned) {
        tab.style.maxWidth = '44px';
        tab.querySelector('.tab-title').style.display = 'none';
    } else {
        tab.style.maxWidth = '';
        tab.querySelector('.tab-title').style.display = '';
    }
}

function saveSelectedTextToStorage(txt) {
    try {
        let history = JSON.parse(localStorage.getItem('anka_saved_snippets') || '[]');
        history.push({ text: txt, date: new Date().toISOString() });
        localStorage.setItem('anka_saved_snippets', JSON.stringify(history));
        showNotification("Metin başarıyla kaydedildi.");
    } catch(e) {
        showNotification("Kaydetme başarısız.");
    }
}

function saveCurrentPage(vw) {
    try {
        if (vw && typeof vw.savePage === 'function') {
            vw.savePage(null, 'HTMLOnly', (error) => {
                if (!error) showNotification("Sayfa başarıyla kaydedildi.");
                else showNotification("Sayfa kaydedilemedi.");
            });
        }
    } catch(e) {
        showNotification("Desteklenmeyen işlem.");
    }
}

function createNewTab(url = 'newtab.html') {
    if (document.querySelectorAll('.tab').length >= getMaxTabs()) {
        showNotification(`Maksimum ${getMaxTabs()} sekme sınırına ulaşıldı.`);
        return;
    }

    const isDefaultNewTab = (!url || url === 'newtab.html' || url === 'about:blank' || url.startsWith('file:///'));
    const secureUrl = isDefaultNewTab ? 'newtab.html' : sanitizeUrl(url);
    const id = 'tab-' + Date.now();
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = 'btn-' + id;
    tab.innerHTML = `
        <img src="${!isDefaultNewTab && secureUrl.startsWith('http') ? getFaviconUrl(secureUrl) : 'assets/icons/logo.png'}" class="tab-icon" alt="">
        <span class="tab-title">${isDefaultNewTab ? 'Yeni Sekme' : 'Yükleniyor...'}</span>
        <div class="tab-controls" style="display: flex; align-items: center; gap: 4px; margin-left: auto;">
            <div class="mute-tab" onclick="toggleMute('${id}', event)" title="Sesi Aç/Kapat" style="cursor: pointer; font-size: 13px; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">Sessiz</div>
            <div class="close-tab" onclick="closeTab('${id}', event)" title="Sekmeyi Kapat" style="cursor: pointer; display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; background: rgba(255,71,87,0.2); color: #ff4757; border-radius: 4px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
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
    attachWebviewContextMenu(vw);

    vw.addEventListener('page-favicon-updated', (e) => {
        if (e.favicons && e.favicons.length > 0) {
            const iconEl = tab.querySelector('.tab-icon');
            if (iconEl) iconEl.src = e.favicons[0];
        }
    });

    vw.addEventListener('did-fail-load', (e) => {
        if (e.errorCode === -3) return;
        if (typeof showToast === 'function') showToast('Sayfa yüklenemedi: ' + (e.errorDescription || e.errorCode), 'error');
    });

    vw.addEventListener('did-stop-loading', () => {
        try {
            const currentUrl = vw.getURL();
            const title = vw.getTitle() || "Yeni Sayfa";
            const titleEl = tab.querySelector('.tab-title');
            if (titleEl) titleEl.innerText = (currentUrl.includes('newtab.html') || currentUrl.startsWith('file:///')) ? 'Yeni Sekme' : (title.substring(0, 15) + (title.length > 15 ? '...' : ''));
            if (id === activeTabId) {
                document.getElementById('url-input').value = (currentUrl.includes('newtab.html') || currentUrl.startsWith('file:///')) ? '' : currentUrl;
            }
        } catch (err) {}
    });

    switchTab(id);
    return id;
}

function createIncognitoTab(url = 'newtab.html') {
    const id = createNewTab(url);
    const tab = document.getElementById('btn-' + id);
    if (tab) {
        tab.classList.add('incognito');
        tab.style.borderColor = '#7c3aed';
    }
    return id;
}

function toggleMute(id, e) {
    if (e) e.stopPropagation();
    const vw = document.getElementById(id);
    if (!vw) return;
    const isMuted = vw.isAudioMuted();
    vw.setAudioMuted(!isMuted);
    const btn = document.querySelector(`#btn-${id} .mute-tab`);
    if (btn) {
        btn.innerText = isMuted ? 'Sesli' : 'Sessiz';
    }
}

function openAISession() {
    if (document.getElementById(AI_TAB_ID)) {
        switchTab(AI_TAB_ID);
        return;
    }

    const provId = getSetting('ai-provider', 'google-ai');
    const prov = AI_PROVIDERS[provId] || AI_PROVIDERS['google-ai'];
    const providerNames = { 'google-ai': 'Google AI Modu', chatgpt: 'ChatGPT Asistan', gemini: 'Gemini Asistan', perplexity: 'Perplexity Asistan' };

    const id = AI_TAB_ID;
    const tab = document.createElement('div');
    tab.className = 'tab ai-tab';
    tab.id = 'btn-' + id;
    tab.innerHTML = `
        <img src="${getFaviconUrl(prov.home)}" class="tab-icon" alt="">
        <span class="tab-title">${providerNames[provId] || 'AI Asistan'}</span>
        <div class="tab-controls" style="display: flex; align-items: center; gap: 4px; margin-left: auto;">
            <div class="close-tab" onclick="closeTab('${id}', event)" title="Sekmeyi Kapat" style="cursor: pointer; display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; background: rgba(255,71,87,0.2); color: #ff4757; border-radius: 4px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        </div>
    `;
    tab.onclick = () => switchTab(id);
    document.getElementById('tab-bar').appendChild(tab);

    const vw = document.createElement('webview');
    vw.id = id;
    vw.src = prov.home;
    vw.className = 'browser-view';
    vw.style.cssText = "display:none; width:100%; height:100%; flex:1;";
    document.getElementById('wv-container').appendChild(vw);

    applyMandatorySecurity(vw);
    attachWebviewContextMenu(vw);
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
            const currentUrl = activeVw.getURL();
            document.getElementById('url-input').value = (currentUrl.includes('newtab.html') || currentUrl.startsWith('file:///')) ? '' : currentUrl;
        } catch (err) {}
    }
    const dropdown = document.getElementById('tab-dropdown-menu');
    if (dropdown) dropdown.style.display = 'none';
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
            createNewTab(typeof getHomeUrl === 'function' ? getHomeUrl() : 'newtab.html');
        }
    }
}

function showNotification(msg) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const note = document.createElement('div');
    note.style.cssText = "background: rgba(30,30,46,0.95); border: 1px solid rgba(137, 180, 250, 0.3); color: #cdd6f4; padding: 12px 24px; border-radius: 12px; margin-top: 10px; z-index: 9999; font-size: 13px; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 8px;";
    note.innerHTML = `<span>${msg}</span>`;
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

function reloadTab() {
    reloadPage();
}

document.getElementById('url-input')?.addEventListener('keypress', (e) => {
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