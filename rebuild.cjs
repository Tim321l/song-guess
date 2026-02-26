const fs = require('fs');
let content = fs.readFileSync('src/songs.js', 'utf8');
let lines = content.split('\n');

let validOutput = [];
let insideArray = false;

for (let line of lines) {
    let trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed === '') {
        validOutput.push(line);
        continue;
    }

    if (trimmed.startsWith('import ')) {
        validOutput.push(line);
        continue;
    }

    if (trimmed.startsWith('export const')) {
        if (trimmed.includes('songsKr') || trimmed.includes('songsEs')) {
            insideArray = true;
            continue;
        }
        validOutput.push(line);
        continue;
    }

    if (trimmed === '];' || trimmed === ']') {
        if (!insideArray) {
            validOutput.push('];');
        }
        insideArray = false;
        continue;
    }

    if (!insideArray) {
        // Extract strictly the first fully-formed song object.
        // { id: 1, title: "...", ..., year: 2000 }
        // Match up to the "year: <num> }" part.
        let match = line.match(/^(\{\s*id\s*:\s*\d+,\s*title\s*:.*?year\s*:\s*\d+\s*\})/);
        if (match) {
            validOutput.push('    ' + match[1] + ',');
        }
    }
}

// Ensure the last array is closed properly
if (validOutput[validOutput.length - 1] !== '];' && validOutput[validOutput.length - 2] !== '];') {
    let hasClose = false;
    for (let i = validOutput.length - 1; i >= 0; i--) {
        if (validOutput[i].trim() === '];') {
            hasClose = true;
            break;
        }
        if (validOutput[i].includes('export const')) {
            break;
        }
    }
    if (!hasClose) validOutput.push('];');
}

// Add the new languages cleanly at the bottom
validOutput.push('');
validOutput.push('export const songsKr = [');
validOutput.push('    // Korean songs will be injected here');
validOutput.push('];');
validOutput.push('');
validOutput.push('export const songsEs = [');
validOutput.push('    // Spanish songs will be injected here');
validOutput.push('];');

fs.writeFileSync('src/songs.js', validOutput.join('\n'));
console.log("Filtered songs.js tightly and rebuilt cleanly.");
