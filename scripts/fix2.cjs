const fs = require('fs');
let s = fs.readFileSync('./src/songs.js', 'utf8');

let lines = s.split('\n');
let fixed = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimEnd();

    if (line === '' || line.startsWith('//') || line.startsWith('export const')) {
        fixed.push(line);
        continue;
    }

    // if line ends properly, push it
    if (line.endsWith('},') || line.endsWith('];') || line.endsWith('[')) {
        fixed.push(line);
    } else {
        // keep appending next lines until it ends correctly
        while (i + 1 < lines.length && !line.endsWith('},') && !line.endsWith('];')) {
            i++;
            line += lines[i].trimEnd();
        }
        fixed.push(line);
    }
}

fs.writeFileSync('./src/songs.js', fixed.join('\n'));
console.log("Fixed songs.js aggressively.");
