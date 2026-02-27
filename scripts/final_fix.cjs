const fs = require('fs');
const content = fs.readFileSync('src/songs.js', 'utf8');
const lines = content.split('\n');

let fixedLines = [];
let buffer = "";

for (let line of lines) {
    let trimmed = line.trim();

    if (trimmed.startsWith('export const') || trimmed === '];' || trimmed === '' || trimmed === '},') {
        if (buffer) {
            fixedLines.push('    ' + buffer);
            buffer = "";
        }
        fixedLines.push(line);
        continue;
    }

    // Fix spaced out keywords
    line = line.replace(/i\s+d\s*:/g, 'id:');
    line = line.replace(/t\s+i\s+t\s+l\s+e\s*:/g, 'title:');
    line = line.replace(/a\s+r\s+t\s+i\s+s\s+t\s*:/g, 'artist:');
    line = line.replace(/a\s+u\s+d\s+i\s+o\s+U\s+r\s+l\s*:/g, 'audioUrl:');
    line = line.replace(/a\s+p\s+p\s+l\s+e\s+U\s+r\s+l\s*:/g, 'appleUrl:');
    line = line.replace(/y\s+e\s+a\s+r\s*:/g, 'year:');

    trimmed = line.trim();

    if (trimmed.startsWith('{')) {
        if (buffer) {
            fixedLines.push('    ' + buffer);
        }
        buffer = trimmed;
    } else {
        if (buffer) {
            buffer += ' ' + trimmed;
        } else {
            fixedLines.push(line);
        }
    }

    if (buffer && buffer.endsWith('},')) {
        fixedLines.push('    ' + buffer);
        buffer = "";
    }
}

if (buffer) {
    fixedLines.push('    ' + buffer);
}

fs.writeFileSync('src/songs.js', fixedLines.join('\n'));
console.log("Final fix applied to src/songs.js");
