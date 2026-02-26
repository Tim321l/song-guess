# 🎵 Song Guess - Setup Guide

This guide will help you set up and run the **Song Guess** project on another computer.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)
- A [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) account (or a local MongoDB instance)

## 🚀 Setup Steps (First Time)

### 1. Clone the Project
Open your terminal on the **new PC** and run:
```bash
git clone https://github.com/Tim321l/song-guess.git
cd song-guess
```

---

## 🔄 GitHub Workflow (Syncing between PCs)

To keep your code in sync between your current PC and another one, follow these steps:

### On your current PC (Save your work):
After making changes, push them to GitHub:
```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

### On the other PC (Get the latest work):
If you already cloned the project, just update it:
```bash
git pull origin main
```
Then run `npm install` if you added any new dependencies.

---

### 2. Install Dependencies
Install all required Node.js packages:
```bash
npm install
```

### 3. Configure Environment Variables
Create a file named `.env` in the root directory and add the following configuration:
```env
PORT=3000
NODE_ENV=development

# Authentication & Security
ADMIN_SECRET=your_admin_secret_here
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id_here

# Database
# Replace the URI with your MongoDB connection string
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/songguess?retryWrites=true&w=majority
```

### 4. Run the Application

#### Development Mode
Runs both the **Vite** frontend and the **Express** backend concurrently with auto-reload:
```bash
npm run dev
```
The app will be available at `http://localhost:5173` (or the port Vite provides).

#### Production Build
If you want to build the frontend for production:
```bash
npm run build
```

---

## 🛠️ Key Scripts
- `npm run dev`: Launch development environment.
- `npm run start`: Start the backend server (`server.js`).
- `npm run build`: Build the frontend for deployment.

## 📁 Project Structure
- `src/server/`: Backend logic (Socket.io, DB models, authentication).
- `src/client/`: Frontend logic (Socket.io, Game UI, Social features).
- `public/`: Static assets.
- `index.html`: Main entry point for the browser.
