import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const songsPath = path.join(__dirname, 'src/server/../../songs.json');

console.log('Absolute Path:', path.resolve(songsPath));
if (fs.existsSync(songsPath)) {
    const data = fs.readFileSync(songsPath, 'utf8');
    const parsed = JSON.parse(data);
    console.log('Keys found:', Object.keys(parsed));
    Object.keys(parsed).forEach(k => {
        console.log(`${k}: ${parsed[k].length} songs`);
    });
} else {
    console.log('File NOT found at:', path.resolve(songsPath));
}
