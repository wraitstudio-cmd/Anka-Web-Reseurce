let canvas = document.querySelector('#main-canvas');
let ctx = canvas.getContext('2d', { willReadFrequently: true });
let drawing = false;
let paintOpen = false;
let tool = 'pen';
let undoStack = [];
let redoStack = [];
let persistentCanvasState = null;

let isSelecting = false;
let startX = 0, startY = 0;
let selectionStartClientX = 0;
let selectionStartClientY = 0;

let shapeStartX = 0;
let shapeStartY = 0;
let isShapeDrawing = false;
let isFilled = false;
let shapeSnapshot = null;
let shapeFrameId = 0;
let pendingShapePoint = null;

let pageZoom = 1;
let pageViewSnapshot = null;

const activeTouches = new Map();
let activePointerId = null;
const captureImage = document.getElementById('capture-image');
const captureCanvas = document.getElementById('capture-canvas');
const captureStage = document.getElementById('capture-stage');
const captureWorkspace = document.getElementById('capture-workspace');
const captureCtx = captureCanvas ? captureCanvas.getContext('2d', { willReadFrequently: true }) : null;
let captureDrawing = false;
let captureShapeDrawing = false;
let captureShapeStartX = 0;
let captureShapeStartY = 0;
let captureShapeSnapshot = null;
let captureSourceRect = null;
let captureZoom = 1;
let captureReturnState = null;
const capturePointers = new Map();
let capturePinchDistance = 0;
let pageInteraction = false;
let boardMode = 'transparent';
let boardCustomColor = '#ffffff';
const paintCursor = document.getElementById('paint-cursor');
let laserPointerActive = false;
let timerToolId = 0;

function getPaintIpc() {
    try {
        if (window.electronAPI && typeof window.electronAPI.send === 'function') return window.electronAPI;
        const { ipcRenderer } = require('electron');
        return ipcRenderer;
    } catch (err) {
        return window.electronAPI && typeof window.electronAPI.invoke === 'function' ? window.electronAPI : null;
    }
}

function persistDrawing() {
    if (localStorage.getItem('set_drawing-recovery') === 'false' || localStorage.getItem('set_auto-save') === 'false') return;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;
    const dataUrl = canvas.toDataURL('image/png');
    const ipc = getPaintIpc();
    if (ipc && typeof ipc.send === 'function') {
        ipc.send('save-drawing-png', dataUrl);
    } else {
        localStorage.setItem('anka-drawing-local', dataUrl);
    }
}

function saveDrawingNow() {
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return false;
    const ipc = getPaintIpc();
    const dataUrl = canvas.toDataURL('image/png');
    persistentCanvasState = dataUrl;
    if (ipc && typeof ipc.send === 'function') {
        ipc.send('save-drawing-png', dataUrl);
    } else {
        localStorage.setItem('anka-drawing-local', dataUrl);
    }
    if (typeof showToast === 'function') showToast('Çizim kaydedildi.');
    return true;
}

async function restoreDrawing() {
    if (localStorage.getItem('set_drawing-recovery') === 'false') return;
    const ipc = getPaintIpc();
    if (!ipc || typeof ipc.invoke !== 'function') {
        persistentCanvasState = localStorage.getItem('anka-drawing-local');
        return;
    }
    try {
        const saved = await ipc.invoke('load-drawing-png');
        persistentCanvasState = saved || localStorage.getItem('anka-drawing-local');
        if (paintOpen) initCanvas(true);
    } catch (err) {
        persistentCanvasState = localStorage.getItem('anka-drawing-local');
    }
}

function initCanvas(force = false) {
    const container = document.getElementById('draw-layer');
    if (!container) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    if (!force && canvas.width === width && canvas.height === height) return;
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    if (canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = width;
    canvas.height = height;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (persistentCanvasState) {
        let img = new Image();
        img.src = persistentCanvasState;
        img.onload = () => ctx.drawImage(img, 0, 0);
    } else if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0);
    } else if (undoStack.length > 0) {
        let img = new Image();
        img.src = undoStack[undoStack.length - 1];
        img.onload = () => ctx.drawImage(img, 0, 0);
    }
}

window.addEventListener('resize', initCanvas);

function initializePaintSurface() {
    applyTouchModePreference();
    resetPaintLayerForStartup();
    initCanvas();
    const layer = document.getElementById('draw-layer');
    if (layer && typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(() => {
            if (layer.clientWidth > 0 && layer.clientHeight > 0) initCanvas();
        });
        observer.observe(layer);
    }
}

function resetPaintLayerForStartup() {
    const layer = document.getElementById('draw-layer');
    if (!layer) return;
    paintOpen = false;
    pageInteraction = false;
    layer.classList.remove('active', 'page-interaction');
    layer.style.pointerEvents = 'none';
    layer.style.touchAction = 'auto';
    canvas.style.pointerEvents = 'none';
    canvas.style.touchAction = 'auto';
}

function applyTouchModePreference() {
    let stored = localStorage.getItem('set_touch-mode');
    if (stored === null) {
        stored = 'true';
        localStorage.setItem('set_touch-mode', stored);
    }
    const enabled = stored === 'true';
    document.body.classList.toggle('touch-mode', enabled);
    document.documentElement.classList.toggle('touch-mode', enabled);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePaintSurface, { once: true });
} else {
    initializePaintSurface();
}

canvas.addEventListener('pointerdown', (e) => {
    if (!paintOpen || activePointerId !== null || e.button !== 0) return;
    activePointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    startDrawing(e, e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === activePointerId) draw(e, e.clientX, e.clientY);
});
const finishPointerDrawing = (e) => {
    if (e.pointerId !== activePointerId) return;
    stopDrawing(e);
    activePointerId = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
};
canvas.addEventListener('pointerup', finishPointerDrawing);
canvas.addEventListener('pointercancel', finishPointerDrawing);
canvas.addEventListener('lostpointercapture', () => {
    drawing = false;
    isSelecting = false;
    isShapeDrawing = false;
    shapeSnapshot = null;
    pendingShapePoint = null;
    if (shapeFrameId) cancelAnimationFrame(shapeFrameId);
    shapeFrameId = 0;
    activePointerId = null;
});

