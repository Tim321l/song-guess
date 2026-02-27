const https = require('https');
const fs = require('fs');

const queries = [
    // Internet Classics
    'Never Gonna Give You Up', 'All Star Smash Mouth', 'Astronomia Vicetone', 'Shooting Stars Bag Raiders',
    'Baby Shark', 'Gangnam Style', 'PPAP', 'Nyan Cat', 'Tunak Tunak Tun', 'Friday Rebecca Black',
    'The Fox Ylvis', 'Trololo Eduard Khil', 'Song for Denise', 'Can You Feel My Heart', 'Baka Mitai',
    'Big Enough Kirin J Callinan', 'Caramelldansen', 'Despacito', 'Old Town Road', 'We Are Number One',
    'You Are A Pirate', 'Lazy Song', 'Chocolate Rain', 'Bed Intruder Song', 'Double Rainbow Song',
    'He-Man HEYYEYAAEYAAAEYAEYAA', 'Numa Numa', 'Cotton Eye Joe', 'Blue Da Ba Dee', 'I\'m Blue',
    'Sandstorm Darude', 'Scatman', 'Rasputin Boney M', ' Moskau Dschinghis Khan', 'Vitas 7th Element',
    'Chaccaron Maccaron', 'Loituma Ievan Polkka', 'Chicken Wing Chicken Wing', 'Hamster Dance',
    'Banana Phone', 'Narwhitals', 'Badgers Badgers', 'Llama Song', 'The Duck Song', 'It\'s Raining Men',
    'YMCA', 'Stayin Alive', 'Stayin Alive meme', 'GigaChad theme', 'Phonk meme', 'Sahara Phonk'
];

const memesQueries = [
    // More Memes
    'Never Gonna Give You Up', 'All Star', 'Astronomia', 'Shooting Stars', 'Baby Shark', 'Gangnam Style', 'PPAP',
    'Entry of the Gladiators', 'Nyan Cat', 'Tunak Tunak Tun', 'Baby Justin Bieber', 'Friday Rebecca Black',
    'The Fox What Does the Fox Say', 'Eduard Khil Trololo', 'Song for Denise Piano Fantasia',
    'Can You Feel My Heart Bring Me The Horizon', 'Baka Mitai Yakuza', 'Big Enough screaming',
    'Caramelldansen', 'Megalovania', 'Running in the 90s', 'Deja Vu Initial D', 'Gas Gas Gas',
    'Brain Power NOMA', 'Crab Rave', 'Coconut Mall', 'Mii Channel', 'Wii Shop Channel',
    'Bitch Lasagna', 'Congratulations PewDiePie', 'Mine Diamond', 'Take on Me', 'Africa Toto',
    'Plastic Love', 'Stay With Me Miki Matsubara', 'Flyday Chinatown', 'Mayonaka no Door',
    'Cupid FIFTY FIFTY', 'See Tình', 'Gimme Gimme Gimme ABBA', 'Rasputin', 'Stayin\' Alive',
    'Careless Whisper', 'Never Gonna Give You Up', 'Rick Astley', 'Smash Mouth', 'Bag Raiders',
    'Jack Stauber Buttercup', 'Day n Nite kid cudi', 'Wait a Minute Willow', 'Twice Look at Me',
    'Phonk', 'Brazil Phonk', 'Sigma Phonk', 'Kordhell Murder in my Mind', 'Hensonn Sahara',
    'Interworld Metamorphosis', 'PlayaPhonk Phonky Town', 'Pastel Ghost Iris', 'Mr Kitty Resurrection',
    'Mareux The Perfect Girl', 'DVRST Close Eyes', 'Kaito Shoma Hotline', 'Rave Dxrk',
    'Toby Fox Megalovania', 'Undertale Hopes and Dreams', 'Bonetrousle', 'Spider-Man 2 Pizza Theme',
    'Super Mario Bros Theme', 'Zelda Theme', 'Tetris Theme', 'Pac-Man Theme',
    'Doom E1M1', 'Halo Theme', 'Minecraft Sweden', 'Minecraft Subwoofer Lullaby',
    'Dr. Gigachad', 'The Only Thing They Fear Is You', 'Bury the Light', 'Devil Trigger',
    'Smurfs We Live We Love We Lie', 'Alan Walker Spectre', 'OMFG Hello', 'The Spectre',
    'Tobu Hope', 'Different Heaven My Heart', 'Fade Alan Walker', 'Marshmello Alone',
    'Skrillex Scary Monsters and Nice Sprites', 'Bangarang', 'First of the Year',
    'Kyary Pamyu Pamyu PonPonPon', 'Snail\'s House Pixel Galaxy', 'Aishite Aishite Aishite',
    'Racing into the Night Yoasobi', 'Idol Yoasobi', 'Bling-Bang-Bang-Born',
    'Gokuraku Jodo', 'Kawaii Future Bass', 'Snail\'s House', 'Yunomi', 'Psychic Type Indigo Plateau',
    'Haru Yo Koi', 'Snow Halation', 'Renai Circulation', 'Platinum Disco'
];

