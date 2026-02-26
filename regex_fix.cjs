const fs = require('fs');
let content = fs.readFileSync('src/songs.js', 'utf8');

// Join lines within song objects
// Pattern: { followed by anything (non-greedy) until },
// We want to replace newlines within that match with spaces.
content = content.replace(/\{[\s\S]*?\},/g, (match) => {
    return match.replace(/\r?\n\s*/g, ' ');
});

// Also fix the spaced out keywords again just in case
content = content.replace(/i\s+d\s*:/g, 'id:');
content = content.replace(/t\s+i\s+t\s+l\s+e\s*:/g, 'title:');
content = content.replace(/a\s+r\s+t\s+i\s+s\s+t\s*:/g, 'artist:');
content = content.replace(/a\s+u\s+d\s+i\s+o\s+U\s+r\s+l\s*:/g, 'audioUrl:');
content = content.replace(/a\s+p\s+p\s+l\s+e\s+U\s+r\s+l\s*:/g, 'appleUrl:');
content = content.replace(/y\s+e\s+a\s+r\s*:/g, 'year:');

// Re-format slightly for readability (one per line)
content = content.replace(/    \{ id:/g, '\n    { id:');

fs.writeFileSync('src/songs.js', content);
console.log("Regex-based fix applied to src/songs.js");