const paintMenuEl = document.getElementById('paint-menu');
if (paintMenuEl) {
    paintMenuEl.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

const opacityControl = document.getElementById('p-opacity');
if (opacityControl) {
    opacityControl.addEventListener('input', applyStyles);
}

function updatePaintCursor(event) {
    if (!paintCursor || !paintOpen || pageInteraction || !['pen', 'highlighter', 'neon', 'eraser'].includes(tool)) return;
    const widthEl = document.getElementById('p-width');
    const width = Math.max(2, parseInt(widthEl ? widthEl.value : '4', 10));
    const size = tool === 'highlighter' ? Math.max(width, 18) : width;
    paintCursor.style.left = `${event.clientX}px`;
    paintCursor.style.top = `${event.clientY}px`;
    paintCursor.style.width = `${size}px`;
    paintCursor.style.height = `${size}px`;
    paintCursor.style.borderColor = tool === 'eraser' ? '#f4f4f5' : (document.getElementById('p-color')?.value || '#ff4757');
    paintCursor.classList.add('visible');
}

function hidePaintCursor() {
    if (paintCursor) paintCursor.classList.remove('visible');
}

canvas.addEventListener('pointermove', updatePaintCursor, { passive: true });
canvas.addEventListener('pointerenter', updatePaintCursor, { passive: true });
canvas.addEventListener('pointerleave', hidePaintCursor, { passive: true });
canvas.addEventListener('pointerup', hidePaintCursor, { passive: true });

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pageZoom !== 1) resetPageZoom();
    if (e.target && typeof e.target.matches === 'function' && e.target.matches('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === '+' || e.key === '=' || e.key === 'Add') {
        e.preventDefault();
        zoomPageIn();
    } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
        e.preventDefault();
        zoomPageOut();
    } else if (e.key === '0') {
        e.preventDefault();
        resetPageZoom();
    }
});

function startDrawing(e, clientX, clientY) {
    if (!paintOpen) return;
    const point = getCanvasPoint(clientX, clientY);

    if (tool === 'select') {
        isSelecting = true;
        startX = point.cssX;
        startY = point.cssY;
        selectionStartClientX = clientX;
        selectionStartClientY = clientY;
        
        const selBox = document.getElementById('selection-box');
        const selOverlay = document.getElementById('selection-overlay');
        
        if (selOverlay) selOverlay.style.display = 'block';
        if (selBox) {
            selBox.style.left = startX + 'px';
            selBox.style.top = startY + 'px';
            selBox.style.width = '0px';
            selBox.style.height = '0px';
            selBox.style.display = 'block';
        }
        return;
    }

    if (tool === 'text') {
        openTextInput(point.x, point.y);
        return;
    }

    if (['line', 'rect', 'circle', 'arrow'].includes(tool)) {
        isShapeDrawing = true;
        shapeStartX = point.x;
        shapeStartY = point.y;
        pendingShapePoint = point;
        saveState();
        shapeSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        persistentCanvasState = canvas.toDataURL();
        return;
    }

    drawing = true;
    saveState();

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    applyStyles();
}

function getCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    const cssX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const cssY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    return { x: cssX * scaleX, y: cssY * scaleY, cssX, cssY };
}

function draw(e, clientX, clientY) {
    if (!paintOpen) return;
    const point = getCanvasPoint(clientX, clientY);

    if (tool === 'select' && isSelecting) {
        const selBox = document.getElementById('selection-box');
        if (selBox) {
            const boxLeft = Math.min(startX, point.cssX);
            const boxTop = Math.min(startY, point.cssY);
            const boxWidth = Math.abs(clientX - selectionStartClientX);
            const boxHeight = Math.abs(clientY - selectionStartClientY);

            selBox.style.left = boxLeft + 'px';
            selBox.style.top = boxTop + 'px';
            selBox.style.width = boxWidth + 'px';
            selBox.style.height = boxHeight + 'px';
        }
        return;
    }

    if (isShapeDrawing && shapeSnapshot) {
        pendingShapePoint = point;
        scheduleShapePreview();
        return;
    }

    if (!drawing) return;

    ctx.globalCompositeOperation = (tool === 'eraser') ? 'destination-out' : 'source-over';
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
}

function stopDrawing(e) {
    if (tool === 'select' && isSelecting) {
        isSelecting = false;
        const selBox = document.getElementById('selection-box');
        const selOverlay = document.getElementById('selection-overlay');
        
        if (selBox) selBox.style.display = 'none';
        if (selOverlay) selOverlay.style.display = 'none';

        const rect = canvas.getBoundingClientRect();
        const endClientX = e ? (e.clientX || (e.changedTouches ? e.changedTouches[0].clientX : selectionStartClientX)) : selectionStartClientX;
        const endClientY = e ? (e.clientY || (e.changedTouches ? e.changedTouches[0].clientY : selectionStartClientY)) : selectionStartClientY;

        let sX = Math.min(startX, endClientX - rect.left);
        let sY = Math.min(startY, endClientY - rect.top);
        let sWidth = Math.abs((endClientX - rect.left) - startX);
        let sHeight = Math.abs((endClientY - rect.top) - startY);

        if (sWidth > 10 && sHeight > 10) {
            captureSelectedPage(sX, sY, sWidth, sHeight);
        }
        return;
    }

    if (isShapeDrawing) {
        if (pendingShapePoint) renderShapePreview(pendingShapePoint);
        if (shapeFrameId) cancelAnimationFrame(shapeFrameId);
        shapeFrameId = 0;
        pendingShapePoint = null;
        isShapeDrawing = false;
        shapeSnapshot = null;
        persistentCanvasState = canvas.toDataURL();
        persistDrawing();
        return;
    }

    if (drawing) {
        ctx.closePath();
        drawing = false;
        persistentCanvasState = canvas.toDataURL();
        persistDrawing();
    }
}

function scheduleShapePreview() {
    if (shapeFrameId) return;
    shapeFrameId = requestAnimationFrame(() => {
        shapeFrameId = 0;
        if (isShapeDrawing && shapeSnapshot && pendingShapePoint) renderShapePreview(pendingShapePoint);
    });
}

function renderShapePreview(point) {
    ctx.putImageData(shapeSnapshot, 0, 0);
    applyStyles();
    drawShape(shapeStartX, shapeStartY, point.x, point.y, tool);
}

