const https = require('https');
const fs = require('fs');

// Usage: node import_spotify.cjs <playlist_url_or_id> <category_name>
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node import_spotify.cjs <playlist_url_or_id> <category_name>');
    process.exit(1);
}

let playlistId = args[0];
if (playlistId.includes('playlist/')) {
    playlistId = playlistId.split('playlist/')[1].split('?')[0];
}
const categoryName = args[1];

console.log(`Importing Spotify Playlist: ${playlistId} into category: ${categoryName}...`);

async function fetchTracksFromSpotify(pid) {
    return new Promise((resolve, reject) => {
        // We use the embed URL because it often contains track metadata in the HTML/JSON without needing an API key
        https.get(`https://open.spotify.com/embed/playlist/${pid}`, (res) => {
            let html = '';
            res.on('data', chunk => html += chunk);
            res.on('end', () => {
                try {
                    // Look for the JSON blob in the embed page
                    const match = html.match(/<script id="resource" type="application\/json">([\s\S]*?)<\/script>/);
                    if (!match) return reject('Could not find track metadata in Spotify page.');

                    const data = JSON.parse(match[1]);
                    const tracks = data.tracks.items.map(item => ({
                        title: item.track.name,
                        artist: item.track.artists[0].name
                    }));
                    resolve(tracks);
                } catch (e) {
                    reject('Error parsing Spotify data: ' + e.message);
                }
            });
        }).on('error', reject);
    });
}

function searchItunes(track) {
    return new Promise((resolve) => {
        const query = `${track.artist} ${track.title}`;
        https.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data).results[0];
                    if (result && result.previewUrl) {
                        resolve({
                            title: result.trackName,
                            artist: result.artistName,
                            audioUrl: result.previewUrl,
                            appleUrl: result.trackViewUrl,
                            year: new Date(result.releaseDate).getFullYear()
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

async function run() {
    try {
        const spotifyTracks = await fetchTracksFromSpotify(playlistId);
        console.log(`Found ${spotifyTracks.length} tracks on Spotify. Searching for previews on iTunes...`);

        const results = [];
        for (const track of spotifyTracks) {
            process.stdout.write(` Searching for: ${track.artist} - ${track.title}... `);
            const found = await searchItunes(track);
            if (found) {
                results.push(found);
                console.log('✅ Found!');
            } else {
                console.log('❌ Not found');
            }
        }

        if (results.length === 0) {
            console.error('No tracks with previews found. Import aborted.');
            return;
        }

        // Add to songs.js
        let fileContent = fs.readFileSync('src/songs.js', 'utf-8');

        // Prepare new category string
        let newCategory = `export const ${categoryName} = [\n`;
        results.forEach((song, i) => {
            newCategory += `    { id: ${i + 1}, title: "${song.title.replace(/"/g, '\\"')}", artist: "${song.artist.replace(/"/g, '\\"')}", audioUrl: "${song.audioUrl}", appleUrl: "${song.appleUrl || ''}", year: ${song.year} },\n`;
        });
        newCategory += `];\n\n`;

        // Check if category already exists and replace it, or append
        const regex = new RegExp(`export const ${categoryName} = \\[([\\s\\S]*?)\\];\\n\\n`, 'g');
        if (fileContent.match(regex)) {
            fileContent = fileContent.replace(regex, newCategory);
            console.log(`Updated existing category: ${categoryName}`);
        } else {
            fileContent += newCategory;
            console.log(`Added new category: ${categoryName}`);
        }

        fs.writeFileSync('src/songs.js', fileContent);
        console.log(`Successfully imported ${results.length} tracks!`);
        console.log(`Don't forget to update server.js allSongs object if you want to use this category.`);

    } catch (e) {
        console.error('Import failed:', e);
    }
}

run();
