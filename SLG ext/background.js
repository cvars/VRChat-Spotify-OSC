// background.js
const FETCH_INTERVAL_MS = 100;
let lastLyrics = '';
let lastTrack = '';
let lastVolume = null;
let fetchInterval;

chrome.runtime.onInstalled.addListener(startFetching);
chrome.runtime.onStartup.addListener(startFetching);

function startFetching() {
    if (fetchInterval) clearInterval(fetchInterval);
    fetchInterval = setInterval(fetchAndSend, FETCH_INTERVAL_MS);
}

function fetchAndSend() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs.length) return;
        const tabId = tabs[0].id;

        // Lyrics
        chrome.scripting.executeScript({ target: { tabId }, func: scrapeLyrics }, res => {
            const lyrics = res?.[0]?.result;
            if (lyrics && lyrics !== lastLyrics) {
                lastLyrics = lyrics;
                chrome.storage.local.set({ lyrics });
                send('lyrics', lyrics);
            }
        });

        // Track
        chrome.scripting.executeScript({ target: { tabId }, func: scrapeTrack }, res => {
            const track = res?.[0]?.result;
            if (track && track !== lastTrack) {
                lastTrack = track;
                chrome.storage.local.set({ track });
                send('track', track);
            }
        });

        // Volume
        chrome.scripting.executeScript({ target: { tabId }, func: scrapeVolume }, res => {
            const volume = res?.[0]?.result;
            if (typeof volume === 'number' && volume !== lastVolume) {
                lastVolume = volume;
                chrome.storage.local.set({ volume });
                send('volume', volume);
            }
        });
    });
}

// ✅ Scrapes the current Spotify lyric line
function scrapeLyrics() {
    // main container for lyrics
    const activeLine = document.querySelector('div[data-testid="lyrics-line"][aria-current="true"]');
    if (activeLine) return activeLine.innerText.trim();

    // fallback: if not fullscreen, sometimes they use a different tag ig
    const altLine = document.querySelector('div[data-testid="lyrics-container"] div[aria-current="true"]');
    if (altLine) return altLine.innerText.trim();

    // fallback to first non-empty visible lyric
    const lines = document.querySelectorAll('div[data-testid="lyrics-line"]');
    for (const line of lines) {
        const text = line.innerText.trim();
        if (text && window.getComputedStyle(line).opacity > 0.9) return text;
    }

    return '';
}

// ✅ Scrapes track title and artist
function scrapeTrack() {
    const title = document.querySelector('div[data-testid="context-item-info-title"] a');
    const artist = document.querySelector('div[data-testid="context-item-info-subtitles"] a');
    return (title && artist) ? `${title.innerText.trim()} by ${artist.innerText.trim()}` : '';
}

// ✅ Scrapes current volume (0.0 – 1.0)
function scrapeVolume() {
    try {
        // primary: Spotify’s volume slider inside data-testid="volume-bar"
        const slider = document.querySelector('div[data-testid="volume-bar"] input[type="range"]');
        if (slider && slider.value) {
            const vol = parseFloat(slider.value);
            if (!isNaN(vol)) return vol * 100; // convert to %
        }

        // fallback: Spotify sometimes keeps volume in localStorage as 0–1 float
        const stored = localStorage.getItem('volume');
        if (stored) {
            const vol = parseFloat(stored);
            if (!isNaN(vol)) return vol * 100;
        }
    } catch (e) {
        console.error(e);
    }
    return null;
}


// ✅ Sends data to your local server
function send(type, value) {
    fetch(`http://localhost:3000?${type}=` + encodeURIComponent(value))
        .then(r => r.text())
        .then(console.log)
        .catch(console.error);
}
