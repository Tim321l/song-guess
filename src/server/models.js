import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String },
    email: { type: String },
    displayName: { type: String },
    icon: { type: String, default: '👤' },
    banned: { type: Boolean, default: false },
    teamId: { type: String, default: null },
    highScores: { type: Map, of: Number, default: {} },
    totalScore: { type: Number, default: 0 },
    favorites: { type: Array, default: [] },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

const teamSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    leader: { type: String, required: true },
    members: [{ type: String }],
    icon: { type: String, default: '👥' },
    score: { type: Number, default: 0 },
    roles: { type: Map, of: String, default: {} },
    memberScores: { type: Map, of: Number, default: {} },
    createdAt: { type: Date, default: Date.now }
});

const playlistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    genre: { type: String, default: 'Other' },
    songs: [{
        title: String,
        artist: String,
        previewUrl: String,
        artworkUrl: String
    }],
    owner: { type: String },
    likes: { type: Number, default: 0 },
    plays: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const recoveryRequestSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    requestedAt: { type: Date, default: Date.now },
    newPassword: { type: String, required: true }
});

const songSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    audioUrl: { type: String, required: true },
    appleUrl: { type: String },
    year: { type: Number },
    language: { type: String, index: true }, // 'en', 'cn', etc.
    popularity: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const Team = mongoose.model('Team', teamSchema);
export const Playlist = mongoose.model('Playlist', playlistSchema);
export const RecoveryRequest = mongoose.model('RecoveryRequest', recoveryRequestSchema);
export const Song = mongoose.model('Song', songSchema);
