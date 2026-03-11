// admin.js - Secure Admin Panel Intercept and Login Logic

document.addEventListener('DOMContentLoaded', () => {
    // We only execute this script on the admin.html page
    const adminOverlay = document.getElementById('admin-login-overlay');
    const adminDashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');

    if (!adminOverlay || !adminDashboard) return;

    // Check if user is already authenticated
    if (localStorage.getItem('hk_isAdmin') === 'true') {
        adminOverlay.style.display = 'none';
        adminDashboard.style.display = 'block';

        // Add a Logout button dynamically to the navbar
        const navLinks = document.getElementById('navLinks');
        if (navLinks && !document.getElementById('logoutBtn')) {
            // Remove public home/search links if they exist in admin
            navLinks.innerHTML = '';

            const li = document.createElement('li');
            li.innerHTML = '<a href="#" id="logoutBtn" class="nav-link" style="color: #ef4444;">Logout</a>';
            navLinks.appendChild(li);

            document.getElementById('logoutBtn').addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('hk_isAdmin');
                window.location.reload();
            });
        }

        // ==========================================
        // MANAGE ARTICLES LOGIC
        // ==========================================
        const tabs = document.querySelectorAll('.feed-tab');
        const panels = document.querySelectorAll('.feed-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.borderBottomColor = 'transparent';
                    t.style.color = 'var(--text-muted)';
                });
                panels.forEach(p => p.classList.remove('active', 'fade-in'));
                panels.forEach(p => p.style.display = 'none');

                tab.classList.add('active');
                tab.style.borderBottomColor = 'var(--gold-400)';
                tab.style.color = 'var(--gold-400)';

                const targetId = tab.getAttribute('data-target');
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.style.display = 'block';
                    // small delay to trigger animation
                    setTimeout(() => targetPanel.classList.add('active', 'fade-in'), 10);
                }

                if (targetId === 'panel-manage') {
                    loadAdminArticles();
                } else if (targetId === 'panel-dashboard') {
                    loadDashboardAnalytics();
                }
            });
        });

        let dashboardCharts = { activity: null, category: null, featured: null };

        async function loadDashboardAnalytics() {
            try {
                const response = await fetch('/api/articles?t=' + Date.now());
                if (!response.ok) throw new Error('API fetch failed');
                let articles = await response.json();

                if (typeof ARTICLES !== 'undefined') {
                    articles = [...ARTICLES, ...articles];
                }

                if (typeof Chart !== 'undefined') {
                    Chart.defaults.color = '#e5e7eb';
                    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
                }

                renderDashboardCharts(articles);

                const timeBtns = document.querySelectorAll('.time-filter-btn');
                timeBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        timeBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        const val = btn.getAttribute('data-value');
                        renderActivityChart(articles, val);
                    });
                });

            } catch (e) {
                console.error("Error loading analytics:", e);
            }
        }

        function renderDashboardCharts(articles) {
            const activeBtn = document.querySelector('.time-filter-btn.active');
            const timeFilter = activeBtn ? activeBtn.getAttribute('data-value') : '1M';
            renderActivityChart(articles, timeFilter);
            renderCategoryChart(articles);
            renderFeaturedChart(articles);
        }

        function getWeekStartEnd(weekStr) {
            if (!weekStr) return null;
            const parts = weekStr.split('-W');
            const year = parseInt(parts[0], 10);
            const week = parseInt(parts[1], 10);
            const d = new Date(year, 0, 1 + (week - 1) * 7);
            const dayOfWeek = d.getDay();
            const ISOweekStart = d;
            if (dayOfWeek <= 4) ISOweekStart.setDate(d.getDate() - d.getDay() + 1);
            else ISOweekStart.setDate(d.getDate() + 8 - d.getDay());

            const start = new Date(ISOweekStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        function renderActivityChart(articles, filter, filterVal) {
            const ctx = document.getElementById('activityChart');
            if (!ctx) return;

            const counts = {};
            const now = new Date();
            let targetDate = new Date();

            let startDate, endDate;
            let labels = [];
            let formatKey = (d) => '';

            if (filter === '1D') {
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
                formatKey = (d) => `${d.getHours().toString().padStart(2, '0')}:00`;

            } else if (filter === '1W') {
                startDate = new Date(now);
                const day = startDate.getDay() || 7;
                startDate.setDate(startDate.getDate() - day + 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                formatKey = (d) => days[d.getDay()];

            } else if (filter === '1M') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                const daysInMonth = endDate.getDate();
                labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
                formatKey = (d) => d.getDate().toString();

            } else if (filter === '3M') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                labels = [];
                for (let i = 2; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    labels.push(d.toLocaleString('default', { month: 'short' }));
                }
                formatKey = (d) => d.toLocaleString('default', { month: 'short' });

            } else if (filter === '1Y') {
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                formatKey = (d) => d.toLocaleString('default', { month: 'short' });

            } else if (filter === '5Y') {
                startDate = new Date(now.getFullYear() - 4, 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                labels = [];
                for(let i=4; i>=0; i--) labels.push((now.getFullYear() - i).toString());
                formatKey = (d) => d.getFullYear().toString();

            } else if (filter === '10Y') {
                startDate = new Date(now.getFullYear() - 9, 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                labels = [];
                for(let i=9; i>=0; i--) labels.push((now.getFullYear() - i).toString());
                formatKey = (d) => d.getFullYear().toString();
            }

            labels.forEach(l => counts[l] = 0);

            articles.forEach(art => {
                const dt = new Date(Number(art.id));
                if (isNaN(dt.getTime())) return;

                if (startDate && endDate && dt >= startDate && dt <= endDate) {
                    const key = formatKey(dt);
                    if (counts[key] !== undefined) {
                        counts[key]++;
                    }
                }
            });

            const dataPoints = labels.map(l => counts[l]);
            const totalCount = dataPoints.reduce((sum, curr) => sum + curr, 0);

            const totalSpan = document.getElementById('activityTotalCount');
            if (totalSpan) {
                totalSpan.innerText = `Total: ${totalCount}`;
            }

            if (dashboardCharts.activity) dashboardCharts.activity.destroy();

            dashboardCharts.activity = new Chart(ctx, {
                type: (filter === '1D') ? 'bar' : 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Articles Added',
                        data: dataPoints,
                        borderColor: '#fbbf24',
                        backgroundColor: (filter === '1D') ? '#fbbf24' : 'rgba(251, 191, 36, 0.1)',
                        borderWidth: (filter === '1D') ? 0 : 2,
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            });
        }

        function renderCategoryChart(articles) {
            const ctx = document.getElementById('categoryChart');
            if (!ctx) return;

            const topicLabels = {
                'mahima': 'મહિમા',
                'atmiyata': 'આત્મીયતા',
                'nishtha': 'નિષ્ઠા',
                'seva': 'સેવા',
                'bhagvadi': 'ભગવદી',
                'bhakti': 'ભક્તોનો મહિમા',
                'saralata': 'સરળતા',
                'swadharm': 'સ્વધર્મ',
                'swadhyay': 'સ્વાધ્યાય-ભજન',
                'bhajan': 'ભજન/સ્વામિનારાયણ મહામંત્ર',
                'svasarap': 'સ્વસારપ',
                'vachanamrut': 'વચનામૃત',
                'swamini': 'સ્વામીની વાતો',
                'shikshapatri': 'શિક્ષાપત્રી',
                'samagam': 'સમાગમ',
                'katha-varta': 'કથા-વાર્તા',
                'other': 'Other'
            };

            const counts = {};
            articles.forEach(art => {
                const cats = (art.category || '').split(',').map(c => c.trim()).filter(Boolean);
                cats.forEach(c => {
                    if (topicLabels[c]) {
                        const label = topicLabels[c];
                        counts[label] = (counts[label] || 0) + 1;
                    }
                });
            });

            const labels = Object.keys(counts);
            const data = Object.values(counts);

            if (dashboardCharts.category) dashboardCharts.category.destroy();

            dashboardCharts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e', 
                            '#f97316', '#eab308', '#22c55e', '#06b6d4',
                            '#6366f1', '#a855f7'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
        }

        function renderFeaturedChart(articles) {
            const ctx = document.getElementById('featuredChart');
            if (!ctx) return;

            const guruLabels = {
                'bhagwan': 'ભગવાન સ્વામિનારાયણ',
                'gunatit': 'ગુણાતીતાનંદ સ્વામી',
                'bhagatji': 'ભગતજી મહારાજ',
                'shastriji': 'શાસ્ત્રીજી મહારાજ',
                'yogiji': 'યોગીજી મહારાજ',
                'hariprasad': 'હરિપ્રસાદ સ્વામીજી',
                'prabodh': 'પ્રબોધ સ્વામીજી',
                'bhakto': 'ભક્તો',
                'prabhudasbhai': 'પ્રભુદાસભાઈ'
            };

            const counts = {};
            articles.forEach(art => {
                const prasangIds = (art.prasang || '').split(',').map(s => s.trim()).filter(Boolean);
                prasangIds.forEach(id => {
                    // ONLY include if it's one of the top 9 predefined gurus
                    if (guruLabels[id]) {
                        const label = guruLabels[id];
                        counts[label] = (counts[label] || 0) + 1;
                    }
                });
            });

            const labels = Object.keys(counts);
            const data = Object.values(counts);

            if (dashboardCharts.featured) dashboardCharts.featured.destroy();

            dashboardCharts.featured = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#fbbf24', '#f59e0b', '#d97706', '#b45309', 
                            '#92400e', '#78350f', '#451a03', '#fef3c7', 
                            '#a16207'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
        }

        // Search Input in Manage Articles
        const searchInput = document.getElementById('adminSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#adminArticlesList tr');
                rows.forEach(row => {
                    if (row.classList.contains('empty-row')) return;
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        }

        async function loadAdminArticles() {
            const listObj = document.getElementById('adminArticlesList');
            if (!listObj) return;

            listObj.innerHTML = '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading...</td></tr>';

            try {
                const response = await fetch('/api/articles?t=' + Date.now());
                if (!response.ok) throw new Error('API fetch failed');
                const articles = await response.json();

                if (articles.length === 0) {
                    listObj.innerHTML = '<tr class="empty-row"><td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted);">No articles found.</td></tr>';
                    return;
                }

                // Sort newest first
                articles.sort((a, b) => Number(b.id) - Number(a.id));

                listObj.innerHTML = '';
                articles.forEach(art => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                    const dt = new Date(Number(art.id));
                    const dateStr = isNaN(dt.getTime()) ? 'Unknown' : dt.toLocaleDateString();

                    tr.innerHTML = `
                        <td style="padding: 1rem 0.5rem; color: var(--text-light); font-weight: 500;">${art.title || 'Untitled'}</td>
                        <td style="padding: 1rem 0.5rem; color: var(--text-muted);">${art.author || 'અજ્ઞાત'}</td>
                        <td style="padding: 1rem 0.5rem; color: var(--text-muted);">${dateStr}</td>
                        <td style="padding: 1rem 0.5rem; text-align: right;">
                            <a href="admin.html?editId=${art.id}" class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.85rem; margin-right: 0.5rem; color: var(--gold-400); border-color: var(--gold-400);">Edit</a>
                            <button class="btn btn-outline delete-btn" data-id="${art.id}" style="padding: 0.25rem 0.75rem; font-size: 0.85rem; color: #ef4444; border-color: #ef4444;">Delete</button>
                        </td>
                    `;
                    listObj.appendChild(tr);
                });

                // Attach delete listeners
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this article? This cannot be undone.')) {
                            e.target.textContent = 'Deleting...';
                            e.target.disabled = true;
                            try {
                                const delRes = await fetch('/api/articles?id=' + encodeURIComponent(id), { method: 'DELETE' });
                                if (delRes.ok) {
                                    loadAdminArticles(); // Reload list
                                } else {
                                    alert('Failed to delete article: ' + await delRes.text());
                                    e.target.textContent = 'Delete';
                                    e.target.disabled = false;
                                }
                            } catch (err) {
                                alert('Error deleting article: ' + err.message);
                                e.target.textContent = 'Delete';
                                e.target.disabled = false;
                            }
                        }
                    });
                });

            } catch (e) {
                listObj.innerHTML = '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: #ef4444;">Error loading articles.</td></tr>';
                console.error(e);
            }
        }
    } else {
        // Not authenticated: hide dashboard, listen to login form
        adminDashboard.style.display = 'none';
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('adminId').value;
                const pass = document.getElementById('adminPassword').value;

                // Fixed Admin Credentials
                if (id === 'admin' && pass === 'hariamrut') {
                    localStorage.setItem('hk_isAdmin', 'true');
                    loginError.style.display = 'none';
                    // Fully reload page to initialize complex feed logic & Quill editors
                    window.location.reload();
                } else {
                    loginError.style.display = 'block';
                }
            });
        }
    }
});
