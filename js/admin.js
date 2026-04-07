// admin.js - Secure Admin Panel Intercept and Login Logic

// ── Token helper — reads from sessionStorage ─────────────────────────────────
function getAdminToken() {
    return sessionStorage.getItem('hk_admin_token') || '';
}

function adminHeaders(extra = {}) {
    return { 'Content-Type': 'application/json', 'X-Admin-Token': getAdminToken(), ...extra };
}

document.addEventListener('DOMContentLoaded', () => {
    // We only execute this script on the admin.html page
    const adminOverlay = document.getElementById('admin-login-overlay');
    const adminApp = document.getElementById('admin-app');
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');

    if (!adminOverlay || !adminApp) return;

    // Check if user is already authenticated
    if (localStorage.getItem('hk_isAdmin') === 'true') {
        adminOverlay.style.display = 'none';
        adminApp.classList.add('is-visible');
        // Show logout button
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('hk_isAdmin');
                window.location.reload();
            });
        }

        // Expose functions for admin-ui.js sidebar to call
        let dashboardCharts = { activity: null, category: null, featured: null };

        window.loadDashboardAnalytics = async function loadDashboardAnalytics() {
            try {
                const response = await fetch('/api/articles?t=' + Date.now());
                if (!response.ok) throw new Error('API fetch failed');
                let articles = await response.json();

                if (typeof ARTICLES !== 'undefined') {
                    articles = [...ARTICLES, ...articles];
                }

                // Deduplicate by ID
                const seen = new Set();
                articles = articles.filter(art => {
                    const idStr = String(art.id);
                    if (seen.has(idStr)) return false;
                    seen.add(idStr);
                    return true;
                });

                if (typeof Chart !== 'undefined') {
                    Chart.defaults.color = '#e5e7eb';
                    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
                }

                renderDashboardStats(articles);
                renderDashboardCharts(articles);

                const timeBtns = document.querySelectorAll('.time-filter-btn');
                timeBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        timeBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        renderDashboardCharts(articles);
                    });
                });

            } catch (e) {
                console.error("Error loading analytics:", e);
            }
        };

        // Populate the 4 stat cards
        function renderDashboardStats(articles) {
            const prasangs = articles.filter(a => a.type === 'prasang' || !a.type);
            const paravanis = articles.filter(a => a.type === 'paravani');
            const drafts = articles.filter(a => a.status === 'draft');
            const albums = new Set(paravanis.map(a => a.album).filter(Boolean));

            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            set('stat-prasangs', prasangs.length);
            set('stat-paravanis', paravanis.length);
            set('stat-albums', albums.size);
            set('stat-drafts', drafts.length);
        }

        function renderDashboardCharts(articles) {
            const activeBtn = document.querySelector('.time-filter-btn.active');
            const timeFilter = activeBtn ? activeBtn.getAttribute('data-value') : '1M';
            
            const filtered = filterArticlesByTimeline(articles, timeFilter);
            
            renderActivityChart(filtered, timeFilter); 
            renderCategoryChart(filtered);
            renderFeaturedChart(filtered);

            const totalSpan = document.getElementById('activityTotalCount');
            if (totalSpan) totalSpan.innerText = `Total: ${filtered.length}`;
        }

        function filterArticlesByTimeline(articles, filter) {
            // 'All' — return everything with a valid timestamp
            if (filter === 'All') {
                return articles.filter(art => {
                    const ts = art.createdAt ? new Date(art.createdAt).getTime() : Number(art.id);
                    return !isNaN(ts) && ts > 1000000;
                });
            }

            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            if (filter === '1D') {
                return articles.filter(art => getArticleTimestamp(art) >= startOfToday);
            }

            let daysToSubtract = 0;
            if (filter === '1W') daysToSubtract = 6;
            else if (filter === '1M') daysToSubtract = 29;
            else if (filter === '3M') daysToSubtract = 89;
            else if (filter === '1Y') daysToSubtract = 364;

            if (daysToSubtract > 0) {
                const startTime = startOfToday - (daysToSubtract * 24 * 60 * 60 * 1000);
                return articles.filter(art => getArticleTimestamp(art) >= startTime);
            }

            return articles;
        }

        // Robust timestamp extraction — prefers createdAt over art.id
        function getArticleTimestamp(art) {
            if (art.createdAt) {
                const t = new Date(art.createdAt).getTime();
                if (!isNaN(t)) return t;
            }
            const idNum = Number(art.id);
            // art.id as timestamp is only valid if it looks like a ms epoch (> year 2000)
            if (!isNaN(idNum) && idNum > 946684800000) return idNum;
            return 0;
        }

        function renderActivityChart(articles, filter) {
            const ctx = document.getElementById('activityChart');
            if (!ctx) return;
            const counts = {};
            const now = new Date();
            let labels = [];
            let formatKey = (d) => '';
            let chartType = 'bar';

            if (filter === '1D') {
                labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
                formatKey = (d) => `${d.getHours().toString().padStart(2, '0')}:00`;
                chartType = 'bar';
            } else if (filter === '1W') {
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                formatKey = (d) => days[d.getDay()];
                chartType = 'bar';
            } else if (filter === '1M' || filter === '3M') {
                // Build day-by-day labels for the range
                const days = filter === '1M' ? 30 : 90;
                for (let i = days - 1; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    labels.push(`${d.getMonth()+1}/${d.getDate()}`);
                }
                formatKey = (d) => `${d.getMonth()+1}/${d.getDate()}`;
                chartType = 'line';
            } else if (filter === '1Y') {
                // Monthly labels for past 12 months
                const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                for (let i = 11; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    labels.push(monthNames[d.getMonth()] + ' ' + d.getFullYear());
                }
                formatKey = (d) => monthNames[d.getMonth()] + ' ' + d.getFullYear();
                chartType = 'bar';
            } else if (filter === 'All') {
                // Group by year
                const years = [...new Set(articles.map(a => new Date(getArticleTimestamp(a)).getFullYear()))].sort();
                labels = years.map(y => String(y));
                formatKey = (d) => String(d.getFullYear());
                chartType = 'bar';
            }

            labels.forEach(l => counts[l] = 0);
            articles.forEach(art => {
                const ts = getArticleTimestamp(art);
                if (!ts) return;
                const dt = new Date(ts);
                if (isNaN(dt.getTime())) return;
                const key = formatKey(dt);
                if (counts[key] !== undefined) counts[key]++;
            });

            const dataPoints = labels.map(l => counts[l]);
            const hasData = dataPoints.some(v => v > 0);
            
            if (dashboardCharts.activity) dashboardCharts.activity.destroy();
            dashboardCharts.activity = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Articles Added',
                        data: dataPoints,
                        borderColor: '#fbbf24',
                        backgroundColor: chartType === 'bar'
                            ? 'rgba(251, 191, 36, 0.5)'
                            : 'rgba(251, 191, 36, 0.1)',
                        borderWidth: chartType === 'bar' ? 0 : 2,
                        borderRadius: chartType === 'bar' ? 4 : 0,
                        tension: 0.3,
                        fill: true,
                        pointRadius: chartType === 'line' ? (hasData ? 3 : 0) : 0,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                maxTicksLimit: filter === '1M' ? 10 : filter === '3M' ? 12 : 24,
                                maxRotation: 45
                            }
                        }
                    }
                }
            });
        }

        function renderCategoryChart(articles) {
            const ctx = document.getElementById('categoryChart');
            if (!ctx) return;
            const topicLabels = {
                'mahima': 'મહિમા', 'atmiyata': 'આત્મીયતા', 'nishtha': 'નિષ્ઠા', 'seva': 'સેવા',
                'bhagvadi': 'ભગવદી', 'bhakti': 'ભક્તિ/મહિમા', 'saralata': 'સરળતા',
                'swadharm': 'સ્વધર્મ', 'swadhyay': 'સ્વાધ્યાય-ભજન', 'bhajan': 'ભજન/સ્વામિનારાયણ મહામંત્ર',
                'svasarap': 'સ્વસારપ', 'vachanamrut': 'વચનામૃત', 'swamini': 'સ્વામીની વાતો',
                'shikshapatri': 'શિક્ષાપત્રી', 'samagam': 'સમાગમ', 'katha-varta': 'કથા-વાર્તા', 'other': 'અન્ય'
            };

            // Merge custom topics
            if (typeof getCustomTags === 'function') {
                const custom = getCustomTags();
                (custom.topic || []).forEach(t => { if (!topicLabels[t.value]) topicLabels[t.value] = t.label; });
            }
            const counts = {};
            articles.forEach(art => {
                const cats = (art.category || art.topic || '').split(',').map(c => c.trim()).filter(Boolean);
                cats.forEach(c => { 
                    const label = topicLabels[c] || 'અન્ય'; 
                    counts[label] = (counts[label] || 0) + 1; 
                });
            });
            if (dashboardCharts.category) dashboardCharts.category.destroy();
            dashboardCharts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{
                        data: Object.values(counts),
                        backgroundColor: ['#f97316', '#fb923c', '#ef4444', '#f87171', '#10b981', '#34d399', '#84cc16', '#a3e635', '#f59e0b', '#fbbf24'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
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
                'hariprasad': 'હરિપ્રસાદ સ્વામીજી મહારાજ',
                'prabodh': 'પ્રબોધ સ્વામીજી', 
                'bhakto': 'ભક્તો', 
                'prabhudasbhai': 'પ્રભુદાસભાઈ'
            };

            const counts = {};
            articles.forEach(art => {
                const pIds = (art.prasang || '').split(',').map(s => s.trim()).filter(Boolean);
                pIds.forEach(id => { 
                    const label = guruLabels[id] || 'ભક્તો'; // Group unknown into Bhakto
                    counts[label] = (counts[label] || 0) + 1; 
                });
            });

            if (dashboardCharts.featured) dashboardCharts.featured.destroy();
            dashboardCharts.featured = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{
                        data: Object.values(counts),
                        backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03', '#fef3c7', '#a16207'],
                        borderWidth: 0
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { 
                        legend: { 
                            position: 'right',
                            labels: {
                                filter: function(item, chart) {
                                    // Optionally filter out legend items with 0 count if desired
                                    return true;
                                }
                            }
                        } 
                    } 
                }
            });
        }

        // Expose key functions globally for admin-ui.js sidebar
        window.renderTasks = function() { renderTasksInternal(); };
        window.initManageTabs = function() { initManageTabsInternal(); };

        // ==========================================
        // QUOTES MANAGEMENT SYSTEM
        // ==========================================
        let _quotesLoaded = false;

        window.initQuotesPanel = async function() {
            // Wire the add form once
            if (!_quotesLoaded) {
                _quotesLoaded = true;
                const form = document.getElementById('quoteAddForm');
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const text = document.getElementById('quoteText').value.trim();
                        const author = document.getElementById('quoteAuthor').value.trim();
                        const feedback = document.getElementById('quoteFeedback');
                        const submitBtn = document.getElementById('quoteSubmitBtn');

                        if (!text) return;
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Saving...';

                        try {
                            const res = await fetch('/api/quotes', {
                                method: 'POST',
                                headers: adminHeaders(),
                                body: JSON.stringify({ text, author, active: true })
                            });
                            if (res.ok) {
                                form.reset();
                                feedback.textContent = '✓ Quote added!';
                                feedback.style.color = '#10b981';
                                feedback.style.display = 'block';
                                setTimeout(() => { feedback.style.display = 'none'; }, 3000);
                                await loadQuotes();
                            } else {
                                const err = await res.text();
                                feedback.textContent = 'Error: ' + err;
                                feedback.style.color = '#ef4444';
                                feedback.style.display = 'block';
                            }
                        } catch (err) {
                            feedback.textContent = 'Connection error: ' + err.message;
                            feedback.style.color = '#ef4444';
                            feedback.style.display = 'block';
                        }
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Add Quote';
                    });
                }
            }
            await loadQuotes();
        };

        async function loadQuotes() {
            const tbody = document.getElementById('adminQuotesList');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="4" class="table-loading">Loading quotes...</td></tr>';

            try {
                const res = await fetch('/api/quotes?all=true', { headers: { 'X-Admin-Token': getAdminToken() } });
                const quotes = await res.json();

                if (!quotes.length) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:2rem;">No quotes yet. Add one above!</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                quotes.forEach(q => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-size:0.9rem; line-height:1.5;">${q.text}</td>
                        <td style="color:var(--saffron-400); font-size:0.85rem; white-space:nowrap;">${q.author || '—'}</td>
                        <td style="text-align:center;">
                            <label class="switch" title="${q.active ? 'Active' : 'Inactive'}">
                                <input type="checkbox" ${q.active ? 'checked' : ''} 
                                    onchange="toggleQuoteActive('${q.id}', this.checked)" />
                                <span class="slider round"></span>
                            </label>
                        </td>
                        <td style="text-align:right; white-space:nowrap;">
                            <button class="table-action-btn delete" onclick="deleteQuote('${q.id}')">Delete</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444; padding:1.5rem;">Error loading quotes: ${err.message}</td></tr>`;
            }
        }

        window.toggleQuoteActive = async (id, active) => {
            try {
                await fetch(`/api/quotes?id=${encodeURIComponent(id)}`, {
                    method: 'PATCH',
                    headers: adminHeaders(),
                    body: JSON.stringify({ active })
                });
            } catch (err) { console.error('Toggle quoe failed:', err); }
        };

        window.deleteQuote = async (id) => {
            if (!confirm('Delete this quote?')) return;
            try {
                await fetch(`/api/quotes?id=${encodeURIComponent(id)}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-Token': getAdminToken() }
                });
                await loadQuotes();
            } catch (err) { console.error('Delete quote failed:', err); }
        };



        // ==========================================
        // TASKS MANAGEMENT SYSTEM
        // ==========================================
        let adminTasks = JSON.parse(localStorage.getItem('hk_admin_tasks') || '[]');

        function saveTasks() {
            localStorage.setItem('hk_admin_tasks', JSON.stringify(adminTasks));
            renderTasksInternal();
        }

        window.deleteTask = (index) => {
            if (confirm('Delete this task?')) {
                adminTasks.splice(index, 1);
                saveTasks();
            }
        };

        window.addSubtask = (taskIndex) => {
            const input = document.getElementById(`subtask-input-${taskIndex}`);
            const val = input ? input.value.trim() : '';
            if (val) {
                if (!adminTasks[taskIndex].subtasks) adminTasks[taskIndex].subtasks = [];
                adminTasks[taskIndex].subtasks.push({ name: val, completed: false });
                input.value = '';
                saveTasks();
            }
        };

        window.toggleSubtask = (taskIndex, subtaskIndex) => {
            adminTasks[taskIndex].subtasks[subtaskIndex].completed = !adminTasks[taskIndex].subtasks[subtaskIndex].completed;
            saveTasks();
        };

        window.removeSubtask = (taskIndex, subtaskIndex) => {
            adminTasks[taskIndex].subtasks.splice(subtaskIndex, 1);
            saveTasks();
        };

        function renderTasksInternal() {
            const container = document.getElementById('taskListContainer');
            if (!container) return;
            container.innerHTML = '';

            if (adminTasks.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No tasks yet. Create one above!</p>';
                return;
            }

            adminTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).forEach((task, index) => {
                const now = new Date();
                const deadline = new Date(task.deadline);
                const diffHours = (deadline - now) / (1000 * 60 * 60);
                
                let statusColor = '#10b981'; // Green
                let statusText = 'On Track';
                if (diffHours < 0) {
                    statusColor = '#ef4444'; // Red
                    statusText = 'Overdue';
                } else if (diffHours < 24) {
                    statusColor = '#fbbf24'; // Warning
                    statusText = 'Due Soon';
                }

                const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length;
                const totalSubtasks = (task.subtasks || []).length;
                const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

                const taskEl = document.createElement('div');
                taskEl.className = 'admin-task-card';
                
                const statusClass = diffHours < 0 ? 'status-overdue' : diffHours < 24 ? 'status-due-soon' : 'status-on-track';
                const priorityClass = `priority-${task.priority}`;
                taskEl.innerHTML = `
                    <div class="admin-task-header">
                        <div>
                            <h4 class="admin-task-name">${task.name}</h4>
                            <div class="admin-task-meta">Deadline: ${deadline.toLocaleDateString()}</div>
                            <div class="admin-task-badges">
                                <span class="priority-badge ${statusClass}">${statusText}</span>
                                <span class="priority-badge ${priorityClass}">${task.priority}</span>
                            </div>
                        </div>
                        <button class="table-action-btn delete" onclick="deleteTask(${index})">Delete</button>
                    </div>
                    <div class="admin-task-progress-bar">
                        <div class="admin-task-progress-fill" style="width:${progress}%"></div>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-align:right; margin-top:-0.4rem; margin-bottom:0.6rem;">${progress}%</div>
                    <div class="admin-subtask-area">
                        <div class="admin-subtask-input-row">
                            <input type="text" id="subtask-input-${index}" placeholder="Add subtask..." class="feed-input" style="height:36px; font-size:0.85rem;" />
                            <button onclick="addSubtask(${index})" class="btn btn-primary" style="height:36px; padding:0 0.75rem; font-size:0.78rem; white-space:nowrap;">Add</button>
                        </div>
                        <div id="subtask-list-${index}">
                            ${(task.subtasks || []).map((st, si) => `
                                <div class="admin-subtask-item">
                                    <input type="checkbox" ${st.completed ? 'checked' : ''} onchange="toggleSubtask(${index}, ${si})" />
                                    <span style="flex:1; font-size:0.85rem; color:${st.completed ? 'var(--text-muted)' : 'var(--text-primary)'}; text-decoration:${st.completed ? 'line-through' : 'none'}">${st.name}</span>
                                    <button onclick="removeSubtask(${index}, ${si})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1rem; line-height:1; padding:0;">&times;</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                container.appendChild(taskEl);
            });
        }

        const taskForm = document.getElementById('taskCreateForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('taskNameInput');
                const deadlineInput = document.getElementById('taskDeadlineInput');
                const priorityInput = document.getElementById('taskPriorityInput');
                
                adminTasks.push({ 
                    name: nameInput.value, 
                    deadline: deadlineInput.value, 
                    priority: priorityInput.value, 
                    subtasks: [] 
                });
                taskForm.reset();
                saveTasks();
            });
        }

        // ==========================================
        // MANAGE ARTICLES LOGIC
        // ==========================================
        // ==========================================
        // CONTENT MANAGEMENT LOGIC (REFACTORED)
        // ==========================================
        let manageState = {
            prasangPage: 0,
            paravaniPage: 0,
            prasangEnd: false,
            paravaniEnd: false,
            limit: 10,
            tabsInitialized: false
        };

        // Bulk selection state
        let selectedPrasangs = new Set();
        let selectedParavanis = new Set();

        function updateBulkBar(type) {
            const set = type === 'prasang' ? selectedPrasangs : selectedParavanis;
            const bar = document.getElementById(type === 'prasang' ? 'prasangBulkBar' : 'paravaniBulkBar');
            const countEl = document.getElementById(type === 'prasang' ? 'prasangSelectedCount' : 'paravaniSelectedCount');
            if (bar) bar.style.display = set.size > 0 ? 'flex' : 'none';
            if (countEl) countEl.textContent = `${set.size} selected`;
        }

        async function bulkAction(type, action) {
            const set = type === 'prasang' ? selectedPrasangs : selectedParavanis;
            const ids = Array.from(set);
            if (ids.length === 0) return;

            if (action === 'delete') {
                if (!confirm(`Permanently delete ${ids.length} article(s)?`)) return;
                try {
                    await fetch('/api/articles', { method: 'DELETE', headers: adminHeaders(), body: JSON.stringify({ ids }) });
                } catch (e) { console.error('Bulk delete error', e); }
            } else {
                const updates = action === 'publish' ? { public: true, status: 'published' } : { public: false, status: 'draft' };
                const label = action === 'publish' ? 'Publish' : 'Unpublish';
                if (!confirm(`${label} ${ids.length} article(s)?`)) return;
                try {
                    await fetch('/api/articles', { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify({ ids, updates }) });
                } catch (e) { console.error('Bulk patch error', e); }
            }

            set.clear();
            updateBulkBar(type);
            if (type === 'prasang') loadAdminPrasangs(true); else loadAdminParavanis(true);
        }

        function initManageTabsInternal() {
            if (manageState.tabsInitialized) return;
            
            const tabs = document.querySelectorAll('.manage-subtab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const target = tab.getAttribute('data-target');
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    document.querySelectorAll('.manage-section').forEach(sec => {
                        sec.style.display = 'none';
                        sec.classList.remove('active');
                    });
                    
                    const targetEl = document.getElementById(target);
                    if (targetEl) {
                        targetEl.style.display = 'block';
                        targetEl.classList.add('active');
                    }
                    
                    if (target === 'manage-prasangs') loadAdminPrasangs(true);
                    if (target === 'manage-paravanis') loadAdminParavanis(true);
                    if (target === 'manage-albums') loadAdminAlbums();
                });
            });

            // Search listeners
            document.getElementById('prasangSearchInput')?.addEventListener('input', debounce(() => loadAdminPrasangs(true), 300));
            document.getElementById('paravaniSearchInput')?.addEventListener('input', debounce(() => loadAdminParavanis(true), 300));
            document.getElementById('prasangSortBy')?.addEventListener('change', () => loadAdminPrasangs(true));
            document.getElementById('prasangStatusFilter')?.addEventListener('change', () => loadAdminPrasangs(true));
            document.getElementById('albumFilter')?.addEventListener('change', () => loadAdminParavanis(true));
            document.getElementById('paravaniSortBy')?.addEventListener('change', () => loadAdminParavanis(true));
            document.getElementById('paravaniStatusFilter')?.addEventListener('change', () => loadAdminParavanis(true));

            // Load more listeners
            document.getElementById('loadMorePrasangs')?.addEventListener('click', () => loadAdminPrasangs(false));
            document.getElementById('loadMoreParavanis')?.addEventListener('click', () => loadAdminParavanis(false));

            // Select-all checkboxes
            document.getElementById('selectAllPrasangs')?.addEventListener('change', (e) => {
                const checked = e.target.checked;
                document.querySelectorAll('#adminPrasangsList .row-checkbox').forEach(cb => {
                    cb.checked = checked;
                    if (checked) selectedPrasangs.add(cb.dataset.id); else selectedPrasangs.delete(cb.dataset.id);
                });
                updateBulkBar('prasang');
            });
            document.getElementById('selectAllParavanis')?.addEventListener('change', (e) => {
                const checked = e.target.checked;
                document.querySelectorAll('#adminParavanisList .row-checkbox').forEach(cb => {
                    cb.checked = checked;
                    if (checked) selectedParavanis.add(cb.dataset.id); else selectedParavanis.delete(cb.dataset.id);
                });
                updateBulkBar('paravani');
            });

            // Bulk action buttons
            document.getElementById('bulkPublishPrasang')?.addEventListener('click', () => bulkAction('prasang', 'publish'));
            document.getElementById('bulkUnpublishPrasang')?.addEventListener('click', () => bulkAction('prasang', 'unpublish'));
            document.getElementById('bulkDeletePrasang')?.addEventListener('click', () => bulkAction('prasang', 'delete'));
            document.getElementById('bulkDeselectPrasang')?.addEventListener('click', () => { selectedPrasangs.clear(); document.getElementById('selectAllPrasangs').checked = false; document.querySelectorAll('#adminPrasangsList .row-checkbox').forEach(cb => cb.checked = false); updateBulkBar('prasang'); });

            document.getElementById('bulkPublishParavani')?.addEventListener('click', () => bulkAction('paravani', 'publish'));
            document.getElementById('bulkUnpublishParavani')?.addEventListener('click', () => bulkAction('paravani', 'unpublish'));
            document.getElementById('bulkDeleteParavani')?.addEventListener('click', () => bulkAction('paravani', 'delete'));
            document.getElementById('bulkDeselectParavani')?.addEventListener('click', () => { selectedParavanis.clear(); document.getElementById('selectAllParavanis').checked = false; document.querySelectorAll('#adminParavanisList .row-checkbox').forEach(cb => cb.checked = false); updateBulkBar('paravani'); });

            manageState.tabsInitialized = true;
        }

        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        async function loadAdminPrasangs(reset = true) {
            const listObj = document.getElementById('adminPrasangsList');
            if (reset) {
                manageState.prasangPage = 0;
                manageState.prasangEnd = false;
                selectedPrasangs.clear();
                updateBulkBar('prasang');
                const selectAll = document.getElementById('selectAllPrasangs');
                if (selectAll) selectAll.checked = false;
                listObj.innerHTML = '<tr><td colspan="6" class="table-loading">Loading prasangs...</td></tr>';
            }
            
            try {
                const term = document.getElementById('prasangSearchInput')?.value.trim() || '';
                const sortBy = document.getElementById('prasangSortBy')?.value || '';
                const statusFilter = document.getElementById('prasangStatusFilter')?.value || '';
                let url = `/api/articles?type=prasang&page=${manageState.prasangPage}&limit=${manageState.limit}&t=${Date.now()}`;
                if (term) url += `&search=${encodeURIComponent(term)}`;
                if (sortBy && sortBy !== 'latest') url += `&sortBy=${encodeURIComponent(sortBy)}`;
                if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

                const res = await fetch(url);
                const articles = await res.json();
                
                renderArticleList('adminPrasangsList', articles, 'prasang', reset);
                
                const btn = document.getElementById('loadMorePrasangs');
                if (articles.length < manageState.limit) {
                    manageState.prasangEnd = true;
                    if (btn) btn.style.display = 'none';
                } else {
                    if (btn) btn.style.display = 'block';
                    manageState.prasangPage++;
                }
            } catch (error) {
                console.error("Failed to load prasangs", error);
            }
        }

        async function loadAdminParavanis(reset = true) {
            const listObj = document.getElementById('adminParavanisList');
            if (reset) {
                manageState.paravaniPage = 0;
                manageState.paravaniEnd = false;
                selectedParavanis.clear();
                updateBulkBar('paravani');
                const selectAll = document.getElementById('selectAllParavanis');
                if (selectAll) selectAll.checked = false;
                listObj.innerHTML = '<tr><td colspan="6" class="table-loading">Loading paravanis...</td></tr>';
            }
            
            try {
                const album = document.getElementById('albumFilter').value;
                const term = document.getElementById('paravaniSearchInput')?.value.trim() || '';
                const sortBy = document.getElementById('paravaniSortBy')?.value || '';
                const statusFilter = document.getElementById('paravaniStatusFilter')?.value || '';
                
                let url = `/api/articles?type=paravani&page=${manageState.paravaniPage}&limit=${manageState.limit}&t=${Date.now()}`;
                if (album) url += `&album=${encodeURIComponent(album)}`;
                if (term) url += `&search=${encodeURIComponent(term)}`;
                if (sortBy && sortBy !== 'latest') url += `&sortBy=${encodeURIComponent(sortBy)}`;
                if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
                
                const res = await fetch(url);
                const articles = await res.json();
                
                renderArticleList('adminParavanisList', articles, 'paravani', reset);
                
                const btn = document.getElementById('loadMoreParavanis');
                if (articles.length < manageState.limit) {
                    manageState.paravaniEnd = true;
                    if (btn) btn.style.display = 'none';
                } else {
                    if (btn) btn.style.display = 'block';
                    manageState.paravaniPage++;
                }
                
                if (reset) updateAlbumFilter();
            } catch (error) {
                console.error("Failed to load paravanis", error);
            }
        }

        function renderArticleList(containerId, articles, type, reset) {
            const listObj = document.getElementById(containerId);
            if (!listObj) return;
            const selSet = type === 'prasang' ? selectedPrasangs : selectedParavanis;
            
            if (reset) listObj.innerHTML = '';
            
            if (articles.length === 0 && reset) {
                listObj.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No ${type}s found.</td></tr>`;
                return;
            }

            articles.forEach(art => {
                const tr = document.createElement('tr');
                
                let dateHtml = '';
                if (art.createdAt) {
                    dateHtml += `C: ${new Date(art.createdAt).toLocaleDateString()}`;
                } else {
                    dateHtml += `C: ${new Date(Number(art.id)).toLocaleDateString()}`;
                }
                
                if (art.updatedAt) {
                    dateHtml += `<br><span style="opacity: 0.7; font-size: 0.8rem;">M: ${new Date(art.updatedAt).toLocaleDateString()}</span>`;
                }
                
                const isDraft = art.status === 'draft';
                const isPublic = !isDraft && art.public !== false && art.public !== 'no';
                const statusBadge = isDraft 
                    ? '<span class="status-badge status-draft">Draft</span>'
                    : '<span class="status-badge status-published">Published</span>';
                
                const detailStr = type === 'prasang' 
                    ? `<span class="author-badge">${art.author || 'Unknown'}</span>`
                    : `<span class="album-badge">${art.album || 'No Album'}</span>`;

                const isChecked = selSet.has(String(art.id)) ? 'checked' : '';

                const detailLabel = type === 'prasang' ? 'Author' : 'Album';
                tr.innerHTML = `
                    <td><input type="checkbox" class="row-checkbox" data-id="${art.id}" ${isChecked} /></td>
                    <td data-label="Title" style="font-weight:500;">${art.title || 'Untitled'}</td>
                    <td data-label="Status">${statusBadge}</td>
                    <td data-label="${detailLabel}">${detailStr}</td>
                    <td data-label="Date" style="color:var(--text-muted); font-size:0.85rem; line-height:1.4;">${dateHtml}</td>
                    <td style="text-align:right; white-space:nowrap;">
                        <a href="admin.html?editId=${art.id}" class="table-action-btn edit">Edit</a>
                        <button class="table-action-btn delete delete-btn" data-id="${art.id}" style="margin-left:0.4rem;">Delete</button>
                    </td>
                `;
                listObj.appendChild(tr);
            });

            // Wire row checkboxes
            listObj.querySelectorAll('.row-checkbox').forEach(cb => {
                cb.onchange = () => {
                    if (cb.checked) selSet.add(cb.dataset.id); else selSet.delete(cb.dataset.id);
                    updateBulkBar(type);
                };
            });
            
            // Attach delete listeners
            listObj.querySelectorAll('.delete-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (confirm('Permanently delete this item?')) {
                        await fetch('/api/articles?id=' + encodeURIComponent(id), { method: 'DELETE', headers: adminHeaders() });
                        if (type === 'prasang') loadAdminPrasangs(true);
                        else loadAdminParavanis(true);
                    }
                };
            });
        }

        async function updateAlbumFilter() {
            const select = document.getElementById('albumFilter');
            if (!select) return;
            const currentVal = select.value;
            
            try {
                const res = await fetch('/api/articles?type=paravani&t=' + Date.now());
                const paravanis = await res.json();
                const albums = [...new Set(paravanis.map(p => p.album).filter(Boolean))].sort();
                
                select.innerHTML = '<option value="">All Albums</option>';
                albums.forEach(al => {
                    const opt = document.createElement('option');
                    opt.value = al;
                    opt.textContent = al;
                    select.appendChild(opt);
                });
                select.value = currentVal;
            } catch (err) { console.warn("Fail sync album filter", err); }
        }

        async function loadAdminAlbums() {
            const listObj = document.getElementById('adminAlbumsList');
            if (!listObj) return;
            listObj.innerHTML = '<tr><td colspan="3" class="table-loading">Loading albums...</td></tr>';
            
            try {
                const res = await fetch('/api/articles?type=paravani&t=' + Date.now());
                const allParavanis = await res.json();
                
                const albumCounts = {};
                allParavanis.forEach(p => {
                    if (p.album) albumCounts[p.album] = (albumCounts[p.album] || 0) + 1;
                });
                
                const albums = Object.keys(albumCounts).sort();
                listObj.innerHTML = '';
                
                if (albums.length === 0) {
                    listObj.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">No albums found.</td></tr>';
                    return;
                }

                albums.forEach(album => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight: 600; color: var(--gold-400);">${album}</td>
                        <td style="color: var(--text-muted);">${albumCounts[album]} articles</td>
                        <td style="text-align: right;">
                            <button class="rename-btn" onclick="promptRenameAlbum('${album.replace(/'/g, "\\'")}')">Rename</button>
                        </td>
                    `;
                    listObj.appendChild(tr);
                });
            } catch (err) {
                console.error("Failed to load albums", err);
            }
        }

        window.promptRenameAlbum = async (oldName) => {
            const newName = prompt(`Rename album "${oldName}" to:`, oldName);
            if (newName && newName !== oldName) {
                if (confirm(`This will rename the album in all ${oldName} articles. Proceed?`)) {
                    await renameAlbum(oldName, newName);
                }
            }
        };

        async function renameAlbum(oldName, newName) {
            try {
                const res = await fetch(`/api/articles?type=paravani&album=${encodeURIComponent(oldName)}&t=${Date.now()}`);
                const articlesToUpdate = await res.json();
                
                if (articlesToUpdate.length === 0) return alert("No articles found in this album.");
                
                let successCount = 0;
                for (const art of articlesToUpdate) {
                    art.album = newName;
                    const saveRes = await fetch('/api/articles', {
                        method: 'POST',
                        headers: adminHeaders(),
                        body: JSON.stringify(art)
                    });
                    if (saveRes.ok) successCount++;
                }
                
                alert(`Successfully renamed ${successCount} articles to album "${newName}"`);
                loadAdminAlbums();
            } catch (err) {
                console.error("Rename failed", err);
                alert("An error occurred during renaming.");
            }
        }

        

    } else {
        adminApp.style.display = 'none';
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('adminId').value;
                const pass = document.getElementById('adminPassword').value;
                const apiToken = document.getElementById('adminApiToken')?.value.trim() || '';
                if (id === 'admin' && pass === 'hariamrut') {
                    localStorage.setItem('hk_isAdmin', 'true');
                    // Store the API token in sessionStorage (cleared on tab close)
                    if (apiToken) sessionStorage.setItem('hk_admin_token', apiToken);
                    window.location.reload();
                } else {
                    if (loginError) loginError.style.display = 'block';
                }
            });
        }
    }
});