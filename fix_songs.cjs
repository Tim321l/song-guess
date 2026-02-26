const fs = require('fs');
const path = './src/songs.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const fixed = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // if it's a valid start of a JS statement or object
    if (
        line.match(/^\s*\{ id:/) ||
        line.match(/^export const/) ||
        line.match(/^\];?/) ||
        line.match(/^\[/) ||
        line.trim() === '' ||
        line.trim().startsWith('//')
    ) {
        fixed.push(line.replace('\r', ''));
    } else {
        // It's a broken string split onto a new line, append it to the prev line
        if (fixed.length > 0) {
            fixed[fixed.length - 1] += line.trim().replace('\r', '');
        }
    }
}

fs.writeFileSync(path, fixed.join('\n'), 'utf8');
console.log("Fixed with line-by-line approach");
