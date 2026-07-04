function createSettingsPanel() {
    if (document.getElementById('settings-panel')) return;

    const styles = `
    <style>
        #settings-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 650px; height: 500px; background: #181825; color: #cdd6f4; border-radius: 20px; box-shadow: 0 25px 60px rgba(0,0,0,0.8); z-index: 100001; border: 1px solid #313244; font-family: sans-serif; opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; display: flex; }
        .nav-item { padding: 12px; cursor: pointer; border-radius: 8px; transition: 0.2s; color: #a6adc8; }
        .nav-item:hover { background: #313244; color: #fff; }
        .set-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: #313244; border-radius: 10px; margin-bottom: 10px; transition: 0.2s; }
        .set-item:hover { background: #45475a; }
        #fps-display { position: fixed; top: 50px; right: 20px; z-index: 999999; background: #000; color: #0f0; padding: 5px 10px; border-radius: 5px; display: none; font-family: monospace; pointer-events: none; }
    </style>`;

    document.head.insertAdjacentHTML('beforeend', styles);
    if(!document.getElementById('fps-display')) document.body.insertAdjacentHTML('beforeend', `<div id="fps-display">FPS: 60</div>`);

    const settingsHTML = `
    <div id="settings-panel">
        <div style="width: 200px; background: #11111b; padding: 20px; border-right: 1px solid #313244;">
            <h3 style="margin-top:0; color:#89b4fa;">Ayarlar</h3>
            <div class="nav-item" onclick="showCategory('genel')">Genel</div>
            <div class="nav-item" onclick="showCategory('performans')">Performans</div>
            <div class="nav-item" onclick="showCategory('gizlilik')">Gizlilik</div>
            <div class="nav-item" onclick="resetSettings()" style="color:#f38ba8; margin-top:50px;">Ayarları Sıfırla</div>
        </div>
        <div style="flex:1; padding:25px; overflow-y:auto;" id="settings-body"></div>
        <button onclick="toggleSettings()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:#585b70; cursor:pointer; font-size:20px;">✕</button>
    </div>
    <div id="settings-overlay" onclick="toggleSettings()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); z-index:100000;"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHTML);
    applyStoredSettings();
    showCategory('genel');
}

const settingsData = {
    genel: [
        { id: 'notifications', label: 'Bildirimler', default: true },
        { id: 'auto-save', label: 'Otomatik Kayıt', default: true },
        { id: 'start-fullscreen', label: 'Tam Ekran Başlat', default: false }
    ],
    performans: [
        { id: 'hw-accel', label: 'Donanım Hızlandırma', default: true },
        { id: 'fps-meter', label: 'FPS Göstergesi', default: false },
        { id: 'gpu-render', label: 'GPU Render', default: true },
        { id: 'smooth-scrolling', label: 'Akıcı Kaydırma', default: true }
    ],
    gizlilik: [
        { id: 'ad-block', label: 'Reklam Engelleyici', default: true },
        { id: 'track-protect', label: 'İzleyici Koruması', default: true },
        { id: 'clear-cache-exit', label: 'Çıkışta Önbelleği Sil', default: false }
    ]
};

function showCategory(cat) {
    const body = document.getElementById('settings-body');
    body.innerHTML = `<h2 style="margin-top:0; color:#cdd6f4;">${cat.toUpperCase()}</h2>`;
    settingsData[cat].forEach(s => {
        const val = localStorage.getItem('set_' + s.id) === 'true';
        const item = document.createElement('div');
        item.className = 'set-item';
        item.innerHTML = `<span>${s.label}</span>
        <input type="checkbox" ${val ? 'checked' : ''} onchange="saveSetting('${s.id}', this.checked)">`;
        body.appendChild(item);
    });
}

function saveSetting(id, val) {
    localStorage.setItem('set_' + id, val);
    applySetting(id, val);
    try { require('electron').ipcRenderer.send('settings-update', { id, val }); } catch(e) {}
}

function applySetting(id, val) {
    if (id === 'fps-meter') document.getElementById('fps-display').style.display = val ? 'block' : 'none';
}

function applyStoredSettings() {
    Object.values(settingsData).flat().forEach(s => {
        const val = localStorage.getItem('set_' + s.id) === 'true' || (localStorage.getItem('set_' + s.id) === null && s.default);
        applySetting(s.id, val);
    });
}

function resetSettings() {
    Object.values(settingsData).flat().forEach(s => localStorage.removeItem('set_' + s.id));
    location.reload();
}

function toggleSettings() {
    createSettingsPanel();
    const p = document.getElementById('settings-panel'), o = document.getElementById('settings-overlay');
    if (p.style.display === 'none' || p.style.display === '') {
        p.style.display = 'flex'; o.style.display = 'block';
        setTimeout(() => { p.style.transform = 'translate(-50%, -50%) scale(1)'; p.style.opacity = '1'; }, 10);
    } else {
        p.style.transform = 'translate(-50%, -50%) scale(0.9)'; p.style.opacity = '0';
        setTimeout(() => { p.style.display = 'none'; o.style.display = 'none'; }, 300);
    }
}
