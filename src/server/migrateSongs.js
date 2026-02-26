import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Song } from './models.js';
import * as allSongs from '../songs.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function migrateSongs() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // Clear existing songs to avoid duplicates if re-running
        // Or you can choose to skip existing ones. For a full migration, clearing is safer.
        console.log('Clearing existing songs collection...');
        await Song.deleteMany({});

        const categories = Object.keys(allSongs);
        console.log(`Found ${categories.length} song categories: ${categories.join(', ')}`);

        let totalUploaded = 0;

        for (const cat of categories) {
            const songsArray = allSongs[cat];
            if (!Array.isArray(songsArray)) continue;

            const language = cat.replace('songs', '').toLowerCase() || 'en';
            console.log(`Migrating ${songsArray.length} songs for language: ${language}...`);

            // Map and prepare songs
            const bulkData = songsArray.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist,
                audioUrl: s.audioUrl,
                appleUrl: s.appleUrl,
                year: s.year,
                language: language
            }));

            // Using insertMany for performance
            if (bulkData.length > 0) {
                // Split into chunks of 1000 to avoid BSON limit issues (though unlikely for 2MB total)
                const chunkSize = 1000;
                for (let i = 0; i < bulkData.length; i += chunkSize) {
                    const chunk = bulkData.slice(i, i + chunkSize);
                    await Song.insertMany(chunk);
                    totalUploaded += chunk.length;
                    console.log(`Progress: ${totalUploaded} songs uploaded...`);
                }
            }
        }

        console.log(`\nMigration successful! Total songs in DB: ${totalUploaded}`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateSongs();
