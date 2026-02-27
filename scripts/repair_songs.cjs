const fs = require('fs');
const content = fs.readFileSync('src/songs.js', 'utf8');
const lines = content.split('\n');

const categories = {}; // name -> records[]
let currentName = null;

for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('export const')) {
        const match = trimmed.match(/export const (\w+) =/);
        if (match) {
            currentName = match[1];
            if (!categories[currentName]) {
                categories[currentName] = [];
            }
            continue;
        }
    }

    if (currentName) {
        if (trimmed === '];') {
            currentName = null;
        } else if (trimmed.startsWith('{ id:')) {
            // Check for duplicates within the same category to be safe
            if (!categories[currentName].some(r => r.includes(trimmed.substring(0, 100)))) {
                categories[currentName].push(line);
            }
        }
    }
}

let finalOutput = "";
for (const [name, records] of Object.entries(categories)) {
    finalOutput += `export const ${name} = [\n`;
    records.forEach((rec, i) => {
        // Re-index to be clean
        const cleanRec = rec.replace(/id: \d+/, `id: ${i + 1}`);
        finalOutput += cleanRec + '\n';
    });
    finalOutput += `];\n\n`;
}

fs.writeFileSync('src/songs.js', finalOutput);
console.log("Rebuilt songs.js with unique categories and re-indexed songs.");
