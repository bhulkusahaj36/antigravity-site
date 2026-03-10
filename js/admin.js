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

                const timeFilter = document.getElementById('dashboardTimeFilter');
                const dynamicInputs = document.getElementById('dashboardDynamicInputs');
                const filterSpecificDate = document.getElementById('filterSpecificDate');
                const filterSpecificWeek = document.getElementById('filterSpecificWeek');
                const filterSpecificMonth = document.getElementById('filterSpecificMonth');
                const filterSpecificYear = document.getElementById('filterSpecificYear');
                const applyBtn = document.getElementById('applyDashboardFilter');

                if (timeFilter) {
                    timeFilter.onchange = () => {
                        const val = timeFilter.value;
                        const requiresInput = ['single_day', 'single_week', 'specific_month', 'specific_year'].includes(val);

                        document.querySelectorAll('.feed-conditional-filter').forEach(el => el.style.display = 'none');

                        if (requiresInput) {
                            dynamicInputs.style.display = 'flex';
                            if (val === 'single_day') filterSpecificDate.style.display = 'block';
                            if (val === 'single_week') filterSpecificWeek.style.display = 'block';
                            if (val === 'specific_month') filterSpecificMonth.style.display = 'block';
                            if (val === 'specific_year') filterSpecificYear.style.display = 'block';
                        } else {
                            dynamicInputs.style.display = 'none';
                            renderActivityChart(articles, val);
                        }
                    };
                }

                if (applyBtn) {
                    applyBtn.onclick = () => {
                        const val = timeFilter.value;
                        let filterVal = null;
                        if (val === 'single_day') filterVal = filterSpecificDate.value;
                        if (val === 'single_week') filterVal = filterSpecificWeek.value;
                        if (val === 'specific_month') filterVal = filterSpecificMonth.value;
                        if (val === 'specific_year') filterVal = filterSpecificYear.value;

                        if (!filterVal) {
                            alert('Please select a value for the filter.');
                            return;
                        }
                        renderActivityChart(articles, val, filterVal);
                    }
                }

            } catch (e) {
                console.error("Error loading analytics:", e);
            }
        }

        function renderDashboardCharts(articles) {
            const timeFilter = document.getElementById('dashboardTimeFilter')?.value || 'this_month';
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

            if (filter === 'today' || filter === 'single_day') {
                if (filter === 'single_day' && filterVal) targetDate = new Date(filterVal);
                startDate = new Date(targetDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(targetDate);
                endDate.setHours(23, 59, 59, 999);

                labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
                formatKey = (d) => `${d.getHours().toString().padStart(2, '0')}:00`;

            } else if (filter === 'this_week' || filter === 'single_week') {
                if (filter === 'single_week' && filterVal) {
                    const range = getWeekStartEnd(filterVal);
                    if (range) { startDate = range.start; endDate = range.end; }
                } else {
                    startDate = new Date(now);
                    const day = startDate.getDay() || 7;
                    startDate.setDate(startDate.getDate() - day + 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 6);
                    endDate.setHours(23, 59, 59, 999);
                }

                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                formatKey = (d) => days[d.getDay()];

            } else if (filter === 'this_month' || filter === 'specific_month') {
                if (filter === 'specific_month' && filterVal) {
                    const [y, m] = filterVal.split('-');
                    targetDate = new Date(y, m - 1, 1);
                }
                startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
                endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

                const daysInMonth = endDate.getDate();
                labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
                formatKey = (d) => d.getDate().toString();

            } else if (filter === 'this_year' || filter === 'specific_year') {
                if (filter === 'specific_year' && filterVal) {
                    targetDate = new Date(filterVal, 0, 1);
                }
                startDate = new Date(targetDate.getFullYear(), 0, 1);
                endDate = new Date(targetDate.getFullYear(), 11, 31, 23, 59, 59, 999);

                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                formatKey = (d) => d.toLocaleString('default', { month: 'short' });
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
                type: (filter === 'today' || filter === 'single_day') ? 'bar' : 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Articles Added',
                        data: dataPoints,
                        borderColor: '#fbbf24',
                        backgroundColor: (filter === 'today' || filter === 'single_day') ? '#fbbf24' : 'rgba(251, 191, 36, 0.1)',
                        borderWidth: (filter === 'today' || filter === 'single_day') ? 0 : 2,
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

            const counts = {};
            articles.forEach(art => {
                const cat = art.category || 'unknown';
                cat.split(',').forEach(c => {
                    const cleanC = c.trim();
                    if (cleanC) counts[cleanC] = (counts[cleanC] || 0) + 1;
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
                        backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#8b5cf6', '#3b82f6', '#10b981'],
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

            let featured = 0;
            let standard = 0;
            articles.forEach(art => {
                if (art.featured || String(art.featured) === 'true') featured++;
                else standard++;
            });

            if (dashboardCharts.featured) dashboardCharts.featured.destroy();

            dashboardCharts.featured = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Featured', 'Standard'],
                    datasets: [{
                        data: [featured, standard],
                        backgroundColor: ['#fbbf24', '#374151'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
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
