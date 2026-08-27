const AI_TAB_ID = 'tab-ai-assistant';
let activeTabId = null;
let closedTabsStack = [];

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

// Kelime sınırına göre engelleme (eski kod "bet" gibi kelimeleri her yerde eşleştirip
// masum siteleri de engelliyordu — düzeltildi)
function matchesBlockedWord(text) {
    const lower = text.toLowerCase();
    return BLOCKED_DOMAINS.some(b => {
        const re = new RegExp('(^|[^a-z0-9])' + b + '([^a-z0-9]|$)', 'i');
        return re.test(lower);
    });
}

function sanitizeUrl(inputUrl) {
    let clean = inputUrl.trim();
    if (!clean) return 'newtab.html';

    if (clean === 'newtab.html' || clean === 'about:blank' || clean.startsWith('file:///')) {
        return clean;
    }

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        const isUrlPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(clean);
        if (isUrlPattern) {
            clean = 'https://' + clean;
        } else {
            clean = buildSearchUrl(clean);
        }
    }

    try {
        const parsed = new URL(clean);
        const domain = parsed.hostname.toLowerCase();

        if (matchesBlockedWord(domain) || matchesBlockedWord(parsed.pathname)) {
            showNotification("Bu site güvenlik politikaları gereği engellendi.");
            return 'about:blank';
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

        vw.addEventListener('did-fail-load', (e) => {
            if (!e || e.errorCode === -3) return; // ERR_ABORTED, video/stream akışlarında normal
            if (typeof showToast === 'function') {
                showToast('Sayfa yüklenemedi: ' + (e.errorDescription || e.errorCode), 'error');
            } else {
                showNotification('Sayfa yüklenemedi: ' + (e.errorDescription || e.errorCode));
            }
        });
    }

    if (typeof setupDownloadHandling === 'function') {
        try { setupDownloadHandling(vw); } catch (err) {}
    }
}

