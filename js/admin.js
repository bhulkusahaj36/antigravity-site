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
        // TAB SWITCHING LOGIC
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
                panels.forEach(p => {
                    p.classList.remove('active', 'fade-in');
                    p.style.display = 'none';
                });

                tab.classList.add('active');
                tab.style.borderBottomColor = 'var(--gold-400)';
                tab.style.color = 'var(--gold-400)';

                const targetId = tab.getAttribute('data-target');
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.style.display = 'block';
                    setTimeout(() => targetPanel.classList.add('active', 'fade-in'), 10);
                }

                if (targetId === 'panel-manage') {
                    loadAdminArticles();
                } else if (targetId === 'panel-dashboard') {
                    loadDashboardAnalytics();
                } else if (targetId === 'panel-tasks') {
                    renderTasks();
                } else if (targetId === 'panel-sync') {
                    initSyncTool();
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

        function renderActivityChart(articles, filter) {
            const ctx = document.getElementById('activityChart');
            if (!ctx) return;
            const counts = {};
            const now = new Date();
            let labels = [];
            let formatKey = (d) => '';

            if (filter === '1D') {
                labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
                formatKey = (d) => `${d.getHours().toString().padStart(2, '0')}:00`;
            } else if (filter === '1W') {
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                formatKey = (d) => days[d.getDay()];
            } else {
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
                formatKey = (d) => d.getDate().toString();
            }

            labels.forEach(l => counts[l] = 0);
            articles.forEach(art => {
                const dt = new Date(Number(art.id));
                if (isNaN(dt.getTime())) return;
                const key = formatKey(dt);
                if (counts[key] !== undefined) counts[key]++;
            });

            const dataPoints = labels.map(l => counts[l]);
            const totalCount = dataPoints.reduce((sum, curr) => sum + curr, 0);
            const totalSpan = document.getElementById('activityTotalCount');
            if (totalSpan) totalSpan.innerText = `Total: ${totalCount}`;

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
                options: { responsive: true, maintainAspectRatio: false }
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
                cats.forEach(c => { const label = topicLabels[c] || c; counts[label] = (counts[label] || 0) + 1; });
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
                'bhagwan': 'ભગવાન સ્વામિનારાયણ', 'gunatit': 'ગુણાતીતાનંદ સ્વામી', 'bhagatji': 'ભગતજી મહારાજ',
                'shastriji': 'શાસ્ત્રીજી મહારાજ', 'yogiji': 'યોગીજી મહારાજ', 'hariprasad': 'હરિપ્રસાદ સ્વામીજી મહારાજ',
                'prabodh': 'પ્રબોધ સ્વામીજી', 'bhakto': 'ભક્તો', 'prabhudasbhai': 'પ્રભુદાસભાઈ'
            };

            // Merge custom prasangs
            if (typeof getCustomTags === 'function') {
                const custom = getCustomTags();
                (custom.prasang || []).forEach(t => { if (!guruLabels[t.value]) guruLabels[t.value] = t.label; });
            }
            const counts = {};
            articles.forEach(art => {
                const pIds = (art.prasang || '').split(',').map(s => s.trim()).filter(Boolean);
                pIds.forEach(id => { const label = guruLabels[id] || id; counts[label] = (counts[label] || 0) + 1; });
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
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }

        // ==========================================
        // TASKS MANAGEMENT SYSTEM
        // ==========================================
        let adminTasks = JSON.parse(localStorage.getItem('hk_admin_tasks') || '[]');

        function saveTasks() {
            localStorage.setItem('hk_admin_tasks', JSON.stringify(adminTasks));
            renderTasks();
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

        function renderTasks() {
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
                taskEl.style.cssText = `background: rgba(17, 24, 39, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;`;
                
                taskEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div>
                            <h4 style="color: var(--text-light); margin: 0; font-size: 1.2rem;">${task.name}</h4>
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0;">Deadline: ${deadline.toLocaleDateString()}</p>
                            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                                <span style="padding: 0.1rem 0.6rem; background: ${statusColor}22; color: ${statusColor}; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${statusText}</span>
                                <span style="padding: 0.1rem 0.6rem; background: rgba(251, 191, 36, 0.1); color: var(--gold-400); border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${task.priority}</span>
                            </div>
                        </div>
                        <button class="btn btn-outline" onclick="deleteTask(${index})" style="color: #ef4444; border-color: #ef4444; padding: 0.25rem 0.75rem; font-size: 0.8rem;">Delete</button>
                    </div>

                    <div style="margin: 1.25rem 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
                            <span>Progress</span>
                            <span>${progress}%</span>
                        </div>
                        <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, #fbbf24, #f59e0b); transition: width 0.4s ease;"></div>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <input type="text" id="subtask-input-${index}" placeholder="New subtask..." style="flex: 1; height: 28px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: white; padding: 0 0.5rem; font-size: 0.85rem;" />
                            <button onclick="addSubtask(${index})" class="btn btn-primary" style="height: 28px; padding: 0 0.75rem; font-size: 0.75rem;">Add</button>
                        </div>
                        <div id="subtask-list-${index}">
                            ${(task.subtasks || []).map((st, si) => `
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                    <input type="checkbox" ${st.completed ? 'checked' : ''} onchange="toggleSubtask(${index}, ${si})" />
                                    <span style="flex: 1; font-size: 0.85rem; color: ${st.completed ? 'var(--text-muted)' : 'var(--text-light)'}; text-decoration: ${st.completed ? 'line-through' : 'none'};">${st.name}</span>
                                    <button onclick="removeSubtask(${index}, ${si})" style="background:none; border:none; color: #ef4444; cursor:pointer; font-size: 1.1rem; line-height: 1;">&times;</button>
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
        async function loadAdminArticles() {
            const listObj = document.getElementById('adminArticlesList');
            if (!listObj) return;
            listObj.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading...</td></tr>';
            try {
                const response = await fetch('/api/articles?t=' + Date.now());
                const articles = await response.json();
                if (articles.length === 0) {
                    listObj.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">No articles found.</td></tr>';
                    return;
                }
                articles.sort((a, b) => Number(b.id) - Number(a.id));
                listObj.innerHTML = '';
                articles.forEach(art => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    const dateStr = new Date(Number(art.id)).toLocaleDateString();
                    
                    const isPublic = art.public !== false && art.public !== 'no';
                    const eyeIconStr = isPublic ? '👁️' : '🚫';
                    const iconColor = isPublic ? 'var(--gold-400)' : '#ef4444';
                    
                    tr.innerHTML = `
                        <td style="padding: 1rem 0.5rem; color: var(--text-light); font-weight: 500;">${art.title || 'Untitled'}</td>
                        <td style="padding: 1rem 0.5rem; color: var(--text-muted);">
                            ${art.author || 'અજ્ઞાત'}
                            <button class="toggle-public-btn" data-id="${art.id}" data-public="${isPublic}" style="padding: 0.2rem 0.4rem; font-size: 0.9rem; margin-left: 0.4rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; background: rgba(0,0,0,0.2); cursor: pointer; color: ${iconColor};" title="Toggle Visibility: ${isPublic ? 'Public' : 'Hidden'}">${eyeIconStr}</button>
                        </td>
                        <td style="padding: 1rem 0.5rem; color: var(--text-muted);">${dateStr}</td>
                        <td style="padding: 1rem 0.5rem; text-align: right;">
                            <a href="admin.html?editId=${art.id}" class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.85rem; color: var(--gold-400); border-color: var(--gold-400); margin-right: 0.5rem;">Edit</a>
                            <button class="btn btn-outline delete-btn" data-id="${art.id}" style="padding: 0.25rem 0.75rem; font-size: 0.85rem; color: #ef4444; border-color: #ef4444;">Delete</button>
                        </td>
                    `;
                    listObj.appendChild(tr);
                });
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        if (confirm('Delete article?')) {
                            await fetch('/api/articles?id=' + encodeURIComponent(id), { method: 'DELETE' });
                            loadAdminArticles();
                        }
                    });
                });

                document.querySelectorAll('.toggle-public-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.getAttribute('data-id');
                        const currentlyPublic = e.currentTarget.getAttribute('data-public') === 'true';
                        if (confirm(`Change visibility to ${currentlyPublic ? 'Private/Hidden' : 'Public'}?`)) {
                            try {
                                const res = await fetch('/api/articles?t=' + Date.now());
                                const allArts = await res.json();
                                const artToUpdate = allArts.find(a => String(a.id) === String(id));
                                if (artToUpdate) {
                                    artToUpdate.public = !currentlyPublic;
                                    await fetch('/api/articles', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(artToUpdate)
                                    });
                                    loadAdminArticles();
                                }
                            } catch (err) { console.error("Visibility toggle failed", err); }
                        }
                    });
                });
            } catch (e) { console.error(e); }
        }
        
        // Search functionality
        const searchInput = document.getElementById('adminSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#adminArticlesList tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        }
    } else {
        adminDashboard.style.display = 'none';
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('adminId').value;
                const pass = document.getElementById('adminPassword').value;
                if (id === 'admin' && pass === 'hariamrut') {
                    localStorage.setItem('hk_isAdmin', 'true');
                    window.location.reload();
                } else {
                    loginError.style.display = 'block';
                }
            });
        }
    }
});