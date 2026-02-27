const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Define Song Schema roughly to fetch data
const songSchema = new mongoose.Schema({
    title: String,
    artist: String,
    language: String,
    id: String,
    src: String,
    cover: String,
    easy: Boolean,
});

const Song = mongoose.model('Song', songSchema);

async function exportSongs() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const songs = await Song.find({});
        console.log(`Found ${songs.length} songs. Grouping by language...`);

        const grouped = {};
        songs.forEach(s => {
            const lang = s.language || 'english';
            const langKey = `songs${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
            if (!grouped[langKey]) grouped[langKey] = [];

            // Clean up the object (remove MongoDB specific fields)
            const songObj = s.toObject();
            delete songObj._id;
            delete songObj.__v;

            grouped[langKey].push(songObj);
        });

        const outputPath = path.join(__dirname, 'songs.json');
        fs.writeFileSync(outputPath, JSON.stringify(grouped, null, 2));
        console.log(`Successfully exported songs to ${outputPath}`);

        process.exit(0);
    } catch (err) {
        console.error('Export failed:', err);
        process.exit(1);
    }
}

exportSongs();
