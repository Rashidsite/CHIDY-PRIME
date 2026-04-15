
        // ===== DATA =====
        let allGames = [];
        let currentCategory = null; // null means 'Home' view

        // === PERFORMANCE UTILITIES ===
        function debounce(fn, delay) {
            let timer;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        }

        function throttle(fn, delay) {
            let last = 0;
            let timer;
            return function(...args) {
                const now = Date.now();
                const remaining = delay - (now - last);
                clearTimeout(timer);
                if (remaining <= 0) {
                    last = now;
                    fn.apply(this, args);
                } else {
                    timer = setTimeout(() => {
                        last = Date.now();
                        fn.apply(this, args);
                    }, remaining);
                }
            };
        }

        // === LAZY IMAGE LOADING ===
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.addEventListener('load', () => {
                            img.classList.add('loaded');
                            img.closest('.card-image-wrap').style.animation = 'none';
                        }, { once: true });
                    }
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '200px 0px', // Start loading 200px before visible
            threshold: 0.01
        });

        function observeImages() {
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }

        // Ordered categories from user's wireframe
        const categoryOrder = [
            'HOT POST',
            'TANZANIA GAMES',
            'FREE GAMES',
            'PPSSPP GAMES',
            'ANDROID GAMES',
            'PC GAMES'
        ];

        const categoryIcons = {
            'HOT POST': 'fa-fire',
            'TANZANIA GAMES': 'fa-globe-africa',
            'FREE GAMES': 'fa-gift',
            'PPSSPP GAMES': 'fa-gamepad',
            'ANDROID GAMES': 'fa-mobile-alt',
            'PC GAMES': 'fa-desktop'
        };

        // ===== FETCH GAMES =====
        async function openMyGames() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return alert('Tafadhali jisajili kwanza!');
            const visitor = JSON.parse(visitorStr);
            
            const overlay = document.getElementById('myGamesOverlay');
            const list = document.getElementById('myGamesList');
            overlay.classList.add('show');
            list.innerHTML = '<div style="grid-column: 1/-1; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Inatafuta...</div>';

            try {
                const res = await fetch(`/api/user/purchases/${visitor.id}`);
                const purchases = await res.json();
                
                if (purchases.length === 0) {
                    list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #6c7293;">Hunija nunua game lolote bado.</div>';
                    return;
                }

                list.innerHTML = purchases.map(p => `
                    <div class="purchased-item">
                        <img src="${p.posts.image_url}" alt="">
                        <div style="font-size: 0.8rem; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.posts.title}</div>
                        <a href="${p.posts.download_url}" class="purchased-btn" target="_blank"><i class="fas fa-download"></i> DOWNLOAD</a>
                    </div>
                `).join('');
            } catch (e) {
                list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Hitilafu imetokea.</div>';
            }
        }

        function closeMyGames() {
            document.getElementById('myGamesOverlay').classList.remove('show');
        }

        async function fetchGames() {
            try {
                const response = await fetch('/api/games');
                const games = await response.json();
                allGames = games;
                
                if (!currentCategory) {
                    renderCategories(games);
                } else {
                    filterByCategory(currentCategory);
                }
            } catch (error) {
                console.error('Error fetching games:', error);
                document.getElementById('categoriesContainer').innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load games. Please try again.</p>
                    </div>
                `;
            }
        }

        // ===== RENDER CATEGORIES =====
        function renderCategories(games) {
            const container = document.getElementById('categoriesContainer');

            // Group games by category
            const grouped = {};
            games.forEach(game => {
                const cat = game.category || 'HOT POST';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(game);
            });

            // Sort categories by predefined order, then any extras
            const orderedKeys = [];
            categoryOrder.forEach(c => {
                if (grouped[c]) orderedKeys.push(c);
            });
            Object.keys(grouped).forEach(c => {
                if (!orderedKeys.includes(c)) orderedKeys.push(c);
            });

            if (orderedKeys.length === 0) {
                container.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-ghost"></i>
                        <p>No games yet. Check back soon!</p>
                    </div>
                `;
                return;
            }

            // --- CATEGORY VIEW (Vertical Grid) ---
            if (currentCategory) {
                const catGames = grouped[currentCategory] || [];
                container.innerHTML = `
                    <div class="view-header">
                        <button class="back-btn" onclick="showHome()"><i class="fas fa-arrow-left"></i></button>
                        <div class="view-title">${currentCategory}</div>
                    </div>
                    <div class="games-grid">
                        ${catGames.map(game => renderCard(game)).join('')}
                    </div>
                `;
                observeImages();
                return;
            }

            // --- HOME VIEW (Horizontal Rows) ---
            let html = '';
            
            // Limit items based on screen size for horizontal scrolling
            const screenWidth = window.innerWidth;
            let displayLimit = 7;
            if (screenWidth >= 1024) displayLimit = 14;
            else if (screenWidth >= 600) displayLimit = 10;

            orderedKeys.forEach(category => {
                const catGames = grouped[category];
                const icon = categoryIcons[category] || 'fa-folder';

                html += `
                    <section class="category-section" id="cat-${category.replace(/\s+/g, '-')}">
                        <div class="category-header">
                            <div class="category-title">
                                ${category}
                                <span class="category-count">${catGames.length}</span>
                            </div>
                            <a href="javascript:void(0)" class="see-all" onclick="filterByCategory('${category.replace(/'/g, "\\'")}')">
                                View All <i class="fas fa-chevron-right"></i>
                            </a>
                        </div>
                        <div class="games-row">
                            ${catGames.slice(0, displayLimit).map(game => renderCard(game)).join('')}
                        </div>
                    </section>
                `;
            });

            container.innerHTML = html;
            
            // Populate the Sidebar
            populateSidebarCategories(orderedKeys);

            // PERFORMANCE: Observe lazy images
            observeImages();
        }

        // ===== RENDER SINGLE CARD =====
        function renderCard(game) {
            const priceLabel = game.price > 0 ? `${parseInt(game.price).toLocaleString()}/-` : 'FREE';
            const priceClass = game.price > 0 ? '' : 'free';
            const category = game.category ? game.category.toUpperCase() : 'HOT POST';

            return `
                <div class="game-card" data-game-id="${game.id}" data-category="${category}">
                    <div class="card-image-wrap">
                        <img data-src="${game.image_url}" alt="${game.title}" 
                             onerror="this.src='https://placehold.co/400x600/111119/00f2ff?text=${encodeURIComponent(game.title)}'"
                             loading="lazy" decoding="async" width="175" height="263">
                        <div class="price-badge ${priceClass}">${priceLabel}</div>
                        <div class="card-rating">
                            <i class="fas fa-star"></i> ${game.rating || '0'}
                        </div>
                    </div>
                    <div class="card-info">
                        <div class="card-title">${game.title}</div>
                        <div class="card-desc">${game.description || ''}</div>
                    </div>
                </div>
            `;
        }

        // ===== DETAIL MODAL =====
        async function openDetail(id) {
            const game = allGames.find(g => g.id == id);
            if (!game) return;

            const overlay = document.getElementById('detailOverlay');
            const card = document.getElementById('detailCard');

            const hasDuration = game.duration_days && game.duration_days > 0;
            const isFree = !game.price || game.price <= 0;

            // Get visitor info
            const visitorStr = localStorage.getItem('chidy_visitor');
            const visitor = visitorStr ? JSON.parse(visitorStr) : null;

            let accessHtml = '';

            if (hasDuration && visitor && visitor.id) {
                // Check access status
                try {
                    const res = await fetch(`/api/check-access/${visitor.id}/${game.id}`);
                    const accessData = await res.json();

                    if (accessData.has_access) {
                        const expiryDate = new Date(accessData.expires_at);
                        const formattedExpiry = expiryDate.toLocaleDateString('sw-TZ', { year: 'numeric', month: 'long', day: 'numeric' });
                        const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                        
                        // Use links from access check response
                        const activeLinks = accessData.links || [];

                        accessHtml = `
                            <div style="background: linear-gradient(135deg, rgba(0,210,91,0.15), rgba(0,210,91,0.05)); border: 1px solid rgba(0,210,91,0.3); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                    <i class="fas fa-check-circle" style="color:#00d25b;font-size:1.1rem;"></i>
                                    <span style="color:#00d25b;font-weight:700;font-size:0.9rem;">ACCESS ACTIVE</span>
                                </div>
                                <p style="color:#a0a0b0;font-size:0.8rem;margin:0;">
                                    <i class="fas fa-calendar-alt" style="color:#ffb400;"></i> 
                                    Muda wako unaisha: <strong style="color:#fff;">${formattedExpiry}</strong> 
                                    ${hasDuration ? `<span style="color:${daysLeft <= 2 ? '#ff3333' : '#00f2ff'};">(Siku ${daysLeft} zimebaki)</span>` : ''}
                                </p>
                            </div>
                            <div class="detail-links">
                                ${game.youtube_url ? `<a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a>` : ''}
                                ${activeLinks.map(l => `<a href="${l.url}" target="_blank" class="dl-btn"><i class="fas fa-download"></i> ${l.name}</a>`).join('')}
                            </div>
                        `;
                        // Trigger Celebration!
                        triggerCelebration();
                    } else if (accessData.pending_order) {
                        // Pending approval
                        accessHtml = `
                            <div style="background: linear-gradient(135deg, rgba(255,171,0,0.15), rgba(255,171,0,0.05)); border: 1px solid rgba(255,171,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 15px; text-align:center;">
                                <div style="width:45px; height:45px; border-radius:50%; background:rgba(255,171,0,0.2); display:flex; align-items:center; justify-content:center; margin:0 auto 10px; color:#ffab00; font-size:1.2rem;">
                                    <i class="fas fa-clock fa-spin"></i>
                                </div>
                                <h4 style="color:#ffab00; margin:0 0 5px; font-family:'Orbitron'; font-size:0.85rem;">MALIPO YANAHAKIKIWA</h4>
                                <p style="color:#a0a0b0; font-size:0.8rem; margin:0; line-height:1.4;">Tumepokea taarifa za malipo yako. Admin anahakiki sasa hivi. Ukurasa huu utajifungua wenyewe mara baada ya kuhakikiwa.</p>
                                <button class="dl-btn" disabled style="width:100%;margin-top:15px;opacity:0.6;background:#333;color:#777;cursor:not-allowed;">TALAFADHALI SUBIRI...</button>
                            </div>
                            ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                        `;
                        // Auto refresh detail modal after 10 seconds to check if approved
                        setTimeout(() => { 
                            if (document.getElementById('detailOverlay').style.display === 'flex') {
                                openDetail(id); 
                            }
                        }, 10000);
                    } else if (accessData.expired) {
                        // ... Expired code ... (lines 1679-1690)
                        accessHtml = `
                            <div style="background: linear-gradient(135deg, rgba(255,51,51,0.15), rgba(255,51,51,0.05)); border: 1px solid rgba(255,51,51,0.3); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                    <i class="fas fa-exclamation-triangle" style="color:#ff3333;font-size:1.1rem;"></i>
                                    <span style="color:#ff3333;font-weight:700;font-size:0.9rem;">MUDA WAKO UMEISHA</span>
                                </div>
                                <p style="color:#a0a0b0;font-size:0.8rem;margin:0;">Muda wako wa siku ${game.duration_days} umeisha. Tafadhali fanya malipo/download upya kupata access mpya.</p>
                            </div>
                            ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                            <button class="dl-btn" onclick="initiatePayment('${game.id}')" style="width:100%;padding:14px;font-size:1rem;font-weight:700;background:linear-gradient(135deg,#ff3333,#990000);color:#fff;border:none;border-radius:12px;cursor:pointer;margin-top:10px;letter-spacing:1px;">
                                <i class="fas fa-redo"></i> LIPA UPYA (Kama Muda Umeisha)
                            </button>
                        `;
                    } else {
                        // No access yet
                        if (game.price && game.price > 0) {
                            // Paid game
                            accessHtml = `
                                <div style="background: linear-gradient(135deg, rgba(255,180,0,0.1), rgba(255,180,0,0.05)); border: 1px solid rgba(255,180,0,0.2); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                                    <p style="color:#a0a0b0;font-size:0.85rem;margin:0;"><i class="fas fa-shopping-cart" style="color:var(--gold);"></i> Game hii ni ya kulipia. Lipia sasa kupata access ya siku <strong style="color:#fff;">${game.duration_days || 'Milele'}</strong>.</p>
                                </div>
                                ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                                <button class="dl-btn" onclick="initiatePayment('${game.id}')" style="width:100%;padding:14px;font-size:1rem;font-weight:700;background:linear-gradient(135deg,var(--gold),#ff8c00);color:#000;border:none;border-radius:12px;cursor:pointer;margin-top:10px;letter-spacing:1px;">
                                    <i class="fas fa-credit-card"></i> NUNUA ACCESS (TSh ${game.price || 0})
                                </button>
                            `;
                        } else {
                            // Free game with duration
                            accessHtml = `
                                <div style="background: linear-gradient(135deg, rgba(0,242,255,0.1), rgba(188,19,254,0.05)); border: 1px solid rgba(0,242,255,0.2); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                                    <p style="color:#a0a0b0;font-size:0.85rem;margin:0;"><i class="fas fa-lock" style="color:#ffb400;"></i> Game hii ina access ya siku <strong style="color:#fff;">${game.duration_days}</strong>. Bofya hapa chini kupata access.</p>
                                </div>
                                ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                                <button class="dl-btn" onclick="initiatePayment('${game.id}')" style="width:100%;padding:14px;font-size:1rem;font-weight:700;background:linear-gradient(135deg,#00f2ff,#bc13fe);color:#000;border:none;border-radius:12px;cursor:pointer;margin-top:10px;letter-spacing:1px;">
                                    <i class="fas fa-unlock-alt"></i> PATA ACCESS (Siku ${game.duration_days})
                                </button>
                            `;
                        }
                    }
                } catch (e) {
                    console.error('Access check failed:', e);
                    accessHtml = `
                        <div style="text-align:center; padding: 20px;">
                            <i class="fas fa-wifi" style="font-size: 2rem; color: #333; margin-bottom: 10px;"></i>
                            <p style="color: #6c7293; font-size: 0.8rem;">Network error while checking access. Please refresh.</p>
                        </div>
                    `;
                }
            } else if (!visitor) {
                // Not logged in - force login for any game (even free ones)
                accessHtml = `
                    <div style="background: rgba(255,180,0,0.1); border: 1px solid rgba(255,180,0,0.2); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                        <p style="color:#a0a0b0;font-size:0.85rem;margin:0;"><i class="fas fa-user-plus" style="color:var(--gold);"></i> Tafadhali jisajili kwanza ili kupata access ya kudownload.</p>
                    </div>
                    ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                    <button class="dl-btn" onclick="openLogin()" style="width:100%;margin-top:10px;">JISAJILI SASA</button>
                `;
            } else {
                // Logged in but game has no duration/price? Still hit access check to get links
                // Re-calling with a simplified view or just fallback
                accessHtml = `
                    <div class="loader-container" style="padding: 20px;">
                        <div class="loader-spinner" style="width:25px; height:25px;"></div>
                        <div class="loader-text">Fetching links...</div>
                    </div>
                `;
                // Manually trigger the check if we didn't enter the duration block
                setTimeout(() => openDetail(id), 100); 
            }

            card.innerHTML = `
                <button class="close-detail" onclick="closeDetail()"><i class="fas fa-times"></i></button>
                <img src="${game.image_url}" alt="${game.title}" class="detail-image">
                <div class="detail-body">
                    <h2>${game.title}</h2>
                    <div class="detail-meta">
                        <span style="color: var(--gold);"><i class="fas fa-star"></i> ${game.rating || 'N/A'}</span>
                        <span style="color: var(--primary);">${game.category || 'HOT POST'}</span>
                        <span style="color: ${game.price > 0 ? 'var(--primary)' : '#00d25b'}; font-weight: 700;">
                            ${game.price > 0 ? 'TSh ' + parseInt(game.price).toLocaleString() : 'FREE'}
                        </span>
                        ${hasDuration ? `<span style="color:#ffb400;font-size:0.8rem;"><i class="fas fa-clock"></i> Siku ${game.duration_days}</span>` : ''}
                    </div>
                    <p>${game.description || 'No description available.'}</p>
                    ${accessHtml}
                </div>
            `;

            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Genesis Engine: Init magnetic effects
            document.querySelectorAll('.dl-btn').forEach(btn => {
                btn.classList.add('magnetic-btn');
                initMagnetic(btn);
            });
        }

        // Initiate payment flow
        async function initiatePayment(postId) {
            const game = allGames.find(g => g.id == postId);
            if (!game) return;

            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) {
                alert('Tafadhali jisajili kwanza!');
                document.getElementById('signupOverlay').classList.remove('hidden');
                return;
            }

            try {
                // Get payment info from settings
                const res = await fetch('/api/settings/payment');
                const settings = await res.json();
                
                document.getElementById('payAmount').textContent = 'TSh ' + game.price;
                document.getElementById('payNumber').textContent = settings.mpesa_number;
                document.getElementById('payName').textContent = settings.mpesa_name;
                document.getElementById('payPostId').value = postId;
                
                // Clear prefill to ensure user knows they must enter it
                document.getElementById('paySenderNumber').value = '';
                // Set a custom placeholder that includes a prompt
                document.getElementById('paySenderNumber').placeholder = "Andika namba yako hapa...";

                document.getElementById('paymentOverlay').classList.add('show');
            } catch (e) {
                alert('Tafadhali jaribu tena baadae.');
            }
        }

        function closePayment() {
            document.getElementById('paymentOverlay').classList.remove('show');
        }

        function toggleGiftInput() {
            const isGift = document.getElementById('isGiftCheck').checked;
            document.getElementById('giftInputGroup').style.display = isGift ? 'block' : 'none';
        }

        async function submitPaymentOrder() {
            const postId = document.getElementById('payPostId').value;
            const senderPhone = document.getElementById('paySenderNumber').value.trim();
            const btn = document.getElementById('confirmPayBtn');
            const isGift = document.getElementById('isGiftCheck').checked;
            const giftPhone = document.getElementById('giftRecipientPhone').value.trim();
            
            const visitorStr = localStorage.getItem('chidy_visitor');
            const visitor = JSON.parse(visitorStr);
            const game = allGames.find(g => g.id == postId);

            if (!senderPhone) {
                alert('Tafadhali ingiza namba uliyotumia kulipia!');
                return;
            }
            if (isGift && !giftPhone) {
                alert("Tafadhali ingiza namba ya rafiki unayemzawadia.");
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INATUMA...';

            try {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        visitor_id: visitor.id,
                        post_id: postId,
                        amount: game.price,
                        phone_number: senderPhone,
                        is_gift: isGift,
                        gift_phone: giftPhone
                    })
                });
                const result = await res.json();

                if (result.success) {
                    alert('✅ Oda yako imepokelewa! Tafadhali subiri Admin athibitishe malipo yako. Utapata taarifa hivi punde.');
                    closePayment();
                    openDetail(postId); // Refresh view to show pending status or similar
                } else {
                    alert('Imeshindikana: ' + result.error);
                }
            } catch (err) {
                alert('Kuna tatizo la mtandao.');
            } finally {
                btn.disabled = false;
                btn.textContent = '✅ NIMETUMA PESA';
            }
        }

        function buildDirectLinks(game, links) {
            return `
                <div class="detail-links">
                    ${game.youtube_url ? `<a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a>` : ''}
                    ${links.map(l => `<a href="${l.url}" target="_blank" class="dl-btn"><i class="fas fa-download"></i> ${l.name}</a>`).join('')}
                </div>
            `;
        }

        function closeDetail() {
            document.getElementById('detailOverlay').classList.remove('show');
            document.body.style.overflow = '';
        }

        // Close on overlay click
        document.getElementById('detailOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeDetail();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDetail();
        });

        // === PERFORMANCE: Event delegation for game card clicks ===
        // One listener replaces hundreds of inline onclick handlers
        document.getElementById('categoriesContainer').addEventListener('click', (e) => {
            const card = e.target.closest('.game-card[data-game-id]');
            if (card) {
                openDetail(card.dataset.gameId);
            }
        });

        // ===== SEARCH (DEBOUNCED for performance) =====
        const debouncedSearch = debounce((query) => {
            currentCategory = null;
            if (!query) {
                renderCategories(allGames);
                return;
            }

            const filtered = allGames.filter(g =>
                (g.title || '').toLowerCase().includes(query) ||
                (g.category || '').toLowerCase().includes(query) ||
                (g.description || '').toLowerCase().includes(query)
            );

            renderCategories(filtered);
        }, 300);

        document.getElementById('searchInput').addEventListener('input', (e) => {
            debouncedSearch(e.target.value.toLowerCase().trim());
        });

        // Clear search on 'search' event (for 'x' button in search inputs)
        document.getElementById('searchInput').addEventListener('search', (e) => {
            if (!e.target.value) renderCategories(allGames);
        });

        // ===== BOTTOM BAR ACTIONS =====
        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveBottom(0);
        }

        function focusSearch() {
            const input = document.getElementById('searchInput');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => input.focus(), 400);
            setActiveBottom(1);
        }

        function scrollToCategory(cat) {
            const el = document.getElementById('cat-' + cat.replace(/\s+/g, '-'));
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            // Set active based on category
            if (cat === 'HOT POST') setActiveBottom(1);
            else if (cat === 'TANZANIA GAMES') setActiveBottom(2);
        }

        function filterByCategory(cat) {
            currentCategory = cat;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            renderCategories(allGames);
            setActiveBottom(-1); // Deselect bottom bar as we are in a sub-view
        }

        function showHome() {
            currentCategory = null;
            document.getElementById('searchInput').value = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            renderCategories(allGames);
            setActiveBottom(0);
        }

        function setActiveBottom(index) {
            document.querySelectorAll('.bottom-item').forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });
        }

        // ===== UPDATE HEADER USER DISPLAY =====
        function setUserDisplay(name) {
            const initial = name ? name.charAt(0).toUpperCase() : 'U';
            const shortName = name ? name.split(' ')[0] : 'User';
            const avatarEl = document.getElementById('userAvatar');
            const nameEl = document.getElementById('userName');
            if (avatarEl) avatarEl.textContent = initial;
            if (nameEl) nameEl.textContent = shortName;
        }

        // ===== LOG VIEW =====
        async function logPageView() {
            try {
                await fetch('/api/log-view', { method: 'POST' });
            } catch (e) { console.error('View tracking failed', e); }
        }

        // ===== SIGNUP SYSTEM =====
        async function checkSignupStatus() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (visitorStr) {
                try {
                    const visitor = JSON.parse(visitorStr);
                    // Verify with backend if user still exists
                    if (visitor.id) {
                        const response = await fetch(`/api/check-user/${visitor.id}`);
                        const result = await response.json();
                        
                        if (result.exists) {
                            // Still exists in DB, hide overlay
                            document.getElementById('signupOverlay').classList.add('hidden');
                            setUserDisplay(visitor.name);
                            refreshUserStats();
                            return true;
                        }
                    }
                } catch (e) {
                    console.error("Signup validation error:", e);
                }
                
                // If we reach here, user does not exist in DB or data is corrupt
                localStorage.removeItem('chidy_visitor');
            }
            
            // If no visitor or deleted from DB, ensure overlay is shown
            openLogin();
            return false;
        }

        function openLogin() {
            document.getElementById('signupOverlay').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeLogin() {
            // Only allow closing if user is actually registered
            if (localStorage.getItem('chidy_visitor')) {
                document.getElementById('signupOverlay').classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        // Create floating particles for welcome screen
        function createParticles() {
            const container = document.getElementById('welcomeParticles');
            container.innerHTML = '';
            const colors = ['#00f2ff', '#bc13fe', '#ff00e5', '#ffb400', '#00d25b'];
            
            for (let i = 0; i < 50; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                const size = Math.random() * 6 + 2;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const x = Math.random() * 100;
                const delay = Math.random() * 2;
                const duration = Math.random() * 3 + 2;
                
                p.style.cssText = `
                    width: ${size}px; height: ${size}px;
                    background: ${color};
                    box-shadow: 0 0 ${size * 3}px ${color};
                    left: ${x}%;
                    bottom: -10px;
                    animation: particleRise ${duration}s ease-out ${delay}s forwards;
                    opacity: 0;
                `;
                container.appendChild(p);
            }
            
            // Add particle animation if not exists
            if (!document.getElementById('particleStyle')) {
                const style = document.createElement('style');
                style.id = 'particleStyle';
                style.innerHTML = `
                    @keyframes particleRise {
                        0% { transform: translateY(0) scale(0); opacity: 0; }
                        20% { opacity: 1; transform: scale(1); }
                        100% { transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}${Math.random() * 100}px); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        // Show welcome animation
        function showWelcome(name) {
            const overlay = document.getElementById('welcomeOverlay');
            const content = document.getElementById('welcomeContent');
            document.getElementById('welcomeUserName').textContent = name.toUpperCase();
            
            overlay.classList.add('show');
            createParticles();
            
            // Trigger content animation after a brief delay
            setTimeout(() => {
                content.classList.add('animate');
            }, 300);
            
            // Auto-close after 4.5 seconds
            setTimeout(() => {
                overlay.style.transition = 'opacity 1s ease-out';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.classList.remove('show');
                    overlay.style.opacity = '';
                    overlay.style.transition = '';
                    
                    if (window.isMaintenanceMode) {
                        document.getElementById('maintenanceOverlay').classList.add('show');
                    }
                }, 1000);
            }, 4500);
        }

        // Signup form handler
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value.trim();
            const phone = document.getElementById('signupPhone').value.trim();
            const errorEl = document.getElementById('signupError');
            const btn = document.getElementById('signupBtn');
            
            errorEl.textContent = '';
            
            if (!name || name.length < 2) {
                errorEl.textContent = 'Tafadhali ingiza jina lako.';
                return;
            }
            if (!phone || phone.length < 10) {
                errorEl.textContent = 'Tafadhali ingiza namba sahihi ya simu.';
                return;
            }
            
            btn.disabled = true;
            btn.textContent = 'INAFANYA KAZI...';
            
            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone })
                });
                const result = await response.json();
                
                if (result.success) {
                    // Save to localStorage
                    localStorage.setItem('chidy_visitor', JSON.stringify({ name, phone, id: result.visitor.id }));
                    setUserDisplay(name);
                    refreshUserStats();
                    
                    // Hide signup overlay
                    const signupOverlay = document.getElementById('signupOverlay');
                    signupOverlay.style.transition = 'opacity 0.5s ease-out';
                    signupOverlay.style.opacity = '0';
                    
                    setTimeout(() => {
                        signupOverlay.classList.add('hidden');
                        // Show welcome animation
                        showWelcome(name);
                    }, 500);
                } else {
                    throw new Error(result.error);
                }
            } catch (err) {
                errorEl.textContent = 'Kuna tatizo. Jaribu tena: ' + err.message;
                btn.disabled = false;
                btn.textContent = 'JOIN NOW';
            }
        });

        // ===== AI BOT SYSTEM (Msaada) =====
        function openBotChat() {
            document.getElementById('botChatOverlay').classList.add('show');
            document.body.style.overflow = 'hidden';
            if (document.getElementById('botMessages').innerHTML.trim() === '') {
                appendBotMsg("Mambo vipi Chief! 👋 Mimi ni Chidy AI Bot 🤖. Niko hapa kukusaidia. Unatafuta game la aina gani leo? (Mfano: 'Kazi', 'Mpira', au jina la game)");
            }
        }

        function toggleBotChat() {
            const overlay = document.getElementById('botChatOverlay');
            if (overlay.classList.contains('show')) {
                overlay.classList.remove('show');
                document.body.style.overflow = '';
            } else {
                openBotChat();
            }
        }

        function appendUserMsg(text) {
            const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const html = `<div class="b-msg user">${text} <span class="time">${time}</span></div>`;
            const box = document.getElementById('botMessages');
            box.innerHTML += html;
            box.scrollTop = box.scrollHeight;
        }

        function appendBotMsg(text, games = []) {
            let htmlText = text;
            games.forEach(g => {
                htmlText += `<a href="#" onclick="toggleBotChat(); openDetail('${g.id}'); return false;" class="chat-game-link"><i class="fas fa-gamepad"></i> Tazama ${g.title}</a>`;
            });

            const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const html = `<div class="b-msg bot">${htmlText} <span class="time">${time}</span></div>`;
            const box = document.getElementById('botMessages');
            box.innerHTML += html;
            box.scrollTop = box.scrollHeight;
        }

        function processBotLogic(input) {
            const lowerInput = input.toLowerCase();
            
            // Greetings
            if (lowerInput.match(/^(mambo|niaje|hi|hello|sasa|vp|vipi)/)) {
                return appendBotMsg("Poa sana Kaka! 🔥 Nipo hapa kukusaidia kupata games zote kali. Unatafuta game la simu, PC au PPSSPP?");
            }

            // Stop words to remove from natural language phrasing
            const stopWords = ['nataka', 'naomba', 'magemu', 'magame', 'ya', 'za', 'tafadhali', 'nipatie', 'nipe', 'game', 'games', 'la', 'kuhusu'];
            
            // Clean the input to get core keywords
            let keywords = lowerInput.split(' ').filter(word => !stopWords.includes(word) && word.length > 1);
            if (keywords.length === 0) keywords = [lowerInput];

            // Fallback intelligence: Search the games using keywords!
            const matchedGames = allGames.filter(g => {
                const titleLower = g.title.toLowerCase();
                const descLower = g.description ? g.description.toLowerCase() : '';
                const catLower = g.category.toLowerCase();

                // Check if any keyword matches the game title, category, or description
                let matchCount = 0;
                keywords.forEach(kw => {
                    if (titleLower.includes(kw) || catLower.includes(kw) || descLower.includes(kw)) {
                        matchCount++;
                    }
                });
                
                // If it matched at least one core keyword, consider it a match
                // We could also do a strict match (all keywords) but partial is safer
                return matchCount > 0;
            }).slice(0, 3); // Max 3 suggestions

            if (matchedGames.length > 0) {
                appendBotMsg(`Nimekupatia hizi hapa! Chagua mojawapo hapa chini kuitazama: 👇`, matchedGames);
            } else {
                appendBotMsg(`Dah! 🤔 Sijapata "${keywords.join(' ')}" moja kwa moja. Hebu jaribu kutaja jina lingine au niambie category kama 'PPSSPP' au 'PC Games'. Kama hujanunua au kuupload, hutaikuta hapa.`);
            }
        }

        function sendBotMessage() {
            const inputEl = document.getElementById('botInputUrl');
            const text = inputEl.value.trim();
            if (!text) return;
            
            inputEl.value = '';
            appendUserMsg(text);

            // Typing simulation
            setTimeout(() => {
                processBotLogic(text);
            }, 800 + Math.random() * 1000); // 0.8s - 1.8s delay
        }

        // ===== PWA INSTALLATION SYSTEM =====
        let deferredPrompt;
        const pwaPopup = document.createElement('div');
        pwaPopup.id = 'pwaInstallPopup';
        pwaPopup.style.cssText = `
            position: fixed; bottom: 85px; left: 20px; right: 20px;
            background: rgba(15, 15, 25, 0.98); backdrop-filter: blur(25px);
            border: 1px solid rgba(0, 242, 255, 0.4); border-radius: 20px;
            padding: 18px; display: none; z-index: 10001;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 242, 255, 0.15);
            animation: slideUpPWA 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        pwaPopup.innerHTML = `
            <style>
                @keyframes slideUpPWA { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                #pwaInstallBtn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0, 242, 255, 0.4); filter: brightness(1.1); }
            </style>
            <div style="display: flex; align-items: center; gap: 15px; position: relative;">
                <div style="position: relative;">
                    <img src="/icon.png" style="width: 55px; height: 55px; border-radius: 14px; border: 2px solid rgba(0, 242, 255, 0.2); box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);">
                </div>
                <div style="flex: 1;">
                    <div style="font-family: 'Orbitron'; font-size: 0.9rem; font-weight: 900; color: #fff; margin-bottom: 2px; letter-spacing: 1px;">CHIDY PRIME APP</div>
                    <div style="font-size: 0.7rem; color: #a0a0b0; line-height: 1.3;">Weka kwenye Screen yako sasa upate uzoefu wa kilele wa gaming! 🔥</div>
                </div>
                <button id="pwaCloseBtn" style="background: rgba(255,255,255,0.05); border: none; color: #fff; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s;"><i class="fas fa-times"></i></button>
            </div>
            <button id="pwaInstallBtn" style="width: 100%; margin-top: 15px; padding: 12px; border-radius: 12px; border: none; background: linear-gradient(135deg, #00f2ff, #bc13fe); color: #000; font-family: 'Orbitron'; font-size: 0.8rem; font-weight: 900; cursor: pointer; letter-spacing: 2px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 242, 255, 0.2);">INSTALL NOW</button>
        `;
        document.body.appendChild(pwaPopup);

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            // Check if already dismissed this session
            if (!sessionStorage.getItem('pwa_dismissed')) {
                setTimeout(() => { 
                    pwaPopup.style.display = 'block';
                    console.log('PWA Install Prompt Showed');
                }, 4000);
            }
        });

        document.getElementById('pwaInstallBtn').addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    pwaPopup.style.display = 'none';
                    localStorage.setItem('pwa_installed', 'true');
                }
                deferredPrompt = null;
            } else {
                // If trigger failed, give instructions
                alert("Ili kuweka app, bofya option za browser yako (vidukta vitatu juu) kisha chagua 'Install App' au 'Add to Home Screen'.");
            }
        });

        document.getElementById('pwaCloseBtn').addEventListener('click', () => {
            pwaPopup.style.display = 'none';
            sessionStorage.setItem('pwa_dismissed', 'true');
        });


        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW Registered'))
                    .catch(err => console.log('SW Failed', err));
            });
        }

        // ===== INIT =====
        async function initializeApp() {
            window.isMaintenanceMode = false;
            try {
                const res = await fetch('/api/settings/maintenance');
                const data = await res.json();
                if (data.value === 'true') {
                    window.isMaintenanceMode = true;
                }
            } catch (e) {
                console.error('Failed to check maintenance status', e);
            }
            
            const isRegistered = await checkSignupStatus();
            
            if (window.isMaintenanceMode) {
                if (isRegistered) {
                    // Show maintenance immediately since user is established
                    document.getElementById('maintenanceOverlay').classList.add('show');
                }
                return; // Stop initialization, don't fetch games
            }
            
            fetchGames();
        }
        
        // Logic initialized at the end of script

        // Update view on resize if in home view (THROTTLED for performance)
        window.addEventListener('resize', throttle(() => {
            const searchQuery = document.getElementById('searchInput').value;
            if (!currentCategory && !searchQuery && allGames.length > 0) {
                renderCategories(allGames);
            }
        }, 250));

        async function openLeaderboard() {
            const overlay = document.getElementById('leaderboardOverlay');
            const list = document.getElementById('leaderboardList');
            overlay.classList.add('show');
            
            try {
                const res = await fetch('/api/leaderboard');
                const data = await res.json();
                
                if (data.length === 0) {
                    list.innerHTML = '<div style="text-align: center; color: #6c7293; padding: 20px;">Hakuna mshindi aliyepatikana bado. Kuwa wa kwanza!</div>';
                    return;
                }
                
                list.innerHTML = data.map((user, index) => {
                    let medal = '';
                    if (index === 0) medal = '🥇';
                    else if (index === 1) medal = '🥈';
                    else if (index === 2) medal = '🥉';
                    else medal = `<span style="font-size:0.8rem; color:#6c7293;">#${index + 1}</span>`;
                    
                    return `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 30px; text-align: center;">${medal}</div>
                                <div style="font-weight: 600; font-family: 'Orbitron'; font-size: 0.85rem; color: #fff;">${user.name}</div>
                            </div>
                            <div style="font-size: 0.7rem; padding: 4px 8px; background: rgba(0, 242, 255, 0.1); color: var(--primary); border-radius: 6px; font-weight: 800;">
                                ${user.purchases} GAMES
                            </div>
                        </div>
                    `;
                }).join('');
            } catch (e) {
                list.innerHTML = '<div style="text-align: center; color: #ff3333; padding: 20px;">Hitilafu imetokea. Jaribu tena!</div>';
            }
        }

        function closeLeaderboard() {
            document.getElementById('leaderboardOverlay').classList.remove('show');
        }

        async function refreshUserStats() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return;
            const visitor = JSON.parse(visitorStr);
            try {
                const res = await fetch(`/api/user/stats/${visitor.id}`);
                const stats = await res.json();
                if (stats.level) {
                    document.getElementById('userLevelBadge').textContent = stats.level.toUpperCase();
                }
            } catch (e) { console.error("Stats fetch failed"); }
        }
        // Unified Script Continuation
        // ... (Existing Logic)
        let notifications = [];

        async function fetchNotifications() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return;
            const visitor = JSON.parse(visitorStr);

            try {
                const res = await fetch(`/api/notifications/${visitor.id}`);
                const data = await res.json();
                
                // Compare with old to see if we have new ones
                const lastCount = notifications.length;
                notifications = data;
                
                renderNotifications();
                
                // Show toast for newest notification if it's new and unread
                if (data.length > lastCount && data[0].visitor_id) {
                    showBigNotification(data[0]);
                }
            } catch (err) {
                console.error("Notif sync error:", err);
            }
        }

        function renderNotifications() {
            const body = document.getElementById('notifBody');
            const badge = document.getElementById('notifBadge');
            
            const unread = notifications.filter(n => !n.is_read).length;
            if (unread > 0) {
                badge.innerText = unread;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }

            if (notifications.length === 0) {
                body.innerHTML = '<p style="text-align:center;color:#6c7293;padding:20px;font-size:0.85rem;">Hakuna taarifa mpya kwa sasa.</p>';
                return;
            }

            body.innerHTML = notifications.map(n => {
                const time = new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                return `
                    <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}')">
                        <h5>${n.title}</h5>
                        <p>${n.message}</p>
                        <span class="time">${time}</span>
                    </div>
                `;
            }).join('');
        }

        function toggleNotifDropdown() {
            const dropdown = document.getElementById('notifDropdown');
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }

        function showBigNotification(notif) {
            // Simple overlay for important success messages
            const overlay = document.createElement('div');
            overlay.className = 'big-notif-overlay';
            overlay.innerHTML = `
                <div class="big-notif-card" style="animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <div style="background:var(--primary); width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:-30px auto 15px; box-shadow:0 0 20px rgba(0,242,255,0.4);">
                        <i class="fas ${notif.type === 'success' ? 'fa-check' : 'fa-info'}" style="color:#000; font-size:1.5rem;"></i>
                    </div>
                    <h3 style="color:#fff; text-align:center; font-family:'Orbitron'; font-size:1rem; margin-bottom:10px;">${notif.title}</h3>
                    <p style="color:#a0a0b0; text-align:center; font-size:0.9rem; margin-bottom:20px; line-height:1.5;">${notif.message}</p>
                    <button onclick="this.closest('.big-notif-overlay').remove()" style="width:100%; border:none; padding:12px; border-radius:8px; background:linear-gradient(135deg,#00f2ff,#bc13fe); color:#000; font-weight:700; cursor:pointer;">ELEWA (SAWA)</button>
                </div>
            `;
            
            const styles = `
                .big-notif-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(5px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; }
                .big-notif-card { background:#15151a; border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:30px; max-width:400px; width:100%; box-shadow:0 10px 50px rgba(0,0,0,0.8); }
                @keyframes bounceIn { from { opacity:0; transform:scale(0.3); } to { opacity:1; transform:scale(1); } }
            `;
            const styleSheet = document.createElement("style");
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);
            document.body.appendChild(overlay);
        }

        // Initialize and poll
        setTimeout(fetchNotifications, 2000);
        setInterval(fetchNotifications, 30000); // Check every 30s

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const notifDropdown = document.getElementById('notifDropdown');
            const notifBell = document.getElementById('notifBell');
            if (notifDropdown.style.display === 'block' && !notifDropdown.contains(e.target) && !notifBell.contains(e.target)) {
                notifDropdown.style.display = 'none';
            }

            const profileDropdown = document.getElementById('profileDropdown');
            const userProfileBtn = document.getElementById('userProfileBtn');
            if (profileDropdown && profileDropdown.classList.contains('show') && !userProfileBtn.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });

        // ===== PROFILE DROPDOWN =====
        function toggleProfileDropdown(e) {
            e.stopPropagation();
            // Only toggle drop-down if user is authenticated (signed up)
            if (!localStorage.getItem('chidy_visitor')) {
                openLogin();
                return;
            }
            const dropdown = document.getElementById('profileDropdown');
            dropdown.classList.toggle('show');
        }

        // ===== SECURE LOGOUT FLOW =====
        function openLogoutModal() {
            document.getElementById('logoutVerifyPhone').value = '';
            document.getElementById('logoutError').style.display = 'none';
            document.getElementById('logoutVerifyOverlay').classList.add('show');
        }

        function closeLogoutModal() {
            document.getElementById('logoutVerifyOverlay').classList.remove('show');
        }

        async function processLogout() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return closeLogoutModal();
            
            const visitor = JSON.parse(visitorStr);
            const inputPhone = document.getElementById('logoutVerifyPhone').value.trim();
            const btn = document.getElementById('confirmLogoutBtn');
            const errorEl = document.getElementById('logoutError');
            
            if (!inputPhone) {
                errorEl.textContent = 'Tafadhali ingiza namba ya simu.';
                errorEl.style.display = 'block';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'INATHIBITISHA...';
            errorEl.style.display = 'none';

            try {
                // Verify with backend
                const res = await fetch('/api/verify-phone', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visitor_id: visitor.id, phone: inputPhone })
                });
                
                const result = await res.json();
                
                if (result.valid) {
                    // Fully remove user info
                    localStorage.removeItem('chidy_visitor');
                    closeLogoutModal();
                    
                    // Show a goodbye toast/alert if desired, then reload or open signup
                    alert('Akaunti yako imeondolewa kikamilifu. Karibu tena!');
                    setUserDisplay(''); // Reset header name
                    document.getElementById('profileDropdown').classList.remove('show');
                    
                    // Re-open signup overlay to pretend they are new
                    openLogin();
                    document.getElementById('signupName').value = '';
                    document.getElementById('signupPhone').value = '';
                } else {
                    errorEl.textContent = result.message || 'Namba si sahihi. Imeshindwa kujiondoa.';
                    errorEl.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                errorEl.textContent = 'Kuna tatizo la mtandao. Jaribu tena.';
                errorEl.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'THIBITISHA KUJIONDOA';
            }
        }

        // ===== SIDEBAR LOGIC =====
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
                // Give animation time to finish before unhiding
                setTimeout(() => { if(!overlay.classList.contains('show')) overlay.style.display = 'none'; }, 300);
                document.body.style.overflow = '';
            } else {
                overlay.style.display = 'block';
                // Trigger reflow
                void overlay.offsetWidth;
                sidebar.classList.add('open');
                overlay.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        }

        function populateSidebarCategories(orderedKeys) {
            const sidebarMenu = document.getElementById('sidebarMenu');
            if(!sidebarMenu) return;
            let html = `
                <div class="sidebar-item" onclick="toggleSidebar(); showHome();">
                    <i class="fas fa-home"></i> Home
                </div>
            `;
            orderedKeys.forEach(cat => {
                const icon = categoryIcons[cat] || 'fa-gamepad';
                html += `
                    <div class="sidebar-item" onclick="toggleSidebar(); filterByCategory('${cat.replace(/'/g, "\\'")}');">
                        <i class="fas ${icon}"></i> ${cat}
                    </div>
                `;
            });
            sidebarMenu.innerHTML = html;
        }

        // ===== WHATSAPP CHANNEL MODAL =====
        function openWaChannelModal() {
            document.getElementById('waModalOverlay').classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        function closeWaModal(e) {
            if (!e || e.target === document.getElementById('waModalOverlay')) {
                document.getElementById('waModalOverlay').classList.remove('show');
                document.body.style.overflow = '';
            }
        }

        // SMART HELP LOGIC
        function toggleBotChat() {
            const botOverlay = document.getElementById('botChatOverlay');
            if (botOverlay) {
                if (botOverlay.classList.contains('show')) {
                    botOverlay.classList.remove('show');
                } else {
                    botOverlay.classList.add('show');
                    // If no message, start with a greeting
                    const body = document.getElementById('botMessages');
                    if (body && body.innerHTML.trim() === '') {
                        addBotMessage("Habari! Mimi ni Chidy AI Assistant 🤖. Naweza kukusaidia kupata game unayohitaji au kutatua tatizo la malipo. Unahitaji msaada gani?");
                    }
                }
            }
        }

        async function refreshUserStats() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return;
            const visitor = JSON.parse(visitorStr);
            try {
                const res = await fetch(`/api/user/stats/${visitor.id}`);
                const stats = await res.json();
                if (stats.level) {
                    const badge = document.getElementById('userLevelBadge');
                    badge.innerText = stats.level;
                    badge.style.color = stats.color;
                }
            } catch (e) { console.error("Stats error", e); }
        }

        function toggleGiftInput() {
            const check = document.getElementById('isGiftCheck');
            const group = document.getElementById('giftInputGroup');
            group.style.display = check.checked ? 'block' : 'none';
        }

        function addBotMessage(text, type = 'bot') {
            const body = document.getElementById('botMessages');
            if (!body) return;
            const msg = document.createElement('div');
            msg.className = `b-msg ${type}`;
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            msg.innerHTML = `${text}<span class="time">${time}</span>`;
            body.appendChild(msg);
            body.scrollTop = body.scrollHeight;
        }

        async function sendBotMessage() {
            const input = document.getElementById('botInputUrl');
            const text = input.value.trim();
            if (!text) return;

            addBotMessage(text, 'user');
            input.value = '';

            // Simple Auto-responses for the premium feel
            setTimeout(() => {
                if (text.toLowerCase().includes('malipo') || text.toLowerCase().includes('lipa')) {
                    addBotMessage("Ili kufanya malipo, chagua game unayotaka kisha bonyeza kitufe cha 'Download'. Fuata maelekezo ya kulipia namba iliyowekwa.");
                } else if (text.toLowerCase().includes('game') || text.toLowerCase().includes('mchezo')) {
                    addBotMessage("Tuna games nyingi za PPSSPP, Android, na PC. Unaweza kutumia search bar juu upate game unayotaka haraka.");
                } else {
                    addBotMessage("Samahani, sijakuelewa vizuri. Unaweza pia kubonyeza kitufe cha WhatsApp hapo chini ili kuongea na msimamizi moja kwa moja.");
                }
            }, 1000);
        }

        // Keep existing openBotChat for real WhatsApp fallback if needed inside the bot
        function openWhatsAppSupport() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            const visitor = visitorStr ? JSON.parse(visitorStr) : null;
            
            let message = "Habari Chidy Prime! Nahitaji msaada kitalu cha Gaming.";
            if (visitor) {
                message = `Habari Chidy Prime! Mimi ni ${visitor.name}, ID: ${visitor.id.substring(0,6)}. Nahitaji msaada wa huduma zenu.`;
            }
            
            const waUrl = `https://wa.me/255762047805?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
        }

        function triggerCelebration() {
            const duration = 3 * 1000;
            const end = Date.now() + duration;

            (function frame() {
              confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#00f2ff', '#bc13fe', '#ffffff']
              });
              confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#00f2ff', '#bc13fe', '#ffffff']
              });

              if (Date.now() < end) {
                requestAnimationFrame(frame);
              }
            }());
        }
        // Wrapper for magnetic effect
        function initMagnetic(el) {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = `translate(0px, 0px)`;
            });
        }

        // --- GENESIS ENGINE CORE LOGIC ---
        
        // 1. Startup Sequence
        function startGenesisEngine() {
            const statusText = document.getElementById('startup-text');
            const overlay = document.getElementById('genesis-startup');
            const scripts = [
                'Initializing Neural Interface...',
                'Loading 3D Visual Engine...',
                'Connecting to Secure Gateway...',
                'CHIDY PRIME SYSTEM ONLINE'
            ];
            
            // Fail-safe: Hide overlay if it hangs for more than 4 seconds
            const failSafe = setTimeout(() => {
                if (overlay && overlay.style.display !== 'none') {
                    console.warn('Genesis Engine startup hang detected, engaging fail-safe...');
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.style.display = 'none', 1000);
                }
            }, 4000);

            let i = 0;
            const interval = setInterval(() => {
                if (statusText) statusText.innerText = scripts[i];
                i++;
                if (i >= scripts.length) {
                    clearInterval(interval);
                    clearTimeout(failSafe);
                    setTimeout(() => {
                        overlay.style.opacity = '0';
                        setTimeout(() => overlay.style.display = 'none', 1000);
                    }, 500);
                }
            }, 400);
        }

        // 2. 3D Tilt Cards Logic
        function init3DTilt(element) {
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotX = ((y - centerY) / centerY) * 10; // Max 10 degrees
                const rotY = ((centerX - x) / centerX) * 10;
                
                element.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`;
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            });
        }

        // 3. Social Pulse Notifications
        const pulseMessages = [
            "Mteja kutoka Dar amepata access ya FIFA 2025 sasa hivi!",
            "Kuna mtu anadownload Spiderman 2 sasa hivi...",
            "Mteja amemaliza malipo ya GTA V...",
            "Premium Account imesajiliwa sasa hivi!",
            "Mteja @Said kutoka Mwanza amefanya upgrade...",
            "Access ya siku 30 imefanikiwa kwa mteja!",
            "Umeona ofa mpya? Angalia sehemu ya HOT POST."
        ];

        function showPulseNotification() {
            const toast = document.getElementById('pulse-notification');
            const msg = document.getElementById('pulse-message');
            
            if (toast && msg) {
                msg.innerText = pulseMessages[Math.floor(Math.random() * pulseMessages.length)];
                toast.classList.add('show');
                
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 4000);
            }
        }

        function showCyberOffers() {
            // Can be expanded to show a special modal
            if (allGames && allGames.length > 0) {
                openDetail(allGames[0].id); // Just as a demo, open first game
            }
        }

        // Wrap the card rendering to include Tilt
        const originalRenderCategories = renderCategories;
        window.renderCategories = function(games) {
            originalRenderCategories(games);
            // Apply tilt to new cards
            document.querySelectorAll('.game-card').forEach(init3DTilt);
        };

        document.addEventListener('DOMContentLoaded', async () => {
            await initializeApp(); // Ensure games are fetched
            startGenesisEngine(); // Start visual logic
            
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (visitorStr) {
                refreshUserStats();
            }

            fetch('/api/settings/announcement')
                .then(r => r.json())
                .then(d => {
                    const el = document.getElementById('announcementText');
                    if (d.value && el) {
                        el.innerHTML = d.value + " &nbsp; • &nbsp; " + d.value;
                    }
                }).catch(e => console.log("Announcement skipped"));

            // Apply tilt to new cards
            document.querySelectorAll('.game-card').forEach(init3DTilt);
        });

    