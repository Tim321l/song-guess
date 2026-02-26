const https = require('https');
const fs = require('fs');

const categories = [
    {
        name: 'songsHk',
        country: 'hk',
        queries: [
            'Jacky Cheung cantonese', 'Andy Lau cantonese', 'Leon Lai cantonese', 'Aaron Kwok cantonese',
            'Faye Wong cantonese', 'Sammi Cheng cantonese', 'Kelly Chen cantonese', 'Miriam Yeung cantonese',
            'Joey Yung cantonese', 'Twins cantonese', 'Eason Chan cantonese', 'Hacken Lee cantonese',
            'Leo Ku cantonese', 'Nicholas Tse cantonese', 'Cass Phang cantonese', 'Shirley Kwan cantonese',
            'Candy Lo cantonese', 'Jade Kwan cantonese', 'Beyond cantonese', 'Grasshopper cantonese',
            'Ronald Cheng cantonese', 'William So cantonese', 'Edmond Leung cantonese', 'Andy Hui cantonese'
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
                            const releaseYear = new Date(song.releaseDate).getFullYear();
                            if (song.previewUrl && releaseYear >= 1980 && releaseYear <= 2010) {
                                allSongs.push({
                                    title: song.trackName,
                                    artist: song.artistName,
                                    audioUrl: song.previewUrl,
                                    year: releaseYear
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
        finalOutput += `    { id: 'hk${i + 1}', title: "${song.title.replace(/"/g, '\\"')}", artist: "${song.artist.replace(/"/g, '\\"')}", audioUrl: "${song.audioUrl}", year: ${song.year} },\n`;
    });
    finalOutput += `];\n`;

    let content = fs.readFileSync('c:/Users/ltim2/programme/song guess/src/songs.js', 'utf8');

    // Remove the old songsHk export completely using regex
    content = content.replace(/\nexport const songsHk = \[[\s\S]*?\];\n/g, '');

    // Append the new content array
    fs.writeFileSync('c:/Users/ltim2/programme/song guess/src/songs.js', content + finalOutput);
    console.log(`Replaced songsHk with ${finalSongs.length} pure Cantonese songs`);
}
