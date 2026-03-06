import { socket } from './socket.js';

export function initLandingHandlers() {
    console.log("[Landing] initLandingHandlers called");
    const modal = document.getElementById('landing-modal');
    const content = document.getElementById('landing-modal-content');
    const closeBtn = document.getElementById('close-landing-modal');

    if (!modal || !content) {
        console.warn("[Landing] Modal or content element not found. Skipping landing handlers.");
        return;
    }

    // Use direct style to bypass any CSS class conflicts
    modal.style.display = 'none';

    const cards = {
        'feature-card-songs': {
            title: '10,000+ Songs',
            render: () => `
                <div style="text-align: center;">
                    <h2 style="color: var(--primary-accent); margin-bottom: 20px;">Massive Song Library</h2>
                    <p style="margin-bottom: 25px; opacity: 0.8;">We have a diverse collection of music across many categories. Check out some of our most popular ones:</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px;">
                        <div style="padding: 15px; border-radius: 12px; border: 1px solid rgba(0,242,254,0.2); background: rgba(255,255,255,0.05);">
                            <div style="font-size: 2rem; margin-bottom: 10px;">嵐</div>
                            <div style="font-weight: bold;">Arashi</div>
                            <div style="font-size: 0.8em; opacity: 0.6;">70+ Tracks</div>
                        </div>
                        <div style="padding: 15px; border-radius: 12px; border: 1px solid rgba(0,242,254,0.2); background: rgba(255,255,255,0.05);">
                            <div style="font-size: 2rem; margin-bottom: 10px;">🎹</div>
                            <div style="font-weight: bold;">Jay Chou</div>
                            <div style="font-size: 0.8em; opacity: 0.6;">Full Discography</div>
                        </div>
                        <div style="padding: 15px; border-radius: 12px; border: 1px solid rgba(0,242,254,0.2); background: rgba(255,255,255,0.05);">
                            <div style="font-size: 2rem; margin-bottom: 10px;">🍱</div>
                            <div style="font-weight: bold;">Anime Hits</div>
                            <div style="font-size: 0.8em; opacity: 0.6;">All Eras</div>
                        </div>
                        <div style="padding: 15px; border-radius: 12px; border: 1px solid rgba(0,242,254,0.2); background: rgba(255,255,255,0.05);">
                            <div style="font-size: 2rem; margin-bottom: 10px;">📻</div>
                            <div style="font-weight: bold;">Global Hits</div>
                            <div style="font-size: 0.8em; opacity: 0.6;">2000s - 2020s</div>
                        </div>
                    </div>
                </div>
            `
        },
        'feature-card-multi': {
            title: 'Multiplayer Experience',
            render: () => `
                <div style="text-align: center;">
                    <h2 style="color: var(--secondary-accent); margin-bottom: 20px;">Game Modes</h2>
                    <p style="margin-bottom: 25px; opacity: 0.8;">Play your way with our different real-time multiplayer modes:</p>
                    <div style="display: flex; flex-direction: column; gap: 15px; text-align: left;">
                        <div style="padding: 20px; border-radius: 15px; display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size: 2.5rem;">🌎</div>
                            <div>
                                <h4 style="margin: 0; color: #fff;">Global Lobby</h4>
                                <p style="margin: 5px 0 0; font-size: 0.9em; opacity: 0.7;">Join a public room and compete with anyone currently online.</p>
                            </div>
                        </div>
                        <div style="padding: 20px; border-radius: 15px; display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size: 2.5rem;">🔒</div>
                            <div>
                                <h4 style="margin: 0; color: #fff;">Private Rooms</h4>
                                <p style="margin: 5px 0 0; font-size: 0.9em; opacity: 0.7;">Create a room with a password to play exclusively with your friends.</p>
                            </div>
                        </div>
                        <div style="padding: 20px; border-radius: 15px; display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size: 2.5rem;">⚔️</div>
                            <div>
                                <h4 style="margin: 0; color: #fff;">1v1 Competition</h4>
                                <p style="margin: 5px 0 0; font-size: 0.9em; opacity: 0.7;">Enter a tournament bracket and battle head-to-head to be the winner.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },
        'feature-card-leaderboard': {
            title: 'Leaderboard',
            render: (data = []) => {
                let listHtml = data.map((p, i) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: rgba(255,255,255,0.03); border-radius: 10px; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="font-weight: 800; color: #00f2fe; width: 25px;">#${i + 1}</span>
                            <span style="font-size: 1.2rem;">${p.icon || '👤'}</span>
                            <span style="font-weight: 600;">${p.username}</span>
                        </div>
                        <div style="font-weight: 800; color: var(--primary-accent);">${p.score.toLocaleString()} pts</div>
                    </div>
                `).join('');

                if (data.length === 0) listHtml = '<div style="padding: 40px; text-align: center; opacity: 0.5;">Loading Top 10 Legends...</div>';

                return `
                    <div style="text-align: center;">
                        <h2 style="color: var(--primary-accent); margin-bottom: 10px;">Top 10 Legends</h2>
                        <p style="margin-bottom: 25px; opacity: 0.8; font-size: 0.9em;">Total cumulative scores from our greatest Song Guessers.</p>
                        <div style="max-height: 400px; overflow-y: auto; text-align: left; padding-right: 5px;">
                            ${listHtml}
                        </div>
                    </div>
                `;
            }
        }
    };

    const openModal = (cardId) => {
        console.log("[Landing] openModal called for:", cardId);
        const config = cards[cardId];
        if (!config) return;

        content.innerHTML = config.render();
        // Use direct style - bypasses the global .hidden CSS class conflict
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';

        if (cardId === 'feature-card-leaderboard') {
            socket.emit('getLeaderboard', { category: 'all', mode: 'standard' }, (data) => {
                content.innerHTML = config.render(data || []);
            });
        }
    };

    const closeModal = () => {
        modal.style.display = 'none';
    };

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    if (closeBtn) closeBtn.onclick = closeModal;

    Object.keys(cards).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            console.log("[Landing] Attaching click listener to:", id);
            el.addEventListener('click', () => {
                console.log("[Landing] Card clicked:", id);
                openModal(id);
            });
        } else {
            console.warn("[Landing] Card not found in DOM:", id);
        }
    });
}
