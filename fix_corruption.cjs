const fs = require('fs');
const content = fs.readFileSync('src/songs.js', 'utf8');
const lines = content.split('\n');

let fixedLines = [];
let buffer = "";

for (let line of lines) {
    let trimmed = line.trim();

    // Fix spaced out keywords like "i d :" or "t i t l e :"
    line = line.replace(/i\s+d\s*:/g, 'id:');
    line = line.replace(/t\s+i\s+t\s+l\s+e\s*:/g, 'title:');
    line = line.replace(/a\s+r\s+t\s+i\s+s\s+t\s*:/g, 'artist:');
    line = line.replace(/a\s+u\s+d\s+i\s+o\s+U\s+r\s+l\s*:/g, 'audioUrl:');
    line = line.replace(/a\s+p\s+p\s+l\s+e\s+U\s+r\s+l\s*:/g, 'appleUrl:');
    line = line.replace(/y\s+e\s+a\s+r\s*:/g, 'year:');

    // Also fix cases where a single digit is spaced out
    line = line.replace(/id:\s+(\d)\s+(\d)\s+(\d)/g, 'id: $1$2$3');
    line = line.replace(/id:\s+(\d)\s+(\d)/g, 'id: $1$2');

    if (buffer) {
        buffer += line.trim();
        if (buffer.includes('},')) {
            fixedLines.push('    ' + buffer);
            buffer = "";
        }
    } else {
        if (line.includes('{') && line.includes('id:') && !line.includes('},')) {
            buffer = line.trim();
        } else {
            fixedLines.push(line);
        }
    }
}

fs.writeFileSync('src/songs_fixed.js', fixedLines.join('\n'));
console.log("Attempted to fix corruption in src/songs_fixed.js");
