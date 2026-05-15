
        // === REFERRAL SYSTEM: Capture ref from URL ===
        (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get('ref');
            if (ref) {
                localStorage.setItem('chidy_ref', ref);
                // Clean up URL to keep it pretty
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
        })();

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
            rootMargin: '600px 0px', // Start loading 600px before visible
            threshold: 0.01
        });

        function observeImages() {
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }

        // Ordered categories from user's wireframe
        // Ordered categories from user's wireframe (Default fallback)
        let categoryOrder = [
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
                // PERFORMANCE: Fetch categories + games in PARALLEL (saves ~400ms)
                const [catRes, gamesRes] = await Promise.all([
                    fetch('/api/categories').catch(() => null),
                    fetch('/api/games')
                ]);

                // Process categories
                if (catRes && catRes.ok) {
                    try {
                        const catData = await catRes.json();
                        if (catData && catData.length > 0) {
                            categoryOrder = catData.map(c => c.name);
                        }
                    } catch(e) { /* use default order */ }
                }

                // Process games
                if (!gamesRes.ok) throw new Error('Games fetch failed');
                const games = await gamesRes.json();
                allGames = games;
                
                if (!currentCategory) {
                    renderCategories(games);
                } else {
                    filterByCategory(currentCategory);
                }
            } catch (error) {
                console.warn('Using mock data for review mode:', error);
                // --- MOCK DATA FOR REVIEW/PREVIEW MODE ---
                allGames = [
                    { id: 101, title: 'EA SPORTS FIFA 25', price: 15000, rating: 4.9, category: 'HOT POST', image_url: 'https://image.api.playstation.com/vulcan/ap/rnd/202407/0414/233e8b09339e3381e4b85c3453305141.png' },
                    { id: 102, title: 'GTA VI PRE-ORDER', price: 25000, rating: 5.0, category: 'HOT POST', image_url: 'https://images.tnt.it/images/2023/12/05/gta-6-trailer-1-1701732565611.jpg' },
                    { id: 103, title: 'SPIDER-MAN 2', price: 12000, rating: 4.7, category: 'ADVENTURE', image_url: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/1c7b753443a411538669c84918e763b6.png' },
                    { id: 104, title: 'GOD OF WAR RAGNAROK', price: 10000, rating: 4.8, category: 'ADVENTURE', image_url: 'https://image.api.playstation.com/vulcan/ap/rnd/202109/2821/S9v9v9v9v9v9v9v9v9v9v9v9.png' }
                ];
                
                if (!currentCategory) {
                    renderCategories(allGames);
                } else {
                    filterByCategory(currentCategory);
                }
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
                        <div class="view-title">
                            ${currentCategory}
                            <i class="fas fa-question-circle" style="font-size: 1rem; opacity: 0.6; cursor: pointer; margin-left: 12px; vertical-align: middle;" onclick="event.stopPropagation(); toggleHelpModal();" title="Msaada wa kundi hili"></i>
                        </div>
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
                                <i class="fas fa-question-circle" style="font-size: 0.8rem; opacity: 0.6; cursor: pointer; margin-left: 8px; vertical-align: middle;" onclick="event.stopPropagation(); toggleHelpModal();" title="Msaada wa kundi hili"></i>
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
            const priceLabel = game.price > 0 ? `TSh ${parseInt(game.price).toLocaleString()}` : 'FREE ACCESS';
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
        // ===== DETAIL MODAL (Instant Opening Optimization) =====
        async function openDetail(id) {
            const game = allGames.find(g => g.id == id);
            if (!game) return;

            const overlay = document.getElementById('detailOverlay');
            const card = document.getElementById('detailCard');
            const visitorStr = localStorage.getItem('chidy_visitor');
            const visitor = visitorStr ? JSON.parse(visitorStr) : null;

            // 1. RENDER SHELL INSTANTLY (0ms Delay)
            card.innerHTML = `
                <button class="close-detail" onclick="closeDetail()"><i class="fas fa-times"></i></button>
                <img src="${game.image_url}" alt="${game.title}" class="detail-image">
                <div class="detail-body">
                    <h2 style="font-family:'Orbitron'; color:#fff; font-size:1.4rem; margin-bottom:12px; letter-spacing:1px; text-transform:uppercase;">${game.title}</h2>
                    <div class="detail-meta" style="display:flex; gap:10px; margin-bottom:18px; flex-wrap:wrap;">
                        <span style="background:rgba(255,180,0,0.1); color:var(--gold); padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:700; border:1px solid rgba(255,180,0,0.2);"><i class="fas fa-star"></i> ${game.rating || '4.5'}</span>
                        <span style="background:rgba(0,242,255,0.1); color:var(--primary); padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:700; border:1px solid rgba(0,242,255,0.2);">${game.category || 'TANZANIA GAMES'}</span>
                        <span style="background:rgba(188,19,254,0.1); color:var(--secondary); padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:700; border:1px solid rgba(188,19,254,0.2);">TSh ${parseInt(game.price).toLocaleString()}</span>
                        <span style="background:rgba(255,255,255,0.05); color:#fff; padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:700; border:1px solid rgba(255,255,255,0.1);"><i class="fas fa-clock"></i> ${game.duration_days > 0 ? `Siku ${game.duration_days}` : 'KUDUMU'}</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:15px; border:1px solid rgba(255,255,255,0.05); margin-bottom:20px;">
                        <p style="color:#a0a0b0; font-size:0.85rem; line-height:1.6; margin:0;">${game.description || 'Gundua ulimwengu mpya wa michezo na Chidy Prime. Download sasa na ufurahie uzoefu bora wa gaming.'}</p>
                    </div>
                    <!-- ACCESS SECTION (LOADS ASYNC) -->
                    <div id="detailAccessContainer" class="access-loading-shimmer">
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <div style="height:50px; background:rgba(255,255,255,0.05); border-radius:12px;"></div>
                            <div style="height:50px; background:rgba(255,255,255,0.05); border-radius:12px;"></div>
                        </div>
                    </div>
                </div>
            `;

            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';

            // 2. CHECK ACCESS IN BACKGROUND
            updateDetailAccess(id, visitor, game);
        }

        async function updateDetailAccess(id, visitor, game) {
            const container = document.getElementById('detailAccessContainer');
            if (!container) return;

            const hasDuration = game.duration_days && game.duration_days > 0;
            const hasPricedContent = game.price && parseInt(game.price) > 0;
            const isFree = !hasPricedContent;

            let accessHtml = '';

            try {
                if (visitor && visitor.id) {
                    const res = await fetch(`/api/check-access/${visitor.id}/${game.id}`);
                    const accessData = await res.json();

                    if (accessData.has_access) {
                        const expiryDate = new Date(accessData.expires_at);
                        const isPermanent = expiryDate.getFullYear() >= 2099;
                        const formattedExpiry = isPermanent ? 'MAISHA YOTE (KUDUMU)' : expiryDate.toLocaleDateString('sw-TZ', { year: 'numeric', month: 'long', day: 'numeric' });
                        const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
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
                                    ${(hasDuration && !isPermanent) ? `<span style="color:${daysLeft <= 2 ? '#ff3333' : '#00f2ff'};">(Siku ${daysLeft} zimebaki)</span>` : ''}
                                </p>
                            </div>
                            <div class="detail-links">
                                ${game.youtube_url ? `<a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a>` : ''}
                                ${activeLinks.map(l => `<a href="${l.url}" target="_blank" class="dl-btn"><i class="fas fa-download"></i> ${l.name}</a>`).join('')}
                            </div>
                        `;
                        triggerCelebration();
                    } else if (accessData.pending_order) {
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
                        setTimeout(() => updateDetailAccess(id, visitor, game), 10000);
                    } else if (accessData.expired) {
                        accessHtml = `
                            <div style="background: linear-gradient(135deg, rgba(255,51,51,0.15), rgba(255,51,51,0.05)); border: 1px solid rgba(255,51,51,0.3); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                    <i class="fas fa-exclamation-triangle" style="color:#ff3333;font-size:1.1rem;"></i>
                                    <span style="color:#ff3333;font-weight:700;font-size:0.9rem;">MUDA WAKO UMEISHA</span>
                                </div>
                                <p style="color:#a0a0b0;font-size:0.8rem;margin:0;">Muda wako wa siku ${game.duration_days} umeisha. Tafadhali fanya malipo/download upya kupata access mpya.</p>
                            </div>
                            ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                            <button class="dl-btn" onclick="initiatePayment('${game.id}')" style="width:100%;padding:14px;font-size:1rem;font-weight:900;background:linear-gradient(135deg,#ff3333,#990000);color:#fff;border:none;border-radius:12px;cursor:pointer;margin-top:10px;letter-spacing:1.5px;box-shadow:0 0 15px rgba(255,51,51,0.5);animation:pulse-glow-red 2s infinite;">
                                <i class="fas fa-bolt"></i> LIPA SASA (Kama Muda Umeisha)
                            </button>
                        `;
                    } else {
                        // NO ACCESS
                        if (hasPricedContent) {
                            accessHtml = `
                                <div style="background: linear-gradient(135deg, rgba(255,180,0,0.1), rgba(255,180,0,0.05)); border: 1px solid rgba(255,180,0,0.2); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                                    <p style="color:#a0a0b0;font-size:0.85rem;margin:0;"><i class="fas fa-shopping-cart" style="color:var(--gold);"></i> Game hii ni ya kulipia. Lipia sasa kupata access ya siku <strong style="color:#fff;">${game.duration_days || 'Milele'}</strong>.</p>
                                </div>
                                ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                                <button class="dl-btn" onclick="initiatePayment('${game.id}')" style="width:100%;padding:14px;font-size:1rem;font-weight:900;background:linear-gradient(135deg,var(--gold),#ff8c00);color:#000;border:none;border-radius:12px;cursor:pointer;margin-top:10px;letter-spacing:1.5px;box-shadow:0 0 15px rgba(255,180,0,0.5);animation:pulse-glow-gold 2s infinite;">
                                    <i class="fas fa-bolt"></i> LIPA SASA (TSh ${parseInt(game.price).toLocaleString()})
                                </button>
                            `;
                        } else {
                            // Free game - check for links
                            const freeLinks = (game.links && Array.isArray(game.links) && game.links.length > 0) ? game.links : (accessData.links || []);
                            if (freeLinks.length > 0) {
                                accessHtml = `
                                    ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                                    <div class="detail-links">
                                        ${freeLinks.map(l => `<a href="${l.url}" target="_blank" class="dl-btn"><i class="fas fa-download"></i> ${l.name || 'Download'}</a>`).join('')}
                                    </div>
                                `;
                            } else {
                                accessHtml = `
                                    <div style="background: rgba(0,242,255,0.07); border: 1px solid rgba(0,242,255,0.15); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                                        <p style="color:#a0a0b0;font-size:0.85rem;margin:0;"><i class="fas fa-info-circle" style="color:#00f2ff;"></i> Game hii bado haina link za download. Angalia baadaye.</p>
                                    </div>
                                    ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                                `;
                            }
                        }
                    }
                } else {
                    // NOT LOGGED IN
                    accessHtml = `
                        <div style="background: rgba(255,180,0,0.1); border: 1px solid rgba(255,180,0,0.2); border-radius: 12px; padding: 14px; margin-bottom: 15px;">
                            <p style="color:#a0a0b0;font-size:0.85rem;margin:0;"><i class="fas fa-user-plus" style="color:var(--gold);"></i> Tafadhali jisajili kwanza ili kupata access ya kudownload.</p>
                        </div>
                        ${game.youtube_url ? `<div class="detail-links"><a href="${game.youtube_url}" target="_blank" class="dl-btn youtube"><i class="fab fa-youtube"></i> Watch Trailer</a></div>` : ''}
                        <button class="dl-btn" onclick="openLogin()" style="width:100%;margin-top:10px;">JISAJILI SASA</button>
                    `;
                }
            } catch (e) {
                console.error('Access check failed:', e);
                accessHtml = `<div style="text-align:center; padding: 20px; color: #ff4444;"><i class="fas fa-wifi"></i> Network error. Please try again.</div>`;
            }

            container.innerHTML = accessHtml;
            container.classList.remove('access-loading-shimmer');

            // Genesis Engine: Init magnetic effects for new buttons
            document.querySelectorAll('.dl-btn').forEach(btn => {
                btn.classList.add('magnetic-btn');
                initMagnetic(btn);
            });
        }

        // Initiate payment flow (Only ZenoPay AutoPayment)
        async function initiatePayment(postId) {
            const game = allGames.find(g => g.id == postId);
            if (!game) return;

            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) {
                alert('Tafadhali jisajili kwanza!');
                document.getElementById('signupOverlay').classList.remove('hidden');
                return;
            }
            const visitor = JSON.parse(visitorStr);

            try {
                // Reset steps to first step
                switchPaymentStep('input');

                // Reset button to fresh state for this new game
                const btn = document.getElementById('autoPayBtn');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-bolt"></i> <span>Nunua Sasa</span>';

                // Populate Game Name and Price in Popup
                document.getElementById('payAmount').textContent = 'TSh ' + parseInt(game.price).toLocaleString();
                document.getElementById('payPostId').value = postId;
                
                // Populate game title in Content field
                const payContentEl = document.getElementById('payContentName');
                if (payContentEl) payContentEl.textContent = game.title;

                // Clear phone field — user must type their number
                document.getElementById('autoPayPhone').value = '';
                
                // Clear promo field
                document.getElementById('promoCodeInput').value = '';
                document.getElementById('promoMessage').textContent = '';
                window.currentDiscount = 0;
                window.appliedPromoCode = null;

                // Show the Payment Overlay
                const pOverlay = document.getElementById('paymentOverlay');
                pOverlay.style.display = 'flex';
                pOverlay.style.visibility = 'visible';
                pOverlay.removeAttribute('hidden');
                pOverlay.classList.add('show');
            } catch (e) {
                alert('Kuna tatizo la mtandao. Tafadhali jaribu tena.');
            }
        }

        async function applyPromoCode() {
            const code = document.getElementById('promoCodeInput').value.trim();
            const postId = document.getElementById('payPostId').value;
            const game = allGames.find(g => g.id == postId);
            const msgEl = document.getElementById('promoMessage');
            const amountEl = document.getElementById('payAmount');
            
            if (!code) return;
            
            msgEl.textContent = 'Inahakiki...';
            msgEl.style.color = '#888';
            
            try {
                const res = await fetch('/api/promo/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const data = await res.json();
                
                if (data.valid) {
                    window.appliedPromoCode = code.toUpperCase();
                    let discountAmount = 0;
                    if (data.type === 'fixed') {
                        discountAmount = data.discount;
                    } else {
                        discountAmount = Math.floor(game.price * (data.discount / 100));
                    }
                    
                    window.currentDiscount = discountAmount;
                    const finalPrice = Math.max(0, game.price - discountAmount);
                    
                    msgEl.textContent = data.message;
                    msgEl.style.color = '#16a34a';
                    amountEl.innerHTML = `<s>TSh ${parseInt(game.price).toLocaleString()}</s> <span style="color:#16a34a; margin-left:8px;">TSh ${finalPrice.toLocaleString()}</span>`;
                    
                    // Small celebration effect
                    confetti({
                        particleCount: 20,
                        spread: 40,
                        origin: { y: 0.7 }
                    });
                } else {
                    msgEl.textContent = data.message || 'Promo code si sahihi.';
                    msgEl.style.color = '#ff3366';
                    window.currentDiscount = 0;
                    window.appliedPromoCode = null;
                    amountEl.textContent = 'TSh ' + parseInt(game.price).toLocaleString();
                }
            } catch (e) {
                msgEl.textContent = 'Tatizo la mtandao.';
                msgEl.style.color = '#ff3366';
            }
        }

        async function payWithZenoPay() {
            const postId = document.getElementById('payPostId').value;
            const phone = document.getElementById('autoPayPhone').value.trim();
            const btn = document.getElementById('autoPayBtn');
            const game = allGames.find(g => g.id == postId);
            
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return;
            const visitor = JSON.parse(visitorStr);

            if (!phone || phone.length < 10) {
                alert('Tafadhali ingiza namba sahihi ya simu!');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INATUMA MAOMBI...';
            btn.style.background = '#16a34a';

            const finalAmount = Math.max(0, game.price - (window.currentDiscount || 0));

            try {
                const response = await fetch('/api/payments/zenopay-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: finalAmount,
                        phone: phone,
                        gameTitle: game.title,
                        visitorId: visitor.id,
                        postId: postId,
                        email: `${visitor.phone}@chidyprime.com`, // Fallback email
                        name: visitor.name,
                        promo_used: window.appliedPromoCode || null
                    })
                });

                const result = await response.json();
                console.log('ZenoPay Checkout Result:', result);

                if (result.status === 'success') {
                    // Switch to Verifying state immediately
                    switchPaymentStep('verifying');
                    
                    // Show manual verify button after 10 seconds as a backup
                    if (window.manualVerifyTimeout) clearTimeout(window.manualVerifyTimeout);
                    window.manualVerifyTimeout = setTimeout(() => {
                        const mvBtn = document.getElementById('manual-verify-btn');
                        if (mvBtn) mvBtn.style.display = 'block';
                    }, 10000);
                    
                    // Auto-poll to check if access is granted (Polling Mechanism)
                    let pollCount = 0;
                    // Clear any previous poll first
                    if (window.activePollInterval) clearInterval(window.activePollInterval);
                    window.activePollInterval = setInterval(async () => {
                        pollCount++;
                        if (pollCount > 30) { // Timeout after ~3 minutes (every 6s)
                            clearInterval(window.activePollInterval);
                            window.activePollInterval = null;
                            
                            // If timeout, go back to input or show error
                            alert("Muda wa kuhakiki malipo umeisha. Kama umeshalipia, bonyeza 'Nimeshalipia' au wasiliana nasi.");
                            switchPaymentStep('input');
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fas fa-bolt"></i> <span>Nunua Sasa</span>';
                            return;
                        }
                        try {
                            const res = await fetch(`/api/check-access/${visitor.id}/${postId}`);
                            const access = await res.json();
                            
                            // Update UI text based on poll count to show it's working
                            const statusText = document.querySelector('#payment-verifying-step p');
                            if (statusText) {
                                if (pollCount % 3 === 0) statusText.innerText = "Tunatekeleza malipo yako...";
                                else if (pollCount % 3 === 1) statusText.innerText = "Tunahakiki na ZenoPay...";
                                else statusText.innerText = "Karibu tunamaliza...";
                            }

                            if (access.has_access) {
                                clearInterval(window.activePollInterval);
                                window.activePollInterval = null;
                                
                                // Show Success State!
                                switchPaymentStep('success');
                                
                                // Setup Continue Button
                                document.getElementById('paymentContinueBtn').onclick = () => {
                                    closePayment();
                                    openDetail(postId); // Open that specific game immediately
                                };

                                // Celebration
                                confetti({
                                    particleCount: 150,
                                    spread: 70,
                                    origin: { y: 0.6 },
                                    colors: ['#00f2ff', '#bc13fe', '#00d25b']
                                });
                            }
                        } catch(e){}
                    }, 3000);
                } else {
                    alert('Hitilafu: ' + (result.message || 'Jaribu tena au tumia Manual Payment.'));
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-bolt"></i> Nunua Sasa';
                }
            } catch (err) {
                console.error(err);
                alert('Kuna tatizo la mtandao. Jaribu tena.');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-bolt"></i> TUMA MAOMBI YA KULIPA';
            }
        }

        function closePayment() {
            // Stop any active payment polling
            if (window.activePollInterval) {
                clearInterval(window.activePollInterval);
                window.activePollInterval = null;
            }
            if (window.manualVerifyTimeout) {
                clearTimeout(window.manualVerifyTimeout);
                window.manualVerifyTimeout = null;
            }
            // Reset confirm button to fresh state
            const btn = document.getElementById('autoPayBtn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-bolt"></i> <span>Nunua Sasa</span>';
                btn.onclick = payWithZenoPay;
            }
            switchPaymentStep('input');
            const pOverlay = document.getElementById('paymentOverlay');
            if (pOverlay) {
                pOverlay.classList.remove('show');
                pOverlay.style.display = 'none';
                pOverlay.style.visibility = 'hidden';
                pOverlay.setAttribute('hidden', 'true');
            }
            
            // Hide the manual verify button for next time
            const mvBtn = document.getElementById('manual-verify-btn');
            if (mvBtn) mvBtn.style.display = 'none';
        }

        async function manualVerifyPayment() {
            const btn = document.getElementById('manual-verify-btn');
            const postId = document.getElementById('payPostId').value;
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return;
            const visitor = JSON.parse(visitorStr);

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INAHAKIKI...';

            try {
                const res = await fetch(`/api/payments/verify-zeno/${visitor.id}/${postId}`);
                const data = await res.json();
                
                if (data.success) {
                    switchPaymentStep('success');
                    document.getElementById('paymentContinueBtn').onclick = () => {
                        closePayment();
                        openDetail(postId);
                    };
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#00f2ff', '#bc13fe', '#00d25b']
                    });
                } else {
                    alert(data.message || 'Malipo bado hayajaonekana. Tafadhali subiri kidogo au piga PIN kama bado.');
                    btn.disabled = false;
                    btn.innerText = 'BADO SIJAPATA ACCESS? HAKIKI HAPA';
                }
            } catch (err) {
                alert('Tatizo la mtandao. Jaribu tena.');
                btn.disabled = false;
                btn.innerText = 'BADO SIJAPATA ACCESS? HAKIKI HAPA';
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

        function switchPaymentStep(step) {
            document.querySelectorAll('.payment-step').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(`payment-step-${step}`);
            if (target) target.classList.add('active');
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
            
            // Show Home elements
            document.querySelector('.hero-section').style.display = 'block';
            const affiliatePromo = document.querySelector('.affiliate-promo-card');
            if(affiliatePromo) affiliatePromo.style.display = 'flex';
            document.getElementById('categoriesContainer').style.display = 'block';
            
            // Hide Video store
            document.getElementById('videoSection').style.display = 'none';

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
            const fullName = name || 'User';
            const shortName = name ? name.split(' ')[0] : 'User';

            // Sidebar targets
            const sAvatar = document.getElementById('sidebarAvatar');
            const sName = document.getElementById('sidebarName');
            if (sAvatar) sAvatar.textContent = initial;
            if (sName) sName.textContent = fullName;
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
                    if (visitor.id) {
                        const response = await fetch(`/api/check-user/${visitor.id}`);
                        const result = await response.json();
                        
                        if (result.exists) {
                            // ✅ User exists in DB - hide overlay and proceed
                            document.getElementById('signupOverlay').style.display = 'none';
                            document.body.style.overflow = '';
                            setUserDisplay(visitor.name);
                            refreshUserStats();
                            return true;
                        } else {
                            // ❌ User explicitly not found in DB - clear and re-signup
                            localStorage.removeItem('chidy_visitor');
                            openLogin();
                            return false;
                        }
                    }
                } catch (e) {
                    // ⚠️ Network/server error - DON'T clear localStorage
                    // Assume user is still valid to prevent false logout
                    console.warn('User check failed (network issue), assuming logged in');
                    const visitor = JSON.parse(visitorStr);
                    document.getElementById('signupOverlay').style.display = 'none';
                    document.body.style.overflow = '';
                    setUserDisplay(visitor.name);
                    refreshUserStats();
                    return true;
                }
            }
            
            // No visitor in localStorage - show signup
            openLogin();
            return false;
        }

        function openLogin() {
            const overlay = document.getElementById('signupOverlay');
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
            document.body.style.overflow = 'hidden';
        }

        function closeLogin() {
            // Only allow closing if user is actually registered
            if (localStorage.getItem('chidy_visitor')) {
                const overlay = document.getElementById('signupOverlay');
                overlay.style.display = 'none';
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
        window.handleSignupClick = async () => {
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
            
            const referredBy = localStorage.getItem('chidy_ref');
            
            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, referred_by: referredBy })
                });
                const result = await response.json();
                
                if (result.success) {
                    // Save to localStorage
                    localStorage.setItem('chidy_visitor', JSON.stringify({ name, phone, id: result.visitor.id }));
                    setUserDisplay(name);
                    refreshUserStats();
                    
                    // Hide signup overlay with smooth fade
                    const signupOverlay = document.getElementById('signupOverlay');
                    signupOverlay.style.transition = 'opacity 0.5s ease-out';
                    signupOverlay.style.opacity = '0';
                    signupOverlay.style.pointerEvents = 'none';
                    
                    setTimeout(() => {
                        signupOverlay.style.display = 'none';
                        document.body.style.overflow = '';
                        
                        // Load games if not already loaded
                        if (!allGames || allGames.length === 0) {
                            fetchGames();
                            loadVideos();
                        }
                        
                        // Show welcome animation
                        showWelcome(name);
                    }, 500);
                } else {
                    throw new Error(result.error || 'Tatizo la seva');
                }
            } catch (err) {
                errorEl.textContent = 'Kuna tatizo. Jaribu tena: ' + err.message;
                btn.disabled = false;
                btn.textContent = 'JOIN NOW';
            }
        };

        // === AFFILIATE SYSTEM FUNCTIONS ===
        async function openAffiliateModal() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return openLogin();
            
            const visitor = JSON.parse(visitorStr);
            const overlay = document.getElementById('affiliateModalOverlay');
            if(overlay) overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Set referral link
            const linkInput = document.getElementById('referralLinkInput');
            if(linkInput) linkInput.value = `https://chidyprime.com/?ref=${visitor.id}`;
            
            // Fetch stats from backend
            try {
                const res = await fetch(`/api/affiliate/stats/${visitor.id}`);
                const stats = await res.json();
                const countEl = document.getElementById('affiliateCount');
                const balEl = document.getElementById('affiliateBalance');
                if(countEl) countEl.innerText = stats.referralCount || 0;
                if(balEl) balEl.innerText = (stats.totalEarnings || 0).toLocaleString();
            } catch (e) {
                console.error("Failed to fetch affiliate stats");
            }
        }

        function closeAffiliateModal() {
            const overlay = document.getElementById('affiliateModalOverlay');
            if(overlay) overlay.classList.remove('show');
            document.body.style.overflow = '';
        }

        function copyReferralLink() {
            const input = document.getElementById('referralLinkInput');
            if(!input) return;
            input.select();
            input.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(input.value);
            
            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = 'COPIED!';
            btn.style.background = '#fff';
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = '#00ff00';
            }, 2000);
        }

        async function requestWithdrawal() {
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) return;
            const visitor = JSON.parse(visitorStr);
            const balEl = document.getElementById('affiliateBalance');
            if(!balEl) return;
            const balance = parseInt(balEl.innerText.replace(/,/g, ''));
            
            if (balance < 5000) {
                alert("Samahani, lazima ufikishe angalau TSh 5,000 ili uweze kutoa pesa.");
                return;
            }
            
            if (confirm(`Je, unataka kutoa TSh ${balance.toLocaleString()}? Ombi lako litatumwa kwa Admin.`)) {
                try {
                    const res = await fetch('/api/affiliate/withdraw', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ visitor_id: visitor.id, amount: balance })
                    });
                    const result = await res.json();
                    if (result.success) {
                        alert("Hongera! Ombi lako la kutoa pesa limetumwa. Admin atafanya malipo kwenye namba yako ya simu hivi punde.");
                        closeAffiliateModal();
                    }
                } catch (e) {
                    alert("Kuna tatizo la mtandao. Jaribu tena.");
                }
            }
        }

        // ===== OPEN VIDEO STORE =====
        function openVideoStore() {
            // Hide Home elements
            document.querySelector('.hero-section').style.display = 'none';
            const affiliatePromo = document.querySelector('.affiliate-promo-card');
            if(affiliatePromo) affiliatePromo.style.display = 'none';
            document.getElementById('winnersTickerWrap').style.display = 'none';
            document.getElementById('categoriesContainer').style.display = 'none';

            // Show Video Store
            const section = document.getElementById('videoSection');
            if (section) {
                section.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
            setActiveBottom(2);
        }


        // ===== PWA INSTALLATION SYSTEM =====
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(reg => {
                    console.log('Service Worker registered!');
                }).catch(err => {
                    console.log('Service Worker failed:', err);
                });
            });
        }

        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            const installArea = document.getElementById('installArea');
            if (installArea) installArea.style.display = 'block';
            console.log('PWA Install prompt ready');
        });

        async function installPWA() {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            const installArea = document.getElementById('installArea');
            if (installArea) installArea.style.display = 'none';
        }


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
                // PERFORMANCE: Check maintenance status quickly
                const res = await fetch('/api/settings/maintenance');
                const data = await res.json();
                if (data && data.value === 'true') {
                    window.isMaintenanceMode = true;
                }
            } catch (e) {
                console.warn('Maintenance check skipped');
            }
            
            const isRegistered = await checkSignupStatus();
            
            if (window.isMaintenanceMode) {
                // If maintenance is on, we only show it if the user isn't an admin or established
                // (For now, we show it to everyone to be safe, but ensure the startup clears)
                document.getElementById('maintenanceOverlay').classList.add('show');
                // Force hide the startup overlay if maintenance is active
                const startup = document.getElementById('genesis-startup');
                if (startup) {
                    startup.style.opacity = '0';
                    setTimeout(() => startup.style.display = 'none', 500);
                }
                return; 
            }
            
            fetchGames();
            loadVideos(); 
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
            const visitor = visitorStr ? JSON.parse(visitorStr) : { id: null, name: 'GUEST PLAYER', phone: '07xx-xxx-xxx' };
            
            // Update Sidebar Display
            const sidebarName = document.getElementById('sidebarUserName');
            const sidebarPhone = document.getElementById('sidebarUserPhone');
            const sidebarAvatar = document.getElementById('sidebarUserAvatar');
            
            if (sidebarName) sidebarName.textContent = visitor.name || 'GUEST PLAYER';
            if (sidebarPhone) sidebarPhone.textContent = visitor.phone || '07xx-xxx-xxx';
            if (sidebarAvatar) sidebarAvatar.textContent = (visitor.name || 'G').charAt(0).toUpperCase();

            if (!visitor.id) return; // Stop here for guests
            
            try {
                const res = await fetch(`/api/user/stats/${visitor.id}`);
                const stats = await res.json();
                
                // Update Sidebar
                const sLevel = document.getElementById('sidebarLevelBadge');
                const sGames = document.getElementById('sidebarStatGames');
                const sPoints = document.getElementById('sidebarStatPoints');
                
                if (sLevel && stats.level) sLevel.textContent = stats.level.toUpperCase();
                if (sGames && stats.purchasesCount !== undefined) sGames.textContent = stats.purchasesCount;
                if (sPoints && stats.level) sPoints.textContent = stats.level.split(' ')[0]; // Quick level shorthand
            } catch (e) { console.error("Stats fetch failed"); }
        }

        function toggleProfileMenu() {
            const menu = document.getElementById('sidebarProfileMenu');
            const btn = document.querySelector('.s-user-expand i');
            if (menu) {
                menu.classList.toggle('open');
                if (btn) btn.style.transform = menu.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
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
            const body = document.getElementById('notifDropdownBody');
            const badge = document.getElementById('notifBadge');
            const bell = document.getElementById('notifBell');
            
            const unread = notifications.filter(n => !n.is_read).length;
            if (unread > 0) {
                badge.innerText = unread;
                badge.style.display = 'flex';
                bell.classList.add('has-unread');
            } else {
                badge.style.display = 'none';
                bell.classList.remove('has-unread');
            }

            if (notifications.length === 0) {
                body.innerHTML = '<p style="text-align:center;color:#6c7293;padding:20px;font-size:0.85rem;">Hakuna taarifa mpya kwa sasa.</p>';
                return;
            }

            body.innerHTML = notifications.map(n => {
                const time = new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                return `
                    <div class="notif-item ${n.is_read ? '' : 'unread'}" style="position:relative;">
                        <div onclick="handleNotifClick('${n.id}')">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; padding-right:20px;">
                                <h5 style="margin:0; font-weight:700;">${n.title}</h5>
                                ${!n.is_read ? '<span style="background:var(--primary); color:#000; font-size:0.5rem; font-weight:900; padding:2px 6px; border-radius:4px; font-family:\'Orbitron\'">NEW</span>' : ''}
                            </div>
                            <p style="margin:5px 0; color:${n.is_read ? '#a0a0b0' : '#fff'}; font-size:0.8rem; line-height:1.4;">${n.message}</p>
                            <span class="time" style="font-size:0.65rem; color:#6c7293;">${time}</span>
                        </div>
                        <button onclick="deleteNotification('${n.id}', event)" style="position:absolute; top:12px; right:10px; background:none; border:none; color:#6c7293; cursor:pointer; font-size:0.8rem; padding:5px; transition:0.3s;" onmouseover="this.style.color='#ff4444'" onmouseout="this.style.color='#6c7293'"><i class="fas fa-times"></i></button>
                    </div>
                `;
            }).join('');
        }

        function toggleNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Handle clicking on a notification: mark as read and optionally navigate
function handleNotifClick(id) {
    // Mark notification as read via API
    fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(() => {
        notifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
        renderNotifications();
    })
    .catch(err => console.error('Error marking notification read:', err));
    
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

async function deleteNotification(id, event) {
    if (event) event.stopPropagation();
    try {
        await fetch(`/api/notifications/${id}/delete`, { method: 'POST' });
        notifications = notifications.filter(n => n.id !== id);
        renderNotifications();
    } catch (e) { console.error("Failed to delete notification", e); }
}

async function clearAllNotifications() {
    const visitorStr = localStorage.getItem('chidy_visitor');
    if (!visitorStr) return;
    const visitor = JSON.parse(visitorStr);
    
    if (!confirm("Je, unataka kufuta taarifa zako zote?")) return;
    
    try {
        await fetch(`/api/notifications/visitor/${visitor.id}/clear`, { method: 'POST' });
        // After clearing personal ones, re-fetch to see remaining global ones (if any)
        fetchNotifications();
    } catch (e) { console.error("Failed to clear notifications", e); }
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

        // Profile menu handled by toggleProfileMenu() inside sidebar

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
                <div class="sidebar-item" onclick="toggleSidebar(); toggleHelpModal();" style="border-left-color: var(--primary); background: rgba(0,242,255,0.05);">
                    <i class="fas fa-question-circle" style="color: var(--primary);"></i> Msaada (Help Center)
                </div>
                <a href="https://chidygaming.online" target="_blank" rel="noopener" class="sidebar-item" style="
                    display:flex; align-items:center; gap:12px;
                    text-decoration:none; color:inherit;
                    background: linear-gradient(135deg, rgba(0,210,91,0.15), rgba(0,210,91,0.05));
                    border: 1px solid rgba(0,210,91,0.3);
                    animation: pulse-glow-free 2s infinite alternate;
                " onclick="toggleSidebar();">
                    <i class="fas fa-gift" style="color:#00d25b;"></i>
                    <span style="color:#00d25b; font-weight:700;">GAMES ZA BURE</span>
                    <i class="fas fa-external-link-alt" style="font-size:0.65rem; color:#00d25b; margin-left:auto;"></i>
                </a>
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
        
        // 1. Startup Sequence (Genesis Engine)
        function startGenesisEngine() {
            const statusText = document.getElementById('startup-text');
            const overlay = document.getElementById('genesis-startup');
            if (!overlay) return;

            const scripts = [
                'Initializing Neural Interface...',
                'Loading 3D Visual Engine...',
                'Connecting to Secure Gateway...',
                'CHIDY PRIME SYSTEM ONLINE'
            ];
            
            // ULTIMATE FAIL-SAFE: Always hide after 5 seconds no matter what
            const forceHide = () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                    overlay.style.visibility = 'hidden';
                }, 1000);
            };

            const failSafe = setTimeout(forceHide, 5000);

            let i = 0;
            const interval = setInterval(() => {
                if (statusText) statusText.innerText = scripts[i];
                i++;
                if (i >= scripts.length) {
                    clearInterval(interval);
                    clearTimeout(failSafe);
                    setTimeout(forceHide, 500);
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

        // ===== HELP SYSTEM LOGIC =====
        function toggleHelpModal() {
            const modal = document.getElementById('helpModal');
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                setTimeout(() => modal.style.display = 'none', 300);
                document.body.style.overflow = '';
            } else {
                modal.style.display = 'flex';
                void modal.offsetWidth;
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeHelpModalOuter(e) {
            if (e.target.id === 'helpModal') toggleHelpModal();
        }

        function toggleHelpAccordion(header) {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');
            
            // Close all items first
            document.querySelectorAll('.help-item').forEach(i => i.classList.remove('active'));
            
            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            startGenesisEngine(); // Start visual logic IMMEDIATELY
            
            try {
                await initializeApp(); // Load data in background
            } catch (e) {
                console.error("App initialization failed but continuing...", e);
            }
            
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

            // CRITICAL: Force-hide payment overlay on page load (prevents ghost card at bottom)
            const payOverlay = document.getElementById('paymentOverlay');
            if (payOverlay) {
                payOverlay.style.display = 'none';
                payOverlay.classList.remove('show');
            }

            // --- PWA SERVICE WORKER REGISTRATION & PUSH NOTIFICATIONS ---
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', async () => {
                    try {
                        const reg = await navigator.serviceWorker.register('/sw.js');
                        console.log('SW Registered!', reg);
                        
                        // Subscription logic
                        async function subscribeUser() {
                            try {
                                const res = await fetch('/api/push/public-key');
                                const { publicKey } = await res.json();
                                if (publicKey) {
                                    const padding = '='.repeat((4 - publicKey.length % 4) % 4);
                                    const base64 = (publicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
                                    const rawData = window.atob(base64);
                                    const outputArray = new Uint8Array(rawData.length);
                                    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
                                    
                                    const subscription = await reg.pushManager.subscribe({
                                        userVisibleOnly: true,
                                        applicationServerKey: outputArray
                                    });
                                    
                                    await fetch('/api/push/subscribe', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(subscription)
                                    });
                                    console.log('Push subscription successful!');
                                }
                            } catch (e) { console.error('Subscription failed:', e); }
                        }

                        if ('Notification' in window && 'PushManager' in window) {
                            if (Notification.permission === 'granted') {
                                // Already granted, silently subscribe/update
                                subscribeUser();
                            } else if (Notification.permission !== 'denied') {
                                // Show our custom prompt after a small delay
                                setTimeout(() => {
                                    const prompt = document.getElementById('pushPrompt');
                                    if (prompt) prompt.style.display = 'block';
                                }, 3000);

                                document.getElementById('pushAllowBtn').addEventListener('click', async () => {
                                    document.getElementById('pushPrompt').style.display = 'none';
                                    const permission = await Notification.requestPermission();
                                    if (permission === 'granted') {
                                        subscribeUser();
                                    }
                                });
                                
                                document.getElementById('pushDenyBtn').addEventListener('click', () => {
                                    document.getElementById('pushPrompt').style.display = 'none';
                                });
                            }
                        }
                    } catch (err) {
                        console.log('SW or Push failed: ', err);
                    }
                });
            }

            // --- PWA INSTALLATION TRACKING ---
            window.addEventListener('appinstalled', (event) => {
                console.log('👍', 'appinstalled', event);
                // Clear the deferredPrompt so it can be garbage collected
                window.deferredPrompt = null;
                
                // Track installation on server
                fetch('/api/track-install', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(res => res.json())
                .then(data => console.log('Install tracked:', data))
                .catch(err => console.error('Failed to track install:', err));
            });
        });

    
        // === CONTENT PROTECTION: Secure against copying and inspection ===
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        document.addEventListener('keydown', e => {
            // Disable Ctrl+C (Copy), Ctrl+S (Save), Ctrl+U (View Source)
            if (e.ctrlKey && (['c', 's', 'u', 'a'].includes(e.key.toLowerCase()))) {
                e.preventDefault();
                return false;
            }
            // Disable F12 and Ctrl+Shift+I (DevTools)
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
                return false;
            }
        });

        // Disable Image Dragging via JS
        document.addEventListener('dragstart', e => {
            if (e.target.nodeName === 'IMG') e.preventDefault();
        });

        // ============================================
        // VIDEO SECTION LOGIC
        // ============================================
        async function loadVideos() {
            try {
                // Fetch videos
                const res = await fetch('/api/videos');
                const videos = await res.json();
                
                const section = document.getElementById('videoSection');
                const grid = document.getElementById('videoGrid');
                const emptyMsg = document.getElementById('videoSectionEmpty');
                const countBadge = document.getElementById('videoCount');

                // Removed auto-show to keep it hidden until 'Video' tab is clicked

                if (!videos || videos.length === 0) {
                    grid.style.display = 'none';
                    emptyMsg.style.display = 'block';
                    countBadge.textContent = '0';
                } else {
                    grid.style.display = 'grid';
                    emptyMsg.style.display = 'none';
                    countBadge.textContent = videos.length;
                    grid.innerHTML = videos.map(v => {
                        const isPaid = v.price && v.price > 0;
                        const durLabel = isPaid ? (v.duration_days > 0 ? `${v.duration_days} Siku` : 'Kudumu') : '';
                        return `
                        <div class="video-card" onclick="openVideoAccess('${v.id}', '${v.video_id}', '${v.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${v.price || 0}, ${v.duration_days || 0})">
                            <div class="video-thumb-wrap">
                                <img class="video-thumb" loading="lazy" src="https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg" alt="${v.title}">
                                <div class="video-play-btn"><div class="play-icon"><i class="fas ${isPaid ? 'fa-lock' : 'fa-play'}"></i></div></div>
                                ${isPaid ? `<div class="video-price-badge">TSh ${parseInt(v.price).toLocaleString()}</div>` : '<div class="video-price-badge" style="background:rgba(0,200,83,0.85);">BURE</div>'}
                            </div>
                            <div class="video-card-info">
                                <div class="video-card-title">${v.title}</div>
                                ${isPaid ? `<div style="font-size:0.7rem; color:#ff9800; margin-top:4px;"><i class="fas fa-calendar-alt"></i> ${durLabel}</div>` : ''}
                            </div>
                        </div>`;
                    }).join('');
                }

                // Fetch and render Subscribe widget if Channel ID exists
                const setRes = await fetch('/api/settings/youtube_channel_id');
                const setData = await setRes.json();
                if (setData && setData.value) {
                    const subWidget = document.getElementById('ytSubscribeWidget');
                    const btn = document.getElementById('ytSubscribeBtn');
                    btn.setAttribute('data-channelid', setData.value);
                    subWidget.style.display = 'flex';
                    // Re-render Google script if platform.js has loaded
                    if (window.gapi && window.gapi.ytsubscribe) {
                        window.gapi.ytsubscribe.go();
                    }
                }
            } catch (error) {
                console.error("Error loading videos:", error);
                document.getElementById('videoGrid').innerHTML = '<div style="color:var(--text-dim);grid-column:1/-1;text-align:center;padding:2rem;">Failed to load videos</div>';
            }
        }

        // ===== VIDEO ACCESS GATE =====
        let _vidPayData = {}; // holds current video payment context
        let _vidPayPollInterval = null;

        async function openVideoAccess(videoId, ytId, title, price, durationDays) {
            if (!price || price <= 0) {
                // Free video - open directly
                openVideoModal(ytId, title);
                return;
            }

            // Paid video - check if user already has access
            const visitorStr = localStorage.getItem('chidy_visitor');
            if (visitorStr) {
                const visitor = JSON.parse(visitorStr);
                try {
                    const res = await fetch(`/api/check-video-access/${visitor.id}/${videoId}`);
                    const data = await res.json();
                    if (data.has_access) {
                        openVideoModal(ytId, title);
                        return;
                    }
                } catch(e) { /* proceed to payment */ }
            }

            // Show payment modal
            _vidPayData = { videoId, ytId, title, price, durationDays };
            document.getElementById('vidPayTitle').textContent = title;
            document.getElementById('vidPayPrice').textContent = `TSh ${parseInt(price).toLocaleString()}`;
            document.getElementById('vidPayDurLabel').textContent = durationDays > 0 ? `Ufikiaji wa Siku ${durationDays}` : 'Ufikiaji wa Kudumu';
            document.getElementById('vidPayForm').style.display = 'block';
            document.getElementById('vidPaySteps').style.display = 'none';
            document.getElementById('vidPayErr').style.display = 'none';
            document.getElementById('vidPayPhone').value = '';
            const btn = document.getElementById('vidPayBtn');
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-mobile-alt"></i> LIPA SASA';
            document.getElementById('vidPayOverlay').classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeVidPayModal() {
            document.getElementById('vidPayOverlay').classList.remove('show');
            document.body.style.overflow = '';
            if (_vidPayPollInterval) { clearInterval(_vidPayPollInterval); _vidPayPollInterval = null; }
        }

        async function initiateVideoPayment() {
            const phone = document.getElementById('vidPayPhone').value.trim();
            const errEl = document.getElementById('vidPayErr');
            if (!phone || phone.length < 10) {
                errEl.textContent = 'Tafadhali weka namba sahihi ya simu (10 digits)';
                errEl.style.display = 'block'; return;
            }
            errEl.style.display = 'none';

            const visitorStr = localStorage.getItem('chidy_visitor');
            if (!visitorStr) { alert('Tafadhali ingia kwanza!'); return; }
            const visitor = JSON.parse(visitorStr);

            const btn = document.getElementById('vidPayBtn');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inatuma...';

            try {
                const res = await fetch('/api/payments/zenopay-video-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: _vidPayData.price,
                        phone: phone,
                        videoTitle: _vidPayData.title,
                        visitorId: visitor.id,
                        videoId: _vidPayData.videoId,
                        email: visitor.email || 'customer@chidyprime.com',
                        name: visitor.name || 'Chidy Customer'
                    })
                });
                const data = await res.json();

                if (data.status === 'success' || data.message === 'success') {
                    document.getElementById('vidPayForm').style.display = 'none';
                    document.getElementById('vidPaySteps').style.display = 'flex';
                    // Start polling
                    let pollCount = 0;
                    _vidPayPollInterval = setInterval(async () => {
                        pollCount++;
                        if (pollCount > 30) { // 2.5 min max
                            clearInterval(_vidPayPollInterval);
                            document.getElementById('vpStep2').className = 'vid-pay-step';
                            document.getElementById('vpStep2').innerHTML = '<i class="fas fa-times-circle"></i> Malipo hayakupokelewa. Jaribu tena.';
                            return;
                        }
                        try {
                            const vr = await fetch(`/api/payments/verify-zeno-video/${visitor.id}/${_vidPayData.videoId}`);
                            const vd = await vr.json();
                            if (vd.success) {
                                clearInterval(_vidPayPollInterval);
                                document.getElementById('vpStep2').className = 'vid-pay-step done';
                                document.getElementById('vpStep2').innerHTML = '<i class="fas fa-check-circle"></i> Malipo yamekubaliwa!';
                                document.getElementById('vpStep3').className = 'vid-pay-step done';
                                document.getElementById('vpStep3').innerHTML = '<i class="fas fa-play-circle"></i> Video inafunguka...';
                                setTimeout(() => {
                                    closeVidPayModal();
                                    openVideoModal(_vidPayData.ytId, _vidPayData.title);
                                }, 1500);
                            }
                        } catch(e) { /* keep polling */ }
                    }, 5000);
                } else {
                    errEl.textContent = data.message || data.error || 'Kuna tatizo. Jaribu tena.';
                    errEl.style.display = 'block';
                    btn.disabled = false; btn.innerHTML = '<i class="fas fa-mobile-alt"></i> LIPA SASA';
                }
            } catch(e) {
                errEl.textContent = 'Tatizo la mtandao. Jaribu tena.';
                errEl.style.display = 'block';
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-mobile-alt"></i> LIPA SASA';
            }
        }

        function openVideoModal(videoId, title) {
            const modal = document.getElementById('videoModalOverlay');
            const iframe = document.getElementById('videoIframe');
            const titleEl = document.getElementById('videoModalTitle');
            const linkEl = document.getElementById('videoYtLink');
            const subWidgetCont = document.getElementById('videoModalSubWidget');
            const originalSubWidget = document.getElementById('ytSubscribeBtn');

            titleEl.textContent = title;
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
            linkEl.href = `https://www.youtube.com/watch?v=${videoId}`;
            
            // Clone subscribe widget into modal if it exists
            subWidgetCont.innerHTML = '';
            if (originalSubWidget && originalSubWidget.hasAttribute('data-channelid')) {
                const clone = originalSubWidget.cloneNode(true);
                subWidgetCont.appendChild(clone);
                if (window.gapi && window.gapi.ytsubscribe) window.gapi.ytsubscribe.go(subWidgetCont);
            }

            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeVideoModal(e, force = false) {
            if (force || e.target.id === 'videoModalOverlay') {
                const modal = document.getElementById('videoModalOverlay');
                const iframe = document.getElementById('videoIframe');
                modal.classList.remove('show');
                iframe.src = ''; // Stop video playback immediately
                document.body.style.overflow = '';
            }
        }
    