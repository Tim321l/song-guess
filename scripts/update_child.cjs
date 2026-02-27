const https = require('https');
const fs = require('fs');

// Fetching Disney and Children's songs just in case they meant "Child"
const categories = [
    {
        name: 'songsChild',
        country: 'us',
        queries: [
            'Disney', 'Pixar', 'Nursery Rhymes', 'Cocomelon', 'Peppa Pig',
            'Super Simple Songs', 'Moana', 'Frozen', 'Encanto', 'The Lion King',
            'Little Baby Bum', 'The Wiggles', 'Sesame Street', 'Muppets'
        ]
    }
];

let finalOutput = '';
let processedCategories = 0;

categories.forEach(category => {
    let allSongs = [];
    let pending = category.queries.length;

    category.queries.forEach(query => {
        https.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=40&country=${category.country}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const results = JSON.parse(data).results;
                    if (results) {
                        results.forEach(song => {
                            if (song.previewUrl) {
                                allSongs.push({
                                    title: song.trackName,
                                    artist: song.artistName,
                                    audioUrl: song.previewUrl,
                                    year: new Date(song.releaseDate).getFullYear()
                                });
                            }
                        });
                    }
                } catch (e) { }
                pending--;
                if (pending === 0) finishCategory(category.name, allSongs);
            });
        }).on('error', () => {
            pending--;
            if (pending === 0) finishCategory(category.name, allSongs);
        });
    });
});

function finishCategory(name, allSongs) {
    const uniqueSongs = [];
    const titles = new Set();
    for (const song of allSongs) {
        if (!titles.has(song.title.toLowerCase())) {
            titles.add(song.title.toLowerCase());
            uniqueSongs.push(song);
        }
    }

    uniqueSongs.sort(() => Math.random() - 0.5);
    const finalSongs = uniqueSongs.slice(0, 250);

    finalOutput += `\nexport const ${name} = [\n`;
    finalSongs.forEach((song, i) => {
        finalOutput += `    { id: 'kid${i + 1}', title: "${song.title.replace(/"/g, '\\"')}", artist: "${song.artist.replace(/"/g, '\\"')}", audioUrl: "${song.audioUrl}", year: ${song.year} },\n`;
    });
    finalOutput += `];\n`;

    fs.appendFileSync('c:/Users/ltim2/programme/song guess/src/songs.js', finalOutput);
    console.log(`Added ${name} with ${finalSongs.length} songs`);
}
