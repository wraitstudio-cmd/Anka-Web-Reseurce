function createHelpPanel() {
    if (document.getElementById('help-panel')) return;

    const styles = `
    <style>
        #help-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 520px; max-height: 85vh; background: #1e1e2e; color: #cdd6f4; padding: 30px; border-radius: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); z-index: 100001; border: 1px solid #45475a; font-family: 'Segoe UI', sans-serif; overflow-y: auto; opacity: 0; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        #help-panel::-webkit-scrollbar { width: 8px; }
        #help-panel::-webkit-scrollbar-track { background: #181825; border-radius: 4px; }
        #help-panel::-webkit-scrollbar-thumb { background: #313244; border-radius: 4px; }
        #help-panel::-webkit-scrollbar-thumb:hover { background: #45475a; }
        .help-search { width: 100%; padding: 12px 16px; background: #11111b; border: 1px solid #313244; border-radius: 14px; color: #cdd6f4; font-size: 14px; outline: none; margin-bottom: 20px; transition: border-color 0.2s; box-sizing: border-box; }
        .help-search:focus { border-color: #89b4fa; }
        .help-section { background: rgba(137, 180, 250, 0.05); padding: 20px; border-radius: 20px; border: 1px dashed #89b4fa; margin-bottom: 20px; transition: transform 0.2s, background 0.2s; }
        .help-section:hover { background: rgba(137, 180, 250, 0.08); }
        .help-img-container { overflow: hidden; border-radius: 14px; border: 2px solid #313244; margin-top: 12px; position: relative; background: #11111b; }
        .help-img-container img { width: 100%; display: block; transition: transform 0.3s; }
        .help-img-container img:hover { transform: scale(1.03); }
        .help-zoom-btn { position: absolute; bottom: 10px; right: 10px; background: rgba(30,30,46,0.8); color: #cdd6f4; border: 1px solid #45475a; padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; backdrop-filter: blur(4px); transition: background 0.2s; }
        .help-zoom-btn:hover { background: #89b4fa; color: #11111b; }
        #help-lightbox { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 100005; justify-content: center; align-items: center; cursor: zoom-out; }
        #help-lightbox img { max-width: 90%; max-height: 90%; border-radius: 12px; border: 2px solid #45475a; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    </style>`;

    document.head.insertAdjacentHTML('beforeend', styles);

    const helpHTML = `
    <div id="help-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size: 24px; background: #fab387; padding: 5px 10px; border-radius: 12px; color: #11111b;">💡</span>
                <h2 style="margin: 0; font-size: 22px; font-weight: 800;">Kullanım Kılavuzu</h2>
            </div>
            <button onclick="toggleHelp()" style="background:#313244; border:none; color:#f38ba8; cursor:pointer; font-size:18px; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition: 0.2s;" onmouseover="this.style.background='#f38ba8'; this.style.color='#11111b'" onmouseout="this.style.background='#313244'; this.style.color='#f38ba8'">✕</button>
        </div>

        <input type="text" class="help-search" id="help-search-input" placeholder="Rehberde ara..." oninput="filterHelpSections(this.value)">

        <div id="help-sections-container">
            <div class="help-section" data-keywords="kalem çizim cetvel sayfa modu">
                <h3 style="font-size: 17px; margin-top: 0; color: #89b4fa; display:flex; align-items:center; gap:8px;">✏️ Kalem Menüsü Nasıl Açılır?</h3>
                <p style="font-size: 14px; line-height: 1.5; color: #a6adc8; margin-bottom: 10px;">Çizim yapmak, cetvel kullanmak veya sayfa modunu değiştirmek için yandaki <b>KALEM</b> butonuna tıklayın.</p>
                <div class="help-img-container">
                    <img src="assets/icons/kalem-açma.png" onclick="openHelpLightbox(this.src)">
                    <button class="help-zoom-btn" onclick="openHelpLightbox(this.previousElementSibling.src)">Büyüt</button>
                </div>
            </div>

            <div class="help-section" data-keywords="klavye arama yazı yazma">
                <h3 style="font-size: 17px; margin-top: 0; color: #a6e3a1; display:flex; align-items:center; gap:8px;">⌨️ Klavye Nasıl Açılır?</h3>
                <p style="font-size: 14px; line-height: 1.5; color: #a6adc8; margin-bottom: 10px;">Arama yapmak veya yazı yazmak için yan menüdeki <b>KLAVYE</b> simgesine dokunun. Klavye ekranın altında belirecektir.</p>
                <div class="help-img-container">
                    <img src="assets/icons/klavye-açma.png" onclick="openHelpLightbox(this.src)">
                    <button class="help-zoom-btn" onclick="openHelpLightbox(this.previousElementSibling.src)">Büyüt</button>
                </div>
            </div>

            <div class="help-section" data-keywords="sekme yeni sekme limit 5">
                <h3 style="font-size: 17px; margin-top: 0; color: #f9e2af; display:flex; align-items:center; gap:8px;">➕ Sekme Nasıl Açılır?</h3>
                <p style="font-size: 14px; line-height: 1.5; color: #a6adc8; margin-bottom: 10px;">Sekme açmak için sol menüde bulunan <b>SEKME</b> simgesine dokunun. Yeni sekme anında oluşacaktır. Sistemde maksimum <b>5 sekme limiti</b> bulunmaktadır.</p>
                <div class="help-img-container">
                    <img src="assets/icons/sekme-açma.png" onclick="openHelpLightbox(this.src)">
                    <button class="help-zoom-btn" onclick="openHelpLightbox(this.previousElementSibling.src)">Büyüt</button>
                </div>
            </div>
        </div>

        <div style="text-align: center; color: #585b70; font-size: 12px; margin-top: 15px;">
            İpucu: Ayarlar panelinden donanım hızlandırmayı açarak performansı artırabilirsiniz.
        </div>
    </div>
    <div id="help-overlay" onclick="toggleHelp()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index:100000;"></div>
    <div id="help-lightbox" onclick="closeHelpLightbox()">
        <img id="help-lightbox-img" src="">
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', helpHTML);
}

function toggleHelp() {
    createHelpPanel();

    const panel = document.getElementById('help-panel');
    const overlay = document.getElementById('help-overlay');

    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        overlay.style.display = 'block';

        setTimeout(() => {
            panel.style.transform = 'translate(-50%, -50%) scale(1)';
            panel.style.opacity = '1';
        }, 10);

        const settingsPanel = document.getElementById('settings-panel');
        if (settingsPanel) settingsPanel.style.display = 'none';
    } else {
        panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
        panel.style.opacity = '0';
        setTimeout(() => {
            panel.style.display = 'none';
            overlay.style.display = 'none';
        }, 300);
    }
}

function filterHelpSections(query) {
    const q = query.toLowerCase().trim();
    const sections = document.querySelectorAll('.help-section');
    sections.forEach(sec => {
        const text = sec.innerText.toLowerCase();
        const keywords = sec.getAttribute('data-keywords') || '';
        if (text.includes(q) || keywords.includes(q)) {
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