const fs = require('fs');
const path = './src/songs.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('au d ioUrl')) {
        lines[i] = '    { id: 27, title: "句號", artist: "鄧紫棋", audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/08/c1/9b/08c19baa-b5cc-d1ac-34ec-c133b38bc237/mzaf_3381328536345356047.plus.aac.p.m4a", appleUrl: "https://music.apple.com/hk/album/%E5%8F%A5%E8%99%9F/1487768987?i=1487768988&uo=4", year: 2019 },';
    }
}

fs.writeFileSync(path, lines.join('\n'));
console.log("Fixed line 27!");
