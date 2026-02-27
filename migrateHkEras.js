import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import { Song } from './src/server/models.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function runMigration() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const rawData = JSON.parse(fs.readFileSync('./hk_era_songs.json', 'utf8'));
        const categories = Object.keys(rawData);

        for (const cat of categories) {
            const songs = rawData[cat];
            const language = cat.replace('songs', '').toLowerCase(); // e.g., hk8090s, hk2000s

            console.log(`\nMoving ${songs.length} songs for category: ${cat} (lang key: ${language})...`);

            // Delete old songs for this specific language to allow clean refresh
            console.log(`  Deleting existing songs for language: ${language}...`);
            await Song.deleteMany({ language });

            const bulkData = songs.map((s, index) => ({
                id: Math.floor(Date.now() / 1000) + index, // Unique ID fallback
                title: s.title,
                artist: s.artist,
                audioUrl: s.audioUrl,
                appleUrl: s.appleUrl,
                year: s.year,
                language: language
            }));

            if (bulkData.length > 0) {
                await Song.insertMany(bulkData);
                console.log(`  Successfully inserted ${bulkData.length} songs.`);
            }
        }

        console.log('\nMigration complete! New HK Eras are ready.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
