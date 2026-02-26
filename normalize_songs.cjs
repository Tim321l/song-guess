const fs = require('fs');
let content = fs.readFileSync('src/songs.js', 'utf8');

// Ensure each object starts on a new line
// Match }, followed by optional whitespace and then {
content = content.replace(/\}\s*,\s*\{/g, '},\n    {');
content = content.replace(/\}\s*\{/g, '},\n    {');

// Fix property names again just in case a new corruption pattern appeared
content = content.replace(/(\W)i\s+d\s*:/g, '$1id:');
content = content.replace(/(\W)t\s+i\s+t\s+l\s+e\s*:/g, '$1title:');
content = content.replace(/(\W)a\s+r\s+t\s+i\s+s\s+t\s*:/g, '$1artist:');
content = content.replace(/(\W)a\s+u\s+d\s+i\s+o\s+U\s+r\s+l\s*:/g, '$1audioUrl:');
content = content.replace(/(\W)a\s+p\s+p\s+l\s+e\s+U\s+r\s+l\s*:/g, '$1appleUrl:');
content = content.replace(/(\W)y\s+e\s+a\s+r\s*:/g, '$1year:');

// Fix numeric values with internal spaces (e.g. 1 1 6, 2 0 2 5)
// This targets values after id: or year:
content = content.replace(/(id:\s*)([\d\s]+)(?=,)/g, (match, p1, p2) => p1 + p2.replace(/\s+/g, ''));
content = content.replace(/(year:\s*)([\d\s]+)(?=\s*})/g, (match, p1, p2) => p1 + p2.replace(/\s+/g, ''));

fs.writeFileSync('src/songs.js', content);
console.log("Structure normalized and spacing fixed in src/songs.js");
