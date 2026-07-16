

function createHelpPanel() {

    if (document.getElementById('help-panel')) return;

    const helpHTML = `
    <div id="help-panel" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 480px; max-height: 85vh; background: #1e1e2e; color: #cdd6f4; padding: 30px; border-radius: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); z-index: 100001; border: 1px solid #45475a; font-family: 'Segoe UI', sans-serif; overflow-y: auto; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size: 24px; background: #fab387; padding: 5px 10px; border-radius: 12px; color: #11111b;">💡</span>
                <h2 style="margin: 0; font-size: 22px; font-weight: 800;">Kullanım Kılavuzu</h2>
            </div>
            <button onclick="toggleHelp()" style="background:#313244; border:none; color:#f38ba8; cursor:pointer; font-size:18px; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition: 0.2s;" onmouseover="this.style.background='#f38ba8'; this.style.color='#11111b'" onmouseout="this.style.background='#313244'; this.style.color='#f38ba8'">✕</button>
        </div>

        <!-- Kalem Rehberi -->
        <div class="help-section" style="background: rgba(137, 180, 250, 0.05); padding: 20px; border-radius: 20px; border: 1px dashed #89b4fa; margin-bottom: 25px;">
            <h3 style="font-size: 17px; margin-top: 0; color: #89b4fa; display:flex; align-items:center; gap:8px;">✏️ Kalem Menüsü Nasıl Açılır?</h3>
            <p style="font-size: 14px; line-height: 1.5; color: #a6adc8; margin-bottom: 15px;">Çizim yapmak, cetvel kullanmak veya sayfa modunu değiştirmek için yandaki <b>KALEM</b> butonuna tıklayın.</p>
            <div style="overflow: hidden; border-radius: 14px; border: 2px solid #313244;">
                <img src="assets/icons/kalem-açma.png" style="width: 100%; display: block; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'">
            </div>
        </div>

        <!-- Klavye Rehberi -->
        <div class="help-section" style="background: rgba(166, 227, 161, 0.05); padding: 20px; border-radius: 20px; border: 1px dashed #a6e3a1; margin-bottom: 25px;">
            <h3 style="font-size: 17px; margin-top: 0; color: #a6e3a1; display:flex; align-items:center; gap:8px;">⌨️ Klavye Nasıl Açılır?</h3>
            <p style="font-size: 14px; line-height: 1.5; color: #a6adc8; margin-bottom: 15px;">Arama yapmak veya yazı yazmak için yan menüdeki <b>KLAVYE</b> simgesine dokunun. Klavye ekranın altında belirecektir.</p>
            <div style="overflow: hidden; border-radius: 14px; border: 2px solid #313244;">
                <img src="assets/icons/klavye-açma.png" style="width: 100%; display: block; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'">
            </div>
        </div>

        <div class="help-section" style="background: rgba(166, 227, 161, 0.05); padding: 20px; border-radius: 20px; border: 1px dashed #a6e3a1; margin-bottom: 25px;">
            <h3 style="font-size: 17px; margin-top: 0; color: #a6e3a1; display:flex; align-items:center; gap:8px;">➕ Sekme Nasıl Açılır?</h3>
            <p style="font-size: 14px; line-height: 1.5; color: #a6adc8; margin-bottom: 15px;">Sekme açmak için Sol menüde bulunan <b>SEKME</b> simgesine dokunun. Yeni sekme anında oluşacaktır Ama 5 sekme Limiti vardır.</p>
            <div style="overflow: hidden; border-radius: 14px; border: 2px solid #313244;">
                <img src="assets/icons/sekme-açma.png" style="width: 100%; display: block; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'">
            </div>
        </div>

        <div style="text-align: center; color: #585b70; font-size: 12px; margin-top: 10px;">
            İpucu: Ayarlar panelinden donanım hızlandırmayı açarak performansı artırabilirsiniz.
        </div>
    </div>
    <div id="help-overlay" onclick="toggleHelp()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index:100000;"></div>
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


        if(document.getElementById('settings-panel')) document.getElementById('settings-panel').style.display = 'none';
    } else {
        panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
        panel.style.opacity = '0';
        setTimeout(() => {
            panel.style.display = 'none';
            overlay.style.display = 'none';
        }, 300);
    }
}