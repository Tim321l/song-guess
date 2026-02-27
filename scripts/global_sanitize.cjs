const fs = require('fs');
let content = fs.readFileSync('src/songs.js', 'utf8');

// Replace all weird whitespace (non-breaking space, etc.) with regular space
content = content.replace(/[\u00A0\u1680​\u180E\u2000-\u200D\u202F\u205F\u3000\uFEFF]/g, ' ');

// Fix property names globally
content = content.replace(/i\s*d\s*:/g, 'id:');
content = content.replace(/t\s*i\s*t\s*l\s*e\s*:/g, 'title:');
content = content.replace(/a\s*r\s*t\s*i\s*s\s*t\s*:/g, 'artist:');
content = content.replace(/a\s*u\s*d\s*i\s*o\s*U\s*r\s*l\s*:/g, 'audioUrl:');
content = content.replace(/a\s*p\s*p\s*l\s*e\s*U\s*r\s*l\s*:/g, 'appleUrl:');
content = content.replace(/y\s*e\s*a\s*r\s*:/g, 'year:');

// Fix numbers separated by whitespace
content = content.replace(/(\d)\s+(\d)/g, '$1$2');
content = content.replace(/(\d)\s+(\d)/g, '$1$2'); // Run twice for triples

// Fix specific mangled URL start
content = content.replace(/\" h tt ps :/g, '"https:');

fs.writeFileSync('src/songs.js', content);
console.log("Global sanitization applied to src/songs.js");
