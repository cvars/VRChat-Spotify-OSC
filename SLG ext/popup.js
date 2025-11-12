document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    // auto-refresh every 100ms
    setInterval(updateUI, 100);
});

function updateUI() {
    chrome.storage.local.get(['lyrics', 'track', 'volume'], data => {
        const trackEl = document.getElementById('track');
        const lyricsEl = document.getElementById('lyrics');
        const volumeEl = document.getElementById('volume');

        const vol = (typeof data.volume === 'number')
            ? Math.min(Math.max(data.volume, 0), 100)
            : 0;

        // Update volume at top-right
        volumeEl.innerText = `[VOL: ${vol.toFixed(0)}%]`;

        // Update track text
        trackEl.innerText = data.track || '[No track yet]';

        // Update lyrics
        lyricsEl.innerText = data.lyrics || 'No lyrics yet';
    });
}
