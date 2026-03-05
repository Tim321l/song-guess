import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, Team, Playlist, RecoveryRequest, Song, Report } from './models.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/songguess';

export async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('[MongoDB] Connected successfully.');
    } catch (err) {
        console.error('[MongoDB] Connection error:', err);
        process.exit(1);
    }
}

export function getDBStatus() {
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    return states[mongoose.connection.readyState] || 'Unknown';
}

// Helper to convert array of documents to object keyed by username/id
function toObject(arr, key) {
    return arr.reduce((acc, curr) => {
        acc[curr[key]] = curr.toObject({ flattenMaps: true });
        return acc;
    }, {});
}

export async function loadUsers() {
    try {
        const users = await User.find({});
        return toObject(users, 'username');
    } catch (e) {
        console.error('Error loading users', e);
        return {};
    }
}

export async function saveUsers(users) {
    // In MongoDB, we don't save the entire collection at once.
    // However, to keep compatibility with existing code that passes the whole object,
    // we iterate and update. Note: This is inefficient for large datasets.
    try {
        const promises = Object.keys(users).map(username => {
            const data = users[username];
            // Remove _id if it exists to avoid immutable field error
            const { _id, ...updateData } = data;
            return User.findOneAndUpdate({ username }, updateData, { upsert: true });
        });
        await Promise.all(promises);
    } catch (e) {
        console.error('Error saving users', e);
    }
}

export async function updateUser(username, updateData) {
    try {
        const { _id, ...data } = updateData;
        await User.findOneAndUpdate({ username }, data, { upsert: true });
    } catch (e) {
        console.error(`Error updating user ${username}`, e);
    }
}

export async function loadRecoveryRequests() {
    try {
        const requests = await RecoveryRequest.find({});
        return toObject(requests, 'username');
    } catch (e) {
        console.error('Error loading recovery requests', e);
        return {};
    }
}

export async function saveRecoveryRequests(requests) {
    try {
        const promises = Object.keys(requests).map(username => {
            const data = requests[username];
            return RecoveryRequest.findOneAndUpdate({ username }, data, { upsert: true });
        });
        await Promise.all(promises);
    } catch (e) {
        console.error('Error saving recovery requests', e);
    }
}

export async function deleteRecoveryRequest(username) {
    try {
        await RecoveryRequest.deleteOne({ username });
        console.log(`[DB] Deleted recovery request for ${username}`);
    } catch (e) {
        console.error('Error deleting recovery request', e);
    }
}

export async function loadCommunityPlaylists() {
    try {
        const playlists = await Playlist.find({});
        return playlists.map(p => p.toObject());
    } catch (e) {
        console.error('Error loading community playlists', e);
        return [];
    }
}

export async function saveCommunityPlaylists(playlists) {
    // This is problematic because playlists is an array.
    // If it's a small array, we can clear and insert, or update.
    try {
        // Simple approach: UPSERT based on name and owner
        const promises = playlists.map(data => {
            const { _id, ...updateData } = data;
            return Playlist.findOneAndUpdate(
                { name: data.name, owner: data.owner },
                updateData,
                { upsert: true }
            );
        });
        await Promise.all(promises);
    } catch (e) {
        console.error('Error saving community playlists', e);
    }
}

export async function loadTeams() {
    try {
        const teams = await Team.find({});
        return toObject(teams, 'id');
    } catch (e) {
        console.error('Error loading teams', e);
        return {};
    }
}

export async function saveTeams(teams) {
    try {
        const promises = Object.keys(teams).map(id => {
            const data = teams[id];
            const { _id, ...updateData } = data;
            return Team.findOneAndUpdate({ id }, updateData, { upsert: true });
        });
        await Promise.all(promises);
    } catch (e) {
        console.error('Error saving teams', e);
    }
}

export async function migratePasswords() {
    // Since loadUsers is now async, we await it.
    const users = await loadUsers();
    let modified = false;
    for (const username in users) {
        const user = users[username];
        if (user.password && !user.password.startsWith('$2')) {
            console.log(`[Security] Migrating/Hashing password for: ${username}`);
            user.password = await bcrypt.hash(user.password, 10);
            modified = true;
        }
    }
    if (modified) {
        await saveUsers(users);
        console.log('[Security] User password migration complete.');
    }
}

export async function loadSongs() {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const songsPath = path.join(__dirname, '../../songs.json');
        let grouped = {};

        // 1. Load from songs.json as base
        if (fs.existsSync(songsPath)) {
            const data = fs.readFileSync(songsPath, 'utf8');
            grouped = JSON.parse(data);
            console.log(`[System] Base songs loaded from songs.json.`);
        }

        // 2. Load from MongoDB and overlay increments
        const dbSongs = await Song.find({});
        if (dbSongs.length > 0) {
            let overrides = 0;
            dbSongs.forEach(s => {
                const langKey = `songs${s.language.charAt(0).toUpperCase() + s.language.slice(1)}`;
                if (!grouped[langKey]) grouped[langKey] = [];

                // Overlay/Merge
                const index = grouped[langKey].findIndex(item => Number(item.id) === s.id);
                if (index !== -1) {
                    grouped[langKey][index] = { ...grouped[langKey][index], ...s.toObject() };
                    overrides++;
                } else {
                    // New song not in JSON
                    grouped[langKey].push(s.toObject());
                }
            });
            console.log(`[System] Overlaid ${overrides} edits from MongoDB.`);
        }

        return grouped;
    } catch (e) {
        console.error('Error loading songs with overlay:', e);
        return {};
    }
}

export async function saveAllSongsToJson(allSongs) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const songsPath = path.join(__dirname, '../../songs.json');

        // Clean up Mongoose specific fields if any
        const cleanData = JSON.parse(JSON.stringify(allSongs));

        fs.writeFileSync(songsPath, JSON.stringify(cleanData, null, 2), 'utf8');
        console.log(`[System] All songs synced to ${songsPath}`);
        return true;
    } catch (e) {
        console.error('Error saving all songs to JSON:', e);
        return false;
    }
}

export async function loadReports() {
    try {
        return await Report.find({ status: 'pending' }).sort({ createdAt: -1 });
    } catch (e) {
        console.error('Error loading reports', e);
        return [];
    }
}

export async function saveReport(reportData) {
    try {
        const report = new Report(reportData);
        await report.save();
        return true;
    } catch (e) {
        console.error('Error saving report', e);
        return false;
    }
}
