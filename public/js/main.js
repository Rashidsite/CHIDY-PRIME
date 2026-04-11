document.addEventListener('DOMContentLoaded', () => {
    const gameGrid = document.getElementById('gameGrid');

    async function fetchGames() {
        try {
            const response = await fetch('/api/games');
            const games = await response.json();

            if (games.error) throw new Error(games.error);

            renderGames(games);
        } catch (error) {
            console.error('Error fetching games:', error);
            gameGrid.innerHTML = `<p class="error">Failed to load games. Check console for details.</p>`;
        }
    }

    function renderGames(games) {
        if (!games || games.length === 0) {
            gameGrid.innerHTML = '<p>No games found. Start by adding some in the Admin panel!</p>';
            return;
        }

        gameGrid.innerHTML = games.map(game => `
            <div class="game-card">
                <div class="price-tag ${game.price > 0 ? '' : 'free'}">
                    ${game.price > 0 ? '$' + game.price : 'FREE'}
                </div>
                <img src="${game.image_url}" alt="${game.title}">
                <div class="game-info">
                    <div style="font-size: 0.65rem; color: var(--primary-color); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; font-family: 'Orbitron';">
                        ${game.category || 'HOT POST'}
                    </div>
                    <h3>${game.title}</h3>
                    <div class="rating">★ ${game.rating || 'N/A'}</div>
                    <p>${game.description || ''}</p>
                    
                    <div class="game-links">
                        ${game.youtube_url ? `
                            <a href="${game.youtube_url}" target="_blank" class="btn-link youtube">
                                <i class="fab fa-youtube"></i> Watch Trailer
                            </a>
                        ` : ''}
                        
                        ${(Array.isArray(game.links) ? game.links : []).map(link => `
                            <a href="${link.url}" target="_blank" class="btn-link">
                                <i class="fas fa-download"></i> ${link.name}
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function logPageView() {
        try {
            await fetch('/api/log-view', { method: 'POST' });
        } catch (e) { console.error('View tracking failed', e); }
    }

    fetchGames();
    logPageView();
});
