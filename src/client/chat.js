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

    if (!chatContainer || !chatHeader || !chatInput || !chatSendBtn || !chatMessages || !scopeGlobalBtn || !scopeRoomBtn || !chatToggleBtn) {
        console.warn("[Chat] Some UI elements missing. Chat system disabled.");
        return;
    }

    // Toggle collapse
    const toggleChat = (save = true) => {
        chatContainer.classList.toggle('collapsed');
        chatToggleBtn.innerText = chatContainer.classList.contains('collapsed') ? '🔼' : '🔽';
        if (save) {
            localStorage.setItem('chatCollapsed', chatContainer.classList.contains('collapsed'));
        }
    };

    // --- Persistence: Load State ---
    const loadPersistence = () => {
        const collapsed = localStorage.getItem('chatCollapsed') === 'true';
        if (collapsed) toggleChat(false);

        const pos = JSON.parse(localStorage.getItem('chatPosition'));
        if (pos) {
            chatContainer.style.bottom = 'auto';
            chatContainer.style.right = 'auto';
            chatContainer.style.left = pos.left;
            chatContainer.style.top = pos.top;
            chatContainer.style.margin = '0';
        }
    };
    loadPersistence();

    chatHeader.onclick = (e) => {
        if (e.target !== chatToggleBtn && !isDragging) toggleChat();
    };

    // --- Draggable Logic ---
    let isDragging = false;
    let offsetX, offsetY;

    const keepOnScreen = () => {
        const rect = chatContainer.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        let left = rect.left;
        let top = rect.top;

        // X bounds
        if (left < 0) left = 0;
        if (left + rect.width > winW) left = winW - rect.width;

        // Y bounds
        if (top < 0) top = 0;
        if (top + rect.height > winH) top = winH - rect.height;

        chatContainer.style.left = `${left}px`;
        chatContainer.style.top = `${top}px`;

        // Save current valid position
        localStorage.setItem('chatPosition', JSON.stringify({
            left: chatContainer.style.left,
            top: chatContainer.style.top
        }));
    };

    window.addEventListener('resize', keepOnScreen);

    chatHeader.onmousedown = (e) => {
        if (e.target === chatToggleBtn) return;
        isDragging = true;
        chatContainer.style.transition = 'none'; // Disable transition during drag

        const rect = chatContainer.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        chatContainer.style.bottom = 'auto';
        chatContainer.style.right = 'auto';
        chatContainer.style.left = `${rect.left}px`;
        chatContainer.style.top = `${rect.top}px`;
        chatContainer.style.margin = '0';

        document.onmousemove = (e) => {
            if (!isDragging) return;

            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // Constrain during drag
            if (newX < 0) newX = 0;
            if (newX + rect.width > window.innerWidth) newX = window.innerWidth - rect.width;
            if (newY < 0) newY = 0;
            if (newY + rect.height > window.innerHeight) newY = window.innerHeight - rect.height;

            chatContainer.style.left = `${newX}px`;
            chatContainer.style.top = `${newY}px`;
        };

        document.onmouseup = () => {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
            chatContainer.style.transition = ''; // Restore transitions

            localStorage.setItem('chatPosition', JSON.stringify({
                left: chatContainer.style.left,
                top: chatContainer.style.top
            }));
        };
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