function getCaptureCoordinates(clientX, clientY) {
    const rect = captureCanvas.getBoundingClientRect();
    const scaleX = captureCanvas.width / Math.max(1, rect.width);
    const scaleY = captureCanvas.height / Math.max(1, rect.height);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function applyCaptureStyles() {
    const colorEl = document.getElementById('p-color');
    const widthEl = document.getElementById('p-width');
    const opacityEl = document.getElementById('p-opacity');
    const color = colorEl ? colorEl.value : '#ff4757';
    const width = widthEl ? parseInt(widthEl.value, 10) : 4;
    const opacity = opacityEl ? parseInt(opacityEl.value, 10) / 100 : 1;
    captureCtx.strokeStyle = color;
    captureCtx.fillStyle = color;
    captureCtx.lineWidth = tool === 'highlighter' ? Math.max(width, 18) : width;
    captureCtx.globalAlpha = tool === 'highlighter' ? opacity * 0.35 : opacity;
    captureCtx.lineCap = 'round';
    captureCtx.lineJoin = 'round';
    captureCtx.shadowBlur = tool === 'neon' ? 15 : 0;
    captureCtx.shadowColor = color;
}

function captureDrawShape(x1, y1, x2, y2) {
    captureCtx.beginPath();
    applyCaptureStyles();
    captureCtx.globalCompositeOperation = 'source-over';
    if (tool === 'line') {
        captureCtx.moveTo(x1, y1);
        captureCtx.lineTo(x2, y2);
        captureCtx.stroke();
    } else if (tool === 'rect') {
        if (isFilled) captureCtx.fillRect(x1, y1, x2 - x1, y2 - y1);
        captureCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    } else if (tool === 'circle') {
        captureCtx.ellipse(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
        if (isFilled) captureCtx.fill();
        captureCtx.stroke();
    } else if (tool === 'arrow') {
        drawArrow(captureCtx, x1, y1, x2, y2);
    }
}

function resizeCaptureCanvas() {
    if (!captureImage || !captureCanvas || !captureImage.naturalWidth) return;
    captureCanvas.style.width = captureImage.clientWidth + 'px';
    captureCanvas.style.height = captureImage.clientHeight + 'px';
    captureCanvas.style.left = captureImage.offsetLeft + 'px';
    captureCanvas.style.top = captureImage.offsetTop + 'px';
}

function updateCaptureZoom() {
    if (!captureImage || !captureImage.naturalWidth) return;
    captureImage.style.maxWidth = 'none';
    captureImage.style.maxHeight = 'none';
    captureCanvas.style.maxWidth = 'none';
    captureCanvas.style.maxHeight = 'none';
    captureImage.style.width = Math.round(captureImage.naturalWidth * captureZoom) + 'px';
    captureImage.style.height = Math.round(captureImage.naturalHeight * captureZoom) + 'px';
    requestAnimationFrame(resizeCaptureCanvas);
}

function setCaptureZoom(nextZoom) {
    captureZoom = Math.max(0.5, Math.min(4, Number(nextZoom) || 1));
    updateCaptureZoom();
}

function openCaptureWorkspace(dataUrl, sourceRect) {
    if (!captureWorkspace || !captureImage || !captureCanvas || !captureCtx) return;
    captureSourceRect = sourceRect || null;
    captureZoom = 1;
    const pageImage = new Image();
    pageImage.onload = () => {
        const composite = document.createElement('canvas');
        composite.width = pageImage.naturalWidth;
        composite.height = pageImage.naturalHeight;
        const compositeCtx = composite.getContext('2d');
        paintCaptureBackground(compositeCtx, composite.width, composite.height, pageImage);
        if (sourceRect && canvas.width > 0 && canvas.height > 0) {
            const canvasRect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / Math.max(1, canvasRect.width);
            const scaleY = canvas.height / Math.max(1, canvasRect.height);
            compositeCtx.drawImage(
                canvas,
                sourceRect.x * scaleX,
                sourceRect.y * scaleY,
                sourceRect.width * scaleX,
                sourceRect.height * scaleY,
                0,
                0,
                composite.width,
                composite.height
            );
        }
        captureImage.onload = () => {
            captureCanvas.width = captureImage.naturalWidth;
            captureCanvas.height = captureImage.naturalHeight;
            captureCtx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
            resizeCaptureCanvas();
            updateCaptureZoom();
        };
        captureImage.src = composite.toDataURL('image/png');
        captureWorkspace.hidden = false;
        document.body.classList.add('capture-active');
        document.getElementById('draw-layer').classList.remove('active');
        requestAnimationFrame(resizeCaptureCanvas);
    };
    pageImage.src = dataUrl;
}

function paintCaptureBackground(targetCtx, width, height, pageImage) {
    if (boardMode === 'transparent') {
        targetCtx.drawImage(pageImage, 0, 0);
        return;
    }
    targetCtx.fillStyle = boardMode === 'black' ? '#121215' : (boardMode === 'custom' ? boardCustomColor : '#ffffff');
    targetCtx.fillRect(0, 0, width, height);
    if (boardMode === 'dot') {
        targetCtx.fillStyle = '#d4d4d8';
        for (let y = 8; y < height; y += 24) {
            for (let x = 8; x < width; x += 24) targetCtx.fillRect(x, y, 2, 2);
        }
    } else if (boardMode === 'lined') {
        targetCtx.strokeStyle = '#e0e0ff';
        targetCtx.lineWidth = 1;
        for (let y = 35; y < height; y += 35) {
            targetCtx.beginPath();
            targetCtx.moveTo(0, y + 0.5);
            targetCtx.lineTo(width, y + 0.5);
            targetCtx.stroke();
        }
    } else if (boardMode === 'grid') {
        targetCtx.strokeStyle = '#eeeeee';
        targetCtx.lineWidth = 1;
        for (let y = 30; y < height; y += 30) {
            targetCtx.beginPath();
            targetCtx.moveTo(0, y + 0.5);
            targetCtx.lineTo(width, y + 0.5);
            targetCtx.stroke();
        }
        for (let x = 30; x < width; x += 30) {
            targetCtx.beginPath();
            targetCtx.moveTo(x + 0.5, 0);
            targetCtx.lineTo(x + 0.5, height);
            targetCtx.stroke();
        }
    }
}

async function captureSelectedPage(x, y, width, height) {
    const target = getActivePageView();
    const viewContainer = document.getElementById('wv-container');
    if (!target || !viewContainer || typeof target.capturePage !== 'function') {
        if (typeof showToast === 'function') showToast('Bu sayfa yakalanamıyor', 'error');
        return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const viewRect = viewContainer.getBoundingClientRect();
    const selectionRect = {
        left: canvasRect.left + x,
        top: canvasRect.top + y,
        right: canvasRect.left + x + width,
        bottom: canvasRect.top + y + height
    };
    const left = Math.max(selectionRect.left, viewRect.left);
    const top = Math.max(selectionRect.top, viewRect.top);
    const right = Math.min(selectionRect.right, viewRect.right);
    const bottom = Math.min(selectionRect.bottom, viewRect.bottom);
    if (right - left < 12 || bottom - top < 12) return;

    try {
        const image = await target.capturePage({
            x: Math.round(left - viewRect.left),
            y: Math.round(top - viewRect.top),
            width: Math.round(right - left),
            height: Math.round(bottom - top)
        });
        if (!image || typeof image.toDataURL !== 'function') throw new Error('capture-failed');
        openCaptureWorkspace(image.toDataURL(), {
            x: Math.max(0, left - canvasRect.left),
            y: Math.max(0, top - canvasRect.top),
            width: right - left,
            height: bottom - top
        });
    } catch (err) {
        if (typeof showToast === 'function') showToast('Seçilen alan alınamadı', 'error');
    }
}

function closeCaptureWorkspace() {
    if (!captureWorkspace) return;
    captureWorkspace.hidden = true;
    document.body.classList.remove('capture-active');
    captureDrawing = false;
    captureShapeDrawing = false;
    capturePointers.clear();
    captureSourceRect = null;
    captureZoom = 1;
    captureReturnState = null;
    document.getElementById('draw-layer').classList.add('active');
}

function zoomCapturedArea() {
    if (!captureSourceRect) return;
    const source = { ...captureSourceRect };
    captureReturnState = {
        image: captureImage ? captureImage.src : '',
        drawing: captureCanvas && captureCanvas.width > 0 ? captureCanvas.toDataURL('image/png') : '',
        source
    };
    captureWorkspace.hidden = true;
    document.body.classList.remove('capture-active');
    captureDrawing = false;
    captureShapeDrawing = false;
    capturePointers.clear();
    document.getElementById('draw-layer').classList.add('active');
    zoomPageFromSelection(source.x, source.y, source.width, source.height);
}

function reopenCapturedWorkspace() {
    const saved = captureReturnState;
    if (!saved || !saved.image || !captureWorkspace || !captureImage || !captureCanvas || !captureCtx) return;
    captureSourceRect = saved.source;
    captureZoom = 1;
    captureWorkspace.hidden = false;
    document.body.classList.add('capture-active');
    document.getElementById('draw-layer').classList.remove('active');
    captureImage.onload = () => {
        captureCanvas.width = captureImage.naturalWidth;
        captureCanvas.height = captureImage.naturalHeight;
        captureCtx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
        if (saved.drawing) {
            const drawing = new Image();
            drawing.onload = () => captureCtx.drawImage(drawing, 0, 0);
            drawing.src = saved.drawing;
        }
        resizeCaptureCanvas();
        updateCaptureZoom();
    };
    captureImage.src = saved.image;
    pageViewSnapshot = null;
    updatePageRestoreButton();
}

function clearCaptureDrawing() {
    if (!captureCtx || !captureCanvas || !captureImage) return;
    captureCtx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
    captureDrawing = false;
    captureShapeDrawing = false;
    captureShapeSnapshot = null;
    if (paintOpen) {
        const menu = document.getElementById('paint-menu');
        if (menu) menu.style.display = 'flex';
    }
}

function exportCapture() {
    if (!captureCanvas || !captureImage) return;
    const output = document.createElement('canvas');
    output.width = captureCanvas.width;
    output.height = captureCanvas.height;
    const outputCtx = output.getContext('2d');
    outputCtx.drawImage(captureImage, 0, 0, output.width, output.height);
    outputCtx.drawImage(captureCanvas, 0, 0);
    const link = document.createElement('a');
    link.download = 'anka-yakalanan-alan.png';
    link.href = output.toDataURL('image/png');
    link.click();
}

if (captureCanvas) {
    captureCanvas.addEventListener('pointerdown', (e) => {
        if (!captureWorkspace || captureWorkspace.hidden || e.button !== 0) return;
        capturePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (capturePointers.size > 1) {
            captureDrawing = false;
            captureShapeDrawing = false;
            const points = [...capturePointers.values()];
            capturePinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            return;
        }
        const point = getCaptureCoordinates(e.clientX, e.clientY);
        captureCanvas.setPointerCapture(e.pointerId);
        if (['line', 'rect', 'circle', 'arrow'].includes(tool)) {
            captureShapeDrawing = true;
            captureShapeStartX = point.x;
            captureShapeStartY = point.y;
            captureShapeSnapshot = captureCtx.getImageData(0, 0, captureCanvas.width, captureCanvas.height);
            return;
        }
        captureDrawing = true;
        applyCaptureStyles();
        captureCtx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        captureCtx.beginPath();
        captureCtx.moveTo(point.x, point.y);
    });

    captureCanvas.addEventListener('pointermove', (e) => {
        if (capturePointers.has(e.pointerId)) capturePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (capturePointers.size > 1) {
            const points = [...capturePointers.values()];
            const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            if (capturePinchDistance > 0) setCaptureZoom(captureZoom * distance / capturePinchDistance);
            capturePinchDistance = distance;
            return;
        }
        if (!captureDrawing && !captureShapeDrawing) return;
        const point = getCaptureCoordinates(e.clientX, e.clientY);
        if (captureShapeDrawing && captureShapeSnapshot) {
            captureCtx.putImageData(captureShapeSnapshot, 0, 0);
            captureDrawShape(captureShapeStartX, captureShapeStartY, point.x, point.y);
            return;
        }
        captureCtx.lineTo(point.x, point.y);
        captureCtx.stroke();
    });

    const finishCaptureDrawing = (e) => {
        capturePointers.delete(e.pointerId);
        capturePinchDistance = 0;
        if (!captureDrawing && !captureShapeDrawing) return;
        if (captureDrawing) captureCtx.closePath();
        captureDrawing = false;
        captureShapeDrawing = false;
        captureShapeSnapshot = null;
        try {
            captureCanvas.releasePointerCapture(e.pointerId);
        } catch (err) {}
    };

    captureCanvas.addEventListener('pointerup', finishCaptureDrawing);
    captureCanvas.addEventListener('pointercancel', finishCaptureDrawing);
    captureCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        setCaptureZoom(captureZoom + (e.deltaY < 0 ? 0.1 : -0.1));
    }, { passive: false });
}

window.addEventListener('resize', resizeCaptureCanvas);

function drawShape(x1, y1, x2, y2, currentTool) {
    ctx.beginPath();
    applyStyles();

    if (currentTool === 'line') {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    } else if (currentTool === 'rect') {
        let w = x2 - x1;
        let h = y2 - y1;
        if (isFilled) {
            ctx.fillRect(x1, y1, w, h);
        }
        ctx.strokeRect(x1, y1, w, h);
    } else if (currentTool === 'circle') {
        let radiusX = Math.abs(x2 - x1) / 2;
        let radiusY = Math.abs(y2 - y1) / 2;
        let centerX = x1 + (x2 - x1) / 2;
        let centerY = y1 + (y2 - y1) / 2;
        
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        if (isFilled) {
            ctx.fill();
        }
        ctx.stroke();
    } else if (currentTool === 'arrow') {
        drawArrow(ctx, x1, y1, x2, y2);
    }
}

function drawArrow(targetCtx, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const lineWidth = Math.max(1, Number(targetCtx.lineWidth) || 1);
    if (distance < 0.5) return;

    const angle = Math.atan2(dy, dx);
    const unitX = dx / distance;
    const unitY = dy / distance;
    const normalX = -unitY;
    const normalY = unitX;

    // Scale the head with both arrow length and stroke width, while keeping
    // enough room for a readable triangle on very short arrows.
    const headLength = Math.min(distance * 0.42, Math.max(lineWidth * 4, 12));
    const headWidth = Math.min(distance * 0.28, Math.max(lineWidth * 2.8, headLength * 0.55));
    const baseX = x2 - unitX * headLength;
    const baseY = y2 - unitY * headLength;
    const leftX = baseX + normalX * headWidth;
    const leftY = baseY + normalY * headWidth;
    const rightX = baseX - normalX * headWidth;
    const rightY = baseY - normalY * headWidth;

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.beginPath();
    targetCtx.moveTo(x1, y1);
    targetCtx.lineTo(baseX, baseY);
    targetCtx.stroke();

    // Render the head as its own closed vector path so the shaft never runs
    // through the triangular tip or creates a doubled center line.
    targetCtx.beginPath();
    targetCtx.moveTo(x2, y2);
    targetCtx.lineTo(leftX, leftY);
    targetCtx.lineTo(rightX, rightY);
    targetCtx.closePath();
    targetCtx.fillStyle = targetCtx.strokeStyle;
    targetCtx.fill();
    targetCtx.restore();
}

function applyStyles() {
    const colorEl = document.getElementById('p-color');
    const widthEl = document.getElementById('p-width');
    const opacityEl = document.getElementById('p-opacity');
    
    const color = colorEl ? colorEl.value : '#ff4757';
    const width = widthEl ? parseInt(widthEl.value, 10) : 4;
    const opacity = opacityEl ? parseInt(opacityEl.value, 10) / 100 : 1.0;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = opacity;

    if (tool === 'neon') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
    } else if (tool === 'highlighter') {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = opacity * 0.35;
        ctx.lineWidth = Math.max(width, 18);
    } else {
        ctx.shadowBlur = 0;
    }
}