function checkUrlSecurity(url, vw) {
    if (!url || !vw || typeof vw.loadURL !== 'function') return;

    try {
        const parsed = new URL(url);
        const domain = parsed.hostname.toLowerCase();

        if (matchesBlockedWord(domain) || matchesBlockedWord(parsed.pathname)) {
            vw.loadURL('about:blank');
            showNotification("Bu içerik güvenlik politikası gereği engellenmiştir.");
            return;
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
                if (window.location.hostname.includes('youtube.com') && !window.__ankaYtRestrict) {
                    window.__ankaYtRestrict = true;
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
                    setInterval(enforceRestrict, 3000);
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

// COMPLETE UI INJECTIONS FOR CONTEXT MENU & DEVTOOLS SIDE PANEL
(function injectContextMenuAndDevToolsStyles() {
    if (document.getElementById('ctx-menu-styles')) return;
    const style = document.createElement('style');
    style.id = 'ctx-menu-styles';
    style.textContent = `
        #custom-context-menu {
            position: fixed;
            background: rgba(22, 22, 26, 0.94);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 6px;
            min-width: 230px;
            z-index: 2000000;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            opacity: 0;
            transform: scale(0.92) translateY(-4px);
            transform-origin: top left;
            transition: opacity 0.12s cubic-bezier(0, 0, 0.2, 1), transform 0.12s cubic-bezier(0, 0, 0.2, 1);
            pointer-events: none;
            will-change: transform, opacity;
        }
        #custom-context-menu.show {
            opacity: 1;
            transform: scale(1) translateY(0);
            pointer-events: auto;
        }
        #custom-context-menu.hiding {
            opacity: 0;
            transform: scale(0.96) translateY(-2px);
            transition: opacity 0.08s ease, transform 0.08s ease;
            pointer-events: none;
        }
        .ctx-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            font-size: 12.5px;
            font-weight: 500;
            color: #ececee;
            border-radius: 7px;
            cursor: pointer;
            white-space: nowrap;
            user-select: none;
            transition: background 0.08s ease, color 0.08s ease;
        }
        .ctx-item:hover {
            background: rgba(255, 255, 255, 0.09);
            color: #ffffff;
        }
        .ctx-item:active {
            background: rgba(255, 255, 255, 0.14);
        }
        .ctx-item.disabled {
            color: #55555e;
            cursor: default;
        }
        .ctx-item.disabled:hover {
            background: transparent;
        }
        .ctx-shortcut {
            font-size: 11px;
            color: #71717a;
            margin-left: 16px;
        }
        .ctx-sep {
            height: 1px;
            background: rgba(255, 255, 255, 0.07);
            margin: 4px 6px;
        }

        #anka-side-devtools {
            position: fixed;
            top: 0;
            right: -50%;
            width: 45%;
            height: 100%;
            background: #141417;
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000000;
            box-shadow: -10px 0 30px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            transition: right 0.25s cubic-bezier(0.1, 0.9, 0.2, 1);
            font-family: Consolas, 'Courier New', monospace;
        }
        #anka-side-devtools.open {
            right: 0;
        }
        .side-dt-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #1c1c21;
            padding: 10px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            color: #e4e4e7;
            font-family: system-ui, sans-serif;
            font-size: 13px;
            font-weight: 600;
        }
        .side-dt-close {
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(255,255,255,0.05);
            color: #a1a1aa;
        }
        .side-dt-close:hover { background: rgba(255,71,87,0.2); color: #ff4757; }
        .side-dt-content {
            flex: 1;
            overflow: auto;
            padding: 16px;
            color: #a6accd;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .anka-find-bar {
            position: fixed;
            top: 8px;
            right: 8px;
            background: rgba(22,22,26,0.96);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 6px 8px;
            display: flex;
            gap: 6px;
            align-items: center;
            z-index: 2000001;
            font-family: system-ui, sans-serif;
        }
        .anka-find-bar input {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            color: #ececee;
            padding: 4px 8px;
            font-size: 12.5px;
            outline: none;
        }
        .anka-find-bar button {
            background: rgba(255,255,255,0.08);
            border: none;
            color: #ececee;
            border-radius: 6px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
        }
        .anka-find-bar button:hover { background: rgba(255,255,255,0.16); }
    `;
    document.head.appendChild(style);
})();

function closeContextMenu() {
    const menu = document.getElementById('custom-context-menu');
    if (!menu || menu.classList.contains('hiding')) return;

    menu.classList.remove('show');
    menu.classList.add('hiding');
    setTimeout(() => {
        menu.remove();
    }, 80);
}

function showContextMenu(x, y, items) {
    const existing = document.getElementById('custom-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'custom-context-menu';

    const frag = document.createDocumentFragment();

    items.forEach(it => {
        if (it === '---') {
            const sep = document.createElement('div');
            sep.className = 'ctx-sep';
            frag.appendChild(sep);
            return;
        }
        const row = document.createElement('div');
        row.className = 'ctx-item' + (it.disabled ? ' disabled' : '');

        const labelSpan = document.createElement('span');
        labelSpan.textContent = it.label;
        row.appendChild(labelSpan);

        if (it.shortcut) {
            const scSpan = document.createElement('span');
            scSpan.className = 'ctx-shortcut';
            scSpan.textContent = it.shortcut;
            row.appendChild(scSpan);
        }

        if (!it.disabled) {
            row.onclick = (e) => {
                e.stopPropagation();
                closeContextMenu();
                it.action && it.action();
            };
        }
        frag.appendChild(row);
    });

    menu.appendChild(frag);
    document.body.appendChild(menu);

    let posX = x;
    let posY = y;
    const menuWidth = 230;
    const menuHeight = menu.offsetHeight || (items.length * 30);

    if (posX + menuWidth > window.innerWidth) posX = Math.max(8, window.innerWidth - menuWidth - 8);
    if (posY + menuHeight > window.innerHeight) posY = Math.max(8, window.innerHeight - menuHeight - 8);

    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';

    requestAnimationFrame(() => {
        menu.classList.add('show');
    });
}

window.addEventListener('pointerdown', (e) => {
    const menu = document.getElementById('custom-context-menu');
    if (menu && !e.target.closest('#custom-context-menu')) {
        closeContextMenu();
    }
}, true);

window.addEventListener('wheel', closeContextMenu, { passive: true });
window.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('webview') && !e.target.closest('.tab') && !e.target.closest('#custom-context-menu')) {
        closeContextMenu();
    }
}, true);

window.addEventListener('blur', closeContextMenu);
window.addEventListener('resize', closeContextMenu);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeContextMenu();
        const findBar = document.getElementById('anka-find-bar');
        if (findBar) findBar.remove();
        const dt = document.getElementById('anka-side-devtools');
        if (dt) dt.classList.remove('open');
    }
}, true);

