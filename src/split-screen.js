let isSplitMode = false;

function toggleSplitScreen() {
    const container = document.getElementById('wv-container');
    const allWebviews = Array.from(document.querySelectorAll('webview'));

    if (!isSplitMode) {
        if (allWebviews.length < 2) return;
        isSplitMode = true;
        container.classList.add('split-mode');

        allWebviews.forEach((wv, index) => {
            if (index >= allWebviews.length - 2) {
                wv.style.display = 'flex';
                wv.style.width = '50%';
                wv.classList.add('active');
            } else {
                wv.style.display = 'none';
                wv.classList.remove('active');
            }
        });
    } else {
        isSplitMode = false;
        container.classList.remove('split-mode');
        allWebviews.forEach(wv => {
            wv.style.width = '100%';
        });
        switchTab(activeTabId);
    }
}