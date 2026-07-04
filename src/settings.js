<<<<<<< HEAD
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
=======
const fs = require('fs');
const path = require('path');

// Kayıt yolu: Uygulama klasörü içindeki data/settings.json
const settingsPath = path.join(__dirname, '../data/settings.json');

// Varsayılan Ayarlar (FPS kapalı, URL EBA olarak ayarlandı)
let settings = {
    theme: 'dark',
    fpsCounter: false, // İlk açılışta kapalı
    hardwareAccel: true,
    autoSave: true,
    lineSmoothing: true,
    cursorStyle: 'crosshair',
    startupPage: 'https://www.eba.gov.tr', // Varsayılan EBA
    performanceMode: false,
    transparency: 0.95,
    shortcuts: true,
    accentColor: '#2ecc71'
};

// 1. AYARLARI YÜKLE VE KAYDET
function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            const savedSettings = JSON.parse(data);
            // Mevcut ayarları kayıtlı olanlarla birleştir (Yeni özellik eklersek bozulmasın)
            settings = { ...settings, ...savedSettings };
        } else {
            saveSettings();
        }
        applyAllSettings();
    } catch (err) {
        console.error("Yükleme Hatası:", err);
    }
}

function saveSettings() {
    try {
        const dir = path.dirname(settingsPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (err) {
        console.error("Kaydetme Hatası:", err);
    }
}

// 2. FPS SİSTEMİ (Animasyonlu Geçişli)
const fpsEl = document.createElement('div');
fpsEl.id = "fps-display";
fpsEl.style = `
    position: fixed; top: 20px; right: 20px; 
    color: #2ecc71; font-family: 'Consolas', monospace; 
    z-index: 999999; background: rgba(0,0,0,0.85); 
    padding: 8px 15px; border-radius: 12px; 
    border: 1px solid rgba(255,255,255,0.1); 
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0; transform: translateY(-20px);
    pointer-events: none; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
`;
document.body.appendChild(fpsEl);

let lastLoop = Date.now();
function updateFPS() {
    if (!settings.fpsCounter) {
        fpsEl.style.opacity = "0";
        fpsEl.style.transform = "translateY(-20px)";
        return;
    }
    
    // FPS Açıldığında Animasyonla Göster
    fpsEl.style.opacity = "1";
    fpsEl.style.transform = "translateY(0px)";

    let thisLoop = Date.now();
    let fps = Math.round(1000 / (thisLoop - lastLoop));
    lastLoop = thisLoop;
    fpsEl.innerHTML = `<span style="color:#888">FPS:</span> ${fps}`;
    requestAnimationFrame(updateFPS);
}

// 3. TEMA VE STİL SİSTEMİ
function applyAllSettings() {
    const root = document.documentElement;
    
    // Tema Uygula
    if (settings.theme === 'light') {
        root.style.setProperty('--bg', '#ffffff');
        root.style.setProperty('--text', '#1a1a1a');
        root.style.setProperty('--panel', '#f0f0f0');
    } else {
        root.style.setProperty('--bg', '#0a0a0a');
        root.style.setProperty('--text', '#ffffff');
        root.style.setProperty('--panel', '#1a1a1a');
    }

    // Panel Şeffaflığı (Animasyonlu)
    const panel = document.getElementById('settings-panel');
    if (panel) {
        panel.style.backgroundColor = `rgba(26, 26, 26, ${settings.transparency})`;
        panel.style.backdropFilter = `blur(${10 * settings.transparency}px)`;
    }

    // FPS Başlat/Durdur
    updateFPS();

    // İmleç
    document.body.style.cursor = settings.cursorStyle;

    // UI Elemanlarını Güncelle (Beyaz Kalmaması İçin Değer Atıyoruz)
    const elements = {
        'fps-toggle': 'checked',
        'theme-select': 'value',
        'startup-input': 'value',
        'transparency-range': 'value'
    };

    Object.entries(elements).forEach(([id, prop]) => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'startup-input') el.value = settings.startupPage || "https://www.eba.gov.tr";
            else if (prop === 'checked') el.checked = settings.fpsCounter;
            else el[prop] = settings[id.split('-')[0]] || settings[id.replace('-select','').replace('-range','')];
        }
    });
}

// 4. AYAR GÜNCELLEME (Efektli)
function updateSetting(key, value) {
    settings[key] = value;
    saveSettings();
    
    // Küçük Bir Geri Bildirim Animasyonu (Opsiyonel)
    const panel = document.getElementById('settings-panel');
    panel.style.borderColor = settings.accentColor;
    setTimeout(() => panel.style.borderColor = "#333", 300);

    applyAllSettings();
}

// 5. PANEL AÇILIŞ ANİMASYONU
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;

    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        panel.style.transform = "translateX(100%)";
    } else {
        panel.classList.add('open');
        panel.style.transform = "translateX(0)";
        // Panel açıldığında değerleri tekrar kontrol et (beyaz görünmemesi için)
        applyAllSettings();
    }
}

// --- BAŞLATMA ---
document.addEventListener('DOMContentLoaded', loadSettings);
>>>>>>> origin/main
