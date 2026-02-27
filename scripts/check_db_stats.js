import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Team, Song, Playlist, RecoveryRequest } from './src/server/models.js';

dotenv.config();

async function checkStats() {
    try {
        console.log('Connecting to MongoDB to check stats...');
        await mongoose.connect(process.env.MONGODB_URI);

        const userCount = await User.countDocuments();
        const teamCount = await Team.countDocuments();
        const songCount = await Song.countDocuments();
        const playlistCount = await Playlist.countDocuments();
        const recoveryCount = await RecoveryRequest.countDocuments();

        console.log('\n--- MongoDB Stats ---');
        console.log(`Users: ${userCount}`);
        console.log(`Teams: ${teamCount}`);
        console.log(`Songs: ${songCount}`);
        console.log(`Playlists: ${playlistCount}`);
        console.log(`Recovery Requests: ${recoveryCount}`);

        if (songCount > 0) {
            const sampleSong = await Song.findOne();
            console.log('\nSample Song:', sampleSong.title, '-', sampleSong.artist, `(${sampleSong.language})`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error checking stats:', err);
        process.exit(1);
    }
}

checkStats();
