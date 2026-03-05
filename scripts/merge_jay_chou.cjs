const fs = require('fs');
const path = require('path');

const songsPath = path.join(__dirname, '../songs.json');
const fetchedPath = path.join(__dirname, '../scripts/jay_chou_fetched.json');

if (!fs.existsSync(songsPath)) {
    console.error('songs.json not found');
    process.exit(1);
}

if (!fs.existsSync(fetchedPath)) {
    console.error('jay_chou_fetched.json not found');
    process.exit(1);
}

const mainData = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
const fetchedSongs = JSON.parse(fs.readFileSync(fetchedPath, 'utf8'));

if (!mainData.songsCn) {
    mainData.songsCn = [];
}

// Find max ID in songsCn
let maxId = 0;
mainData.songsCn.forEach(s => {
    if (s.id > maxId) maxId = s.id;
});

console.log(`Current max ID in songsCn: ${maxId}`);

// Deduplicate: check if title+artist already exists in songsCn
const existingKeys = new Set(mainData.songsCn.map(s => `${s.title.toLowerCase()}|${s.artist.toLowerCase()}`));

let addedCount = 0;
fetchedSongs.forEach(song => {
    const key = `${song.title.toLowerCase()}|${song.artist.toLowerCase()}`;
    if (!existingKeys.has(key)) {
        maxId++;
        mainData.songsCn.push({
            id: maxId,
            title: song.title,
            artist: song.artist,
            audioUrl: song.audioUrl,
            appleUrl: song.appleUrl,
            year: song.year
        });
        existingKeys.add(key);
        addedCount++;
    }
});

fs.writeFileSync(songsPath, JSON.stringify(mainData, null, 2), 'utf8');
console.log(`Successfully merged ${addedCount} new Jay Chou songs into songsCn.`);