function getActivePageView() {
    if (typeof activeView !== 'function') return null;
    return activeView();
}

function setPageZoom(nextZoom, view) {
    const target = view || getActivePageView();
    if (!target || typeof target.setZoomFactor !== 'function') return;

    pageZoom = Math.max(0.5, Math.min(3, Number(nextZoom) || 1));
    try {
        target.setZoomFactor(pageZoom);
    } catch (err) {}
}

async function zoomPageFromSelection(x, y, width, height) {
    const target = getActivePageView();
    if (!target) return;

    const viewContainer = document.getElementById('wv-container');
    const viewRect = viewContainer ? viewContainer.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const selectionCenterX = x + width / 2;
    const selectionCenterY = y + height / 2;
    const zoomFactor = Math.max(1.25, Math.min(3, viewRect.width / Math.max(width, 120)));
    const nextZoom = Math.max(pageZoom, zoomFactor);

    if (typeof target.executeJavaScript === 'function') {
        try {
            const state = await target.executeJavaScript('({ x: window.scrollX || 0, y: window.scrollY || 0, width: window.innerWidth || 1, height: window.innerHeight || 1 })');
            const currentZoom = typeof target.getZoomFactor === 'function' ? Number(target.getZoomFactor()) || pageZoom : pageZoom;
            pageViewSnapshot = { zoom: currentZoom, scrollX: Number(state.x) || 0, scrollY: Number(state.y) || 0 };
            const contentX = (Number(state.x) || 0) + selectionCenterX / currentZoom;
            const contentY = (Number(state.y) || 0) + selectionCenterY / currentZoom;
            setPageZoom(nextZoom, target);
            const nextScrollX = Math.max(0, contentX - (Number(state.width) || viewRect.width) / 2);
            const nextScrollY = Math.max(0, contentY - (Number(state.height) || viewRect.height) / 2);
            await target.executeJavaScript(`window.scrollTo(${Math.round(nextScrollX)}, ${Math.round(nextScrollY)})`);
            updatePageRestoreButton();
            return;
        } catch (err) {}
    }

    const previousZoom = pageZoom;
    setPageZoom(nextZoom, target);
    pageViewSnapshot = { zoom: previousZoom, scrollX: 0, scrollY: 0 };
    updatePageRestoreButton();
}

