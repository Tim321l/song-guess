const mongoose = require('mongoose');
require('dotenv').config();

// Define Song Schema roughly to delete data
const songSchema = new mongoose.Schema({
    title: String,
});

const Song = mongoose.model('Song', songSchema);

async function clearSongs() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const songCount = await Song.countDocuments();
        console.log(`Current song count in DB: ${songCount}`);

        if (songCount === 0) {
            console.log('No songs to delete. Already empty!');
        } else {
            console.log('Deleting all songs from MongoDB...');
            const result = await Song.deleteMany({});
            console.log(`Successfully deleted ${result.deletedCount} songs.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Delete failed:', err);
        process.exit(1);
    }
}

clearSongs();
