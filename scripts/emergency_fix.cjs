const fs = require('fs');
const content = fs.readFileSync('src/songs.js', 'utf8');
const sections = content.split('export const ');

const validCategories = {};

for (let section of sections) {
    if (!section.trim()) continue;
    let lines = section.split('\n');
    let header = lines[0].trim();
    let nameMatch = header.match(/(\w+) = \[/);
    if (!nameMatch) continue;
    let name = nameMatch[1];

    let songs = [];
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        // Only keep lines that look like valid song objects without mangled chars
        if (line.startsWith('{ id:') && line.includes('audioUrl: "http') && !line.includes('?')) {
            let lastBrace = line.lastIndexOf('}');
            if (lastBrace !== -1) {
                songs.push(line.substring(0, lastBrace + 1) + ',');
            }
        }
    }
    if (!validCategories[name] || songs.length > validCategories[name].length) {
        validCategories[name] = songs;
    }
}

// Ensure Spanish exists
validCategories['songsEs'] = [
    '{ id: 1, title: "Despacito", artist: "Luis Fonsi & Daddy Yankee", audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/4a/5b/c2/4a5bc20c-0333-e91c-775b-5544ae6582f2/mzaf_6282914541229619292.plus.aac.p.m4a", appleUrl: "https://music.apple.com/us/album/despacito/1207120422?i=1207120448&uo=4", year: 2017 },',
    '{ id: 2, title: "Hips Don\'t Lie", artist: "Shakira", audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/10/9a/6e/109a6ef3-77d0-d4c1-4c2d-7a291400c44e/mzaf_7158869798603921547.plus.aac.p.m4a", appleUrl: "https://music.apple.com/us/album/hips-dont-lie/1441154435?i=1441154440&uo=4", year: 2006 },',
    '{ id: 3, title: "Vivir Mi Vida", artist: "Marc Anthony", audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/3e/c4/27/3ec427f7-5421-9997-e534-8864597a28ac/mzaf_17880638373980787465.plus.aac.p.m4a", appleUrl: "https://music.apple.com/us/album/vivir-mi-vida/1440824514?i=1440824749&uo=4", year: 2013 },',
    '{ id: 4, title: "Bailando", artist: "Enrique Iglesias", audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b7/a1/28/b7a1288f-203e-08f7-3d00-44890cfc7c07/mzaf_8209562857680609164.plus.aac.p.m4a", appleUrl: "https://music.apple.com/us/album/bailando/1440860819?i=1440861227&uo=4", year: 2014 },',
    '{ id: 5, title: "Gasolina", artist: "Daddy Yankee", audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/a2/04/7b/a2047ba6-15c1-b694-f6c7-4c673c674b3a/mzaf_13698105114896550058.plus.aac.p.m4a", appleUrl: "https://music.apple.com/us/album/gasolina/574406654?i=574406658&uo=4", year: 2004 },',
];

let finalOutput = "";
for (let name of Object.keys(validCategories)) {
    finalOutput += `export const ${name} = [\n`;
    validCategories[name].forEach((s, idx) => {
        finalOutput += `    ${s.replace(/id: \d+/, 'id: ' + (idx + 1))}\n`;
    });
    finalOutput += `];\n\n`;
}

fs.writeFileSync('src/songs.js', finalOutput);
console.log("Deep sanitized and recovered songs.js");
