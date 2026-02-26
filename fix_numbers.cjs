const fs = require('fs');
let content = fs.readFileSync('src/songs.js', 'utf8');

// Fix spaced-out numbers in IDs (e.g., id: 1 1 6 -> id: 116)
content = content.replace(/id:\s*(\d)\s*(\d)\s*(\d)/g, 'id: $1$2$3');
content = content.replace(/id:\s*(\d)\s*(\d)/g, 'id: $1$2');

// Fix other possible spaced-out issues
content = content.replace(/y\s*e\s*a\s*r\s*:\s*(\d)\s*(\d)\s*(\d)\s*(\d)/g, 'year: $1$2$3$4');

fs.writeFileSync('src/songs.js', content);
console.log("Fixed spaced-out numbers in src/songs.js");
