const fs = require('fs');

const songsJson = JSON.parse(fs.readFileSync('./src/songs.json', 'utf8'));
let songsJs = fs.readFileSync('./src/songs.js', 'utf8');

const categories = ['songsEn', 'songsCn', 'songsJp', 'songsFr', 'songsTh', 'songsHk', 'songsKr', 'songsEs'];

for (const cat of categories) {
    if (!songsJson[cat]) continue;

    // We build the array string
    let arrayContent = `export const ${cat} = [\n`;
    for (let i = 0; i < songsJson[cat].length; i++) {
        const song = songsJson[cat][i];
        // clean titles
        const safeTitle = song.title.replace(/"/g, '\\"');
        const safeArtist = song.artist.replace(/"/g, '\\"');
        arrayContent += `    { id: ${i + 1}, title: "${safeTitle}", artist: "${safeArtist}", audioUrl: "${song.audioUrl}", appleUrl: "${song.appleUrl || ''}", year: ${song.year} },\n`;
    }
    arrayContent += `];`;

    // Replace the specific export const array in songs.js
    // This regex looks for export const <cat> = [ ... ];
    const regex = new RegExp(`export const ${cat}\\s*=\\s*\\[[\\s\\S]*?\\];`, 'g');

    if (regex.test(songsJs)) {
        songsJs = songsJs.replace(regex, arrayContent);
        console.log(`Updated ${cat} in songs.js`);
    } else {
        // If not found, append to the bottom
        songsJs += `\n\n${arrayContent}`;
        console.log(`Appended ${cat} to songs.js`);
    }
}

fs.writeFileSync('./src/songs.js', songsJs, 'utf8');
console.log("Successfully injected all songs into songs.js securely part by part.");
