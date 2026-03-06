const fs = require('fs');
const arashiMetadata = JSON.parse(fs.readFileSync('c:/Users/ltim2/programme/song guess/scripts/arashi_songs_metadata.json', 'utf8'));
const songsJsonPath = 'c:/Users/ltim2/programme/song guess/songs.json';

if (!fs.existsSync(songsJsonPath)) {
    console.error('songs.json not found!');
    process.exit(1);
}

const songsData = JSON.parse(fs.readFileSync(songsJsonPath, 'utf8'));

// Deduplicate Arashi songs (case insensitive title check)
const existingTitles = new Set();
if (songsData.songsArashi) {
    songsData.songsArashi.forEach(s => existingTitles.add(s.title.toLowerCase()));
} else {
    songsData.songsArashi = [];
}

const newSongs = arashiMetadata.filter(s => {
    if (!existingTitles.has(s.title.toLowerCase())) {
        existingTitles.add(s.title.toLowerCase());
        return true;
    }
    return false;
});

// Re-index IDs starting from 1
const mergedArashi = [...songsData.songsArashi, ...newSongs].map((s, i) => ({
    ...s,
    id: i + 1
}));

songsData.songsArashi = mergedArashi;

fs.writeFileSync(songsJsonPath, JSON.stringify(songsData, null, 2));

console.log(`Successfully merged ${newSongs.length} new Arashi songs. Total: ${mergedArashi.length}`);
