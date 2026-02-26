import { state } from './state.js';
import { socket } from './socket.js';
import { renderIcon, switchScreen } from './utils.js';
import { connectSpotify } from './spotify.js';

export function initSettingsHandlers() {
    // Icon Selection
    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('selected-icon').value = btn.innerText;
        };
    });

    // Photo Upload Logic
    const iconUploadInput = document.getElementById('icon-upload-input');
    const uploadBtn = document.getElementById('upload-icon-btn');

    if (uploadBtn) {
        uploadBtn.onclick = () => iconUploadInput.click();
    }

    if (iconUploadInput) {
        iconUploadInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 128;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/webp', 0.8);

                    // Update selection UI
                    document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
                    document.getElementById('selected-icon').value = dataUrl;

                    if (uploadBtn) {
                        uploadBtn.innerHTML = `<img src="${dataUrl}" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; object-fit:cover;"> Photo Selected`;
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
    }

    // Save Settings
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const oldPassword = document.getElementById('old-password').value;
            const newPassword = document.getElementById('new-password').value;
            const icon = document.getElementById('selected-icon').value;
            const email = document.getElementById('settings-email').value.trim();
            const displayName = document.getElementById('settings-display-name').value.trim();

            socket.emit('updateSettings', {
                username: state.username,
                oldPassword,
                newPassword,
                icon,
                email,
                displayName
            }, (res) => {
                const msgEl = document.getElementById('settings-message');
                if (!msgEl) return;
                msgEl.innerText = res.message;
                if (res.success) {
                    msgEl.style.color = '#2ecc71';
                    state.icon = icon;
                    if (res.displayName) state.name = res.displayName;
                    document.getElementById('display-username').innerHTML = `<span style="margin-right:5px;">${renderIcon(state.icon)}</span> ${state.name}`;
                    document.getElementById('old-password').value = '';
                    document.getElementById('new-password').value = '';
                    setTimeout(() => {
                        switchScreen('start');
                        msgEl.innerText = '';
                    }, 1500);
                } else {
                    msgEl.style.color = '#ff4757';
                }
            });
        };
    }

    const cancelBtn = document.getElementById('cancel-settings-btn');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            switchScreen('start');
            const msgEl = document.getElementById('settings-message');
            if (msgEl) msgEl.innerText = '';
        };
    }

    // Spotify Connect Button
    const spotifyBtn = document.getElementById('spotify-connect-btn');
    if (spotifyBtn) {
        spotifyBtn.onclick = () => connectSpotify();
    }
}
