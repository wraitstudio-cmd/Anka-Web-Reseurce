function createSettingsPanel() {
    if (document.getElementById('settings-panel')) return;

    const styles = `
    <style>
        #settings-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); width: 850px; height: 600px; background: #202124; color: #e8eaed; border-radius: 12px; box-shadow: 0 24px 38px rgba(0,0,0,0.4), 0 9px 46px rgba(0,0,0,0.3); z-index: 100001; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; opacity: 0; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; border: 1px solid #3c4043; }
        .settings-sidebar { width: 240px; background: #292a2d; padding: 24px 12px; border-right: 1px solid #3c4043; display: flex; flex-direction: column; gap: 4px; }
        .settings-nav-item { padding: 10px 16px; cursor: pointer; border-radius: 20px; transition: 0.2s; color: #bdc1c6; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 12px; }
        .settings-nav-item:hover { background: #35363a; color: #e8eaed; }
        .settings-nav-item.active { background: #8ab4f829; color: #8ab4f8; }
        .settings-content { flex: 1; padding: 32px 48px; overflow-y: auto; background: #202124; }
        .settings-section-title { font-size: 22px; font-weight: 400; color: #e8eaed; margin-bottom: 24px; }
        .settings-group { background: #292a2d; border-radius: 8px; border: 1px solid #3c4043; margin-bottom: 20px; overflow: hidden; }
        .settings-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #3c4043; transition: 0.2s; }
        .settings-item:last-child { border-bottom: none; }
        .settings-item:hover { background: #323337; }
        .settings-label { font-size: 14px; color: #e8eaed; font-weight: 400; }
        .settings-desc { font-size: 12px; color: #9aa0a6; margin-top: 2px; }
        
        .settings-toggle { position: relative; display: inline-block; width: 36px; height: 20px; }
        .settings-toggle input { opacity: 0; width: 0; height: 0; }
        .settings-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #5f6368; transition: .2s; border-radius: 20px; }
        .settings-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: #202124; transition: .2s; border-radius: 50%; }
        .settings-toggle input:checked + .settings-slider { background-color: #8ab4f8; }
        .settings-toggle input:checked + .settings-slider:before { transform: translateX(16px); }

        .settings-select { background: #3c4043; color: #e8eaed; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; outline: none; cursor: pointer; }
        .settings-btn { background: #8ab4f8; color: #202124; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .settings-btn:hover { background: #aecbfa; }

        #fps-display { position: fixed; top: 50px; right: 20px; z-index: 999999; background: rgba(0,0,0,0.8); color: #8ab4f8; padding: 6px 12px; border-radius: 6px; display: none; font-family: monospace; font-size: 12px; pointer-events: none; border: 1px solid #3c4043; }
    </style>`;

    document.head.insertAdjacentHTML('beforeend', styles);
    if (!document.getElementById('fps-display')) document.body.insertAdjacentHTML('beforeend', `<div id="fps-display">FPS: 60</div>`);

    const settingsHTML = `
    <div id="settings-panel">
        <div style="display: flex; height: 100%;">
            <div class="settings-sidebar">
                <h3 style="margin: 0 0 16px 16px; color:#e8eaed; font-size: 18px; font-weight: 500;">Ayarlar</h3>
                <div class="settings-nav-item active" onclick="switchSettingsTab('genel', this)">🛡️ Genel</div>
                <div class="settings-nav-item" onclick="switchSettingsTab('performans', this)">⚡ Performans</div>
                <div class="settings-nav-item" onclick="switchSettingsTab('gizlilik', this)">🔒 Gizlilik ve Güvenlik</div>
                <div class="settings-nav-item" onclick="switchSettingsTab('gorunum', this)">🎨 Görünüm</div>
                <div class="settings-nav-item" onclick="resetSettings()" style="color:#f28b82; margin-top: auto;">🗑️ Ayarları Sıfırla</div>
            </div>
            <div class="settings-content" id="settings-body"></div>
        </div>
        <button onclick="toggleSettings()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:#9aa0a6; cursor:pointer; font-size:18px; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:0.2s;" onmouseover="this.style.background='#3c4043'" onmouseout="this.style.background='none'">✕</button>
    </div>
    <div id="settings-overlay" onclick="toggleSettings()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:100000; backdrop-filter: blur(2px);"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHTML);
    applyStoredSettings();
    switchSettingsTab('genel', document.querySelector('.settings-nav-item'));
}

const settingsData = {
    genel: [
        { id: 'notifications', label: 'Bildirimler', desc: 'Uygulama içi anlık bildirimlere izin ver', type: 'toggle', default: true },
        { id: 'auto-save', label: 'Otomatik Kayıt', desc: 'Çalışma alanını ve çizimleri otomatik olarak kaydet', type: 'toggle', default: true },
        { id: 'start-fullscreen', label: 'Tam Ekran Başlat', desc: 'Uygulama açıldığında otomatik olarak tam ekrana geç', type: 'toggle', default: false },
        { id: 'default-browser', label: 'Varsayılan Tarayıcı Yap', desc: 'Linux veya Windows sisteminde varsayılan tarayıcı olarak ayarla', type: 'button', btnText: 'Varsayılan Ayarla', action: 'setDefaultBrowser' },
        { id: 'startup-page', label: 'Başlangıç Sayfası', desc: 'Tarayıcı açıldığında yüklenen sayfa', type: 'select', options: [{val: 'home', name: 'Ana Sayfa'}, {val: 'blank', name: 'Boş Sayfa'}, {val: 'last', name: 'Önceki Oturumu Kurtar'}], default: 'home' }
    ],
    performans: [
        { id: 'hw-accel', label: 'Donanım Hızlandırma', desc: 'Mümkün olduğunda grafik işlemcisini kullan', type: 'toggle', default: true },
        { id: 'fps-meter', label: 'FPS Göstergesi', desc: 'Ekranın sağ üst köşesinde anlık kare hızını göster', type: 'toggle', default: false },
        { id: 'gpu-render', label: 'GPU Render', desc: 'Gelişmiş donanımsal çizim ve işleme motorunu etkinleştir', type: 'toggle', default: true },
        { id: 'smooth-scrolling', label: 'Akıcı Kaydırma', desc: 'Sayfa geçişlerinde ve kaydırmalarda yumuşak animasyonlar uygula', type: 'toggle', default: true },
        { id: 'memory-saver', label: 'Bellek Tasarrufu', desc: 'Boştaki sekme belleklerini optimize ederek RAM kullanımını azalt', type: 'toggle', default: true }
    ],
    gizlilik: [
        { id: 'ad-block', label: 'Reklam Engelleyici', desc: 'Web sayfalarındaki rahatsız edici reklamları engelle', type: 'toggle', default: true },
        { id: 'track-protect', label: 'İzleyici Koruması', desc: 'Gizliliğinizi tehlikeye atan çerezleri ve izleyicileri engelle', type: 'toggle', default: true },
        { id: 'clear-cache-exit', label: 'Çıkışta Önbelleği Sil', desc: 'Uygulama kapatıldığında tüm çerezleri ve önbelleği temizle', type: 'toggle', default: false },
        { id: 'do-not-track', label: 'Takip Etme İsteği', desc: 'Göz Atma trafiğinizi web sitelerinden gizleyin', type: 'toggle', default: true }
    ],
    gorunum: [
        { id: 'dark-mode', label: 'Koyu Tema Modu', desc: 'Tüm arayüzde modern koyu tema renk paletini kullan', type: 'toggle', default: true },
        { id: 'compact-tabs', label: 'Kompakt Sekmeler', desc: 'Sekme boyutlarını küçülterek daha fazla alan kazanın', type: 'toggle', default: false },
        { id: 'ui-animations', label: 'Arayüz Animasyonları', desc: 'Pencere geçişleri ve menü açılmalarında akıcı efektler kullan', type: 'toggle', default: true }
    ]
};

function switchSettingsTab(cat, el) {
    document.querySelectorAll('.settings-nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');

    const body = document.getElementById('settings-body');
    if (!body) return;

    let titles = { genel: 'Genel', performans: 'Performans', gizlilik: 'Gizlilik ve Güvenlik', gorunum: 'Görünüm' };
    body.innerHTML = `<div class="settings-section-title">${titles[cat]}</div>`;

    const group = document.createElement('div');
    group.className = 'settings-group';

    settingsData[cat].forEach(s => {
        let val;
        const stored = localStorage.getItem('set_' + s.id);
        if (stored !== null) {
            val = (s.type === 'select') ? stored : (stored === 'true');
        } else {
            val = s.default;
            if (s.id === 'start-fullscreen') {
                val = !!document.fullscreenElement;
            }
        }

        const item = document.createElement('div');
        item.className = 'settings-item';
        
        let controlHTML = '';
        if (s.type === 'toggle') {
            controlHTML = `
                <label class="settings-toggle">
                    <input type="checkbox" ${val ? 'checked' : ''} onchange="saveSetting('${s.id}', this.checked)">
                    <span class="settings-slider"></span>
                </label>
            `;
        } else if (s.type === 'select') {
            let optionsHTML = s.options.map(o => `<option value="${o.val}" ${val === o.val ? 'selected' : ''}>${o.name}</option>`).join('');
            controlHTML = `<select class="settings-select" onchange="saveSetting('${s.id}', this.value)">${optionsHTML}</select>`;
        } else if (s.type === 'button') {
            controlHTML = `<button class="settings-btn" onclick="executeSettingAction('${s.action}')">${s.btnText}</button>`;
        }

        item.innerHTML = `
            <div>
                <div class="settings-label">${s.label}</div>
                <div class="settings-desc">${s.desc}</div>
            </div>
            ${controlHTML}
        `;
        group.appendChild(item);
    });

    body.appendChild(group);
}

function saveSetting(id, val) {
    localStorage.setItem('set_' + id, val);
    applySetting(id, val);
    try { 
        require('electron').ipcRenderer.send('settings-update', { id, val }); 
    } catch(e) {}
}

function executeSettingAction(action) {
    if (action === 'setDefaultBrowser') {
        try {
            require('electron').ipcRenderer.send('set-as-default-browser');
            alert('Tarayıcınız sistem varsayılanı olarak ayarlandı!');
        } catch(e) {
            alert('Varsayılan tarayıcı ayarlama işlemi bu ortamda destekleniyor.');
        }
    }
}

function applySetting(id, val) {
    if (id === 'fps-meter') {
        const fpsEl = document.getElementById('fps-display');
        if (fpsEl) fpsEl.style.display = (val === true || val === 'true') ? 'block' : 'none';
    } else if (id === 'start-fullscreen' && (val === true || val === 'true')) {
        try {
            require('electron').ipcRenderer.send('set-fullscreen', true);
        } catch(e) {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        }
    }
}

function applyStoredSettings() {
    Object.values(settingsData).flat().forEach(s => {
        const stored = localStorage.getItem('set_' + s.id);
        const val = stored !== null ? stored : s.default;
        applySetting(s.id, val);
    });
}

function resetSettings() {
    Object.values(settingsData).flat().forEach(s => localStorage.removeItem('set_' + s.id));
    location.reload();
}

function toggleSettings() {
    createSettingsPanel();
    const p = document.getElementById('settings-panel');
    const o = document.getElementById('settings-overlay');
    if (!p || !o) return;

    if (p.style.display === 'none' || p.style.display === '') {
        p.style.display = 'flex'; 
        o.style.display = 'block';
        setTimeout(() => { 
            p.style.transform = 'translate(-50%, -50%) scale(1)'; 
            p.style.opacity = '1'; 
        }, 10);
    } else {
        p.style.transform = 'translate(-50%, -50%) scale(0.95)'; 
        p.style.opacity = '0';
        setTimeout(() => { 
            p.style.display = 'none'; 
            o.style.display = 'none'; 
        }, 250);
    }
}