// Combine and deduplicate
const allQueries = Array.from(new Set([...queries, ...memesQueries]));

async function fetchMemes() {
    console.log(`Starting to fetch memes. Queries count: ${allQueries.length}`);
    let allSongs = [];

    for (const query of allQueries) {
        try {
            console.log(`Searching for: ${query}`);
            const results = await performSearch(query);
            if (results) {
                results.forEach(song => {
                    const year = new Date(song.releaseDate).getFullYear();
                    // Basic sanity check for meme songs
                    if (song.previewUrl) {
                        allSongs.push({
                            title: song.trackName,
                            artist: song.artistName,
                            audioUrl: song.previewUrl,
                            appleUrl: song.trackViewUrl,
                            year: year
                        });
                    }
                });
            }
            // Delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error(`Error for ${query}: ${e.message}`);
        }
    }

    // Deduplicate by title + artist
    const uniqueSongs = [];
    const seen = new Set();
    for (const song of allSongs) {
        const key = `${song.title.toLowerCase()}-${song.artist.toLowerCase()}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueSongs.push(song);
        }
    }

    console.log(`Total unique songs found: ${uniqueSongs.length}`);

    // Sort randomly and take top 150
    const finalSongs = uniqueSongs.sort(() => Math.random() - 0.5).slice(0, 150);

    // Format as Javascript array
    let arrayStr = `export const songsMemes = [\n`;
    finalSongs.forEach((song, i) => {
        arrayStr += `  {\n`;
        arrayStr += `    id: ${10001 + i},\n`;
        arrayStr += `    title: "${song.title.replace(/"/g, '\\"')}",\n`;
        arrayStr += `    artist: "${song.artist.replace(/"/g, '\\"')}",\n`;
        arrayStr += `    audioUrl: "${song.audioUrl}",\n`;
        arrayStr += `    appleUrl: "${song.appleUrl || ''}",\n`;
        arrayStr += `    year: ${song.year}\n`;
        arrayStr += `  }${i === finalSongs.length - 1 ? '' : ','}\n`;
    });
    arrayStr += `];\n`;

    // Read songs.js and replace songsMemes
    const songsJsPath = 'src/songs.js';
    let content = fs.readFileSync(songsJsPath, 'utf8');

    // Find the export const songsMemes = ... block
    const marker = 'export const songsMemes =';
    const parts = content.split(marker);
    if (parts.length > 1) {
        // Assume it's the last block or followed by nothing or another export
        // We just replace everything after the marker for now if it's at the end, 
        // or try to find the closing bracket if there are more exports after.
        // In this project, songsMemes seems to be at the end based on fix_memes.cjs
        fs.writeFileSync(songsJsPath, parts[0] + arrayStr);
        console.log(`Successfully updated ${songsJsPath} with ${finalSongs.length} meme songs.`);
    } else {
        // Just append if not found
        fs.appendFileSync(songsJsPath, '\n\n' + arrayStr);
        console.log(`Appended ${finalSongs.length} meme songs to ${songsJsPath}.`);
    }
}

function performSearch(query) {
    return new Promise((resolve, reject) => {
        // Using US store for better meme coverage
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=3&country=us`;
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };
        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                resolve(null);
                return;
            }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data).results);
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', e => resolve(null));
    });
}

fetchMemes();
