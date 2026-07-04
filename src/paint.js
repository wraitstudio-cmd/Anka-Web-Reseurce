<<<<<<< HEAD
let canvas = document.querySelector('#main-canvas');
let ctx = canvas.getContext('2d', { willReadFrequently: true });
=======
let canvas = document.querySelector('canvas');
let ctx = canvas.getContext('2d');
>>>>>>> origin/main
let drawing = false;
let paintOpen = false;
let tool = 'pen';
let undoStack = [];

<<<<<<< HEAD

function initCanvas() {
    const container = document.getElementById('draw-layer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (undoStack.length > 0) {
        let img = new Image();
        img.src = undoStack[undoStack.length - 1];
        img.onload = () => ctx.drawImage(img, 0, 0);
    }
}

window.addEventListener('resize', initCanvas);
setTimeout(initCanvas, 100);

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);


canvas.addEventListener('touchstart', (e) => startDrawing(e.touches[0]), { passive: false });
canvas.addEventListener('touchmove', (e) => draw(e.touches[0]), { passive: false });
canvas.addEventListener('touchend', stopDrawing);

function startDrawing(e) {
    if (!paintOpen) return;
    drawing = true;
    saveState();

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    applyStyles();
}

function draw(e) {
    if (!drawing || !paintOpen) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;

    ctx.globalCompositeOperation = (tool === 'eraser') ? 'destination-out' : 'source-over';

    ctx.lineTo(x, y);
    ctx.stroke();
}

function stopDrawing() {
    if (drawing) {
        ctx.closePath();
        drawing = false;
    }
}
=======
// 1. CANVAS BAŞLATMA
function initCanvas() {
    canvas.width = window.innerWidth - 100; 
    canvas.height = window.innerHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

window.addEventListener('resize', initCanvas);
initCanvas();

// 2. ÇİZİM SİSTEMİ
canvas.addEventListener('mousedown', (e) => {
    if(!paintOpen) return;
    drawing = true;
    saveState();
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    applyStyles();
});

canvas.addEventListener('mousemove', (e) => {
    if(!drawing || !paintOpen) return;
    const rect = canvas.getBoundingClientRect();
    ctx.globalCompositeOperation = (tool === 'eraser') ? 'destination-out' : 'source-over';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
});

canvas.addEventListener('mouseup', () => drawing = false);
>>>>>>> origin/main

function applyStyles() {
    const color = document.getElementById('p-color').value;
    const width = document.getElementById('p-width').value;
<<<<<<< HEAD

    ctx.strokeStyle = color;
    ctx.lineWidth = width;

    if (tool === 'neon') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
    } else {
        ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = (tool === 'marker') ? 0.4 : 1.0;
}


=======
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowBlur = (tool === 'neon') ? 20 : 0;
    ctx.shadowColor = color;
    ctx.globalAlpha = (tool === 'marker') ? 0.4 : 1.0;
}

// 3. GELİŞMİŞ SÜRÜKLEME SİSTEMİ (Hata Düzeltildi)
>>>>>>> origin/main
function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const targetHandle = handle || element;

<<<<<<< HEAD
    targetHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('c-btn')) return;
=======
    targetHandle.onmousedown = (e) => {
        e = e || window.event;
        if (e.target.classList.contains('c-btn')) return; // Butonlara basınca sürükleme yapma
>>>>>>> origin/main
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
<<<<<<< HEAD
    }

    function elementDrag(e) {
=======
        element.style.transition = 'none'; // Sürüklerken gecikmeyi önle
    };

    function elementDrag(e) {
        e = e || window.event;
>>>>>>> origin/main
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
<<<<<<< HEAD

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;


        if (newTop < 0) newTop = 0;
        if (newLeft < 0) newLeft = 0;

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
=======
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
>>>>>>> origin/main
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
<<<<<<< HEAD
    }
}


const pMenu = document.getElementById('paint-menu');
if (pMenu) makeDraggable(pMenu, document.getElementById('paint-handle'));


function toggleMathTool(toolId) {
    const el = document.getElementById(toolId);
    if (!el) return;

    if (getComputedStyle(el).display === 'none') {
        el.style.display = 'block';
        el.style.top = "150px";
        el.style.left = "250px";
=======
        element.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }
}

// Menü ve Araçları Sürüklenebilir Yap
const pMenu = document.getElementById('paint-menu');
makeDraggable(pMenu, document.getElementById('paint-handle'));

