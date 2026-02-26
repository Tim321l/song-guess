const fs = require('fs');
let content = fs.readFileSync('src/songs.js', 'utf8');
let lines = content.split('\n');

let seenExports = new Set();
let output = [];
let insideValidArray = false;
let currentArrayLines = [];

for (let line of lines) {
    let trimmed = line.trim();
    if (trimmed.startsWith('export const')) {
        let nameMatch = trimmed.match(/export const (\w+) =/);
        if (nameMatch) {
            let name = nameMatch[1];
            if (seenExports.has(name)) {
                insideValidArray = false; // Skip this duplicate
                continue;
            }
            seenExports.add(name);
            insideValidArray = true;
            output.push(line);
            continue;
        }
    }

    if (trimmed === '];') {
        if (insideValidArray) {
            output.push(line);
        }
        insideValidArray = false;
        continue;
    }

    if (insideValidArray) {
        output.push(line);
    }
}

fs.writeFileSync('src/songs.js', output.join('\n'));
console.log("Deduplicated songs.js");
