import { state } from './state.js';
import { socket } from './socket.js';
import { renderIcon, switchScreen } from './utils.js';
import { clearTeamState } from './teams.js';
import { showNewsPopupIfNeeded } from '../main.js';

export function handleLoginSuccess(res, username, password) {
    clearTeamState();
    state.username = res.username;
    state.name = res.displayName || res.username;
    state.icon = res.icon || '👤';
    state.favorites = res.favorites || [];
    state.teamId = res.teamId || null;
    document.getElementById('display-username').innerHTML = `<span style="margin-right:5px;">${renderIcon(state.icon)}</span> ${state.name}`;

    if (res.token) {
        localStorage.setItem('songGuessToken', res.token);
        socket.auth = { token: res.token };
        // Save to cookie for better persistence (24h)
        const d = new Date();
        d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
        document.cookie = `songGuessToken=${res.token};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    }

    // Save for auto-login
    if (username && password) {
        localStorage.setItem('songGuessAuth', JSON.stringify({ username, password }));
    }

    // Also update the UI icon selector to match their current icon
    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText === state.icon) btn.classList.add('active');
    });
    document.getElementById('selected-icon').value = state.icon;
    if (res.email) {
        state.email = res.email;
        const settingsEmail = document.getElementById('settings-email');
        if (settingsEmail) settingsEmail.value = res.email;
    }

    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) chatContainer.classList.remove('hidden');

    switchScreen('start');
    setTimeout(() => showNewsPopupIfNeeded(), 500); // Slight delay for smoother UX
}

// Google Login Handler Implementation
const handleGoogleLoginActual = (response) => {
    console.log("[Google Auth] Real handler triggered. Decoding...");
    try {
        if (!response || !response.credential) {
            console.error("[Google Auth] No credential received", response);
            return alert("Google Login Failed: No credentials received.");
        }

        // Safer decoding for JWT tokens (supports Unicode/UTF-8)
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        const jsonPayload = decodeURIComponent(atob(paddedBase64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const data = JSON.parse(jsonPayload);
        console.log("[Google Auth] Decoded User Data:", data);

        const username = data.email;
        const googleId = data.sub;

        console.log(`[Google Auth] Emitting googleLogin event for ${username}...`);

        socket.emit('googleLogin', {
            username,
            googleId,
            email: data.email,
            name: data.name,
            icon: data.picture
        }, (res) => {
            console.log("[Google Auth] Server response:", res);
            if (res.success) {
                console.log("[Google Auth] Success! Redirecting to game start...");
                handleLoginSuccess(res, username, null);
            } else {
                console.error("[Google Auth] Server rejected login:", res.message);
                alert("Server Login Failed: " + res.message);
            }
        });

    } catch (e) {
        console.error("[Google Auth] Fatal error processing login:", e);
        alert("Error processing Google login data. Check console.");
    }
};

// Connect real handler to the global proxy
window._handleGoogleLoginActual = handleGoogleLoginActual;

// Check if there's a stashed response from before we loaded
if (window._stashedGoogleResponse) {
    console.log("[Google Auth] Found stashed response. Processing now...");
    handleGoogleLoginActual(window._stashedGoogleResponse);
    delete window._stashedGoogleResponse;
}

export function initAuthHandlers() {


    document.getElementById('forgot-password-link').onclick = (e) => {
        e.preventDefault();
        switchScreen('forgot-password');
    };

    document.getElementById('back-to-login-btn').onclick = () => {
        switchScreen('auth');
    };

    document.getElementById('send-recovery-btn').onclick = () => {
        const email = document.getElementById('recovery-email').value.trim();
        if (!email) return alert("Please enter your email");

        socket.emit('forgotPassword', { email }, (res) => {
            if (res.success) {
                alert("Recover Request Sent! Please contact the admin for your new password.");
                switchScreen('auth');
            } else {
                alert(res.message);
            }
        });
    };

    document.getElementById('login-btn').onclick = () => {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value.trim();
        if (!username || !password) return alert("Please enter username and password");
        document.getElementById('auth-message').innerText = 'Logging in... please wait';
        document.getElementById('auth-message').style.color = '#f1c40f';
        socket.emit('login', { username, password }, (res) => {
            if (res.success) {
                handleLoginSuccess(res, username, password);
            } else {
                document.getElementById('auth-message').innerText = res.message;
            }
        });
    };

    document.getElementById('register-btn').onclick = () => {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value.trim();
        const policyChecked = document.getElementById('auth-policy-check').checked;

        if (!username || !password) return alert("Please enter username and password");
        if (!policyChecked) {
            const lang = localStorage.getItem('songGuessLang') || 'EN';
            const msg = lang === 'ZH' ? '請先閱讀並同意私隱政策。' : 'Please read and agree to the Privacy Policy first.';
            return alert(msg);
        }

        document.getElementById('auth-message').innerText = 'Creating account... please wait';
        document.getElementById('auth-message').style.color = '#f1c40f';
        socket.emit('register', { username, password }, (res) => {
            document.getElementById('auth-message').innerText = res.message;
            if (res.success) {
                document.getElementById('auth-message').style.color = '#2ecc71';
                // Auto-login after register
                handleLoginSuccess(res, username, password);
            } else {
                document.getElementById('auth-message').style.color = '#ff4757';
            }
        });
    };
}
