const https = require('https');
const fs = require('fs');

const categories = [
    {
        name: 'songsIn',
        country: 'in',
        queries: [
            'Arijit Singh', 'Shreya Ghoshal', 'Neha Kakkar', 'Badshah', 'A.R. Rahman',
            'Sonu Nigam', 'Sunidhi Chauhan', 'Atif Aslam', 'Kishore Kumar', 'Lata Mangeshkar',
            'Udit Narayan', 'Alka Yagnik', 'Kumar Sanu', 'Jubin Nautiyal', 'Guru Randhawa',
            'Sid Sriram', 'Darshan Raval', 'Armaan Malik', 'B Praak', 'Yo Yo Honey Singh'
        ]
    }
];

let finalOutput = '';

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
        finalOutput += `    { id: 'in${i + 1}', title: "${song.title.replace(/"/g, '\\"')}", artist: "${song.artist.replace(/"/g, '\\"')}", audioUrl: "${song.audioUrl}", year: ${song.year} },\n`;
    });
    finalOutput += `];\n`;

    fs.appendFileSync('c:/Users/ltim2/programme/song guess/src/songs.js', finalOutput);
    console.log(`Added ${name} with ${finalSongs.length} songs`);
}
