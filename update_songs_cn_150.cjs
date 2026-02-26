const https = require('https');
const fs = require('fs');

const queries = [
    'Jay Chou', 'Eason Chan', 'JJ Lin', 'G.E.M.', 'Eric Chou', 'Mayday',
    'Hebe Tien', 'A-Mei', 'Jolin Tsai', 'David Tao', 'Leehom Wang', 'Stefanie Sun',
    'Fish Leong', 'Rene Liu', 'S.H.E', 'A-Lin', 'Joker Xue', 'Li Ronghao',
    'Yoga Lin', 'WeiBird', 'F.I.R.', 'Tanya Chua', 'Show Lo', 'Rainie Yang',
    'Cyndi Wang', 'Faye Wong', 'Wakin Chau', 'Sodagreen', 'Cheer Chen', 'Penny Tai',
    'Wu Bai', 'Angela Zhang', 'Jacky Cheung', 'Andy Lau', 'Leon Lai',
    'Aaron Kwok', 'Leslie Cheung', 'Beyond', 'Crowd Lu', 'Jam Hsiao'
];
let allSongs = [];
let pending = queries.length;

queries.forEach(query => {
    https.get('https://itunes.apple.com/search?term=' + encodeURIComponent(query) + '&entity=song&limit=25&country=tw', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const results = JSON.parse(data).results;
                results.forEach(song => {
                    const year = new Date(song.releaseDate).getFullYear();
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
    const uniqueSongs = [];
    const titles = new Set();
    for (const song of allSongs) {
        if (!titles.has(song.title.toLowerCase())) {
            titles.add(song.title.toLowerCase());
            uniqueSongs.push(song);
        }
    }

    uniqueSongs.sort(() => Math.random() - 0.5); // Shuffle
    const finalSongs = uniqueSongs.slice(0, 150); // Get up to 150 songs

    let content = 'export const songs = [\n';
    finalSongs.forEach((song, i) => {
        content += `    { id: ${i + 1}, title: "${song.title.replace(/"/g, '\\"')}", artist: "${song.artist.replace(/"/g, '\\"')}", audioUrl: "${song.audioUrl}", year: ${song.year} },\n`;
    });
    content += '];\n';

    fs.writeFileSync('c:/Users/ltim2/programme/song guess/src/songs.js', content);
    console.log('Songs updated successfully! Found ' + finalSongs.length + ' Chinese songs.');
}
