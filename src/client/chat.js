import { socket } from './socket.js';

let chatScope = 'global';

export function initChatHandlers() {
    const chatContainer = document.getElementById('chat-container');
    const chatHeader = document.getElementById('chat-header');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const scopeGlobalBtn = document.getElementById('scope-global-btn');
    const scopeRoomBtn = document.getElementById('scope-room-btn');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');

    // Toggle collapse
    const toggleChat = () => {
        chatContainer.classList.toggle('collapsed');
        chatToggleBtn.innerText = chatContainer.classList.contains('collapsed') ? '🔼' : '🔽';
    };

    chatHeader.onclick = (e) => {
        if (e.target !== chatToggleBtn) toggleChat();
    };
    chatToggleBtn.onclick = (e) => {
        e.stopPropagation();
        toggleChat();
    };

    // Scope switching
    scopeGlobalBtn.onclick = () => {
        chatScope = 'global';
        scopeGlobalBtn.classList.add('active');
        scopeRoomBtn.classList.remove('active');
    };

    scopeRoomBtn.onclick = () => {
        chatScope = 'room';
        scopeRoomBtn.classList.add('active');
        scopeGlobalBtn.classList.remove('active');
    };

    // Sending messages
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (!text) return;

        socket.emit('sendMessage', { message: text, scope: chatScope }, (res) => {
            if (res.success) {
                chatInput.value = '';
            } else {
                alert(res.message);
            }
        });
    };

    chatSendBtn.onclick = sendMessage;
    chatInput.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    // Receiving messages
    socket.on('chatMessage', (msg) => {
        const msgEl = document.createElement('div');
        msgEl.className = `chat-msg ${msg.scope}`;

        const scopeTag = document.createElement('span');
        scopeTag.className = 'scope-tag';
        scopeTag.innerText = msg.scope === 'global' ? 'G' : 'R';

        const senderEl = document.createElement('span');
        senderEl.className = 'sender';
        senderEl.innerText = `${msg.sender}:`;

        const textEl = document.createElement('span');
        textEl.innerText = msg.message;

        msgEl.appendChild(scopeTag);
        msgEl.appendChild(senderEl);
        msgEl.appendChild(textEl);

        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Auto-expand if collapsed and receiving a message
        if (chatContainer.classList.contains('collapsed')) {
            // Maybe flash the header instead?
        }
    });
}
