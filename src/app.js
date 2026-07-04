let isSplitMode = false;
let isExamMode = false;

window.onload = () => {
    if(typeof createNewTab === "function") {
        createNewTab('https://www.eba.gov.tr');
    }
    const layer = document.getElementById('draw-layer');
    if(layer) layer.style.pointerEvents = 'none';
    const paintMenu = document.getElementById('paint-menu');
    if(paintMenu) paintMenu.style.display = 'none';
    if(localStorage.getItem('examPassword')) {
        showNotify("Sınav modu sistemde hala aktif!", "warning");
        activateExamLock(localStorage.getItem('examPassword'));
    }
};

function showNotify(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if(!container) return;
    const notification = document.createElement('div');
    const colors = { warning: '#f1c40f', error: '#e74c3c', success: '#2ecc71', info: '#3498db' };
    const icons = { warning: '⚠️', error: '❌', success: '✅', info: 'ℹ️' };
    notification.style.cssText = `
        background: #1e1e2e; color: white; padding: 12px 25px; border-radius: 12px;
        margin-bottom: 10px; border-left: 5px solid ${colors[type]};
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: sans-serif;
        display: flex; align-items: center; gap: 10px; min-width: 300px;
        animation: slideDown 0.4s ease forwards, fadeOut 0.4s ease 2.5s forwards;
    `;
    notification.innerHTML = `<span>${icons[type]}</span> ${message}`;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function toggleSplitScreen() {
    const container = document.getElementById('wv-container');
    const allWebviews = Array.from(document.querySelectorAll('webview'));

    if (!isSplitMode) {
        if (allWebviews.length < 2) {
            showNotify("Ekranı bölmek için en az 2 sekme açık olmalıdır!", "warning");
            return;
        }
        isSplitMode = true;
        container.classList.add('split-mode');
        showNotify("Çoklu ekran modu aktif.", "success");
        allWebviews.forEach((wv, i) => {
            wv.classList.toggle('active', i >= allWebviews.length - 2);
        });
    } else {
        isSplitMode = false;
        container.classList.remove('split-mode');
        showNotify("Tekli ekran moduna dönüldü.", "info");
        allWebviews.forEach((wv, i) => {
            wv.classList.toggle('active', i === allWebviews.length - 1);
        });
        if(typeof switchTab === "function") switchTab(activeTabId);
    }
}

function activateExamMode() {
    const pass = prompt("Sınavı başlatmak için hoca şifresi belirleyin:");
    if (pass && pass.trim() !== "") {
        localStorage.setItem('examPassword', pass);
        activateExamLock(pass);
        showNotify("Sınav modu başlatıldı.", "success");
    }
}

function activateExamLock(pass) {
    isExamMode = true;
    const lockScreen = document.getElementById('exam-lock-screen');
    if(lockScreen) lockScreen.style.display = 'flex';
    if (typeof ipcRenderer !== 'undefined') ipcRenderer.send('enable-exam-restrictions');
}

function unlockExamMode() {
    const input = document.getElementById('exam-unlock-password');
    const storedPass = localStorage.getItem('examPassword');
    if (input.value === storedPass) {
        isExamMode = false;
        document.getElementById('exam-lock-screen').style.display = 'none';
        localStorage.removeItem('examPassword');
        input.value = "";
        if (typeof ipcRenderer !== 'undefined') ipcRenderer.send('disable-exam-restrictions');
        showNotify("Sınav modu kapatıldı.", "success");
    } else {
        showNotify("Hatalı şifre!", "error");
        input.value = "";
    }
}

const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    #wv-container.split-mode {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
        padding: 4px;
        width: 100%;
        height: 100%;
    }
    #wv-container.split-mode webview {
        display: none !important;
    }
    #wv-container.split-mode webview.active {
        display: flex !important;
    }
`;
document.head.appendChild(styleSheet);
