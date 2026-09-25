function createHelpPanel() {
    if (document.getElementById('help-panel')) return;

    const styles = `
    <style>
        #help-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 680px; max-height: 85vh; background: var(--panel-bg, #1e1e2e); color: var(--panel-text, #cdd6f4); padding: 30px; border-radius: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); z-index: 100001; border: 1px solid var(--panel-border, #45475a); font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; overflow-y: auto; opacity: 0; transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.2s ease; will-change: transform, opacity; contain: content; }
        body.light-theme #help-panel { --panel-bg: #eff1f5; --panel-text: #4c4f69; --panel-border: #ccd0da; }
        #help-panel::-webkit-scrollbar { width: 8px; }
        #help-panel::-webkit-scrollbar-track { background: var(--scrollbar-track, #181825); border-radius: 4px; }
        body.light-theme #help-panel::-webkit-scrollbar-track { --scrollbar-track: #e6e9ef; }
        #help-panel::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #313244); border-radius: 4px; }
        body.light-theme #help-panel::-webkit-scrollbar-thumb { --scrollbar-thumb: #bcc0cc; }
        #help-panel::-webkit-scrollbar-thumb:hover { background: #45475a; }
        .help-search { width: 100%; padding: 12px 16px; background: var(--search-bg, #11111b); border: 1px solid var(--search-border, #313244); border-radius: 14px; color: var(--panel-text, #cdd6f4); font-size: 14px; outline: none; margin-bottom: 20px; box-sizing: border-box; }
        body.light-theme .help-search { --search-bg: #e6e9ef; --search-border: #bcc0cc; }
        .help-search:focus { border-color: #89b4fa; }
        .help-section { background: var(--sec-bg, rgba(137, 180, 250, 0.05)); padding: 20px; border-radius: 20px; border: 1px dashed #89b4fa; margin-bottom: 20px; contain: layout style paint; }
        body.light-theme .help-section { --sec-bg: rgba(30, 102, 245, 0.05); }
        .help-img-container { overflow: hidden; border-radius: 14px; border: 2px solid var(--img-border, #313244); margin-top: 12px; position: relative; background: var(--img-bg, #11111b); }
        body.light-theme .help-img-container { --img-border: #bcc0cc; --img-bg: #e6e9ef; }
        .help-img-container img { width: 100%; height: auto; display: block; object-fit: contain; }
        .help-zoom-btn { position: absolute; bottom: 10px; right: 10px; background: rgba(30,30,46,0.8); color: #cdd6f4; border: 1px solid #45475a; padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
        .help-zoom-btn:hover { background: #89b4fa; color: #11111b; }
        #help-lightbox { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 100005; justify-content: center; align-items: center; cursor: zoom-out; }
        #help-lightbox img { max-width: 90%; max-height: 90%; width: auto; height: auto; object-fit: contain; border-radius: 12px; border: 2px solid #45475a; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .help-category-tabs { display: flex; gap: 8px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 5px; }
        .help-tab-btn { background: var(--tab-bg, #313244); border: none; color: var(--panel-text, #cdd6f4); padding: 6px 14px; border-radius: 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }
        body.light-theme .help-tab-btn { --tab-bg: #ccd0da; }
        .help-tab-btn.active, .help-tab-btn:hover { background: #89b4fa; color: #11111b; font-weight: 600; }
        .shortcut-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        .shortcut-item { background: var(--shortcut-bg, #11111b); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--shortcut-border, #313244); display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        body.light-theme .shortcut-item { --shortcut-bg: #e6e9ef; --shortcut-border: #bcc0cc; }
        .shortcut-key { background: var(--key-bg, #313244); color: #89b4fa; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: bold; border: 1px solid #45475a; }
        body.light-theme .shortcut-key { --key-bg: #ccd0da; }
    </style>`;

    document.head.insertAdjacentHTML('beforeend', styles);

    const helpHTML = `
    <div id="help-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size: 24px; background: #fab387; padding: 5px 10px; border-radius: 12px; color: #11111b;">💡</span>
                <h2 style="margin: 0; font-size: 22px; font-weight: 800;">Gelişmiş Kullanım ve Sistem Kılavuzu</h2>
            </div>
            <button onclick="toggleHelp()" style="background:var(--tab-bg, #313244); border:none; color:#f38ba8; cursor:pointer; font-size:18px; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>

        <input type="text" class="help-search" id="help-search-input" placeholder="Rehberde, kısayollarda veya özelliklerde ara..." oninput="filterHelpSections(this.value)">

        <div class="help-category-tabs">
            <button class="help-tab-btn active" onclick="filterHelpCategory('all', this)">Tümü</button>
            <button class="help-tab-btn" onclick="filterHelpCategory('arac', this)">Araçlar</button>
            <button class="help-tab-btn" onclick="filterHelpCategory('ayar', this)">Ayarlar & Performans</button>
            <button class="help-tab-btn" onclick="filterHelpCategory('guvenlik', this)">Güvenlik & Gizlilik</button>
            <button class="help-tab-btn" onclick="filterHelpCategory('kisayol', this)">Kısayollar</button>
        </div>

        <div id="help-sections-container">
            <div class="help-section" data-category="arac" data-keywords="kalem çizim cetvel sayfa modu">
                <h3 style="font-size: 17px; margin-top: 0; color: #89b4fa; display:flex; align-items:center; gap:8px;">✏️ Kalem Menüsü ve Çizim Araçları</h3>
                <p style="font-size: 14px; line-height: 1.5; opacity: 0.8; margin-bottom: 10px;">Sayfa üzerinde serbest çizim yapmak, cetvel kullanmak veya özel sayfa modlarını değiştirmek için kalem menüsünü açın.</p>
                <div class="help-img-container">
                    <img src="../../icons/kalem-açma.png" onclick="openHelpLightbox(this.src)" alt="Kalem Açma">
                    <button class="help-zoom-btn" onclick="openHelpLightbox(this.previousElementSibling.src)">Büyüt</button>
                </div>
            </div>

            <div class="help-section" data-category="arac" data-keywords="klavye arama yazı yazma sanal">
                <h3 style="font-size: 17px; margin-top: 0; color: #a6e3a1; display:flex; align-items:center; gap:8px;">⌨️ Sanal Klavye Entegrasyonu</h3>
                <p style="font-size: 14px; line-height: 1.5; opacity: 0.8; margin-bottom: 10px;">Fiziksel klavyenizin olmadığı durumlarda hızlı arama yapmak veya metin alanlarına yazı yazmak için sanal klavyeyi kullanın.</p>
                <div class="help-img-container">
                    <img src="../../icons/klavye-açma.png" onclick="openHelpLightbox(this.src)" alt="Klavye Açma">
                    <button class="help-zoom-btn" onclick="openHelpLightbox(this.previousElementSibling.src)">Büyüt</button>
                </div>
            </div>

            <div class="help-section" data-category="arac" data-keywords="sekme yeni sekme limit yönetim">
                <h3 style="font-size: 17px; margin-top: 0; color: #f9e2af; display:flex; align-items:center; gap:8px;">➕ Gelişmiş Sekme Yönetimi</h3>
                <p style="font-size: 14px; line-height: 1.5; opacity: 0.8; margin-bottom: 10px;">Çoklu sekme yapısını optimize etmek ve bellek tüketimini yönetmek için sol menüdeki sekme araçlarını kullanabilirsiniz.</p>
                <div class="help-img-container">
                    <img src="../../icons/sekme-açma.png" onclick="openHelpLightbox(this.src)" alt="Sekme Açma">
                    <button class="help-zoom-btn" onclick="openHelpLightbox(this.previousElementSibling.src)">Büyüt</button>
                </div>
            </div>

            <div class="help-section" data-category="ayar" data-keywords="donanım hızlandırma performans gpu linux windows ayarlar">
                <h3 style="font-size: 17px; margin-top: 0; color: #fab387; display:flex; align-items:center; gap:8px;">⚡ Donanım Hızlandırma & Platform Optimizasyonu</h3>
                <p style="font-size: 14px; line-height: 1.5; opacity: 0.8; margin-bottom: 10px;">Windows ve Linux işletim sistemlerinde ekran kartı (GPU) desteğini tam verimle kullanmak için ayarlar menüsünden donanım hızlandırmayı aktif tutun. Linux ortamlarında Wayland veya X11 uyumluluğu için bayrak ayarlarını yapılandırabilirsiniz.</p>
            </div>

            <div class="help-section" data-category="guvenlik" data-keywords="güvenlik gizlilik çerezler anti çerez şifreleme koruma">
                <h3 style="font-size: 17px; margin-top: 0; color: #f38ba8; display:flex; align-items:center; gap:8px;">🛡️ Güvenlik ve Gizlilik Denetimi</h3>
                <p style="font-size: 14px; line-height: 1.5; opacity: 0.8; margin-bottom: 10px;">Uygulama yerleşik indirme ve site tarama araçlarıyla potansiyel tehlikeli dosyaları (.exe, .sh, .bat vb.) otomatik olarak işaretler. Gizlilik modunda izleyici engelleyicileri ve güvenli HTTPS yönlendirmelerini etkinleştirebilirsiniz.</p>
            </div>

            <div class="help-section" data-category="kisayol" data-keywords="kısayol yenile tam ekran kapat sekme bul git windows linux">
                <h3 style="font-size: 17px; margin-top: 0; color: #cba6f7; display:flex; align-items:center; gap:8px;">⌨️ Windows & Linux Klavye Kısayolları</h3>
                <div class="shortcut-grid">
                    <div class="shortcut-item"><span>Yeni Sekme</span><span class="shortcut-key">Ctrl + T</span></div>
                    <div class="shortcut-item"><span>Kapananı Geri Aç</span><span class="shortcut-key">Ctrl + Shift + T</span></div>
                    <div class="shortcut-item"><span>Gizli Sekme</span><span class="shortcut-key">Ctrl + Shift + N</span></div>
                    <div class="shortcut-item"><span>Sekmeyi Kapat</span><span class="shortcut-key">Ctrl + W</span></div>
                    <div class="shortcut-item"><span>Adres Çubuğu Odak</span><span class="shortcut-key">Ctrl + L</span></div>
                    <div class="shortcut-item"><span>Sayfayı Yenile</span><span class="shortcut-key">Ctrl + R / F5</span></div>
                    <div class="shortcut-item"><span>Geri / İleri Git</span><span class="shortcut-key">Alt + Sol/Sağ Ok</span></div>
                    <div class="shortcut-item"><span>Sekmeler Arası Geçiş</span><span class="shortcut-key">Ctrl + Tab</span></div>
                    <div class="shortcut-item"><span>Sayfada Bul</span><span class="shortcut-key">Ctrl + F</span></div>
                    <div class="shortcut-item"><span>Sesi Kapat / Aç</span><span class="shortcut-key">Ctrl + Shift + M</span></div>
                    <div class="shortcut-item"><span>Geliştirici Araçları</span><span class="shortcut-key">F12</span></div>
                    <div class="shortcut-item"><span>Tam Ekran</span><span class="shortcut-key">F11</span></div>
                </div>
            </div>
        </div>

        <div style="text-align: center; opacity: 0.6; font-size: 12px; margin-top: 15px;">
            Anka Web Çoklu Platform Yardım ve Güvenlik Sistemi
        </div>
    </div>
    <div id="help-overlay" onclick="toggleHelp()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index:100000;"></div>
    <div id="help-lightbox" onclick="closeHelpLightbox()">
        <img id="help-lightbox-img" src="" alt="Büyütülmüş Görsel">
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', helpHTML);
}

let cachedSections = null;

function toggleHelp() {
    createHelpPanel();

    const panel = document.getElementById('help-panel');
    const overlay = document.getElementById('help-overlay');

    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        overlay.style.display = 'block';

        requestAnimationFrame(() => {
            panel.style.transform = 'translate(-50%, -50%) scale(1)';
            panel.style.opacity = '1';
        });

        const settingsPanel = document.getElementById('settings-panel');
        if (settingsPanel) settingsPanel.style.display = 'none';
    } else {
        panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
        panel.style.opacity = '0';
        setTimeout(() => {
            panel.style.display = 'none';
            overlay.style.display = 'none';
        }, 200);
    }
}

function filterHelpSections(query) {
    const q = query.toLowerCase().trim();
    if (!cachedSections) {
        cachedSections = document.querySelectorAll('.help-section');
    }
    
    cachedSections.forEach(sec => {
        const text = sec.innerText.toLowerCase();
        const keywords = sec.getAttribute('data-keywords') || '';
        if (text.includes(q) || keywords.includes(q)) {
            sec.style.display = 'block';
        } else {
            sec.style.display = 'none';
        }
    });
}

function filterHelpCategory(category, btn) {
    document.querySelectorAll('.help-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (!cachedSections) {
        cachedSections = document.querySelectorAll('.help-section');
    }

    cachedSections.forEach(sec => {
        const cat = sec.getAttribute('data-category');
        if (category === 'all' || cat === category) {
            sec.style.display = 'block';
        } else {
            sec.style.display = 'none';
        }
    });
}

function openHelpLightbox(src) {
    const lb = document.getElementById('help-lightbox');
    const img = document.getElementById('help-lightbox-img');
    img.src = src;
    lb.style.display = 'flex';
}

function closeHelpLightbox() {
    document.getElementById('help-lightbox').style.display = 'none';
}