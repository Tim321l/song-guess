const https = require('https');
const fs = require('fs');
const path = require('path');

const categories = [
    {
        name: 'songsIn',
        country: 'in',
        queries: [
            'Arijit Singh', 'Shreya Ghoshal', 'Neha Kakkar', 'Badshah', 'A.R. Rahman',
            'Sonu Nigam', 'Sunidhi Chauhan', 'Atif Aslam', 'Kishore Kumar', 'Lata Mangeshkar',
            'Udit Narayan', 'Alka Yagnik', 'Kumar Sanu', 'Jubin Nautiyal', 'Guru Randhawa',
            'Sid Sriram', 'Darshan Raval', 'Armaan Malik', 'B Praak', 'Yo Yo Honey Singh',
            'Shreya Ghoshal Hits', 'Arijit Singh Hits', 'Bollywood 2024', 'Bollywood Classics'
        ]
    }
];

const songsPath = path.join(__dirname, '../songs.json');

async function startRestoration() {
    console.log('Restoring India Hits...');

    let currentSongs = {};
    if (fs.existsSync(songsPath)) {
        currentSongs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
    }

    for (const category of categories) {
        let allSongs = [];
        console.log(`Processing ${category.name}...`);

        for (const query of category.queries) {
            console.log(`Searching: ${query}...`);
            try {
                const results = await performSearch(query, category.country);
                if (results) {
                    results.forEach(song => {
                        if (song.previewUrl) {
                            allSongs.push({
                                id: song.trackId,
                                title: song.trackName,
                                artist: song.artistName,
                                audioUrl: song.previewUrl,
                                appleUrl: song.trackViewUrl,
                                year: new Date(song.releaseDate).getFullYear()
                            });
                        }
                    });
                }
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.error(`Error for ${query}: ${e.message}`);
            }
        }

        const uniqueSongs = [];
        const seen = new Set();
        for (const s of allSongs) {
            const key = `${s.title}-${s.artist}`.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueSongs.push(s);
            }
        }

        uniqueSongs.sort(() => Math.random() - 0.5);
        currentSongs[category.name] = uniqueSongs.slice(0, 500); // Add up to 500 songs
        console.log(`Finished ${category.name} with ${currentSongs[category.name].length} songs`);
    }

    fs.writeFileSync(songsPath, JSON.stringify(currentSongs, null, 2));
    console.log('Successfully updated songs.json with India Hits!');
}

function performSearch(query, country) {
    return new Promise((resolve) => {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=50&country=${country}`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data).results);
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

startRestoration();
