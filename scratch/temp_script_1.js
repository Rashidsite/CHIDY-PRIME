
        // Intercept all fetch requests to add the Admin Token automatically
        const originalFetch = window.fetch;
        window.fetch = async function () {
            let [resource, config] = arguments;
            if (typeof resource === 'string' && resource.startsWith('/api/') && resource !== '/api/admin/login') {
                config = config || {};
                config.headers = config.headers || {};
                const token = localStorage.getItem('adminToken');
                console.log("Injecting token for:", resource);
                config.headers['Authorization'] = 'Bearer ' + token;
            }
            const response = await originalFetch(resource, config);
            console.log(`Fetch Response [${resource}]: ${response.status}`);
            if (response.status === 401 || response.status === 403) {
                // Token invalid or expired, locking vault
                localStorage.removeItem('adminToken');
                document.getElementById('vaultOverlay').style.display = 'flex';
                document.getElementById('vaultOverlay').classList.remove('vault-unlocked');
                document.body.classList.add('scanning');
            }
            return response;
        };

        const form = document.getElementById('uploadForm');
        const statusMsg = document.getElementById('statusMsg');
        const fullGameTableBody = document.getElementById('fullGameTableBody');
        const totalGamesLabels = document.querySelectorAll('.totalGamesCount');
        const addLinkBtn = document.getElementById('addLinkBtn');
        const linksContainer = document.getElementById('linksContainer');

        let currentActiveViewId = 'dashboardView';
        let allGamesData = [];
        let allOrdersData = [];
        let allCategories = [];
        let currentGamesFilter = 'all';

        // GLOBAL SEARCH HANDLER
        document.getElementById('adminSearchInput').addEventListener('input', () => {
            if (currentActiveViewId === 'allGamesView') {
                renderFilteredGames(currentGamesFilter);
            } else if (currentActiveViewId === 'usersView') {
                renderUsersList();
            } else if (currentActiveViewId === 'ordersView') {
                renderOrdersList();
            } else if (document.getElementById('adminSearchInput').value.length > 0) {
                // If they search while on Dashboard or somewhere else, switch to Games
                const gamesLink = document.querySelector('.nav-link[data-view="allGamesView"]');
                if (gamesLink) gamesLink.click();
            }
        });

        // Maintenance Toggle State
        async function fetchMaintenanceState() {
            try {
                const res = await fetch('/api/settings/maintenance');
                const data = await res.json();
                document.getElementById('maintenanceToggle').checked = data.value === 'true';
            } catch (err) {
                console.error('Failed to load maintenance state', err);
            }
        }

        async function toggleMaintenance() {
            const toggle = document.getElementById('maintenanceToggle');
            const enabled = toggle.checked;
            try {
                const res = await fetch('/api/settings/maintenance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled })
                });
                if (!res.ok) throw new Error('Failed to update maintenance state');
                if (!enabled) {
                    alert('Maintenance disabled. SMS/Messages queued for users!');
                } else {
                    alert('Maintenance mode enabled!');
                }
            } catch (err) {
                console.error(err);
                toggle.checked = !enabled;
                alert('Error updating maintenance state.');
            }
        }

        async function updateAnnouncement() {
            const text = document.getElementById('announcementInput').value.trim();
            if (!text) return alert("Please enter some text");
            try {
                const res = await fetch('/api/settings/announcement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                const result = await res.json();
                if (result.success) alert("Announcement Banner Updated!");
            } catch (e) { alert("Failed to update banner"); }
        }

        async function initSalesChart() {
            try {
                const res = await fetch('/api/admin/analytics/sales');
                const data = await res.json();
                const ctx = document.getElementById('salesChart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.map(d => d.date),
                        datasets: [{
                            label: 'Revenue (TSH)',
                            data: data.map(d => d.total),
                            borderColor: '#00f2ff',
                            backgroundColor: 'rgba(0, 242, 255, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#00f2ff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6c7293' } },
                            x: { grid: { display: false }, ticks: { color: '#6c7293' } }
                        }
                    }
                });
            } catch (e) { console.error("Chart error", e); }
        }

        // View Switching Logic
        const navLinks = document.querySelectorAll('.nav-link[data-view]');
        const views = document.querySelectorAll('.view-section');

        navLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const viewId = link.getAttribute('data-view');
                showView(viewId);
            };
        });

        function showView(viewId) {
            currentActiveViewId = viewId;
            views.forEach(v => v.style.display = 'none');
            navLinks.forEach(l => l.classList.remove('active'));
            
            document.getElementById(viewId).style.display = 'block';
            const activeLink = document.querySelector(`.nav-link[data-view="${viewId}"]`);
            if (activeLink) activeLink.classList.add('active');

            if (viewId === 'dashboardView') { fetchOrders(); fetchAnalytics(); fetchAdminData(); }
            if (viewId === 'allGamesView') fetchAdminData();
            if (viewId === 'analyticsView') fetchAnalytics();
            if (viewId === 'categoriesView') loadCategories();
            if (viewId === 'usersView') loadUsers();
            if (viewId === 'ordersView') fetchOrders();
            if (viewId === 'healthView') loadSystemHealth();
            if (viewId === 'promoView') loadPromoCodesWithStats();
        }

        // ============================================
        // SYSTEM HEALTH
        // ============================================
        async function loadSystemHealth() {
            const token = localStorage.getItem('adminToken');
            if (!token) return;

            try {
                const res = await fetch('/api/system/health', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (!res.ok) throw new Error('Failed to fetch health data');
                const data = await res.json();
                const s = data.stats;

                // DB Status
                const isDbOk = s.supabaseStatus && s.supabaseStatus.startsWith('OK');
                document.getElementById('healthDbStatus').textContent = s.supabaseStatus || 'Unknown';
                document.getElementById('healthDbStatus').style.color = isDbOk ? '#00d25b' : '#ff3366';
                document.getElementById('healthDbCard').style.borderColor = isDbOk ? '#00d25b' : '#ff3366';
                document.getElementById('healthDbLastCheck').textContent = s.lastDbCheck 
                    ? 'Last checked: ' + new Date(s.lastDbCheck).toLocaleTimeString() 
                    : 'Never checked yet';

                // CPU
                const cpu = s.cpuUsage || 0;
                document.getElementById('healthCpuVal').textContent = cpu + '%';
                document.getElementById('healthCpuBar').textContent = cpu + '%';
                document.getElementById('healthCpuProgress').style.width = Math.min(cpu, 100) + '%';
                document.getElementById('healthCpuCard').style.borderColor = cpu > 90 ? '#ff3366' : cpu > 70 ? '#ffb400' : '#00f2ff';

                // Memory
                const mem = s.memoryUsage || 0;
                document.getElementById('healthMemVal').textContent = mem + '%';
                document.getElementById('healthMemBar').textContent = mem + '%';
                document.getElementById('healthMemProgress').style.width = Math.min(mem, 100) + '%';
                document.getElementById('healthMemCard').style.borderColor = mem > 90 ? '#ff3366' : mem > 70 ? '#ffb400' : '#bc13fe';

                // Uptime
                const uptimeSec = Math.floor(s.uptime || 0);
                const hrs = Math.floor(uptimeSec / 3600);
                const mins = Math.floor((uptimeSec % 3600) / 60);
                const secs = uptimeSec % 60;
                document.getElementById('healthUptime').textContent = `${hrs}h ${mins}m ${secs}s`;

                // Telegram
                const tgEl = document.getElementById('healthTelegramStatus');
                const tgCard = document.getElementById('healthTelegramCard');
                if (data.telegramConfigured) {
                    tgEl.textContent = '✅ Connected';
                    tgEl.style.color = '#00d25b';
                    tgCard.style.borderColor = '#00d25b';
                } else {
                    tgEl.textContent = '❌ Not Set';
                    tgEl.style.color = '#ff3366';
                    tgCard.style.borderColor = '#ff3366';
                }

                // Error Log
                const log = document.getElementById('healthErrorLog');
                const errors = data.errors || [];
                if (errors.length === 0) {
                    log.innerHTML = '<div style="color:#00d25b;text-align:center;padding:2rem;font-size:0.9rem;"><i class="fas fa-check-circle"></i> No errors detected. System is healthy! 🎉</div>';
                } else {
                    log.innerHTML = errors.map(e => `
                        <div style="
                            background: rgba(255,51,102,0.07);
                            border: 1px solid rgba(255,51,102,0.25);
                            border-radius: 10px;
                            padding: 12px 16px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 10px;
                        ">
                            <div>
                                <div style="color:#ff3366;font-weight:700;font-size:0.8rem;letter-spacing:1px;">${e.type.replace(/_/g,' ')}</div>
                                <div style="color:#e0e0e0;font-size:0.85rem;margin-top:3px;">${e.message}</div>
                            </div>
                            <div style="color:#6c7293;font-size:0.7rem;white-space:nowrap;">${new Date(e.time).toLocaleString()}</div>
                        </div>
                    `).join('');
                }
            } catch(err) {
                document.getElementById('healthErrorLog').innerHTML = 
                    '<div style="color:#ff3366;text-align:center;padding:2rem;"><i class="fas fa-times-circle"></i> Failed to load health data: ' + err.message + '</div>';
            }
        }

        // ============================================
        // CATEGORY MANAGEMENT
        // ============================================
        let lastSeenOrderId = null;
        let revenueChartInstance = null;
        const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        async function handleImageUpload(input, targetInputId, statusId) {
            const file = input.files[0];
            if (!file) return;

            const status = document.getElementById(statusId);
            status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inapakia picha...';
            status.style.color = '#00f2ff';

            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Image = e.target.result;
                try {
                    const res = await fetch('/api/admin/upload', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify({ image: base64Image, fileName: file.name })
                    });
                    const data = await res.json();
                    if (data.success) {
                        document.getElementById(targetInputId).value = data.url;
                        status.innerHTML = '<i class="fas fa-check-circle"></i> Imekamilika! Picha tayari.';
                        status.style.color = '#00d25b';
                    } else {
                        status.innerHTML = '<i class="fas fa-times-circle"></i> Imefeli: ' + data.error;
                        status.style.color = '#ff3333';
                    }
                } catch (err) {
                    status.innerHTML = '<i class="fas fa-times-circle"></i> Kosa la mtandao.';
                    status.style.color = '#ff3333';
                }
            };
            reader.readAsDataURL(file);
        }



        let categoryChartInstance = null;
        function updateCategoryChart(orders) {
            const ctx = document.getElementById('categoryChart').getContext('2d');
            const statsList = document.getElementById('categoryStatsList');
            
            // Calculate totals by category
            const categories = {};
            orders.forEach(o => {
                if (o.status === 'approved' && o.posts) {
                    const cat = o.posts.category || 'HOT POST';
                    categories[cat] = (categories[cat] || 0) + o.amount;
                }
            });

            const sortedCats = Object.entries(categories).sort((a,b) => b[1] - a[1]);
            const labels = sortedCats.map(c => c[0]);
            const dataValues = sortedCats.map(c => c[1]);

            if (categoryChartInstance) categoryChartInstance.destroy();

            // Nice gradient colors for categories
            const colors = ['#00f2ff', '#bc13fe', '#ffb400', '#00ff88', '#ff3366', '#8e44ad'];

            categoryChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: colors.slice(0, labels.length).map(c => c + '33'),
                        borderColor: colors.slice(0, labels.length),
                        borderWidth: 2,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { display: false } }
                }
            });

            // Update the text list
            statsList.innerHTML = sortedCats.map(([name, amount], i) => `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${colors[i % colors.length]};"></div>
                        <span style="color: #fff;">${name}</span>
                    </div>
                    <span style="color: #6c7293;">TSh ${amount.toLocaleString()}</span>
                </div>
            `).join('');
        }

        function updateRevenueChart(orders) {
            const ctx = document.getElementById('revenueChart').getContext('2d');
            
            // Group revenue by date (Last 7 days)
            const dailyData = {};
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                last7Days.push(dateStr);
                dailyData[dateStr] = 0;
            }

            orders.forEach(o => {
                if (o.status === 'approved') {
                    const date = o.created_at.split('T')[0];
                    if (dailyData[date] !== undefined) {
                        dailyData[date] += o.amount;
                    }
                }
            });

            const labels = last7Days.map(d => d.split('-').slice(1).join('/'));
            const dataValues = last7Days.map(d => dailyData[d]);

            if (revenueChartInstance) revenueChartInstance.destroy();

            revenueChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Mapato (TSh)',
                        data: dataValues,
                        borderColor: '#00f2ff',
                        backgroundColor: 'rgba(0, 242, 255, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#00f2ff',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#6c7293', font: { size: 10 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#6c7293', font: { size: 10 } }
                        }
                    }
                }
            });
        }
        let isCatDirty = false;

        async function loadCategories() {
            try {
                const res = await fetch('/api/categories');
                allCategories = await res.json();
                isCatDirty = false; // Reset on load
                renderCategoriesView();
                populateCategoryDropdowns();
            } catch (err) {
                console.error('Failed to load categories:', err);
            }
        }

        function populateCategoryDropdowns(selectedValue = null) {
            const datalists = [
                document.getElementById('categoryOptions'),
                document.getElementById('categoryOptionsEdit')
            ];
            const optionsHtml = allCategories.map(c => `<option value="${c.name}">`).join('');
            datalists.forEach(dl => {
                if (dl) dl.innerHTML = optionsHtml;
            });
        }

        function renderCategoriesView() {
            const list = document.getElementById('categoriesList');
            const count = document.getElementById('catCount');
            if (!list) return;
            count.textContent = allCategories.length;
            if (allCategories.length === 0) {
                list.innerHTML = '<div style="color:#6c7293;">Hakuna categories bado. Ongeza moja!</div>';
                return;
            }
            
            // NOTE: Do NOT sort here — user's manual drag order is preserved in the array

            let html = '<div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 600px;">';
            html += allCategories.map((c, i) => `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0,242,255,0.06);
                    border: 1px solid rgba(0,242,255,0.2);
                    border-radius: 12px;
                    padding: 12px 18px;
                ">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <button onclick="moveCatUp(${i})" style="background:none;border:none;color:#00f2ff;cursor:pointer;padding:0; ${i === 0 ? 'opacity:0.3;cursor:not-allowed;' : ''}"><i class="fas fa-chevron-up"></i></button>
                            <button onclick="moveCatDown(${i})" style="background:none;border:none;color:#00f2ff;cursor:pointer;padding:0; ${i === allCategories.length - 1 ? 'opacity:0.3;cursor:not-allowed;' : ''}"><i class="fas fa-chevron-down"></i></button>
                        </div>
                        <span style="color:#e0e0e0;font-weight:600;letter-spacing:1px;font-size:1rem;">${c.name}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <label style="display:flex; align-items:center; gap:5px; font-size:0.85rem; color:#aaa; margin:0; cursor:pointer;" onclick="toggleCatVisibility(${i})">
                            <i class="fas ${c.is_visible !== false ? 'fa-eye' : 'fa-eye-slash'}" style="color:${c.is_visible !== false ? '#00d25b' : '#ff3333'};"></i>
                            ${c.is_visible !== false ? 'Inaonekana' : 'Imefichwa'}
                        </label>
                        <button onclick="deleteCategory(${c.id}, '${c.name.replace(/'/g,"\\'")}')"
                            title="Futa category"
                            style="background:none;border:none;color:#ff3366;cursor:pointer;padding:0;margin:0;font-size:1rem;line-height:1;transition:0.2s;"
                            onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            html += `
                <button onclick="saveCategorySettings()" class="btn-primary" id="saveCatBtn" style="margin-top: 15px; padding: 12px; border-radius: 8px; font-weight: bold; background: linear-gradient(45deg, var(--primary), var(--secondary)); display: ${isCatDirty ? 'block' : 'none'};">
                    Save Order & Visibility
                </button>
            </div>`;
            list.innerHTML = html;
        }

        function moveCatUp(index) {
            if (index === 0) return;
            const temp = allCategories[index];
            allCategories[index] = allCategories[index-1];
            allCategories[index-1] = temp;
            markCatDirty();
            renderCategoriesView();
        }

        function moveCatDown(index) {
            if (index === allCategories.length - 1) return;
            const temp = allCategories[index];
            allCategories[index] = allCategories[index+1];
            allCategories[index+1] = temp;
            markCatDirty();
            renderCategoriesView();
        }

        function toggleCatVisibility(index) {
            allCategories[index].is_visible = allCategories[index].is_visible === false ? true : false;
            markCatDirty();
            renderCategoriesView();
        }

        function markCatDirty() {
            isCatDirty = true;
            const btn = document.getElementById('saveCatBtn');
            if (btn) btn.style.display = 'block';
        }

        async function saveCategorySettings() {
            const btn = document.getElementById('saveCatBtn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            const payload = allCategories.map((c, i) => ({
                id: c.id,
                display_order: i + 1,
                is_visible: c.is_visible !== false
            }));
            
            try {
                const token = localStorage.getItem('adminToken');
                const res = await fetch('/api/categories/order', {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ categories: payload })
                });
                if (!res.ok) throw new Error('Failed to save');
                isCatDirty = false; // Reset on success
                btn.innerHTML = '<i class="fas fa-check"></i> Saved successfully!';
                setTimeout(() => { if(btn) btn.style.display = 'none'; }, 2000);
            } catch (err) {
                alert('Error saving ordering: ' + err.message);
                btn.innerHTML = 'Save Order & Visibility';
            }
        }


        async function addCategory() {
            const input = document.getElementById('newCategoryInput');
            const msg = document.getElementById('catMsg');
            const name = input.value.trim().toUpperCase();
            if (!name) { showCatMsg('Andika jina la category kwanza!', '#ff3366'); return; }

            try {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                const data = await res.json();
                if (!res.ok) {
                    showCatMsg(data.error === 'Category already exists' ? `"${name}" ipo tayari!` : data.error, '#ff3366');
                    return;
                }
                input.value = '';
                showCatMsg(`✅ "${name}" imeongezwa!`, '#00f2ff');
                await loadCategories();
            } catch (err) {
                showCatMsg('Hitilafu! Jaribu tena.', '#ff3366');
            }
        }

        async function deleteCategory(id, name) {
            if (!confirm(`Futa category "${name}"? Games zilizo na category hii hazitafutwa.`)) return;
            try {
                const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error();
                showCatMsg(`🗑️ "${name}" imefutwa.`, '#6c7293');
                await loadCategories();
            } catch {
                showCatMsg('Hitilafu wakati wa kufuta!', '#ff3366');
            }
        }

        function showCatMsg(text, color) {
            const el = document.getElementById('catMsg');
            el.textContent = text;
            el.style.color = color;
            el.style.display = 'block';
            setTimeout(() => el.style.display = 'none', 4000);
        }

        function updateClock() {
            const now = new Date();
            const h = now.getHours() % 12 || 12;
            const m = now.getMinutes().toString().padStart(2, '0');
            const s = now.getSeconds().toString().padStart(2, '0');
            const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
            document.getElementById('digitalClock').textContent = `${h}:${m}:${s} ${ampm}`;
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Dropdown Handlers
        document.getElementById('notifTrigger').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('notifDropdown').classList.toggle('show');
            document.getElementById('msgDropdown').classList.remove('show');
        });

        document.getElementById('msgTrigger').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('msgDropdown').classList.toggle('show');
            document.getElementById('notifDropdown').classList.remove('show');
        });

        window.onclick = () => {
            document.getElementById('notifDropdown').classList.remove('show');
            document.getElementById('msgDropdown').classList.remove('show');
        };

        // (PIN Logic moved to top for better loading)

        async function fetchAnalytics() {
            try {
                const res = await fetch('/api/admin/analytics');
                const data = await res.json();
                
                const trendEl = document.getElementById('userTrend');
                let arrowIcon, trendText, trendClass;

                if (data.trend === 'up') {
                    arrowIcon = 'fa-arrow-up';
                    trendText = `+${data.diff} leo`;
                    trendClass = 'up';
                } else if (data.trend === 'down') {
                    arrowIcon = 'fa-arrow-down';
                    trendText = `${data.diff} leo`;
                    trendClass = 'down';
                } else {
                    arrowIcon = 'fa-minus';
                    trendText = 'Tulivu';
                    trendClass = 'stable';
                }
                
                trendEl.className = `stat-trend ${trendClass}`;
                trendEl.innerHTML = `
                    <span class="stat-trend-arrow"><i class="fas ${arrowIcon}"></i></span>
                    <span class="stat-trend-text">${trendText}</span>
                `;
            } catch (err) {
                console.error('Analytics error:', err);
            }
        }

        addLinkBtn.onclick = () => {
            const row = document.createElement('div');
            row.className = 'form-row link-row';
            row.style.marginTop = '0.5rem';
            row.innerHTML = `
                <input type="text" placeholder="Link Name" class="link-name">
                <input type="url" placeholder="URL" class="link-url">
            `;
            linksContainer.appendChild(row);
        };

        async function fetchAdminData() {
            try {
                const response = await fetch('/api/admin/games');
                const games = await response.json();
                
                if (games.error) throw new Error(games.error);

                allGamesData = games;
                totalGamesLabels.forEach(el => el.innerText = games.length);
                updateFilterCounts(); // Update the (0) numbers
                renderFilteredGames(currentGamesFilter); // Maintain current filter
            } catch (err) {
                console.error(err);
            }
        }

        function updateFilterCounts() {
            const counts = {
                published: allGamesData.filter(g => (g.status || 'published') === 'published').length,
                draft: allGamesData.filter(g => g.status === 'draft').length,
                trash: allGamesData.filter(g => g.status === 'trash').length
            };
            
            document.getElementById('count-published').innerText = counts.published;
            document.getElementById('count-draft').innerText = counts.draft;
            document.getElementById('count-trash').innerText = counts.trash;
        }

        function filterByStatus(status) {
            currentGamesFilter = status;
            document.querySelectorAll('.btn-filter').forEach(btn => {
                btn.classList.remove('active');
                if (btn.innerText.toLowerCase().includes(status)) btn.classList.add('active');
            });
            renderFilteredGames(status);
        }

        function renderFilteredGames(status) {
            let filtered = allGamesData.filter(g => (g.status || 'published') === status);
            const query = document.getElementById('adminSearchInput').value.toLowerCase();
            
            if (query) {
                filtered = filtered.filter(g => 
                    (g.title || '').toLowerCase().includes(query) ||
                    (g.category || '').toLowerCase().includes(query)
                );
            }

            const titleEl = document.getElementById('tableTitle');
            titleEl.innerText = status.charAt(0).toUpperCase() + status.slice(1) + (status === 'published' ? ' Games' : '');
            
            fullGameTableBody.innerHTML = filtered.map(game => `
                    <tr>
                        <td><img src="${game.image_url}" class="game-thumb"></td>
                        <td style="font-weight: 600;">${game.title}</td>
                        <td><span style="font-size: 0.75rem; background: rgba(0, 242, 255, 0.1); color: #00f2ff; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(0, 242, 255, 0.2);">${game.category || 'HOT POST'}</span></td>
                        <td style="color: ${game.price > 0 ? '#00f2ff' : '#00d25b'}; font-weight: 700;">
                            ${game.price > 0 ? 'TSh ' + parseInt(game.price).toLocaleString() : 'FREE'}
                        </td>
                        <td><span style="color: #ffcc00;">★ ${game.rating}</span></td>
                        <td>
                            ${(Array.isArray(game.links) ? game.links : []).map(l => `<span style="font-size: 0.7rem; background: rgba(255,255,255,0.05); padding: 2px 5px; border-radius: 3px; margin-right: 3px;">${l.name}</span>`).join('')}
                        </td>
                        <td>${new Date(game.created_at).toLocaleDateString()}</td>
                        <td>
                            <span class="status-badge status-${game.status || 'published'}">
                                ${game.status || 'published'}
                            </span>
                        </td>
                        <td>
                            <div style="display: flex; gap: 10px; font-size: 0.8rem;">
                                ${status === 'trash' ? `
                                    <i class="fas fa-undo action-btn" onclick="updateStatus('${game.id}', 'published')" title="Restore to Store" style="color: #00d25b;"></i>
                                    <i class="fas fa-trash action-btn" onclick="deletePermanently('${game.id}')" title="Delete Permanently" style="color: #ff3333;"></i>
                                ` : status === 'draft' ? `
                                    <i class="fas fa-edit action-btn" onclick="editGame('${game.id}')" title="Edit Game" style="color: #0090e7;"></i>
                                    <i class="fas fa-rocket action-btn" onclick="updateStatus('${game.id}', 'published')" title="Publish Now" style="color: #00d25b;"></i>
                                    <i class="fas fa-trash action-btn" onclick="updateStatus('${game.id}', 'trash')" title="Move to Trash" style="color: #ff3333;"></i>
                                ` : `
                                    <i class="fas fa-edit action-btn" onclick="editGame('${game.id}')" title="Edit Game" style="color: #0090e7;"></i>
                                    <i class="fas fa-gift action-btn" onclick="handleManualGift('${game.id}', '${game.title.replace(/'/g, "\\'")}')" title="Grant Manual Gift" style="color: var(--secondary-color);"></i>
                                    <i class="fas fa-file-alt action-btn" onclick="updateStatus('${game.id}', 'draft')" title="Move to Draft" style="color: #ffab00;"></i>
                                    <i class="fas fa-trash action-btn" onclick="updateStatus('${game.id}', 'trash')" title="Move to Trash" style="color: #ff3333;"></i>
                                `}
                            </div>
                        </td>
                    </tr>
                `).join('') || `<tr><td colspan="7" style="text-align: center; color: #6c7293; padding: 2rem;">No ${status} items found.</td></tr>`;
        }

        async function handleManualGift(postId, gameTitle) {
            const phone = prompt(`Ingiza namba ya simu ya mteja unayetaka kumzawadia game ya "${gameTitle}":\n(Mfano: 07XXXXXXXX)`);
            if (!phone) return;
            
            if (phone.length < 10) {
                alert("Tafadhali ingiza namba ya simu sahihi (Digitali 10).");
                return;
            }

            try {
                const res = await fetch('/api/admin/grant-gift', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: postId, phone: phone })
                });
                const result = await res.json();
                if (result.success) {
                    showToast(`🎁 Zawadi ya ${gameTitle} imetumwa kwa ${phone}!`);
                } else {
                    alert('Imeshindwa: ' + result.error);
                }
            } catch (e) {
                alert('Hitilafu ya mtandao: ' + e.message);
            }
        }

        async function deletePermanently(id) {
            if (!confirm('This will permanently delete the game from the database. Are you sure?')) return;
            
            try {
                const response = await fetch(`/api/games/${id}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                if (result.success) {
                    fetchAdminData();
                    showToast('Game deleted permanently.');
                } else alert(result.error);
            } catch (err) {
                alert('Error deleting: ' + err.message);
            }
        }

        async function updateStatus(id, newStatus) {
            try {
                const response = await fetch(`/api/games/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const result = await response.json();
                if (result.success) {
                    fetchAdminData();
                    showToast(`Game moved to ${newStatus}.`);
                } else alert(result.error);
            } catch (err) {
                alert('Error updating status: ' + err.message);
            }
        }

        function editGame(id) {
            const game = allGamesData.find(g => g.id == id);
            if (!game) return;

            document.getElementById('editGameId').value = game.id;
            document.getElementById('editTitle').value = game.title;
            document.getElementById('editCategory').value = game.category || 'HOT POST';
            document.getElementById('editRating').value = game.rating;
            document.getElementById('editPrice').value = game.price || 0;
            document.getElementById('editDurationDays').value = game.duration_days || 0;
            document.getElementById('editDescription').value = game.description || '';
            document.getElementById('editYoutubeUrl').value = game.youtube_url || '';
            document.getElementById('editImageUrl').value = game.image_url || '';
            
            // Fill links
            const container = document.getElementById('editLinksContainer');
            container.innerHTML = '';
            const links = Array.isArray(game.links) ? game.links : [];
            if (links.length === 0) addEditLinkRow(); // Add empty row if none
            else {
                links.forEach(l => addEditLinkRow(l.name, l.url));
            }

            document.getElementById('editModal').style.display = 'flex';
        }

        function addEditLinkRow(name = '', url = '') {
            const row = document.createElement('div');
            row.className = 'form-row link-row';
            row.style.marginTop = '0.5rem';
            row.innerHTML = `
                <input type="text" placeholder="Link Name" class="link-name" value="${name}">
                <input type="url" placeholder="URL" class="link-url" value="${url}">
            `;
            document.getElementById('editLinksContainer').appendChild(row);
        }

        function closeEditModal() {
            document.getElementById('editModal').style.display = 'none';
        }

        document.getElementById('editForm').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('updateBtn');
            const id = document.getElementById('editGameId').value;
            
            btn.disabled = true;
            btn.innerText = 'Updating...';

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.youtube_url = document.getElementById('editYoutubeUrl').value || null;
            data.image_url = document.getElementById('editImageUrl').value || null;
            
            // Collect links
            const linkRows = document.querySelectorAll('#editLinksContainer .link-row');
            data.links = Array.from(linkRows).map(row => ({
                name: row.querySelector('.link-name').value,
                url: row.querySelector('.link-url').value
            })).filter(l => l.name && l.url);

            try {
                const response = await fetch(`/api/games/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    closeEditModal();
                    fetchAdminData();
                    showToast('Game updated successfully!');
                } else throw new Error(result.error);
            } catch (err) {
                alert('Update failed: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = 'Save Changes';
            }
        };

        function showToast(msg) {
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.bottom = '2rem';
            toast.style.right = '2rem';
            toast.style.background = 'linear-gradient(45deg, #00f2ff, #bc13fe)';
            toast.style.color = 'white';
            toast.style.padding = '1rem 2rem';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = '0 10px 30px rgba(0, 242, 255, 0.4)';
            toast.style.zIndex = '3000';
            toast.style.fontFamily = 'Orbitron';
            toast.style.fontSize = '0.9rem';
            toast.style.animation = 'slideInToast 0.4s ease-out';
            toast.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
            
            document.body.appendChild(toast);
            
            const style = document.createElement('style');
            style.innerHTML = `
                @keyframes slideInToast {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);

            setTimeout(() => {
                toast.style.animation = 'slideInToast 0.4s ease-in reverse forwards';
                setTimeout(() => toast.remove(), 400);
            }, 3000);
        }


        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.disabled = true;
            btn.innerText = 'Uploading...';
            statusMsg.innerText = 'Processing your deploy...';

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Collect dynamic links
            const linkRows = document.querySelectorAll('#linksContainer .link-row');
            data.links = Array.from(linkRows).map(row => ({
                name: row.querySelector('.link-name').value,
                url: row.querySelector('.link-url').value
            })).filter(link => link.name && link.url);

            try {
                const response = await fetch('/api/games', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (result.success) {
                    statusMsg.style.color = '#00ff00';
                    statusMsg.innerText = 'Game deployed successfully!';
                    form.reset();
                    fetchAdminData();
                } else {
                    throw new Error(result.error);
                }
            } catch (err) {
                statusMsg.style.color = '#ff3333';
                statusMsg.innerText = 'Error: ' + err.message;
            } finally {
                btn.disabled = false;
                btn.innerText = 'Deploy To Store';
            }
        };

        // Animated number counter
        function animateCount(el, target, duration = 1200) {
            const start = parseInt(el.innerText) || 0;
            if (start === target) return;
            const increment = target > start ? 1 : -1;
            const steps = Math.abs(target - start);
            const stepTime = Math.max(Math.floor(duration / steps), 20);
            let current = start;
            
            const timer = setInterval(() => {
                current += increment;
                el.innerText = current.toLocaleString();
                if (current === target) {
                    clearInterval(timer);
                    el.classList.add('counting');
                    setTimeout(() => el.classList.remove('counting'), 500);
                }
            }, stepTime);
        }

        // Fetch real user stats from Supabase
        async function fetchUserStats() {
            try {
                const response = await fetch('/api/user-stats');
                const data = await response.json();
                
                if (data.error) throw new Error(data.error);

                const countEl = document.getElementById('totalUsersCount');
                const trendEl = document.getElementById('userTrend');
                
                // Animate the counter
                animateCount(countEl, data.total);
                
                // Update trend arrow
                let arrowIcon, trendText, trendClass;
                
                if (data.trend === 'up') {
                    arrowIcon = 'fa-arrow-up';
                    trendText = `+${data.diff} today`;
                    trendClass = 'up';
                } else if (data.trend === 'down') {
                    arrowIcon = 'fa-arrow-down';
                    trendText = `${data.diff} today`;
                    trendClass = 'down';
                } else {
                    arrowIcon = 'fa-minus';
                    trendText = 'No change';
                    trendClass = 'stable';
                }
                
                trendEl.className = `stat-trend ${trendClass}`;
                trendEl.innerHTML = `
                    <span class="stat-trend-arrow"><i class="fas ${arrowIcon}"></i></span>
                    <span class="stat-trend-text">${trendText}</span>
                `;
                
                // Fetch pending orders count
                const ordersRes = await fetch('/api/admin/orders');
                const orders = await ordersRes.json();
                const pending = Array.isArray(orders) ? orders.filter(o => o.status === 'pending').length : 0;
                document.getElementById('pendingOrdersCount').innerText = pending;
                if (pending > 0) {
                    document.getElementById('pendingOrdersCount').parentElement.parentElement.style.borderColor = '#ffb400';
                } else {
                    document.getElementById('pendingOrdersCount').parentElement.parentElement.style.borderColor = 'rgba(255,255,255,0.06)';
                }
            } catch (err) {
                console.error('User stats error:', err);
            }
        }

        function initDash() {
            showView('dashboardView');
            fetchOrders();
            fetchAnalytics();
        }

        function refreshAllData() {
            fetchAdminData();
            fetchUserStats();
            loadCategories();
            fetchActivity();
            // If the current view is not dashboard, reload that specific view
            if (currentActiveViewId === 'dashboardView') fetchOrders();
            if (currentActiveViewId === 'usersView') loadUsers();
            if (currentActiveViewId === 'ordersView') fetchOrders();
        }

        refreshAllData();
        // Auto-refresh user stats and activity every 30 seconds
        setInterval(() => {
            fetchUserStats();
            fetchActivity();
        }, 30000);

        async function fetchActivity() {
            try {
                const res = await fetch('/api/admin/activity');
                const activity = await res.json();
                renderActivity(activity);
            } catch (err) {
                console.error("Activity fetch failed:", err);
            }
        }

        function renderActivity(data) {
            const list = document.getElementById('liveActivityList');
            if (!list) return;
            
            if (!data || data.length === 0) {
                list.innerHTML = '<div style="text-align: center; color: #6c7293; padding: 2rem;">No recent network activity.</div>';
                return;
            }

            list.innerHTML = data.map(act => {
                const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isSignup = act.type === 'signup';
                
                return `
                    <div style="
                        display: flex; 
                        align-items: center; 
                        gap: 15px; 
                        padding: 12px; 
                        background: rgba(255,255,255,0.03); 
                        border-radius: 10px; 
                        border: 1px solid rgba(255,255,255,0.05);
                        animation: slideInRight 0.3s ease;
                    ">
                        <div style="
                            width: 35px; height: 35px; border-radius: 8px; 
                            background: ${isSignup ? 'rgba(0, 242, 255, 0.1)' : 'rgba(188, 19, 254, 0.1)'};
                            display: flex; align-items: center; justify-content: center;
                            color: ${isSignup ? '#00f2ff' : '#bc13fe'};
                        ">
                            <i class="fas ${isSignup ? 'fa-user-plus' : 'fa-shopping-cart'}"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 0.85rem; color: #fff; font-weight: 500;">
                                ${isSignup ? `<b>${act.name}</b> ametengeneza akaunti leo.` : `Oda mpya ya <b>${act.posts?.title || 'Game'}</b> imeingia kutoka kwa ${act.visitors?.name || 'Mteja'}.`}
                            </div>
                            <div style="font-size: 0.7rem; color: #6c7293; margin-top: 2px;">
                                ${isSignup ? 'New User Identity Registered' : `TSh ${parseInt(act.amount).toLocaleString()} - ${act.status.toUpperCase()}`}
                            </div>
                        </div>
                        <div style="font-size: 0.7rem; color: #6c7293; font-family: monospace;">${timeStr}</div>
                    </div>
                `;
            }).join('');
        }

        // USER DETAIL DRILL-DOWN LOGIC
        async function viewUserDetail(visitorId) {
            const modal = document.getElementById('userDetailModal');
            const content = document.getElementById('userDetailContent');
            modal.style.display = 'flex';
            content.innerHTML = '<p style="text-align: center; color: #6c7293; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Analyzing user data...</p>';

            try {
                // Fetch user info from allUsersData
                const userProfile = allUsersData.find(u => u.visitor_id === visitorId || u.id == visitorId);
                const purchasesRes = await fetch(`/api/user/purchases/${visitorId}`);
                const purchases = await purchasesRes.json();

                let purchasesHtml = purchases.length === 0 
                    ? '<p style="color: #6c7293; font-size: 0.85rem;">Huyu mteja bado hajanunua game lolote.</p>'
                    : purchases.map(p => `
                        <div style="padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: #fff; font-size: 0.9rem; font-weight: 600;">${p.posts.title}</div>
                                <div style="font-size: 0.75rem; color: #6c7293;">Inaisha: ${new Date(p.expires_at).toLocaleDateString()}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 0.7rem; background: rgba(0, 242, 255, 0.1); color: #00f2ff; padding: 2px 8px; border-radius: 4px;">ACTIVE</span>
                                <button onclick="extendAccess('${visitorId}', '${p.post_id}')" 
                                    style="background: rgba(188, 19, 254, 0.2); color: #bc13fe; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer;"
                                    title="Ongeza siku 7 za access">
                                    +7 Days
                                </button>
                            </div>
                        </div>
                    `).join('');

                content.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 2rem;">
                        <div style="width: 70px; height: 70px; border-radius: 15px; background: linear-gradient(135deg, #00f2ff, #bc13fe); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff;">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div>
                            <h2 style="margin: 0; font-family: 'Orbitron'; color: #fff;">${userProfile?.name || 'Mteja'}</h2>
                            <p style="margin: 5px 0 0; color: #00f2ff; font-weight: bold;">${userProfile?.phone || ''}</p>
                            <span style="font-size: 0.75rem; color: #6c7293;">Joined: ${new Date(userProfile?.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <h3 style="font-family: 'Orbitron'; font-size: 0.9rem; color: #6c7293; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px; letter-spacing: 1px;">PURCHASE HISTORY</h3>
                    <div style="max-height: 250px; overflow-y: auto;">
                        ${purchasesHtml}
                    </div>
                `;
            } catch (err) {
                content.innerHTML = `<p style="padding: 2rem; color: #ff3366;">Error: ${err.message}</p>`;
            }
        }

        function closeUserDetailModal() {
            document.getElementById('userDetailModal').style.display = 'none';
        }

        async function extendAccess(vId, pId) {
            if (!confirm('Unataka kuongeza siku 7 za access kwa huyu mteja?')) return;
            
            try {
                const res = await fetch('/api/admin/access/extend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visitor_id: vId, post_id: pId, days: 7 })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Access imeongezwa kwa kufanikiwa!');
                    viewUserDetail(vId); // Refresh modal
                } else throw new Error(data.error);
            } catch (err) {
                alert('Imeshindikana kuongeza: ' + err.message);
            }
        }

        // ===== USER MANAGEMENT SYSTEM =====
        let allUsersData = [];

        async function loadUsers() {
            try {
                const res = await fetch('/api/users');
                allUsersData = await res.json();
                renderUsersList();
            } catch (err) {
                console.error("Failed to load users:", err);
            }
        }

        function renderUsersList() {
            const users = allUsersData;
            const tbody = document.getElementById('usersTableBody');
            const query = document.getElementById('adminSearchInput').value.toLowerCase();
            
            const filteredUsers = query 
                ? users.filter(u => u.name.toLowerCase().includes(query) || u.phone.includes(query))
                : users;

            document.getElementById('userViewTotal').innerText = filteredUsers.length + ' Total';
            
            if (filteredUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6c7293;padding:20px;">No registered users found.</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            filteredUsers.forEach((u, i) => {
                    const date = new Date(u.created_at).toLocaleDateString([], {year: 'numeric', month: 'short', day: 'numeric'});
                    const time = new Date(u.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    const phoneClean = u.phone.replace(/[^0-9]/g, '');
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="color:#6c7293;font-size:0.8rem;">#${i + 1}</td>
                        <td style="font-weight:bold;color:var(--primary-color);cursor:pointer;" onclick="viewUserDetail('${u.visitor_id || u.id}')">
                            <i class="fas fa-external-link-alt" style="font-size:0.7rem;margin-right:5px;opacity:0.5;"></i> ${u.name}
                        </td>
                        <td><span style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:4px;font-family:monospace;">${u.phone}</span></td>
                        <td>${date} <span style="color:#6c7293;font-size:0.8rem">${time}</span></td>
                        <td style="display:flex; gap:8px;">
                            <a href="https://wa.me/${phoneClean}" target="_blank" class="btn-filter" style="background:rgba(37,211,102,0.1);color:#25D366;border-color:rgba(37,211,102,0.3);padding:0.4rem 0.8rem;text-decoration:none;display:flex;align-items:center;gap:5px;">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </a>
                            <a href="sms:${u.phone}" class="btn-filter" style="background:rgba(0,242,255,0.1);color:#00f2ff;border-color:rgba(0,242,255,0.3);padding:0.4rem 0.8rem;text-decoration:none;display:flex;align-items:center;gap:5px;">
                                <i class="fas fa-sms"></i> SMS
                            </a>
                            <button class="btn-filter delete-user-btn" style="background:rgba(255,50,50,0.1);color:#ff4444;border-color:rgba(255,50,50,0.3);padding:0.4rem 0.8rem;display:flex;align-items:center;gap:5px;" data-id="${u.id}" data-name="${u.name}">
                                <i class="fas fa-trash-alt"></i> Delete
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
        }

        async function handleDeleteUser(id, name) {
            if (!confirm(`Uko uhakika unataka kumfuta mteja "${name}"? Hii itamfanya asajiliwe upya akifungua website!`)) return;
            
            try {
                const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
                const result = await response.json();
                
                if (result.success) {
                    showToast(`Mteja ${name} amefutwa kabisa.`);
                    loadUsers();
                    fetchUserStats();
                } else {
                    alert("Imeshindwa kufuta: " + (result.error || "Unknown error"));
                }
            } catch (err) {
                console.error("Failed to delete user:", err);
                alert("Hitilafu imetokea wakati wa mawasiliano na server.");
            }
        }

        // Global Event Delegation for dynamic buttons
        document.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-user-btn');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                const name = deleteBtn.dataset.name;
                handleDeleteUser(id, name);
            }
        });

        // BROADCAST MESSAGE LOGIC & LIVE PREVIEW
        const bcTitleInput = document.getElementById('bcTitle');
        const bcMessageInput = document.getElementById('bcMessage');
        const bcTypeSelect = document.getElementById('bcType');
        
        const previewBox = document.getElementById('livePreviewBox');
        const previewTitle = document.getElementById('previewTitle');
        const previewText = document.getElementById('previewText');
        const titleCounter = document.getElementById('titleCounter');
        const msgCounter = document.getElementById('msgCounter');

        const typeColorMap = {
            'info': { bg: 'rgba(0, 242, 255, 0.1)', border: '#00f2ff' },
            'success': { bg: 'rgba(0, 255, 136, 0.1)', border: '#00ff88' },
            'warning': { bg: 'rgba(255, 180, 0, 0.1)', border: '#ffb400' }
        };

        function updatePreview() {
            const tVal = bcTitleInput.value;
            const mVal = bcMessageInput.value;
            const tType = bcTypeSelect.value;
            
            previewTitle.innerText = tVal || 'Offer ya Leo!';
            previewText.innerText = mVal || 'Andika ujumbe wako hapa...';
            
            const styles = typeColorMap[tType];
            previewBox.style.background = styles.bg;
            previewBox.style.borderLeftColor = styles.border;
            
            titleCounter.innerText = `${tVal.length}/40`;
            titleCounter.style.color = tVal.length >= 40 ? '#ff3366' : '#6c7293';
            
            msgCounter.innerText = `${mVal.length}/150`;
            msgCounter.style.color = mVal.length >= 150 ? '#ff3366' : '#6c7293';
        }

        bcTitleInput.addEventListener('input', updatePreview);
        bcMessageInput.addEventListener('input', updatePreview);
        bcTypeSelect.addEventListener('change', updatePreview);

        document.getElementById('broadcastForm').onsubmit = async (e) => {
            e.preventDefault();
            const title = bcTitleInput.value;
            const message = bcMessageInput.value;
            const type = bcTypeSelect.value;
            
            const submitBtn = document.getElementById('bcSubmitBtn');
            const icon = document.getElementById('bcIcon');
            const btnText = document.getElementById('bcBtnText');

            if (!title || !message) return alert("Tafadhali jaza title na ujumbe!");

            // Loading state
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            icon.className = 'fas fa-spinner fa-spin';
            btnText.innerText = 'Inatuma...';

            try {
                const res = await fetch('/api/admin/notifications/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, message, type })
                });
                const result = await res.json();
                
                if (result.success) {
                    alert('✅ Safi kabisa! Ujumbe wako umetumwa kwa wateja wote kwa mafanikio.');
                    document.getElementById('broadcastForm').reset();
                    updatePreview(); // Reset preview
                } else {
                    throw new Error(result.error);
                }
            } catch (err) {
                alert('❌ Imeshindikana: ' + err.message);
            } finally {
                // Restore button
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                icon.className = 'fas fa-paper-plane';
                btnText.innerText = 'Tuma Ujumbe Sasa';
            }
        };

        // Initialize admin dashboard
        fetchMaintenanceState();
        initSalesChart();
        // Pre-fill announcement
        fetch('/api/settings/announcement').then(r=>r.json()).then(d=>{ if(d.value) document.getElementById('announcementInput').value = d.value; });

        // Mobile Sidebar Toggle
        function toggleSidebar() {
            document.querySelector('.sidebar').classList.toggle('active');
        }

        // Navigation Logic
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                if (!this.dataset.view) return;
                e.preventDefault();
                
                // Update active link
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Show view
                const viewId = this.dataset.view;
                document.querySelectorAll('.view-section').forEach(view => {
                    view.style.display = 'none';
                });
                const activeView = document.getElementById(viewId);
                if (activeView) {
                    activeView.style.display = 'block';
                    // Trigger view-specific loads
                    if (viewId === 'usersView') loadUsers();
                    if (viewId === 'ordersView') fetchOrders();
                    if (viewId === 'analyticsView') updateAnalytics();
                    if (viewId === 'categoriesView') loadCategories();
                }

                // Close sidebar on mobile after click
                if (window.innerWidth <= 576) {
                    document.querySelector('.sidebar').classList.remove('active');
                }
            });
        });
        async function fetchOrders() {
            const list = document.getElementById('ordersList');
            if (list) list.innerHTML = '<p style="text-align: center; color: #6c7293; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Syncing orders...</p>';
            
            try {
                const res = await fetch('/api/admin/orders');
                const orders = await res.json();
                allOrdersData = orders;

                // Notification sound for new orders
                if (Array.isArray(orders) && orders.length > 0) {
                    const latestId = orders[0].id;
                    if (lastSeenOrderId !== null && latestId > lastSeenOrderId) {
                        notificationSound.play().catch(e => console.log('Audio blocked'));
                    }
                    lastSeenOrderId = latestId;
                } else if (lastSeenOrderId === null) {
                    lastSeenOrderId = 0;
                }
                
                // Calculate Category specific counts for the top boxes (based on keywords or categories)
                if (Array.isArray(allOrdersData)) {
                    const actionCount = allOrdersData.filter(o => o.posts && o.posts.title.toLowerCase().includes('action')).length;
                    const sportsCount = allOrdersData.filter(o => o.posts && o.posts.title.toLowerCase().includes('sports')).length;
                    const appCount = allOrdersData.filter(o => o.posts && o.posts.title.toLowerCase().includes('app')).length;
                    
                    if (document.getElementById('actionOrders')) document.getElementById('actionOrders').innerText = `${actionCount} Orders`;
                    if (document.getElementById('sportsOrders')) document.getElementById('sportsOrders').innerText = `${sportsCount} Orders`;
                    if (document.getElementById('appOrders')) document.getElementById('appOrders').innerText = `${appCount} Orders`;
                }

                // Update Revenue statistic
                const approvedTotal = Array.isArray(allOrdersData) 
                    ? allOrdersData
                        .filter(o => o.status === 'approved')
                        .reduce((sum, o) => sum + parseFloat(o.amount || 0), 0)
                    : 0;
                document.getElementById('totalRevenue').innerText = `TSh ${approvedTotal.toLocaleString()}`;

                renderOrdersList();
            } catch (err) {
                console.error(err);
                list.innerHTML = '<p style="text-align: center; color: #ff3333; padding: 2rem;">Error sync orders.</p>';
            }
        }

        function renderOrdersList() {
            const list = document.getElementById('ordersList');
            const orders = allOrdersData;
            const query = document.getElementById('adminSearchInput').value.toLowerCase();
            
            const filteredOrders = query 
                ? orders.filter(o => {
                    const gameTitle = o.posts ? o.posts.title.toLowerCase() : '';
                    const guestName = o.visitors ? o.visitors.name.toLowerCase() : '';
                    const phone = o.phone_number || '';
                    return gameTitle.includes(query) || guestName.includes(query) || phone.includes(query);
                })
                : orders;
                
            if (filteredOrders.length === 0) {
                list.innerHTML = '<p style="text-align: center; color: #6c7293; padding: 2rem;">Hauna oda yoyote kwa sasa.</p>';
                return;
            }

            // Update order badge count
            const orderBadge = document.getElementById('orderCountBadge');
            if (orderBadge) orderBadge.innerText = `${filteredOrders.length} Total`;

            list.innerHTML = filteredOrders.map(order => {
                    const statusClass = `status-${order.status}`;
                    const date = new Date(order.created_at).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
                    const guestName = order.visitors ? order.visitors.name : 'Unknown';
                    const guestPhone = order.visitors ? order.visitors.phone : order.phone_number;
                    const gameTitle = order.posts ? order.posts.title : 'Deleted Game';
                    
                    return `
                        <div class="order-card" style="
                            flex-direction: column; 
                            align-items: stretch; 
                            margin-bottom: 0; 
                            background: linear-gradient(135deg, #121218 0%, #0d0d12 100%);
                            border: 1px solid rgba(255,255,255,0.05);
                            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                            position: relative;
                            overflow: hidden;
                            transition: 0.3s;
                        ">
                            <!-- Glowing edge for status -->
                            <div style="position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: ${order.status === 'pending' ? '#ffab00' : (order.status === 'approved' ? '#00d25b' : '#ff3333')}"></div>
                            
                            <div class="order-info" style="margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${gameTitle}</h4>
                                    <span style="font-size: 0.65rem; color: #6c7293;">${date}</span>
                                </div>
                                <div class="order-meta" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(0,242,255,0.1); display: flex; align-items: center; justify-content: center;">
                                            <i class="fas fa-user" style="font-size: 0.7rem; color: var(--primary-color);"></i>
                                        </div>
                                        <span style="color: #fff; font-size: 0.85rem;">${guestName}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
                                            <i class="fas fa-phone" style="font-size: 0.7rem; color: #6c7293;"></i>
                                        </div>
                                        <span style="font-size: 0.8rem; color: #6c7293;">${guestPhone}</span>
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.03);">
                                <div>
                                    <span style="display: block; font-size: 0.6rem; text-transform: uppercase; color: #4b4b56; margin-bottom: 2px;">Amount</span>
                                    <span style="font-weight: 500; color: #00ff88; font-size: 1.1rem;">TSh ${parseInt(order.amount).toLocaleString()}</span>
                                </div>
                                <div class="order-actions">
                                    ${order.status === 'pending' ? `
                                        <button class="btn-order-approve" onclick="updateOrderStatus('${order.id}', 'approved')" style="padding: 6px 14px; font-size: 0.75rem; background: #00d25b; border: none; border-radius: 4px; font-weight: 500; cursor: pointer;">Approve</button>
                                        <button class="btn-order-reject" onclick="updateOrderStatus('${order.id}', 'rejected')" style="padding: 6px 14px; font-size: 0.75rem; background: rgba(255,51,51,0.1); border: 1px solid #ff3333; color: #ff3333; border-radius: 4px; font-weight: 500; cursor: pointer;">Reject</button>
                                    ` : `
                                        <span class="order-status ${statusClass}" style="opacity: 0.8;">${order.status}</span>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
        }

        async function updateOrderStatus(orderId, status) {
            if (!confirm(`Are you sure you want to ${status} this order?`)) return;
            
            try {
                const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                const result = await res.json();
                
                if (result.success) {
                    showToast(`Order has been ${status}! Access granted if approved.`);
                    fetchOrders();
                    fetchUserStats(); // Refresh stats
                } else {
                    alert('Failed: ' + result.error);
                }
            } catch (err) {
                alert('Network error.');
            }
        }
        // Auto-refresh system health every 15 seconds if view is active
        setInterval(() => {
            if (currentActiveViewId === 'healthView') {
                loadSystemHealth();
            }
        }, 15000);

        // Debug: Log when script is fully loaded
        console.log("Admin Dashboard Script: FULLY INITIALIZED ✅");
    