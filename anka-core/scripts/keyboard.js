let isShift = false;
let isCapsLock = false;

const keyMapStandard = [
    ["\"", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "-", "⌫"],
    ["Tab", "q", "w", "e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
    ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i", "Enter"],
    ["⇧", "z", "x", "c", "v", "b", "n", "m", "ö", "ç", ".", ",", "⇧"],
    ["Ctrl", "Alt", "BOŞLUK", "AltGr", "Kapat"]
];

const keyMapShift = [
    ["é", "!", "'", "^", "+", "%", "&", "/", "(", ")", "=", "?", "_", "⌫"],
    ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
    ["Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ", "Enter"],
    ["⇧", "Z", "X", "C", "V", "B", "N", "M", "Ö", "Ç", ":", ";", "⇧"],
    ["Ctrl", "Alt", "BOŞLUK", "AltGr", "Kapat"]
];

function initKeys() {
    const kbContainer = document.getElementById('keyboard');
    if (!kbContainer) return;
    kbContainer.innerHTML = '';

    const currentMap = (isShift || isCapsLock) ? keyMapShift : keyMapStandard;

    currentMap.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'kb-row';
        row.forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'kb-key';
            btn.innerText = key;

            if (key === "BOŞLUK") btn.style.flex = "6";
            if (key === "ENTER" || key === "Enter") { btn.style.flex = "2"; btn.style.background = "var(--accent)"; btn.innerText = "ENTER"; }
            if (key === "⌫") btn.style.background = "#e74c3c";
            if (key === "Caps" && isCapsLock) btn.classList.add('active');
            if (key === "⇧" && isShift) btn.classList.add('active');
            if (key === "Kapat") btn.style.background = "#ff4757";

            btn.onmousedown = (e) => {
                e.preventDefault();
                handleKeyPress(key);
            };

            rowDiv.appendChild(btn);
        });
        kbContainer.appendChild(rowDiv);
    });
}

function handleKeyPress(k) {
    if (k === 'Kapat') {
        toggleKeyboard();
        return;
    }
    if (k === '⇧') {
        isShift = !isShift;
        initKeys();
        return;
    }
    if (k === 'Caps') {
        isCapsLock = !isCapsLock;
        initKeys();
        return;
    }

    const activeEl = document.activeElement;

    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        if (k === '⌫') {
            activeEl.value = activeEl.value.slice(0, -1);
        } else if (k === 'ENTER' || k === 'Enter') {
            toggleKeyboard();
        } else if (k === 'BOŞLUK') {
            activeEl.value += ' ';
        } else if (k === 'Tab') {
            activeEl.value += '\t';
        } else if (k === 'Ctrl' || k === 'Alt' || k === 'AltGr') {
            return;
        } else {
            activeEl.value += k;
        }
        if (isShift && !isCapsLock) {
            isShift = false;
            initKeys();
        }
    } else {
        const wv = document.querySelector('webview.active');
        if (!wv) return;

        if (k === '⌫') {
            wv.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' });
        } else if (k === 'ENTER' || k === 'Enter') {
            wv.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
        } else if (k === 'BOŞLUK') {
            wv.sendInputEvent({ type: 'char', keyCode: ' ' });
        } else if (k === 'Tab') {
            wv.sendInputEvent({ type: 'char', keyCode: '\t' });
        } else if (k === 'Ctrl' || k === 'Alt' || k === 'AltGr') {
            return;
        } else {
            wv.sendInputEvent({ type: 'char', keyCode: k });
        }
        if (isShift && !isCapsLock) {
            isShift = false;
            initKeys();
        }
    }
}

function toggleKeyboard() {
    const kb = document.getElementById('keyboard');
    if (!kb) return;
    kb.classList.toggle('open');
    if (kb.classList.contains('open')) {
        initKeys();
    }
}