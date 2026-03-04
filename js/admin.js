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
                }
            });
        });

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