function toggleSideViewSource(vw) {
    let panel = document.getElementById('anka-side-devtools');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'anka-side-devtools';
        panel.innerHTML = `
            <div class="side-dt-header">
                <span>Sayfa Kaynak Kodu (Side Panel)</span>
                <span class="side-dt-close" onclick="toggleSideViewSource()">✕</span>
            </div>
            <div class="side-dt-content" id="side-dt-code">Yükleniyor...</div>
        `;
        document.body.appendChild(panel);
    }

    if (panel.classList.contains('open') && !vw) {
        panel.classList.remove('open');
        return;
    }

    if (vw && typeof vw.executeJavaScript === 'function') {
        vw.executeJavaScript('document.documentElement.outerHTML').then(html => {
            const codeBox = document.getElementById('side-dt-code');
            if (codeBox) {
                codeBox.textContent = html;
            }
            panel.classList.add('open');
        }).catch(() => {
            showNotification("Kaynak kodu alınamadı.");
        });
    } else {
        panel.classList.toggle('open');
    }
}

function attachWebviewContextMenu(vw) {
    if (!vw || typeof vw.addEventListener !== 'function') return;

    vw.addEventListener('context-menu', (e, paramsArg) => {
        const p = paramsArg || e.params || {};
        const x = (typeof p.x === 'number') ? p.x : (e.clientX || 100);
        const y = (typeof p.y === 'number') ? p.y : (e.clientY || 100);

        const items = [];
        items.push({ label: 'Geri', shortcut: 'Alt+←', action: () => vw.canGoBack() && vw.goBack(), disabled: !(vw.canGoBack && vw.canGoBack()) });
        items.push({ label: 'İleri', shortcut: 'Alt+→', action: () => vw.canGoForward() && vw.goForward(), disabled: !(vw.canGoForward && vw.canGoForward()) });
        items.push({ label: 'Yenile', shortcut: 'Ctrl+R', action: () => vw.reload() });
        items.push('---');

        if (p.linkURL) {
            items.push({ label: 'Bağlantıyı yeni sekmede aç', action: () => createNewTab(p.linkURL) });
            items.push({ label: 'Bağlantıyı gizli pencerede aç', action: () => createIncognitoTab(p.linkURL) });
            items.push({ label: 'Bağlantı adresini kopyala', action: () => navigator.clipboard.writeText(p.linkURL).catch(() => {}) });
            items.push('---');
        }
        if (p.selectionText) {
            items.push({ label: 'Kopyala', shortcut: 'Ctrl+C', action: () => vw.copy() });
            items.push({ label: `Web'de Ara: "${p.selectionText.substring(0, 15)}..."`, action: () => createNewTab(buildSearchUrl(p.selectionText)) });
            items.push({ label: 'Notlara / Panoya Ekle', action: () => saveSelectedTextToStorage(p.selectionText) });
            items.push('---');
        }
        if (p.isEditable) {
            items.push({ label: 'Kes', shortcut: 'Ctrl+X', action: () => vw.cut() });
            items.push({ label: 'Yapıştır', shortcut: 'Ctrl+V', action: () => vw.paste() });
            items.push({ label: 'Tümünü Seç', shortcut: 'Ctrl+A', action: () => vw.selectAll() });
            items.push('---');
        }
        if (p.hasImageContents && p.srcURL) {
            items.push({ label: 'Resmi yeni sekmede aç', action: () => createNewTab(p.srcURL) });
            items.push({ label: 'Resim adresini kopyala', action: () => navigator.clipboard.writeText(p.srcURL).catch(() => {}) });
            items.push({ label: 'Resmi İndir', action: () => downloadFileFromUrl(p.srcURL) });
            items.push({ label: 'Resmi Google Lens ile Ara', action: () => createNewTab(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(p.srcURL)}`) });
            items.push('---');
        }

        items.push({ label: 'Sayfada Bul', shortcut: 'Ctrl+F', action: () => openFindBar(vw) });
        items.push({ label: 'Sayfa Kaynağını Yanda Gör', shortcut: 'Ctrl+U', action: () => toggleSideViewSource(vw) });
        items.push({ label: 'Sayfayı Bilgisayara Kaydet', shortcut: 'Ctrl+S', action: () => saveCurrentPage(vw) });
        items.push({ label: 'Sekmeyi Yan Panele Sabitle', action: () => pinToSidePanel(vw) });
        items.push({ label: 'Geliştirici Araçları (DevTools)', shortcut: 'F12', action: () => { if (vw.isDevToolsOpened && !vw.isDevToolsOpened()) vw.openDevTools(); } });

        showContextMenu(x, y, items);
    });
}

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
    const titleEl = tab.querySelector('.tab-title');
    if (isPinned) {
        tab.style.maxWidth = '44px';
        if (titleEl) titleEl.style.display = 'none';
    } else {
        tab.style.maxWidth = '';
        if (titleEl) titleEl.style.display = '';
    }
}

function saveSelectedTextToStorage(txt) {
    try {
        let history = JSON.parse(localStorage.getItem('anka_saved_snippets') || '[]');
        history.push({ text: txt, date: new Date().toISOString() });
        localStorage.setItem('anka_saved_snippets', JSON.stringify(history));
        showNotification("Metin panoya ve notlara kaydedildi.");
    } catch (e) {
        showNotification("Kaydetme başarısız.");
    }
}

function saveCurrentPage(vw) {
    if (!vw) return;

    try {
        if (typeof vw.savePage === 'function') {
            vw.savePage('', 'HTMLComplete', (error) => {
                if (!error) showNotification("Sayfa tam olarak kaydedildi.");
                else fallbackSavePage(vw);
            });
        } else {
            fallbackSavePage(vw);
        }
    } catch (e) {
        fallbackSavePage(vw);
    }
}

function fallbackSavePage(vw) {
    if (!vw || typeof vw.executeJavaScript !== 'function') return;

    vw.executeJavaScript('document.documentElement.outerHTML').then(html => {
        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (vw.getTitle() || 'sayfa').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        showNotification("Sayfa HTML olarak indirildi.");
    }).catch(() => {
        showNotification("Sayfa kaydedilemedi.");
    });
}

function downloadFileFromUrl(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop().split('?')[0] || 'indirilen_medya';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification("İndirme başlatıldı.");
}

function pinToSidePanel(vw) {
    if (!vw) return;
    showNotification("Sekme yan panele sabitlendi.");
}

function openFindBar(vw) {
    if (!vw || typeof vw.findInPage !== 'function') {
        showNotification("Bu sekmede arama desteklenmiyor.");
        return;
    }
    let bar = document.getElementById('anka-find-bar');
    if (bar) bar.remove();

    bar = document.createElement('div');
    bar.id = 'anka-find-bar';
    bar.className = 'anka-find-bar';
    bar.innerHTML = `
        <input type="text" id="anka-find-input" placeholder="Sayfada ara..." />
        <button id="anka-find-prev">◀</button>
        <button id="anka-find-next">▶</button>
        <button id="anka-find-close">✕</button>
    `;
    document.body.appendChild(bar);

    const input = bar.querySelector('#anka-find-input');
    input.focus();

    const runFind = (forward) => {
        const term = input.value;
        if (!term) { if (vw.stopFindInPage) vw.stopFindInPage('clearSelection'); return; }
        vw.findInPage(term, { forward });
    };

    input.addEventListener('input', () => runFind(true));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runFind(!e.shiftKey);
        if (e.key === 'Escape') bar.remove();
    });
    bar.querySelector('#anka-find-next').onclick = () => runFind(true);
    bar.querySelector('#anka-find-prev').onclick = () => runFind(false);
    bar.querySelector('#anka-find-close').onclick = () => {
        if (vw.stopFindInPage) vw.stopFindInPage('clearSelection');
        bar.remove();
    };
}

function createNewTab(url = 'newtab.html') {
    if (document.querySelectorAll('.tab').length >= getMaxTabs()) {
        showNotification(`Maksimum ${getMaxTabs()} sekme sınırına ulaşıldı.`);
        return null;
    }

    const isDefaultNewTab = (!url || url === 'newtab.html' || url === 'about:blank' || url.startsWith('file:///'));
    const secureUrl = isDefaultNewTab ? 'newtab.html' : sanitizeUrl(url);
    const id = 'tab-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
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
    vw.setAttribute('allowpopups', '');
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

    vw.addEventListener('did-stop-loading', () => {
        try {
            const currentUrl = vw.getURL();
            const title = vw.getTitle() || "Yeni Sayfa";
            const titleEl = tab.querySelector('.tab-title');
            const isNewTabUrl = currentUrl.includes('newtab.html') || currentUrl.startsWith('file:///');
            if (titleEl) titleEl.innerText = isNewTabUrl ? 'Yeni Sekme' : (title.substring(0, 15) + (title.length > 15 ? '...' : ''));
            if (id === activeTabId) {
                document.getElementById('url-input').value = isNewTabUrl ? '' : currentUrl;
            }
        } catch (err) {}
    });

    switchTab(id);
    return id;
}

function createIncognitoTab(url = 'newtab.html') {
    const id = createNewTab(url);
    if (!id) return null;
    const tab = document.getElementById('btn-' + id);
    if (tab) {
        tab.classList.add('incognito');
        tab.style.borderColor = '#7c3aed';
    }
    return id;
}

function reopenClosedTab() {
    const last = closedTabsStack.pop();
    if (last) createNewTab(last);
    else showNotification("Yeniden açılacak sekme yok.");
}

function toggleMute(id, e) {
    if (e) e.stopPropagation();
    const vw = document.getElementById(id);
    if (!vw || typeof vw.isAudioMuted !== 'function') return;
    const isMuted = vw.isAudioMuted();
    vw.setAudioMuted(!isMuted);
    const btn = document.querySelector(`#btn-${id} .mute-tab`);
    if (btn) {
        btn.innerText = isMuted ? 'Sessiz' : 'Sesli';
    }
}

function openAISession() {
    if (document.getElementById(AI_TAB_ID)) {
        switchTab(AI_TAB_ID);
        return;
    }
    if (document.querySelectorAll('.tab').length >= getMaxTabs()) {
        showNotification(`Maksimum ${getMaxTabs()} sekme sınırına ulaşıldı.`);
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

function switchTabByIndex(index) {
    const tabs = document.querySelectorAll('.tab');
    if (index === -1) {
        if (tabs.length) switchTab(tabs[tabs.length - 1].id.replace('btn-', ''));
        return;
    }
    if (tabs[index]) switchTab(tabs[index].id.replace('btn-', ''));
}

function cycleTab(dir) {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    if (!tabs.length) return;
    const curIndex = tabs.findIndex(t => t.id === 'btn-' + activeTabId);
    let next = (curIndex + dir + tabs.length) % tabs.length;
    switchTab(tabs[next].id.replace('btn-', ''));
}

function closeTab(id, e) {
    if (e) e.stopPropagation();
    const tabBtn = document.getElementById('btn-' + id);
    const tabVw = document.getElementById(id);

    if (tabVw && id !== AI_TAB_ID) {
        try {
            const url = tabVw.getURL();
            if (url && !url.includes('newtab.html')) closedTabsStack.push(url);
            if (closedTabsStack.length > 20) closedTabsStack.shift();
        } catch (err) {}
    }

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

function focusUrlBar() {
    const input = document.getElementById('url-input');
    if (input) {
        input.focus();
        input.select();
    }
}

// ---- Klavye Kısayolları ----
document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key.toLowerCase() === 't' && !e.shiftKey) {
        e.preventDefault(); createNewTab(typeof getHomeUrl === 'function' ? getHomeUrl() : 'newtab.html');
    } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault(); reopenClosedTab();
    } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault(); createIncognitoTab();
    } else if (ctrl && e.key.toLowerCase() === 'w') {
        e.preventDefault(); if (activeTabId) closeTab(activeTabId, { stopPropagation() {} });
    } else if (ctrl && e.key.toLowerCase() === 'l') {
        e.preventDefault(); focusUrlBar();
    } else if (ctrl && e.key.toLowerCase() === 'r') {
        e.preventDefault(); reloadPage();
    } else if (e.key === 'F5') {
        e.preventDefault(); reloadPage();
    } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault(); goBack();
    } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault(); goForward();
    } else if (ctrl && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault(); cycleTab(1);
    } else if (ctrl && e.shiftKey && e.key === 'Tab') {
        e.preventDefault(); cycleTab(-1);
    } else if (ctrl && /^[1-8]$/.test(e.key)) {
        e.preventDefault(); switchTabByIndex(parseInt(e.key, 10) - 1);
    } else if (ctrl && e.key === '9') {
        e.preventDefault(); switchTabByIndex(-1);
    } else if (ctrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const vw = document.getElementById(activeTabId);
        if (vw) openFindBar(vw);
    } else if (ctrl && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        const vw = document.getElementById(activeTabId);
        if (vw) toggleSideViewSource(vw);
    } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault(); if (activeTabId) toggleMute(activeTabId);
    } else if (e.key === 'F12') {
        e.preventDefault();
        const vw = document.getElementById(activeTabId);
        if (vw && vw.isDevToolsOpened && !vw.isDevToolsOpened()) vw.openDevTools();
    }
}, true);

