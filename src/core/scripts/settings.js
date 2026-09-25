function createSettingsPanel() {
    if (document.getElementById('settings-panel')) return;

    const styles = `
    <style>
        #settings-panel { 
            display: none; position: fixed; top: 50%; left: 50%; 
            transform: translate(-50%, -50%) scale(0.95); 
            width: 850px; height: 600px; 
            max-width: 90vw; max-height: 90vh;
            background: var(--bg-secondary, #18181b); 
            color: var(--text-color, #f4f4f5); 
            border-radius: 12px; 
            box-shadow: 0 24px 38px rgba(0,0,0,0.5); 
            z-index: 100001; 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            opacity: 0; 
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
            overflow: hidden; 
            border: 1px solid var(--border-color, #27272a); 
            will-change: transform, opacity;
            box-sizing: border-box;
        }
        #settings-panel * { box-sizing: border-box; }
        .settings-sidebar { 
            width: 240px; 
            flex-shrink: 0;
            background: var(--bg-primary, #121214); 
            padding: 24px 12px; 
            border-right: 1px solid var(--border-color, #27272a); 
            display: flex; flex-direction: column; gap: 4px; 
            contain: content;
        }
        .settings-nav-item { 
            padding: 10px 16px; cursor: pointer; border-radius: 10px; 
            transition: background 0.2s, color 0.2s; color: var(--text-secondary, #a1a1aa); 
            font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 12px; 
            user-select: none;
        }
        .settings-nav-item:hover { 
            background: var(--bg-tertiary, #27272a); 
            color: var(--text-color, #f4f4f5); 
        }
        .settings-nav-item.active { 
            background: rgba(255, 71, 87, 0.15); 
            color: var(--accent, #ff4757); 
        }
        .settings-content { 
            flex: 1; padding: 32px 48px; overflow-y: auto; 
            background: var(--bg-secondary, #18181b); 
            contain: layout style;
        }
        .settings-section-title { 
            font-size: 20px; font-weight: 600; 
            color: var(--text-color, #f4f4f5); margin-bottom: 24px; 
        }
        .settings-group { 
            background: var(--bg-primary, #121214); 
            border-radius: 10px; 
            border: 1px solid var(--border-color, #27272a); 
            margin-bottom: 20px; overflow: hidden; 
        }
        .settings-item { 
            display: flex; justify-content: space-between; align-items: center; 
            padding: 16px 20px; border-bottom: 1px solid var(--border-color, #27272a); 
            transition: background 0.2s; gap: 20px; 
        }
        .settings-item:last-child { border-bottom: none; }
        .settings-item:hover { background: var(--bg-tertiary, #27272a); }
        .settings-label { font-size: 14px; color: var(--text-color, #f4f4f5); font-weight: 500; }
        .settings-desc { font-size: 12px; color: var(--text-secondary, #a1a1aa); margin-top: 2px; }
        
        .settings-toggle { position: relative; display: inline-block; width: 38px; height: 22px; flex-shrink: 0; }
        .settings-toggle input { opacity: 0; width: 0; height: 0; }
        .settings-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-tertiary, #3f3f46); transition: background-color .2s; border-radius: 20px; }
        .settings-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: #ffffff; transition: transform .2s; border-radius: 50%; will-change: transform; }
        .settings-toggle input:checked + .settings-slider { background-color: var(--accent, #ff4757); }
        .settings-toggle input:checked + .settings-slider:before { transform: translateX(16px); }

        .settings-select, .settings-text { 
            background: var(--bg-tertiary, #27272a); 
            color: var(--text-color, #f4f4f5); 
            border: 1px solid var(--border-color, #3f3f46); 
            padding: 6px 12px; border-radius: 6px; font-size: 13px; outline: none; flex-shrink:0; 
        }
        .settings-text { width: 200px; max-width: 100%; }
        .settings-btn { 
            background: var(--accent, #ff4757); 
            color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; 
            font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; flex-shrink:0; 
        }
        .settings-btn:hover { opacity: 0.9; }
        .settings-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .settings-status { font-size: 11px; padding: 4px 10px; border-radius: 10px; font-weight: 600; flex-shrink:0; }
        .settings-status.ok { background: rgba(129, 201, 149, 0.2); color: #81c995; }
        .settings-status.no { background: rgba(242, 139, 130, 0.2); color: #f28b82; }
        .settings-status.info { background: rgba(255, 152, 0, 0.2); color: #ff9800; }

        #fps-display { position: fixed; top: 50px; right: 20px; z-index: 999999; background: rgba(0,0,0,0.85); color: var(--accent, #ff4757); padding: 6px 12px; border-radius: 6px; display: none; font-family: monospace; font-size: 12px; pointer-events: none; border: 1px solid var(--border-color, #27272a); }
    </style>`;

    document.head.insertAdjacentHTML('beforeend', styles);
    if (!document.getElementById('fps-display')) {
        document.body.insertAdjacentHTML('beforeend', `<div id="fps-display">FPS: 60</div>`);
    }

    const settingsHTML = `
    <div id="settings-panel">
        <div style="display: flex; height: 100%; width: 100%;">
            <div class="settings-sidebar">
                <h3 style="margin: 0 0 16px 16px; color:var(--text-color); font-size: 18px; font-weight: 600;">Ayarlar</h3>
                <div class="settings-nav-item active" data-tab="genel">🛡️ Genel</div>
                <div class="settings-nav-item" data-tab="arama">🔎 Arama ve AI</div>
                <div class="settings-nav-item" data-tab="performans">⚡ Performans</div>
                <div class="settings-nav-item" data-tab="gizlilik">🔒 Gizlilik ve Güvenlik</div>
                <div class="settings-nav-item" data-tab="gorunum">🎨 Görünüm</div>
                <div class="settings-nav-item" data-tab="gelismis">🛠️ Gelişmiş</div>
                <div class="settings-nav-item" id="reset-settings-btn" style="color:#f28b82; margin-top: auto;">🗑️ Ayarları Sıfırla</div>
            </div>
            <div class="settings-content" id="settings-body"></div>
        </div>
        <button id="close-settings-btn" style="position:absolute; top:20px; right:20px; background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:18px; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:background 0.2s;">✕</button>
    </div>
    <div id="settings-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:100000; backdrop-filter: blur(4px);"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHTML);

    const panel = document.getElementById('settings-panel');
    const overlay = document.getElementById('settings-overlay');
    const sidebar = panel.querySelector('.settings-sidebar');
    const closeBtn = document.getElementById('close-settings-btn');

    sidebar.addEventListener('click', (e) => {
        const item = e.target.closest('.settings-nav-item');
        if (!item) return;
        if (item.id === 'reset-settings-btn') {
            resetSettings();
        } else if (item.dataset.tab) {
            switchSettingsTab(item.dataset.tab, item);
        }
    });

    overlay.addEventListener('click', toggleSettings);
    closeBtn.addEventListener('click', toggleSettings);
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'var(--bg-tertiary)');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'none');

    setupUpdateListeners();
    switchSettingsTab('genel', sidebar.querySelector('.settings-nav-item[data-tab="genel"]'));
}

const settingsData = {
    genel: [
        { id: 'notifications', label: 'Bildirimler', desc: 'Uygulama içi anlık bildirimlere izin ver', type: 'toggle', default: true },
        { id: 'auto-save', label: 'Otomatik Kayıt', desc: 'Çalışma alanını, ayarları ve çizimleri otomatik olarak kaydet', type: 'toggle', default: true },
        { id: 'start-fullscreen', label: 'Tam Ekran Başlat', desc: 'Uygulama açıldığında otomatik olarak tam ekrana geç', type: 'toggle', default: false },
        { id: 'default-browser', label: 'Varsayılan Tarayıcı Yap', desc: 'İşletim sisteminde varsayılan web tarayıcısı olarak ayarla', type: 'button-status', btnText: 'Varsayılan Ayarla', action: 'setDefaultBrowser', statusCheck: 'checkDefaultBrowser' },
        { id: 'check-updates', label: 'Yazılım Güncellemeleri', desc: 'Uygulama güncellemelerini kontrol et ve yükle', type: 'button-status', btnText: 'Güncellemeleri Kontrol Et', action: 'checkAppUpdates', statusCheck: 'initAppVersionDisplay' },
        { id: 'startup-page', label: 'Başlangıç Sayfası', desc: 'Tarayıcı açıldığında yüklenen sayfa', type: 'select', options: [{val: 'home', name: 'Hız Çubuğu (Ana Sayfa)'}, {val: 'blank', name: 'Boş Sayfa'}, {val: 'last', name: 'Önceki Oturumu Kurtar'}, {val: 'dashboard', name: 'Özel Dashboard'}], default: 'home' },
        { id: 'max-tabs', label: 'Maksimum Sekme Sayısı', desc: 'Aynı anda açık tutulabilecek sekme sayısı (En fazla 30)', type: 'number', min: 1, max: 30, placeholder: '10', default: '10' },
        { id: 'drawing-recovery', label: 'Çizim Kurtarma', desc: 'Çizimleri PNG olarak kullanıcı verileri klasöründe sakla ve açılışta geri yükle', type: 'toggle', default: true },
        { id: 'save-drawing-now', label: 'Çizimi Şimdi Kaydet', desc: 'Mevcut çizim yüzeyini anında kullanıcı verileri klasörüne kaydet', type: 'button', btnText: 'Kaydet', action: 'saveDrawingNow' },
        { id: 'clear-drawing-now', label: 'Kayıtlı Çizimi Sil', desc: 'Kaydedilmiş çizim dosyasını ve mevcut çizim yüzeyini temizle', type: 'button', btnText: 'Temizle', action: 'clearDrawingNow' }
    ],
    arama: [
        { id: 'search-engine', label: 'Arama Motoru', desc: 'Adres çubuğuna yazılan aramaların gönderileceği motor', type: 'select', options: [
            {val:'google', name:'Google'}, {val:'yandex', name:'Yandex'}, {val:'bing', name:'Bing'}, {val:'duckduckgo', name:'DuckDuckGo'}, {val:'ecosia', name:'Ecosia'}, {val:'brave', name:'Brave Search'}, {val:'custom', name:'Özel (aşağıda tanımla)'}
        ], default: 'google' },
        { id: 'custom-search-url', label: 'Özel Arama Adresi', desc: `Sadece "Özel" seçiliyken kullanılır. %s aranan kelimenin yerine geçer.`, type: 'text', placeholder: 'https://ornek.com/ara?q=%s', default: 'https://www.google.com/search?q=%s' },
        { id: 'search-suggestions', label: 'Arama Önerileri', desc: 'Adres çubuğuna yazarken otomatik tamamlama ve öneriler göster', type: 'toggle', default: true },
        { id: 'ai-mode-active', label: 'AI Modu', desc: 'Adres çubuğundaki aramaları yapay zekaya yönlendir', type: 'toggle', default: false },
        { id: 'ai-provider', label: 'AI Sağlayıcı', desc: 'AI Modu ve AI kısayolu için kullanılacak servis', type: 'select', options: [
            {val:'google-ai', name:'Google AI Modu'}, {val:'chatgpt', name:'ChatGPT'}, {val:'gemini', name:'Gemini'}, {val:'perplexity', name:'Perplexity'}, {val:'claude', name:'Claude'}
        ], default: 'google-ai' }
    ],
    performans: [
        { id: 'hw-accel', label: 'Donanım Hızlandırma', desc: 'Mümkün olduğunda grafik işlemcisini kullan', type: 'toggle', default: true },
        { id: 'fps-meter', label: 'FPS Göstergesi', desc: 'Ekranın sağ üst köşesinde anlık kare hızını göster', type: 'toggle', default: false },
        { id: 'gpu-render', label: 'GPU Render', desc: 'Gelişmiş donanımsal çizim ve işleme motorunu etkinleştir', type: 'toggle', default: true },
        { id: 'smooth-scrolling', label: 'Akıcı Kaydırma', desc: 'Sayfa geçişlerinde ve kaydırmalarda yumuşak animasyonlar uygula', type: 'toggle', default: true },
        { id: 'memory-saver', label: 'Bellek Tasarrufu', desc: 'Boştaki sekme belleklerini optimize ederek RAM kullanımını azalt', type: 'toggle', default: true },
        { id: 'network-optimizer', label: 'Ağ İstek Optimizasyonu', desc: 'Veri paketlerini sıkıştırarak sayfa yüklenme sürelerini hızlandır', type: 'toggle', default: true }
    ],
    gizlilik: [
        { id: 'ad-block', label: 'Reklam Engelleyici', desc: 'Web sayfalarındaki rahatsız edici reklamları engelle', type: 'toggle', default: true },
        { id: 'track-protect', label: 'İzleyici Koruması', desc: 'Gizliliğinizi tehlikeye atan çerezleri ve izleyicileri engelle', type: 'toggle', default: true },
        { id: 'clear-cache-exit', label: 'Çıkışta Önbelleği Sil', desc: 'Uygulama kapatıldığında tüm çerezleri ve önbelleği temizle', type: 'toggle', default: false },
        { id: 'do-not-track', label: 'Takip Etme İsteği', desc: 'Göz Atma trafiğinizi web sitelerinden gizleyin', type: 'toggle', default: true },
        { id: 'https-only', label: 'Yalnızca HTTPS Modu', desc: 'Güvensiz HTTP bağlantılarını otomatik olarak güvenli sürüme yükselt', type: 'toggle', default: true },
        { id: 'password-manager', label: 'Dahili Şifre Yöneticisi', desc: 'Site şifrelerini güvenli şekilde şifrelenmiş olarak sakla', type: 'toggle', default: true }
    ],
    gorunum: [
        { id: 'theme-preset', label: 'Tema Seçimi', desc: 'Arayüzün genel renk paletini ve atmosferini özelleştir', type: 'select', options: [
            {val: 'dark', name: 'Modern Koyu (Zinc)'},
            {val: 'light', name: 'Aydınlık Ferah'},
            {val: 'catppuccin', name: 'Catppuccin Mocha'},
            {val: 'cyberpunk', name: 'Cyberpunk Neon'},
            {val: 'dracula', name: 'Dracula Pro'},
            {val: 'nord', name: 'Nord Frost'},
            {val: 'oled', name: 'OLED Saf Siyah'},
            {val: 'emerald', name: 'Emerald Forest'}
        ], default: 'dark' },
        { id: 'compact-tabs', label: 'Kompakt Sekmeler', desc: 'Sekme boyutlarını küçülterek daha fazla alan kazanın', type: 'toggle', default: false },
        { id: 'ui-animations', label: 'Arayüz Animasyonları', desc: 'Pencere geçişleri ve menü açılmalarında akıcı efektler kullan', type: 'toggle', default: true },
        { id: 'font-scale', label: 'Yazı Boyutu Ölçeği', desc: 'Arayüz genelindeki metinlerin boyut yoğunluğu', type: 'select', options: [
            {val: 'small', name: 'Küçük (%90)'},
            {val: 'normal', name: 'Normal (%100)'},
            {val: 'large', name: 'Büyük (%110)'}
        ], default: 'normal' },
        { id: 'ui-scale', label: 'Arayüz Ölçeği', desc: 'Küçük veya yüksek çözünürlüklü ekranlarda arayüz yoğunluğunu ayarla', type: 'select', options: [
            {val: 'compact', name: 'Kompakt (%90)'}, {val: 'normal', name: 'Normal (%100)'}, {val: 'large', name: 'Büyük (%110)'}, {val: 'board', name: 'Akıllı Tahta (%125)'}
        ], default: 'normal' },
        { id: 'touch-mode', label: 'Dokunmatik Tahta Modu', desc: 'Dokunmatik ekranlar için butonları ve araç hedeflerini büyüt', type: 'toggle', default: true }
    ],
    gelismis: [
        { id: 'dev-tools-shortcut', label: 'Geliştirici Araçları', desc: 'Uygulama içi konsol ve element denetleyicisini etkinleştir', type: 'toggle', default: true },
        { id: 'hardware-acceleration-override', label: 'WebGL Zorla Etkinleştir', desc: 'Donanım kısıtlamalarını aşarak WebGL performansını zorla', type: 'toggle', default: false },
        { id: 'cache-size-limit', label: 'Maksimum Önbellek Boyutu (MB)', desc: 'Disk üzerinde saklanacak maksimum önbellek sınırı', type: 'number', min: 100, max: 5000, placeholder: '500', default: '500' },
        { id: 'export-settings-btn', label: 'Ayarları Dışa Aktar', desc: 'Tüm tercihlerinizi ve ayarlarınızı JSON dosyası olarak kaydedin', type: 'button', btnText: 'Dışa Aktar', action: 'exportSettingsData' },
        { id: 'import-settings-btn', label: 'Ayarları İçe Aktar', desc: 'Daha önce kaydettiğiniz ayar dosyasını uygulamaya yükleyin', type: 'button', btnText: 'İçe Aktar', action: 'importSettingsData' }
    ]
};

const settingsTitles = { 
    genel: 'Genel', 
    arama: 'Arama ve AI', 
    performans: 'Performans', 
    gizlilik: 'Gizlilik ve Güvenlik', 
    gorunum: 'Görünüm',
    gelismis: 'Gelişmiş'
};


function switchSettingsTab(cat, el) {
    const body = document.getElementById('settings-body');
    if (!body) return;

    const navItems = document.querySelectorAll('.settings-nav-item');
    for (let i = 0; i < navItems.length; i++) {
        navItems[i].classList.remove('active');
    }
    if (el) el.classList.add('active');

    const fragment = document.createDocumentFragment();

    const titleDiv = document.createElement('div');
    titleDiv.className = 'settings-section-title';
    titleDiv.textContent = settingsTitles[cat];
    fragment.appendChild(titleDiv);

    const group = document.createElement('div');
    group.className = 'settings-group';

    const items = settingsData[cat];
    const len = items.length;

    for (let i = 0; i < len; i++) {
        const s = items[i];
        let val;
        let stored = null;

    if (stored !== null) {
            val = (s.type === 'select' || s.type === 'text' || s.type === 'number') ? stored : (stored === 'true');
        } else {
            val = s.default;
            if (s.id === 'start-fullscreen') {
                val = !!document.fullscreenElement;
            }
        }

        const item = document.createElement('div');
        item.className = 'settings-item';

        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `<div class="settings-label">${s.label}</div><div class="settings-desc">${s.desc}</div>`;
        item.appendChild(infoDiv);

        if (s.type === 'toggle') {
            const label = document.createElement('label');
            label.className = 'settings-toggle';
            label.innerHTML = `<input type="checkbox" ${val ? 'checked' : ''}><span class="settings-slider"></span>`;
            label.querySelector('input').addEventListener('change', (e) => saveSetting(s.id, e.target.checked));
            item.appendChild(label);
        } else if (s.type === 'select') {
            const select = document.createElement('select');
            select.className = 'settings-select';
            let optsHTML = '';
            for (let j = 0; j < s.options.length; j++) {
                const o = s.options[j];
                optsHTML += `<option value="${o.val}" ${val === o.val ? 'selected' : ''}>${o.name}</option>`;
            }
            select.innerHTML = optsHTML;
            select.addEventListener('change', (e) => saveSetting(s.id, e.target.value));
            item.appendChild(select);
        } else if (s.type === 'text') {
            const input = document.createElement('input');
            input.className = 'settings-text';
            input.type = 'text';
            input.value = val || '';
            input.placeholder = s.placeholder || '';
            input.addEventListener('change', (e) => saveSetting(s.id, e.target.value));
            item.appendChild(input);
        } else if (s.type === 'number') {
            const input = document.createElement('input');
            input.className = 'settings-text';
            input.type = 'number';
            if (s.min !== undefined) input.min = s.min;
            if (s.max !== undefined) input.max = s.max;
            input.value = val || '';
            input.placeholder = s.placeholder || '';
            input.addEventListener('change', (e) => {
                let num = parseInt(e.target.value, 10);
                if (isNaN(num)) num = parseInt(s.default, 10);
                if (s.min !== undefined && num < s.min) num = s.min;
                if (s.max !== undefined && num > s.max) num = s.max;
                e.target.value = num;
                saveSetting(s.id, num.toString());
            });
            item.appendChild(input);
        } else if (s.type === 'button') {
            const btn = document.createElement('button');
            btn.className = 'settings-btn';
            btn.textContent = s.btnText;
            btn.addEventListener('click', () => executeSettingAction(s.action, btn));
            item.appendChild(btn);
        } else if (s.type === 'button-status') {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex; align-items:center; gap:10px; flex-shrink:0;';
            wrap.innerHTML = `<span class="settings-status" id="status-${s.id}">Kontrol ediliyor...</span>`;
            const btn = document.createElement('button');
            btn.className = 'settings-btn';
            btn.id = `btn-${s.id}`;
            btn.textContent = s.btnText;
            btn.addEventListener('click', () => executeSettingAction(s.action, btn));
            wrap.appendChild(btn);
            item.appendChild(wrap);

            if (s.statusCheck && typeof window[s.statusCheck] === 'function') {
                queueMicrotask(() => window[s.statusCheck]());
            }
        }

        group.appendChild(item);
    }

    fragment.appendChild(group);
    body.replaceChildren(fragment);
}

function saveSetting(id, val) {
    localStorage.setItem('set_' + id, val);
    
    applySetting(id, val);
    
    if (window.electronAPI && window.electronAPI.sendSettingUpdate) {
        window.electronAPI.sendSettingUpdate({ id, val });
    } else {
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('settings-update', { id, val });
        } catch(e) {}
    }
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('save-app-setting', { id, val });
    } catch(e) {}
}

function executeSettingAction(action, btnEl) {
    if (action === 'saveDrawingNow') {
        if (typeof window.saveDrawingNow === 'function' && window.saveDrawingNow()) return;
        if (typeof showToast === 'function') showToast('Çizim kaydedilemedi.', 'error');
    } else if (action === 'clearDrawingNow') {
        if (typeof window.clearCanvas === 'function') {
            window.clearCanvas();
            if (typeof showToast === 'function') showToast('Kayıtlı çizim temizlendi.');
        }
    } else if (action === 'setDefaultBrowser') {
        let sent = false;
        if (window.electronAPI && window.electronAPI.setAsDefaultBrowser) {
            window.electronAPI.setAsDefaultBrowser();
            sent = true;
        } else {
            try {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-as-default-browser');
                sent = true;
            } catch(e) {}
        }

        if (sent) {
            setTimeout(checkDefaultBrowser, 1500);
            if (typeof showToast === 'function') showToast('Varsayılan tarayıcı isteği gönderildi.');
        } else {
            if (typeof showToast === 'function') {
                showToast('Bu işlem bu ortamda desteklenmiyor.', 'error');
            } else {
                alert('Varsayılan tarayıcı ayarlama işlemi bu ortamda desteklenmiyor.');
            }
        }
    } else if (action === 'checkAppUpdates') {
        const statusEl = document.getElementById('status-check-updates');
        if (statusEl) {
            statusEl.textContent = 'Denetleniyor...';
            statusEl.className = 'settings-status info';
        }
        if (btnEl) btnEl.disabled = true;

        clearTimeout(window._updateCheckTimeout);
        window._updateCheckTimeout = setTimeout(() => {
            const currentBadge = document.getElementById('status-check-updates');
            const currentBtn = document.getElementById('btn-check-updates');
            if (currentBadge && currentBadge.textContent === 'Denetleniyor...') {
                currentBadge.textContent = 'Zaman Aşımı';
                currentBadge.className = 'settings-status no';
                if (currentBtn) currentBtn.disabled = false;
            }
        }, 8000);

        if (window.electronAPI && window.electronAPI.checkManualUpdate) {
            window.electronAPI.checkManualUpdate();
        } else {
            try {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('check-manual-update');
            } catch(e) {
                clearTimeout(window._updateCheckTimeout);
                if (statusEl) {
                    statusEl.textContent = 'Desteklenmiyor';
                    statusEl.className = 'settings-status no';
                }
                if (btnEl) btnEl.disabled = false;
            }
        }
    } else if (action === 'exportSettingsData') {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('set_') || key === 'okul_modu')) {
                data[key] = localStorage.getItem(key);
            }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ankaweb-settings.json';
        a.click();
        URL.revokeObjectURL(url);
        if (typeof showToast === 'function') showToast('Ayarlar başarıyla dışa aktarıldı.');
    } else if (action === 'importSettingsData') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    for (const key in data) {
                        if (key.startsWith('set_') || key === 'okul_modu') {
                            localStorage.setItem(key, data[key]);
                        }
                    }
                    if (typeof showToast === 'function') showToast('Ayarlar yüklendi, yeniden başlatılıyor...');
                    setTimeout(() => location.reload(), 1000);
                } catch (err) {
                    if (typeof showToast === 'function') showToast('Geçersiz ayar dosyası!', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

function checkDefaultBrowser() {
    const badge = document.getElementById('status-default-browser');
    if (!badge) return;

    const handleResult = (isDefault) => {
        badge.textContent = isDefault ? 'Varsayılan ✓' : 'Varsayılan Değil';
        badge.className = 'settings-status ' + (isDefault ? 'ok' : 'no');
    };

    const handleError = () => {
        badge.textContent = 'Durum bilinmiyor';
        badge.className = 'settings-status no';
    };

    if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
        window.electronAPI.checkDefaultBrowser().then(handleResult).catch(handleError);
    } else {
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.invoke('check-default-browser').then(handleResult).catch(handleError);
        } catch (e) {
            handleError();
        }
    }
}

function initAppVersionDisplay() {
    const badge = document.getElementById('status-check-updates');
    if (!badge) return;

    let ver = 'v1.0.0';

    try {
        const fs = require('fs');
        const path = require('path');
        
        const appPath = process.cwd(); 
        const pkgPath = path.join(appPath, 'package.json');

        if (fs.existsSync(pkgPath)) {
            const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkgData && pkgData.version) {
                ver = 'v' + pkgData.version;
            }
        } else {
            const fallbackPath = path.resolve(__dirname, '..', 'package.json');
            if (fs.existsSync(fallbackPath)) {
                const pkgData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
                if (pkgData && pkgData.version) {
                    ver = 'v' + pkgData.version;
                }
            }
        }
    } catch (e) {}

    badge.textContent = `Güncel (${ver})`;
    badge.className = 'settings-status ok';
}

function setupUpdateListeners() {
    if (window.hasSetupUpdateListeners) return;
    window.hasSetupUpdateListeners = true;

    const handleUpdateAvailable = (data) => {
        clearTimeout(window._updateCheckTimeout);
        const badge = document.getElementById('status-check-updates');
        const btn = document.getElementById('btn-check-updates');
        if (badge) {
            badge.textContent = `Yeni Sürüm Var! (${data && data.version ? 'v' + data.version : ''})`;
            badge.className = 'settings-status info';
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Güncellemeyi Başlat';
            btn.onclick = () => {
                const downloadUrl = data ? data.url : null;
                if (window.electronAPI && window.electronAPI.startDownload) {
                    window.electronAPI.startDownload(downloadUrl);
                } else {
                    try {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('start-download', downloadUrl);
                    } catch(e) {}
                }
            };
        }
    };

    const handleUpdateNotAvailable = (data) => {
        clearTimeout(window._updateCheckTimeout);
        const badge = document.getElementById('status-check-updates');
        const btn = document.getElementById('btn-check-updates');
        if (badge) {
            const verText = (data && data.currentVersion) ? ` (v${data.currentVersion})` : '';
            badge.textContent = `Sürüm Güncel${verText}`;
            badge.className = 'settings-status ok';
        }
        if (btn) btn.disabled = false;
    };

    const handleUpdateError = (msg) => {
        clearTimeout(window._updateCheckTimeout);
        const badge = document.getElementById('status-check-updates');
        const btn = document.getElementById('btn-check-updates');
        if (badge) {
            badge.textContent = 'Kontrol Başarısız';
            badge.className = 'settings-status no';
        }
        if (btn) btn.disabled = false;
    };

    if (window.electronAPI && window.electronAPI.on) {
        window.electronAPI.on('update-available', handleUpdateAvailable);
        window.electronAPI.on('update-not-available', handleUpdateNotAvailable);
        window.electronAPI.on('update-error', handleUpdateError);
    } else {
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('update-available', (e, data) => handleUpdateAvailable(data));
            ipcRenderer.on('update-not-available', (e, data) => handleUpdateNotAvailable(data));
            ipcRenderer.on('update-error', (e, msg) => handleUpdateError(msg));
        } catch(e) {}
    }
}

let fpsFrameCount = 0;
let fpsLastTime = performance.now();
let fpsAnimationId = null;

function updateFPS() {
    fpsFrameCount++;
    const now = performance.now();
    if (now - fpsLastTime >= 1000) {
        const fpsDisplay = document.getElementById('fps-display');
        if (fpsDisplay) {
            fpsDisplay.textContent = `FPS: ${fpsFrameCount}`;
        }
        fpsFrameCount = 0;
        fpsLastTime = now;
    }
    fpsAnimationId = requestAnimationFrame(updateFPS);
}

function applySetting(id, val) {
    const boolVal = (val === true || val === 'true');
    if (id === 'fps-meter') {
        const fpsEl = document.getElementById('fps-display');
        if (fpsEl) {
            fpsEl.style.display = boolVal ? 'block' : 'none';
        }
        if (boolVal) {
            if (!fpsAnimationId) updateFPS();
        } else {
            if (fpsAnimationId) {
                cancelAnimationFrame(fpsAnimationId);
                fpsAnimationId = null;
            }
        }
    } else if (id === 'start-fullscreen' && boolVal) {
        if (window.electronAPI && window.electronAPI.setFullscreen) {
            window.electronAPI.setFullscreen(true);
        } else {
            try {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-fullscreen', true);
            } catch(e) {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
            }
        }
    } else if (id === 'ai-mode-active') {
        const btn = document.getElementById('ai-mode-btn');
        if (btn) btn.classList.toggle('active', boolVal);
    } else if (id === 'theme-preset') {
        document.body.classList.remove('light-theme', 'theme-catppuccin', 'theme-cyberpunk', 'theme-dracula', 'theme-nord', 'theme-oled', 'theme-emerald');
        document.documentElement.dataset.themePreset = val || 'dark';
        if (val === 'light') {
            document.body.classList.add('light-theme');
        } else if (val !== 'dark') {
            document.body.classList.add('theme-' + val);
        }
    } else if (id === 'smooth-scrolling') {
        document.documentElement.style.scrollBehavior = boolVal ? 'smooth' : 'auto';
    } else if (id === 'font-scale') {
        document.documentElement.dataset.fontScale = val || 'normal';
        document.documentElement.style.fontSize = val === 'small' ? '14px' : val === 'large' ? '17px' : '16px';
    } else if (id === 'ui-scale') {
        document.documentElement.dataset.uiScale = val || 'normal';
    } else if (id === 'touch-mode') {
        document.body.classList.toggle('touch-mode', boolVal);
        document.documentElement.classList.toggle('touch-mode', boolVal);
    } else if (id === 'compact-tabs') {
        document.documentElement.classList.toggle('compact-tabs', boolVal);
    } else if (id === 'notifications') {
        document.documentElement.dataset.notifications = boolVal ? 'on' : 'off';
    } else if (id === 'search-suggestions') {
        document.documentElement.dataset.searchSuggestions = boolVal ? 'on' : 'off';
    } else if (id === 'ui-animations') {
        let animStyle = document.getElementById('no-animations-style');
        if (!boolVal) {
            if (!animStyle) {
                animStyle = document.createElement('style');
                animStyle.id = 'no-animations-style';
                animStyle.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
                document.head.appendChild(animStyle);
            }
        } else {
            if (animStyle) animStyle.remove();
        }
    }
}

function applyStoredSettings() {
    const categories = Object.keys(settingsData);
    for (let c = 0; c < categories.length; c++) {
        const items = settingsData[categories[c]];
        for (let i = 0; i < items.length; i++) {
            const s = items[i];
            let stored = localStorage.getItem('set_' + s.id);
            const val = stored !== null ? stored : s.default;
            applySetting(s.id, val);
        }
    }
}

function resetSettings() {
    const categories = Object.keys(settingsData);
    for (let c = 0; c < categories.length; c++) {
        const items = settingsData[categories[c]];
        for (let i = 0; i < items.length; i++) {
            localStorage.removeItem('set_' + items[i].id);
        }
    }
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('reset-app-settings');
    } catch(e) {}
    if (typeof showToast === 'function') showToast('Ayarlar sıfırlandı.');
    setTimeout(() => location.reload(), 500);
}

function toggleSettings() {
    createSettingsPanel();
    const p = document.getElementById('settings-panel');
    const o = document.getElementById('settings-overlay');
    if (!p || !o) return;

    const isHidden = p.style.display === 'none' || p.style.display === '';

    if (isHidden) {
        p.style.display = 'flex'; 
        o.style.display = 'block';
        requestAnimationFrame(() => {
            p.style.transform = 'translate(-50%, -50%) scale(1)'; 
            p.style.opacity = '1'; 
        });
    } else {
        p.style.transform = 'translate(-50%, -50%) scale(0.95)'; 
        p.style.opacity = '0';
        setTimeout(() => { 
            p.style.display = 'none'; 
            o.style.display = 'none'; 
        }, 250);
    }
}

async function hydrateStoredSettings() {
    try {
        const { ipcRenderer } = require('electron');
        const state = await ipcRenderer.invoke('load-app-state');
        const settings = state && state.settings ? state.settings : {};
        Object.keys(settings).forEach((id) => {
            localStorage.setItem('set_' + id, settings[id]);
        });
    } catch(e) {}
    if (localStorage.getItem('set_touch-mode-migrated') !== 'true') {
        localStorage.setItem('set_touch-mode-migrated', 'true');
        saveSetting('touch-mode', 'true');
    }
    applyStoredSettings();
}

hydrateStoredSettings();