function zoomPageIn() {
    setPageZoom(pageZoom + 0.25);
}

function zoomPageOut() {
    setPageZoom(pageZoom - 0.25);
}

function resetPageZoom() {
    setPageZoom(1);
}

async function restorePageView() {
    const target = getActivePageView();
    const snapshot = pageViewSnapshot;
    if (!snapshot || !target) {
        resetPageZoom();
        reopenCapturedWorkspace();
        updatePageRestoreButton();
        return;
    }
    setPageZoom(snapshot.zoom, target);
    if (typeof target.executeJavaScript === 'function') {
        try {
            await target.executeJavaScript(`window.scrollTo(${Math.round(snapshot.scrollX)}, ${Math.round(snapshot.scrollY)})`);
        } catch (err) {}
    }
    pageViewSnapshot = null;
    reopenCapturedWorkspace();
    updatePageRestoreButton();
}

function updatePageRestoreButton() {
    const button = document.getElementById('page-zoom-reset');
    if (button) button.hidden = !pageViewSnapshot;
}

function setActiveClass(element, selector) {
    if (!element) return;
    document.querySelectorAll(selector).forEach((item) => item.classList.remove('active'));
    element.classList.add('active');
}

function setToolActive(element) {
    setActiveClass(element, '.paint-menu-container [id^="t-"]');
}

function setTool(t) {
    tool = t;
    const buttons = document.querySelectorAll('.paint-menu .t-btn, .paint-menu-container .t-btn');
    buttons.forEach(b => {
        if (!b.classList.contains('bg-btn') && !b.classList.contains('bg-color-btn')) {
            b.classList.remove('active');
        }
    });
    
    const target = document.getElementById('t-' + t);
    if (target) {
        target.classList.add('active');
    }
}

function toggleFill() {
    isFilled = !isFilled;
    const fillBtn = document.getElementById('t-fill');
    if (fillBtn) {
        fillBtn.classList.toggle('active', isFilled);
    }
}

