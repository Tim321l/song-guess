const fs = require('fs');
let content = fs.readFileSync('src/songs.js', 'utf8');

// Fix property names with any amount of spaces
content = content.replace(/i\s*d\s*:/g, 'id:');
content = content.replace(/t\s*i\s*t\s*l\s*e\s*:/g, 'title:');
content = content.replace(/a\s*r\s*t\s*i\s*s\s*t\s*:/g, 'artist:');
content = content.replace(/a\s*u\s*d\s*i\s*o\s*U\s*r\s*l\s*:/g, 'audioUrl:');
content = content.replace(/a\s*p\s*p\s*l\s*e\s*U\s*r\s*l\s*:/g, 'appleUrl:');
content = content.replace(/y\s*e\s*a\s*r\s*:/g, 'year:');

// Fix numeric values (id and year)
content = content.replace(/id:\s*([\d\s]+),/g, (match, p1) => {
    return 'id: ' + p1.replace(/\s+/g, '') + ',';
});
content = content.replace(/year:\s*([\d\s]+)\s*}/g, (match, p1) => {
    return 'year: ' + p1.replace(/\s+/g, '') + ' }';
});

// Fix spaced-out URLs (https, appleUrl, etc.)
content = content.replace(/\"(h\s*t\s*t\s*p\s*s\s*:\s*\/[\s\S]*?)\"/g, (match, p1) => {
    if (p1.replace(/\s+/g, '').startsWith('https:/')) {
        return '"' + p1.replace(/\s+/g, '') + '"';
    }
    return match;
});

fs.writeFileSync('src/songs.js', content);
console.log("Improved brute force fix applied to src/songs.js");
