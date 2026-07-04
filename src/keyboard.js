let isShift = false;

const keyMap = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "-"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ", ","],
    ["⇧", "Z", "X", "C", "V", "B", "N", "M", "Ö", "Ç", ".", "⌫"],
    ["BOŞLUK", "ENTER"]
];

function initKeys() {
    const kbContainer = document.getElementById('keyboard');
<<<<<<< HEAD
    kbContainer.innerHTML = '';
=======
    kbContainer.innerHTML = ''; 
>>>>>>> origin/main

    keyMap.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'kb-row';
<<<<<<< HEAD

=======
        
>>>>>>> origin/main
        row.forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'kb-key';
            btn.innerText = key;

            if (key === "BOŞLUK") btn.style.flex = "6";
            if (key === "ENTER") { btn.style.flex = "2"; btn.style.background = "var(--accent)"; }
            if (key === "⌫") btn.style.background = "#e74c3c";
            if (key === "⇧") btn.classList.toggle('active', isShift);

<<<<<<< HEAD

=======
            // Mousedown kullanıyoruz ki input odağı (focus) kaybolmasın
>>>>>>> origin/main
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
    const activeEl = document.activeElement;
<<<<<<< HEAD


=======
    
    // 1. DURUM: Eğer odak senin kendi URL çubuğundaysa (veya kendi inputlarındaysa)
>>>>>>> origin/main
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        if (k === '⌫') {
            activeEl.value = activeEl.value.slice(0, -1);
        } else if (k === 'ENTER') {
            toggleKeyboard();
        } else if (k === 'BOŞLUK') {
            activeEl.value += ' ';
        } else if (k === '⇧') {
            toggleShift();
        } else {
            let char = isShift ? k.toUpperCase() : k.toLowerCase();
            if(k === "I" && !isShift) char = "ı";
            if(k === "İ" && !isShift) char = "i";
            activeEl.value += char;
        }
<<<<<<< HEAD
    }

=======
    } 
    // 2. DURUM: Eğer bir web sitesinin (webview) içindeki bir yere tıklanmışsa
>>>>>>> origin/main
    else {
        const wv = document.querySelector('webview.active');
        if (!wv) return;

        if (k === '⌫') {
            wv.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' });
        } else if (k === 'ENTER') {
            wv.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
        } else if (k === '⇧') {
            toggleShift();
        } else {
            let char = (k === 'BOŞLUK') ? ' ' : (isShift ? k.toUpperCase() : k.toLowerCase());
            if(k === "I" && !isShift) char = "ı";
            if(k === "İ" && !isShift) char = "i";

<<<<<<< HEAD

=======
            // Webview içine karakteri gönder
>>>>>>> origin/main
            wv.sendInputEvent({
                type: 'char',
                keyCode: char
            });
        }
    }
}

function toggleShift() {
    isShift = !isShift;
    initKeys();
}

function toggleKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.classList.toggle('open');
    if(kb.classList.contains('open')) {
        initKeys();
    }
}