function togglePaintMenu() {
    paintOpen = !paintOpen;
    const menu = document.getElementById('paint-menu');
    const layer = document.getElementById('draw-layer');
    const btn = document.getElementById('btn-paint');

    if (!menu || !layer) return;

    if (paintOpen) {
        document.body.classList.remove('dragging-ui', 'capture-active');
        menu.style.display = 'flex';
        layer.classList.add('active');
        layer.style.pointerEvents = 'auto';
        canvas.style.pointerEvents = 'auto';
        layer.classList.remove('page-interaction');
        pageInteraction = false;
        if (btn) btn.classList.add('active');
        initCanvas(true);
    } else {
        menu.style.display = 'none';
        hidePaintCursor();
        menu.classList.remove('paint-touch-mode');
        layer.classList.remove('active');
        layer.classList.remove('page-interaction');
        layer.style.pointerEvents = 'none';
        canvas.style.pointerEvents = 'none';
        pageInteraction = false;
        document.documentElement.classList.remove('touch-page-mode');
        document.body.classList.remove('touch-page-mode');
        localStorage.setItem('set_touch-page-mode', 'false');
        const touchButton = document.getElementById('touch-page-mode-btn');
        if (touchButton) touchButton.classList.remove('active');
        if (btn) btn.classList.remove('active');
        drawing = false;
        isSelecting = false;
        isShapeDrawing = false;
        shapeSnapshot = null;
        activePointerId = null;
        document.body.classList.remove('dragging-ui', 'capture-active');
        closeCaptureWorkspace();
        localStorage.removeItem('anka_math_tools');
        ['ruler', 'protractor'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }
}

function toggleTouchPageMode() {
    const menu = document.getElementById('paint-menu');
    const layer = document.getElementById('draw-layer');
    const button = document.getElementById('touch-page-mode-btn');
    if (!menu || !layer) return;
    const enabled = !menu.classList.contains('paint-touch-mode');
    menu.classList.toggle('paint-touch-mode', enabled);
    layer.classList.toggle('page-interaction', enabled);
    layer.style.pointerEvents = enabled ? 'none' : 'auto';
    canvas.style.pointerEvents = enabled ? 'none' : 'auto';
    pageInteraction = enabled;
    if (enabled) hidePaintCursor();
    drawing = false;
    isSelecting = false;
    isShapeDrawing = false;
    shapeSnapshot = null;
    activePointerId = null;
    document.documentElement.classList.toggle('touch-page-mode', enabled);
    document.body.classList.toggle('touch-page-mode', enabled);
    localStorage.setItem('set_touch-page-mode', String(enabled));
    if (button) {
        button.classList.toggle('active', enabled);
        button.title = enabled ? 'Çizim moduna dön' : 'Dokunmatik Sayfa Modu';
    }
}

function toggleScreenGrid() {
    const grid = document.getElementById('screen-grid-layer');
    if (grid) grid.classList.toggle('active');
}

function toggleLaserPointer() {
    laserPointerActive = !laserPointerActive;
    const laser = document.getElementById('laser-pointer');
    if (laser) laser.classList.toggle('active', laserPointerActive);
    if (!laserPointerActive && laser) laser.style.display = '';
    if (laserPointerActive) {
        const moveLaser = (event) => {
            if (!laserPointerActive || !laser) return;
            const rect = document.getElementById('main-view').getBoundingClientRect();
            laser.style.left = `${event.clientX - rect.left}px`;
            laser.style.top = `${event.clientY - rect.top}px`;
        };
        if (!window._ankaLaserMove) {
            window._ankaLaserMove = moveLaser;
            window.addEventListener('pointermove', moveLaser, { passive: true });
        }
    }
}

function toggleTimerTool() {
    let timer = document.getElementById('lesson-timer');
    if (timer) {
        timer.remove();
        if (timerToolId) clearInterval(timerToolId);
        timerToolId = 0;
        return;
    }
    timer = document.createElement('div');
    timer.id = 'lesson-timer';
    timer.innerHTML = '<strong>00:00</strong><button type="button">Başlat</button><button type="button">Sıfırla</button>';
    document.getElementById('main-view').appendChild(timer);
    let elapsed = 0;
    const output = timer.querySelector('strong');
    const startButton = timer.querySelector('button');
    const resetButton = timer.querySelectorAll('button')[1];
    startButton.onclick = () => {
        if (timerToolId) {
            clearInterval(timerToolId);
            timerToolId = 0;
            startButton.textContent = 'Başlat';
            return;
        }
        startButton.textContent = 'Durdur';
        timerToolId = setInterval(() => {
            elapsed += 1;
            output.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
        }, 1000);
    };
    resetButton.onclick = () => {
        elapsed = 0;
        output.textContent = '00:00';
    };
}

function togglePageInteraction() {
    const layer = document.getElementById('draw-layer');
    const button = document.getElementById('page-interaction-btn');
    if (!layer) return;
    pageInteraction = !pageInteraction;
    layer.classList.toggle('page-interaction', pageInteraction);
    if (button) {
        button.classList.toggle('active', pageInteraction);
        button.title = pageInteraction ? 'Çizim moduna dön' : 'Sayfayı Kullan';
    }
    if (pageInteraction) {
        drawing = false;
        isSelecting = false;
        isShapeDrawing = false;
        activePointerId = null;
    }
}

function setBoardMode(mode, customColor) {
    const layer = document.getElementById('draw-layer');
    if (!layer) return;
    
    layer.classList.add('active');
    layer.style.backgroundImage = 'none';
    boardMode = mode;
    boardCustomColor = customColor || boardCustomColor;
    localStorage.setItem('anka-board-mode', boardMode);
    localStorage.setItem('anka-board-color', boardCustomColor);

    switch(mode) {
        case 'transparent':
            layer.style.backgroundColor = 'transparent';
            break;
        case 'white':
            layer.style.backgroundColor = '#ffffff';
            break;
        case 'black':
            layer.style.backgroundColor = '#121215';
            break;
        case 'dot':
            layer.style.backgroundColor = '#ffffff';
            layer.style.backgroundImage = 'radial-gradient(#d4d4d8 1.5px, transparent 1.5px)';
            layer.style.backgroundSize = '24px 24px';
            break;
        case 'lined':
            layer.style.backgroundColor = '#ffffff';
            layer.style.backgroundImage = 'linear-gradient(#e0e0ff 1px, transparent 1px)';
            layer.style.backgroundSize = '100% 35px';
            break;
        case 'grid':
            layer.style.backgroundColor = '#ffffff';
            layer.style.backgroundImage = 'linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px)';
            layer.style.backgroundSize = '30px 30px';
            break;
        case 'isometric':
            layer.style.backgroundColor = '#ffffff';
            layer.style.backgroundImage = 'linear-gradient(30deg, #dbe4ee 1px, transparent 1px), linear-gradient(150deg, #dbe4ee 1px, transparent 1px)';
            layer.style.backgroundSize = '28px 48px';
            break;
        case 'music':
            layer.style.backgroundColor = '#fffdf7';
            layer.style.backgroundImage = 'linear-gradient(#cbd5e1 1px, transparent 1px)';
            layer.style.backgroundSize = '100% 9px';
            break;
        case 'map':
            layer.style.backgroundColor = '#edf6ec';
            layer.style.backgroundImage = 'linear-gradient(115deg, transparent 0 48%, rgba(34, 97, 64, .18) 49% 51%, transparent 52%), linear-gradient(25deg, transparent 0 48%, rgba(34, 97, 64, .14) 49% 51%, transparent 52%)';
            layer.style.backgroundSize = '110px 90px, 150px 120px';
            break;
        case 'custom':
            layer.style.backgroundColor = customColor || '#ffffff';
            break;
    }

    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    const activeBg = document.querySelector(`[data-bg="${mode}"]`);
    if (activeBg) {
        activeBg.classList.add('active');
    }
}

function toggleBoardMode() {
    setBoardMode(boardMode === 'transparent' ? 'white' : 'transparent');
}

function saveState() {
    if (undoStack.length >= 25) undoStack.shift();
    const dataUrl = canvas.toDataURL();
    undoStack.push(dataUrl);
    redoStack = [];
    persistentCanvasState = dataUrl;
}

function undo() {
    if (undoStack.length > 0) {
        const currentState = canvas.toDataURL();
        redoStack.push(currentState);
        
        const lastState = undoStack.pop();
        persistentCanvasState = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
        const img = new Image();
        img.src = lastState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
}

function redo() {
    if (redoStack.length > 0) {
        const currentState = canvas.toDataURL();
        undoStack.push(currentState);
        
        const nextState = redoStack.pop();
        persistentCanvasState = nextState;
        const img = new Image();
        img.src = nextState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    undoStack = [];
    redoStack = [];
    persistentCanvasState = null;
    const ipc = getPaintIpc();
    if (ipc && typeof ipc.send === 'function') ipc.send('clear-drawing-png');
    localStorage.removeItem('anka-drawing-local');
}

function exportBoard() {
    downloadCanvasImage(buildBoardImage(), 'anka-cizim.png');
}

function buildBoardImage() {
    const output = document.createElement('canvas');
    output.width = canvas.width;
    output.height = canvas.height;
    const outputCtx = output.getContext('2d');
    drawBoardBackground(outputCtx, output.width, output.height);
    outputCtx.drawImage(canvas, 0, 0);
    return output;
}

function drawBoardBackground(targetCtx, width, height) {
    if (boardMode === 'transparent') return;
    targetCtx.fillStyle = boardMode === 'black' ? '#121215' : (boardMode === 'custom' ? boardCustomColor : (boardMode === 'music' ? '#fffdf7' : (boardMode === 'map' ? '#edf6ec' : '#ffffff')));
    targetCtx.fillRect(0, 0, width, height);
    targetCtx.lineWidth = 1;
    if (boardMode === 'dot') {
        targetCtx.fillStyle = '#d4d4d8';
        for (let y = 8; y < height; y += 24) for (let x = 8; x < width; x += 24) targetCtx.fillRect(x, y, 2, 2);
    } else if (boardMode === 'lined' || boardMode === 'music') {
        targetCtx.strokeStyle = boardMode === 'music' ? '#cbd5e1' : '#e0e0ff';
        const step = boardMode === 'music' ? 9 : 35;
        for (let y = step; y < height; y += step) {
            targetCtx.beginPath();
            targetCtx.moveTo(0, y + 0.5);
            targetCtx.lineTo(width, y + 0.5);
            targetCtx.stroke();
        }
    } else if (boardMode === 'grid') {
        targetCtx.strokeStyle = '#eeeeee';
        for (let y = 30; y < height; y += 30) { targetCtx.beginPath(); targetCtx.moveTo(0, y + 0.5); targetCtx.lineTo(width, y + 0.5); targetCtx.stroke(); }
        for (let x = 30; x < width; x += 30) { targetCtx.beginPath(); targetCtx.moveTo(x + 0.5, 0); targetCtx.lineTo(x + 0.5, height); targetCtx.stroke(); }
    } else if (boardMode === 'isometric') {
        targetCtx.strokeStyle = '#dbe4ee';
        for (let x = -height; x < width + height; x += 28) { targetCtx.beginPath(); targetCtx.moveTo(x, 0); targetCtx.lineTo(x + height / 1.7, height); targetCtx.stroke(); }
        for (let x = 0; x < width + height; x += 28) { targetCtx.beginPath(); targetCtx.moveTo(x, 0); targetCtx.lineTo(x - height / 1.7, height); targetCtx.stroke(); }
    } else if (boardMode === 'map') {
        targetCtx.strokeStyle = 'rgba(34, 97, 64, .18)';
        for (let x = -height; x < width + height; x += 110) { targetCtx.beginPath(); targetCtx.moveTo(x, 0); targetCtx.lineTo(x + height * .45, height); targetCtx.stroke(); }
        for (let x = 0; x < width + height; x += 150) { targetCtx.beginPath(); targetCtx.moveTo(x, 0); targetCtx.lineTo(x - height * .35, height); targetCtx.stroke(); }
    }
}

function downloadCanvasImage(source, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = source.toDataURL('image/png');
    link.click();
}

async function takeBoardScreenshot() {
    if (typeof captureSelectedPage === 'function' && tool === 'select') {
        if (typeof showToast === 'function') showToast('Alan seçmek için sayfada sürükleyin.');
        return;
    }
    const ipc = getPaintIpc();
    if (ipc && typeof ipc.invoke === 'function') {
        try {
            const filePath = await ipc.invoke('capture-app-screen');
            if (filePath) {
                if (typeof showToast === 'function') showToast('Ekran görüntüsü Resimler klasörüne kaydedildi.');
                return;
            }
        } catch (err) {}
    }
    exportBoard();
}

function savePenFile() {
    const payload = {
        version: 1,
        boardMode,
        boardCustomColor,
        image: canvas.toDataURL('image/png'),
        settings: {
            tool,
            color: document.getElementById('p-color')?.value || '#ff4757',
            width: document.getElementById('p-width')?.value || '4',
            opacity: document.getElementById('p-opacity')?.value || '100'
        }
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/x-anka-pen' });
    const link = document.createElement('a');
    link.download = 'anka-ders.pen';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    if (typeof showToast === 'function') showToast('.pen dosyası kaydedildi.');
}

function loadPenFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const payload = JSON.parse(reader.result);
            if (!payload || typeof payload.image !== 'string') throw new Error('invalid-pen');
            const image = new Image();
            image.onload = () => {
                saveState();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                persistentCanvasState = canvas.toDataURL();
                if (payload.boardMode) setBoardMode(payload.boardMode, payload.boardCustomColor);
                const settings = payload.settings || {};
                if (settings.color) document.getElementById('p-color').value = settings.color;
                if (settings.width) document.getElementById('p-width').value = settings.width;
                if (settings.opacity) document.getElementById('p-opacity').value = settings.opacity;
                if (settings.tool) setTool(settings.tool);
                persistDrawing();
                if (typeof showToast === 'function') showToast('.pen dosyası açıldı.');
            };
            image.src = payload.image;
        } catch (err) {
            if (typeof showToast === 'function') showToast('Geçersiz .pen dosyası', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function exportBoardPdf() {
    const image = buildBoardImage().toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
        if (typeof showToast === 'function') showToast('PDF penceresi açılamadı', 'error');
        return;
    }
    printWindow.document.write(`<html><head><title>Anka Web Çizimi</title><style>html,body{margin:0;background:#fff}img{display:block;width:100%;height:auto}</style></head><body><img src="${image}" alt="Anka Web çizimi"></body></html>`);
    printWindow.document.close();
    printWindow.addEventListener('load', () => {
        printWindow.focus();
        printWindow.print();
    });
}

function openTextInput(x, y) {
    const existingInput = document.getElementById('canvas-text-input');
    if (existingInput) existingInput.remove();

    const widthEl = document.getElementById('p-width');
    const colorEl = document.getElementById('p-color');
    const fontSize = (widthEl ? parseInt(widthEl.value, 10) : 4) * 4 + 10;
    const fontColor = colorEl ? colorEl.value : '#ff4757';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'canvas-text-input';
    input.style.position = 'absolute';
    input.style.left = (canvas.getBoundingClientRect().left + x) + 'px';
    input.style.top = (canvas.getBoundingClientRect().top + y) + 'px';
    input.style.font = `${fontSize}px Arial`;
    input.style.color = fontColor;
    input.style.background = 'transparent';
    input.style.border = '1px dashed #ff4757';
    input.style.outline = 'none';
    input.style.zIndex = '1000';
    input.style.padding = '2px 4px';

    document.body.appendChild(input);
    input.focus();

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveState();
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = fontColor;
            ctx.fillText(input.value, x, y + 20);
            persistentCanvasState = canvas.toDataURL();
            input.remove();
        } else if (e.key === 'Escape') {
            input.remove();
        }
    });
}

function toggleMathTool(toolId) {
    const el = document.getElementById(toolId);
    if (!el) return;

    if (getComputedStyle(el).display === 'none') {
        el.style.display = 'block';
        if (!el.dataset.initialized) {
            el.style.top = "200px";
            el.style.left = "300px";
            el.dataset.rotation = 0;
            el.dataset.scale = "1.0";
            el.dataset.initialized = "true";
        }
        updateToolTransform(el);
        fitMathTool(el);
    } else {
        el.style.display = 'none';
    }
}

function toolRotate(e, toolId) {
    e.stopPropagation();
    const el = document.getElementById(toolId);
    if (!el) return;
    let r = parseInt(el.dataset.rotation || 0, 10);
    r = (r + 15) % 360;
    el.dataset.rotation = r;
    updateToolTransform(el);
}

function toolScale(e, toolId, delta = 0.2) {
    e.stopPropagation();
    const el = document.getElementById(toolId);
    if (!el) return;
    let s = parseFloat(el.dataset.scale || 1.0);
    s = Math.max(0.6, Math.min(2.4, s + delta));
    el.dataset.scale = s;
    updateToolTransform(el);
    fitMathTool(el);
}

function resetMathTool(e, toolId) {
    e.stopPropagation();
    const el = document.getElementById(toolId);
    if (!el) return;
    el.dataset.rotation = 0;
    el.dataset.scale = '1';
    el.style.marginLeft = '0';
    el.style.left = Math.max(8, (window.innerWidth - el.offsetWidth) / 2) + 'px';
    el.style.top = toolId === 'ruler' ? '170px' : '250px';
    updateToolTransform(el);
    fitMathTool(el);
}

function setupProtractorScale() {
    const body = document.querySelector('#protractor .protractor-body');
    if (!body) return;
    const labels = body.querySelectorAll('span');
    labels.forEach((label, index) => {
        const angle = index * 10;
        const radians = angle * Math.PI / 180;
        label.textContent = String(angle);
        label.style.left = `${50 - 47 * Math.cos(radians)}%`;
        label.style.bottom = `${10 + Math.sin(radians) * 82}px`;
    });
}

function setupRulerScale() {
    const ticks = document.querySelector('#ruler .ruler-ticks');
    if (!ticks) return;
    const fragment = document.createDocumentFragment();
    for (let millimeter = 0; millimeter <= 100; millimeter += 1) {
        const tick = document.createElement('i');
        tick.style.left = `${millimeter}%`;
        tick.className = millimeter % 10 === 0 ? 'major' : (millimeter % 5 === 0 ? 'half' : 'minor');
        fragment.appendChild(tick);
    }
    ticks.replaceChildren(fragment);
}

function updateToolTransform(el) {
    const r = el.dataset.rotation || 0;
    const s = el.dataset.scale || 1;
    el.style.transform = `rotate(${r}deg) scale(${s})`;
}

function fitMathTool(el) {
    if (!el || getComputedStyle(el).display === 'none') return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - rect.width - 8));
    const top = Math.min(Math.max(48, rect.top), Math.max(48, window.innerHeight - rect.height - 8));
    const currentLeft = parseFloat(getComputedStyle(el).left) || 0;
    const currentTop = parseFloat(getComputedStyle(el).top) || 0;
    el.style.left = currentLeft + left - rect.left + 'px';
    el.style.top = currentTop + top - rect.top + 'px';
}

