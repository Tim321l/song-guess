const https = require('https');
const fs = require('fs');

const queries = ['YOASOBI', 'Kenshi Yonezu', 'Ado', 'LiSA', 'Hikaru Utada', 'RADWIMPS', 'Aimer', 'King Gnu', 'Official HIGE DANdism', 'Aimyon', 'Vaundy', 'Eve', 'Yorushika', 'Yuri', 'Mrs. GREEN APPLE', 'Milet', 'Kaze Fujii', 'ONE OK ROCK', 'Back Number', 'Daoko'];
let allSongs = [];
let pending = queries.length;

queries.forEach(query => {
    // Adding country=jp to get localized titles and better matches
    https.get('https://itunes.apple.com/search?term=' + encodeURIComponent(query) + '&entity=song&limit=15&country=jp', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const results = JSON.parse(data).results;
                results.forEach(song => {
                    const year = new Date(song.releaseDate).getFullYear();
                    // Ensure it has a preview URL
                    if (song.previewUrl) {
                        allSongs.push({
                            title: song.trackName,
                            artist: song.artistName,
                            audioUrl: song.previewUrl,
                            year: year
                        });
                    }
                });
            } catch (e) {
                console.error('Error parsing data for', query);
            }
            pending--;
            if (pending === 0) finish();
        });
    }).on('error', (err) => {
        console.error('Network error for', query, err);
        pending--;
        if (pending === 0) finish();
    });
});

function finish() {
    // Remove duplicates based on title
    const uniqueSongs = [];
    const titles = new Set();
    for (const song of allSongs) {
        if (!titles.has(song.title.toLowerCase())) {
            titles.add(song.title.toLowerCase());
            uniqueSongs.push(song);
        }
    }

    uniqueSongs.sort(() => Math.random() - 0.5); // Shuffle
    const finalSongs = uniqueSongs.slice(0, 40); // Need around 40 songs

    let content = 'export const songs = [\n';
    finalSongs.forEach((song, i) => {
        content += `    { id: ${i + 1}, title: "${song.title.replace(/"/g, '\\"')}", artist: "${song.artist.replace(/"/g, '\\"')}", audioUrl: "${song.audioUrl}", year: ${song.year} },\n`;
    });
    content += '];\n';

    fs.writeFileSync('c:/Users/ltim2/programme/song guess/src/songs.js', content);
    console.log('Songs updated successfully! Found ' + finalSongs.length + ' Japanese songs.');
}
