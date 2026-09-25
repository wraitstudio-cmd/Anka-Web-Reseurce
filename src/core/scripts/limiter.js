function createLimitPanel() {
    if (document.getElementById('limit-panel')) return;

    const styles = `
    <style>
        #limit-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); z-index: 100000; }
        #limit-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 420px; background: #181825; color: #cdd6f4; border-radius: 24px; box-shadow: 0 30px 70px rgba(0,0,0,0.9); z-index: 100001; border: 1px solid #313244; font-family: 'Segoe UI', sans-serif; padding: 30px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); opacity: 0; }
        .limit-item { margin-bottom: 25px; }
        .limit-item label { display: block; margin-bottom: 12px; font-size: 14px; color: #bac4de; }
        .limit-slider { width: 100%; height: 6px; background: #313244; border-radius: 3px; appearance: none; outline: none; }
        .limit-slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; background: #89b4fa; border-radius: 50%; cursor: pointer; transition: 0.2s; }
        .l-btn-act { width: 100%; background: #89b4fa; border: none; padding: 12px; border-radius: 12px; cursor: pointer; font-weight: bold; color: #11111b; font-size: 15px; transition: 0.2s; }
        .l-btn-act:hover { background: #b4befe; }
        .toast { position: fixed; bottom: 20px; right: 20px; background: #313244; color: #a6e3a1; padding: 15px 25px; border-radius: 12px; border: 1px solid #45475a; box-shadow: 0 10px 20px rgba(0,0,0,0.3); z-index: 100002; transform: translateY(100px); transition: 0.4s; }
    </style>`;

    document.head.insertAdjacentHTML('beforeend', styles);

    const html = `
    <div id="limit-overlay" onclick="toggleLimit()"></div>
    <div id="limit-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
            <h2 style="margin:0; font-size:20px; color:#89b4fa;">Anka Web Limitleyici</h2>
            <button onclick="toggleLimit()" style="background:none; border:none; color:#585b70; cursor:pointer; font-size:20px;">✕</button>
        </div>
        <div class="limit-item">
            <label>RAM Kullanımı: <span id="ram-val" style="color:#89b4fa; font-weight:bold;">8 GB</span></label>
            <input type="range" class="limit-slider" min="1" max="32" value="8" oninput="updateVal('ram-val', this.value, ' GB')">
        </div>
        <div class="limit-item">
            <label>CPU Kullanımı: <span id="cpu-val" style="color:#89b4fa; font-weight:bold;">50 %</span></label>
            <input type="range" class="limit-slider" min="10" max="100" value="50" oninput="updateVal('cpu-val', this.value, ' %')">
        </div>
        <div class="limit-item">
            <label>GPU Hızlandırma: <input type="checkbox" id="gpu-check" checked style="float:right;"></label>
        </div>
        <button class="l-btn-act" onclick="applyLimits()">Sınırları Uygula</button>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}

function updateVal(id, val, suffix) {
    document.getElementById(id).innerText = val + suffix;
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.style.transform = 'translateY(0)', 10);
    setTimeout(() => { t.style.transform = 'translateY(100px)'; setTimeout(() => t.remove(), 400); }, 3000);
}

function toggleLimit() {
    createLimitPanel();
    const p = document.getElementById('limit-panel'), o = document.getElementById('limit-overlay');
    if (p.style.display === 'block') {
        p.style.transform = 'translate(-50%, -50%) scale(0.9)'; p.style.opacity = '0';
        o.style.display = 'none';
        setTimeout(() => p.style.display = 'none', 300);
    } else {
        p.style.display = 'block'; o.style.display = 'block';
        setTimeout(() => { p.style.transform = 'translate(-50%, -50%) scale(1)'; p.style.opacity = '1'; }, 10);
    }
}

function applyLimits() {
    const ram = document.getElementById('ram-val').innerText;
    const cpu = document.getElementById('cpu-val').innerText;
    const gpu = document.getElementById('gpu-check').checked;

    showToast('Ayarlar güncellendi: ' + ram + ', ' + cpu);
    try { require('electron').ipcRenderer.send('apply-limits', { ram, cpu, gpu }); } catch(e) {}
    toggleLimit();
}