// 4. GEOMETRİ ARAÇLARI
function toggleMathTool(toolId) {
    const el = document.getElementById(toolId);
    if (!el) return;
    
    if (el.style.display === 'none' || el.style.display === '') {
        el.style.display = 'block';
        el.style.top = "200px";
        el.style.left = "300px";
        
        if(toolId === 'ruler') {
            el.style.width = '550px';
            el.style.height = 'auto';
        } else {
            el.style.width = '380px';
            el.style.height = 'auto';
        }
        
>>>>>>> origin/main
        el.dataset.rotation = 0;
        el.dataset.scale = 1.0;
        updateToolTransform(el);
        makeDraggable(el, el.querySelector('.tool-ctrl'));
    } else {
        el.style.display = 'none';
    }
}

function toolRotate(e, toolId) {
    e.stopPropagation();
    const el = document.getElementById(toolId);
    let r = parseInt(el.dataset.rotation || 0);
    r = (r + 15) % 360;
    el.dataset.rotation = r;
    updateToolTransform(el);
}

function toolScale(e, toolId) {
    e.stopPropagation();
    const el = document.getElementById(toolId);
    let s = parseFloat(el.dataset.scale || 1.0);
<<<<<<< HEAD
    s = (s >= 2.0) ? 0.5 : s + 0.2;
=======
    s = (s >= 1.6) ? 0.6 : s + 0.2;
>>>>>>> origin/main
    el.dataset.scale = s;
    updateToolTransform(el);
}

function updateToolTransform(el) {
    const r = el.dataset.rotation || 0;
    const s = el.dataset.scale || 1;
    el.style.transform = `rotate(${r}deg) scale(${s})`;
}

<<<<<<< HEAD
=======
// 5. MODLAR VE YARDIMCI ARAÇLAR
function setBoardMode(mode) {
    const layer = document.getElementById('draw-layer');
    layer.style.backgroundImage = 'none';
    layer.classList.add('active'); 
    layer.style.backgroundSize = '30px 30px';

    const colors = {
        white: '#ffffff',
        transparent: 'transparent',
        lined: '#ffffff',
        grid: '#ffffff'
    };
    
    layer.style.backgroundColor = colors[mode];
    
    if (mode === 'lined') {
        layer.style.backgroundImage = 'linear-gradient(#e0e0ff 1px, transparent 1px)';
        layer.style.backgroundSize = '100% 35px';
    } else if (mode === 'grid') {
        layer.style.backgroundImage = 'linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px)';
    }
}

function togglePaintMenu() {
    paintOpen = !paintOpen;
    pMenu.style.display = paintOpen ? 'flex' : 'none';
    document.getElementById('draw-layer').classList.toggle('active', paintOpen);
    if(paintOpen) initCanvas();
}
>>>>>>> origin/main

function setTool(t) {
    tool = t;
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('t-' + t)?.classList.add('active');
}

<<<<<<< HEAD
function togglePaintMenu() {
    paintOpen = !paintOpen;
    const menu = document.getElementById('paint-menu');
    const layer = document.getElementById('draw-layer');

    if (paintOpen) {
        menu.style.display = 'flex';
        layer.classList.add('active');
        initCanvas();
    } else {
        menu.style.display = 'none';
        layer.classList.remove('active');
        drawing = false;
    }
}
function setBoardMode(mode) {
    const layer = document.getElementById('draw-layer');
    layer.classList.add('active');

    layer.style.backgroundImage = 'none';
    layer.style.backgroundColor = (mode === 'transparent') ? 'transparent' : '#ffffff';

    if (mode === 'lined') {
        layer.style.backgroundImage = 'linear-gradient(#e0e0ff 1px, transparent 1px)';
        layer.style.backgroundSize = '100% 35px';
    } else if (mode === 'grid') {
        layer.style.backgroundImage = 'linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px)';
        layer.style.backgroundSize = '30px 30px';
    }
}


function saveState() {
    if (undoStack.length >= 25) undoStack.shift();
=======
function saveState() {
    if (undoStack.length > 30) undoStack.shift();
>>>>>>> origin/main
    undoStack.push(canvas.toDataURL());
}

function undo() {
    if (undoStack.length > 0) {
<<<<<<< HEAD
        const lastState = undoStack.pop();
        const img = new Image();
        img.src = lastState;
=======
        let img = new Image();
        img.src = undoStack.pop();
>>>>>>> origin/main
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
}

function clearCanvas() {
<<<<<<< HEAD
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    undoStack = [];
=======
    if(confirm("Tüm sayfayı temizle?")) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        undoStack = [];
    }
>>>>>>> origin/main
}