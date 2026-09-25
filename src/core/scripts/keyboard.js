let isShift = false;
let isCapsLock = false;
let lastActiveElement = null;

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

document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        lastActiveElement = e.target;
    }
});

document.addEventListener('click', (e) => {
    const target = e.target.closest('input, textarea, [contenteditable="true"]');
    if (target) {
        lastActiveElement = target;
    }
}, true);

function initKeys() {
    const kbContainer = document.getElementById('keyboard');
    if (!kbContainer) return;

    const currentMap = (isShift || isCapsLock) ? keyMapShift : keyMapStandard;
    const fragment = document.createDocumentFragment();

    currentMap.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'kb-row';
        
        row.forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'kb-key';
            btn.textContent = key;

            if (key === "BOŞLUK") btn.style.flex = "6";
            if (key === "Enter") { 
                btn.style.flex = "2"; 
                btn.style.background = "var(--accent)"; 
                btn.textContent = "ENTER"; 
            }
            if (key === "⌫") btn.style.background = "#e74c3c";
            if (key === "Caps" && isCapsLock) btn.classList.add('active');
            if (key === "⇧" && isShift) btn.classList.add('active');
            if (key === "Kapat") btn.style.background = "#ff4757";

            rowDiv.appendChild(btn);
        });
        fragment.appendChild(rowDiv);
    });

    kbContainer.innerHTML = '';
    kbContainer.appendChild(fragment);

    if (!kbContainer.hasListener) {
        kbContainer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const keyElement = e.target.closest('.kb-key');
            if (keyElement) {
                handleKeyPress(keyElement.textContent);
            }
        });
        kbContainer.hasListener = true;
    }
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

    const activeEl = (lastActiveElement && document.contains(lastActiveElement)) ? lastActiveElement : document.activeElement;

    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;
        const val = activeEl.value;

        if (k === '⌫') {
            if (start !== end) {
                activeEl.value = val.slice(0, start) + val.slice(end);
                activeEl.setSelectionRange(start, start);
            } else if (start > 0) {
                activeEl.value = val.slice(0, start - 1) + val.slice(start);
                activeEl.setSelectionRange(start - 1, start - 1);
            }
        } else if (k === 'ENTER' || k === 'Enter') {
            activeEl.blur();
            toggleKeyboard();
        } else if (k === 'BOŞLUK') {
            activeEl.value = val.slice(0, start) + ' ' + val.slice(end);
            activeEl.setSelectionRange(start + 1, start + 1);
        } else if (k === 'Tab') {
            activeEl.value = val.slice(0, start) + '\t' + val.slice(end);
            activeEl.setSelectionRange(start + 1, start + 1);
        } else if (k === 'Ctrl' || k === 'Alt' || k === 'AltGr') {
            return;
        } else {
            activeEl.value = val.slice(0, start) + k + val.slice(end);
            activeEl.setSelectionRange(start + 1, start + 1);
        }

        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        activeEl.dispatchEvent(new Event('change', { bubbles: true }));

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
        const currentActive = document.activeElement;
        if (currentActive && (currentActive.tagName === 'INPUT' || currentActive.tagName === 'TEXTAREA')) {
            lastActiveElement = currentActive;
        }
        initKeys();
    }
}