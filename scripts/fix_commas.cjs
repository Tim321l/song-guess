const fs = require('fs');
let content = fs.readFileSync('src/songs.js', 'utf8');

// Fix missing comma between objects: }{ -> }, {
content = content.replace(/\}\s*\{/g, '}, {');

// Re-run the spacing cleanup just in case
content = content.replace(/(\d)\s+(\d)/g, '$1$2');
content = content.replace(/(\d)\s+(\d)/g, '$1$2');

// Re-format slightly
content = content.replace(/    \{ id:/g, '\n    { id:');
content = content.replace(/\}, \{ id:/g, '},\n    { id:');

fs.writeFileSync('src/songs.js', content);
console.log("Joined objects fixed in src/songs.js");
