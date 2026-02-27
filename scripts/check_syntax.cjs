const fs = require('fs');
const content = fs.readFileSync('src/songs.js', 'utf8');

const lines = content.split('\n');
let inArray = false;
let currentArrayName = "";

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('export const')) {
        inArray = true;
        currentArrayName = trimmed.split(' ')[2];
        continue;
    }
    if (trimmed === '];') {
        inArray = false;
        continue;
    }

    if (inArray && trimmed.startsWith('{')) {
        try {
            // Attempt to parse strictly
            // We need to wrap it in a variable assignment to be valid JS
            eval('const x = ' + trimmed.replace(/,$/, ''));
        } catch (e) {
            console.log(`Error on line ${i + 1} in ${currentArrayName}: ${e.message}`);
            console.log(`Content: ${trimmed}`);
        }
    }
}
