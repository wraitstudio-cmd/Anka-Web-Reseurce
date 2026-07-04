let canvas = document.querySelector('#main-canvas');
let ctx = canvas.getContext('2d', { willReadFrequently: true });
let drawing = false;
let paintOpen = false;
let tool = 'pen';
let undoStack = [];

function initCanvas() {
    const container = document.getElementById('draw-layer');
    if (!container) return;
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

function applyStyles() {
    const colorEl = document.getElementById('p-color');
    const widthEl = document.getElementById('p-width');
    const color = colorEl ? colorEl.value : '#000000';
    const width = widthEl ? widthEl.value : 5;

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

function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const targetHandle = handle || element;

    targetHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('c-btn')) return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        if (newTop < 0) newTop = 0;
        if (newLeft < 0) newLeft = 0;

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
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
    if (!el) return;
    let r = parseInt(el.dataset.rotation || 0);
    r = (r + 15) % 360;
    el.dataset.rotation = r;
    updateToolTransform(el);
}

function toolScale(e, toolId) {
    e.stopPropagation();
    const el = document.getElementById(toolId);
    if (!el) return;
    let s = parseFloat(el.dataset.scale || 1.0);
    s = (s >= 2.0) ? 0.5 : s + 0.2;
    el.dataset.scale = s;
    updateToolTransform(el);
}

function updateToolTransform(el) {
    const r = el.dataset.rotation || 0;
    const s = el.dataset.scale || 1;
    el.style.transform = `rotate(${r}deg) scale(${s})`;
}

function setTool(t) {
    tool = t;
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('t-' + t)?.classList.add('active');
}

function togglePaintMenu() {
    paintOpen = !paintOpen;
    const menu = document.getElementById('paint-menu');
    const layer = document.getElementById('draw-layer');

    if (!menu || !layer) return;

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
    if (!layer) return;
    
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
    undoStack.push(canvas.toDataURL());
}

function undo() {
    if (undoStack.length > 0) {
        const lastState = undoStack.pop();
        const img = new Image();
        img.src = lastState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    undoStack = [];
}