document.addEventListener('DOMContentLoaded', () => {
    setAiMode(isAiModeActive());

    document.getElementById('tab-bar')?.addEventListener('contextmenu', (e) => {
        const tabEl = e.target.closest('.tab');
        if (!tabEl) return;
        e.preventDefault();
        const id = tabEl.id.replace('btn-', '');
        const vw = document.getElementById(id);

        const items = [
            { label: 'Sekmeyi Yenile', shortcut: 'Ctrl+R', action: () => vw && vw.reload() },
            { label: 'Sekmeyi Çoğalt', action: () => vw && createNewTab(vw.getURL()) },
            { label: (vw && vw.isAudioMuted && vw.isAudioMuted()) ? 'Sesi Aç' : 'Sesi Kapat', action: () => toggleMute(id) },
            '---',
            { label: 'Sekmeyi Sabitle', action: () => togglePinTab(id) },
            { label: 'Sekmeyi Kapat', shortcut: 'Ctrl+W', action: () => closeTab(id, { stopPropagation() {} }) },
            { label: 'Kapatılan Sekmeyi Aç', shortcut: 'Ctrl+Shift+T', action: () => reopenClosedTab() },
            { label: 'Diğer Sekmeleri Kapat', action: () => closeOtherTabs(id) },
            { label: 'Sağdaki Sekmeleri Kapat', action: () => closeTabsToRight(id) }
        ];
        showContextMenu(e.clientX, e.clientY, items);
    });

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

    if (document.querySelectorAll('.tab').length === 0) {
        createNewTab(typeof getHomeUrl === 'function' ? getHomeUrl() : 'newtab.html');
    }
});

window.addEventListener('mousedown', (e) => {
    const menu = document.getElementById('custom-context-menu');
    if (menu && !e.target.closest('#custom-context-menu')) {
        closeContextMenu();
    }
}, true);
