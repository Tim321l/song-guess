const https = require('https');
const fs = require('fs');

const songListPath = '/tmp/arashi_songs.txt';
const outputPath = 'c:/Users/ltim2/programme/song guess/scripts/arashi_songs_metadata.json';

const songTitles = fs.readFileSync(songListPath, 'utf8')
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0);

console.log(`Searching for ${songTitles.length} Arashi songs...`);

let results = [];
let currentIndex = 0;

async function fetchWithDelay() {
    if (currentIndex >= songTitles.length) {
        finish();
        return;
    }

    const title = songTitles[currentIndex];
    const query = `嵐 ${title}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1&country=jp`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const searchResults = JSON.parse(data).results;
                if (searchResults && searchResults.length > 0) {
                    const song = searchResults[0];
                    results.push({
                        id: results.length + 1,
                        title: song.trackName,
                        artist: song.artistName,
                        audioUrl: song.previewUrl,
                        appleUrl: song.trackViewUrl,
                        year: new Date(song.releaseDate).getFullYear()
                    });
                    console.log(`[${currentIndex + 1}/${songTitles.length}] MATCH: ${title} -> ${song.trackName}`);
                } else {
                    console.warn(`[${currentIndex + 1}/${songTitles.length}] MISS: ${title}`);
                }
            } catch (e) {
                console.error(`Error parsing data for ${title}:`, e.message);
                if (data.includes("Rate limit")) {
                    console.error("RATE LIMIT DETECTED. Stopping and saving progress.");
                    finish();
                    return;
                }
            }
            currentIndex++;
            setTimeout(fetchWithDelay, 800); // 800ms delay between requests
        });
    }).on('error', (err) => {
        console.error(`Network error for ${title}:`, err.message);
        currentIndex++;
        setTimeout(fetchWithDelay, 800);
    });
}

function finish() {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nFinished! Found ${results.length}/${songTitles.length} songs.`);
    console.log(`Metadata saved to ${outputPath}`);
}

fetchWithDelay();