['ruler', 'protractor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        let isDraggingTool = false;
        let activePointerId = null;
        let startX, startY, initialX, initialY;

        el.addEventListener('pointerdown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('c-btn')) return;
            isDraggingTool = true;
            activePointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            const computed = getComputedStyle(el);
            initialX = parseFloat(computed.left) || el.getBoundingClientRect().left;
            initialY = parseFloat(computed.top) || el.getBoundingClientRect().top;
            el.setPointerCapture(e.pointerId);
            e.stopPropagation();
        });

        el.addEventListener('pointermove', (e) => {
            if (!isDraggingTool || e.pointerId !== activePointerId) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            el.style.left = (initialX + dx) + 'px';
            el.style.top = (initialY + dy) + 'px';
            fitMathTool(el);
        });

        const finishToolDrag = (e) => {
            if (!isDraggingTool || e.pointerId !== activePointerId) return;
            isDraggingTool = false;
            activePointerId = null;
            try {
                el.releasePointerCapture(e.pointerId);
            } catch (err) {}
        };

        el.addEventListener('pointerup', finishToolDrag);
        el.addEventListener('pointercancel', finishToolDrag);
        el.addEventListener('lostpointercapture', () => {
            isDraggingTool = false;
            activePointerId = null;
        });
    }
});

window.addEventListener('resize', () => {
    fitMathTool(document.getElementById('ruler'));
    fitMathTool(document.getElementById('protractor'));
});

setupProtractorScale();
setupRulerScale();

document.querySelectorAll('.favorite-color').forEach((button) => {
    button.addEventListener('click', () => {
        const color = button.dataset.color;
        const colorInput = document.getElementById('p-color');
        if (!colorInput || !color) return;
        colorInput.value = color;
        document.querySelectorAll('.favorite-color').forEach((item) => item.classList.toggle('active', item === button));
        applyStyles();
    });
});

const savedBoardMode = localStorage.getItem('anka-board-mode');
const savedBoardColor = localStorage.getItem('anka-board-color');
if (savedBoardMode) setBoardMode(savedBoardMode, savedBoardColor || '#ffffff');

restoreDrawing();