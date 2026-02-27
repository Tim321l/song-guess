const https = require('https');
const fs = require('fs');

const categories = [
    {
        name: 'songsKr',
        country: 'kr',
        queries: [
            'BTS', 'IU', 'BLACKPINK', 'TWICE', 'EXO', 'NewJeans', 'IVE', 'Stray Kids',
            'SEVENTEEN', 'PSY', 'BIGBANG', 'Girls\' Generation', 'Red Velvet', 'NCT',
            'aespa', 'LE SSERAFIM', 'Jay Park', 'Zico', 'Taeyeon', 'G-DRAGON'
        ]
    },
    {
        name: 'songsEs',
        country: 'us',
        queries: [
            'Shakira', 'Bad Bunny', 'Rosalía', 'Enrique Iglesias', 'J Balvin',
            'Luis Fonsi', 'Ricky Martin', 'Daddy Yankee', 'Maluma', 'Ozuna',
            'Karol G', 'Alejandro Sanz', 'Juanes', 'Camila Cabello', 'C. Tangana',
            'Rauw Alejandro', 'Anuel AA', 'Bizarrap', 'Christian Nodal', 'Sebastián Yatra'
        ]
    }
];

async function fetchNewSongs() {
    let newSongsData = {};

    for (const category of categories) {
        let allSongs = [];
        console.log(`Processing ${category.name}...`);

        for (const query of category.queries) {
            try {
                const results = await performSearch(query, category.country);
                if (results) {
                    results.forEach(song => {
                        const year = new Date(song.releaseDate).getFullYear();
                        if (year >= 2000 && song.previewUrl) {
                            allSongs.push({
                                title: song.trackName,
                                artist: song.artistName,
                                audioUrl: song.previewUrl,
                                appleUrl: song.trackViewUrl,
                                year: year
                            });
                        }
                    });
                    console.log(`  Added ${results.length} results for ${query}`);
                }
                // Large delay to be safe
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.error(`Error for ${query}: ${e.message}`);
            }
        }

        const uniqueSongs = [];
        const titles = new Set();
        for (const song of allSongs) {
            if (!titles.has(song.title.toLowerCase())) {
                titles.add(song.title.toLowerCase());
                uniqueSongs.push(song);
            }
        }

        uniqueSongs.sort(() => Math.random() - 0.5);
        newSongsData[category.name] = uniqueSongs.slice(0, 500);
        console.log(`Finished ${category.name} with ${newSongsData[category.name].length} songs`);
    }

    // Now inject into existing songs.js
    let songsJsPath = 'c:/Users/ltim2/programme/song guess/src/songs.js';
    let content = fs.readFileSync(songsJsPath, 'utf8');

    for (const [name, songs] of Object.entries(newSongsData)) {
        let arrayStr = `export const ${name} = [\n`;
        songs.forEach((song, i) => {
            arrayStr += `    { id: ${i + 1}, title: "${song.title.replace(/"/g, '\\"')}", artist: "${song.artist.replace(/"/g, '\\"')}", audioUrl: "${song.audioUrl}", appleUrl: "${song.appleUrl || ''}", year: ${song.year} },\n`;
        });
        arrayStr += `];\n\n`;

        // Append to the end
        content += '\n' + arrayStr;
    }

    fs.writeFileSync(songsJsPath, content);
    console.log('Successfully appended new categories to songs.js');
}

function performSearch(query, country) {
    return new Promise((resolve, reject) => {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=30&country=${country}`;
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };
        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                console.log(`Status ${res.statusCode} for ${query}`);
                resolve(null);
                return;
            }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data).results);
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', e => resolve(null));
    });
}

fetchNewSongs();
