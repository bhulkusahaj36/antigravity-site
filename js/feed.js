// ============================================================
// FEED PAGE — Tabs + Conditional fields + Browse logic
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    wireDateRadio('add');
    wireDateRadio('br');

    /* ── Add Form submit ─────────────────────────────────────── */
    const addForm = document.getElementById('addForm');
    const addFeedback = document.getElementById('add-feedback');

    if (addForm) {
        addForm.addEventListener('submit', async e => {
            e.preventDefault();
            const title = document.getElementById('add-title').value.trim();
            const content = document.getElementById('add-content').value.trim();

            if (!title || !content) {
                showFeedback(addFeedback, 'error', 'શીર્ષક અને સંદેશ ભરવા જરૂરી છે.');
                return;
            }

            // Build article object
            const article = {
                id: String(Date.now()),
                title,
                content,
                author: document.getElementById('add-author').value.trim() || 'અજ્ઞાત',
                source: Array.from(document.getElementById('add-source').selectedOptions).map(o => o.value).filter(v => v).join(','),
                topic: Array.from(document.getElementById('add-topic').selectedOptions).map(o => o.value).filter(v => v).join(','),
                prasang: Array.from(document.getElementById('add-prasang').selectedOptions).map(o => o.value).filter(v => v).join(','),
                date: getDateValue('add'),
                location: document.getElementById('add-location') ? document.getElementById('add-location').value.trim() : '',
                featured: false,
                category: Array.from(document.getElementById('add-topic').selectedOptions).map(o => o.value).filter(v => v).join(',') || 'bhakti',
            };

            // Save to Azure API
            try {
                const response = await fetch('/api/articles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(article)
                });

                if (response.ok) {
                    showFeedback(addFeedback, 'success', '✓ પ્રસંગ સફળતાપૂર્વક ઉમેરાયો!');
                    addForm.reset();

                    // Hide all conditional fields
                    document.querySelectorAll('#panel-add .feed-conditional').forEach(el => { el.style.display = 'none'; });
                    document.querySelectorAll('#panel-add [name="add-date-type"][value="none"]').forEach(r => { r.checked = true; });
                    document.getElementById('add-date-single').style.display = 'none';
                    document.getElementById('add-date-range').style.display = 'none';
                } else {
                    const errorText = await response.text();
                    showFeedback(addFeedback, 'error', 'Error saving article to the database: ' + errorText);
                }
            } catch (error) {
                console.error("API error:", error);
                showFeedback(addFeedback, 'error', 'Error connecting to the database: ' + error.message);
            }

        });
    }

    /* ── Browse / Filter ─────────────────────────────────────── */
    const browseBtn = document.getElementById('browseSearchBtn');
    const browseReset = document.getElementById('browseResetBtn');
    const browseGrid = document.getElementById('browseResults');
    const browseEmpty = document.getElementById('browseEmpty');

    function getDateValue(prefix) {
        const type = document.querySelector(`[name="${prefix}-date-type"]:checked`)?.value;
        if (type === 'date') return document.getElementById(`${prefix}-date-val`)?.value || '';
        if (type === 'range') return {
            from: document.getElementById(`${prefix}-date-from`)?.value || '',
            to: document.getElementById(`${prefix}-date-to`)?.value || '',
        };
        return null;
    }

    function renderCards(articles) {
        browseGrid.innerHTML = '';
        browseEmpty.style.display = articles.length ? 'none' : '';
        articles.forEach(a => {
            const card = document.createElement('div');
            card.className = 'article-card card-animate';
            card.innerHTML = `
          <h3 class="card-title">${a.title}</h3>
          <div class="card-footer">
            <a href="article.html?id=${a.id || ''}" class="read-more">વધુ વાંચો</a>
          </div>`;
            browseGrid.appendChild(card);
        });
    }

    async function runFilter() {
        const source = document.getElementById('br-source').value;
        const topic = document.getElementById('br-topic').value;
        const prasang = document.getElementById('br-prasang').value;
        const dateVal = getDateValue('br');

        let articles = [];
        try {
            const res = await fetch('/api/articles?t=' + Date.now());
            if (res.ok) {
                articles = await res.json();
            }
        } catch (error) {
            console.error("Failed to load articles from database:", error);
        }

        // Also include static ARTICLES from data.js if available
        if (typeof ARTICLES !== 'undefined') articles = [...ARTICLES, ...articles];

        if (source) articles = articles.filter(a => !a.source || a.source === source);
        if (topic) articles = articles.filter(a => !a.topic || a.category === topic || a.topic === topic);
        if (prasang) articles = articles.filter(a => !a.prasang || a.prasang === prasang);

        if (dateVal && typeof dateVal === 'string' && dateVal) {
            articles = articles.filter(a => a.date === dateVal);
        } else if (dateVal && typeof dateVal === 'object' && dateVal.from) {
            articles = articles.filter(a => {
                if (!a.date) return true;
                const d = typeof a.date === 'string' ? a.date : a.date.from;
                return d >= dateVal.from && d <= dateVal.to;
            });
        }

        renderCards(articles);
    }

    if (browseBtn) {
        browseBtn.addEventListener('click', runFilter);
    }

    if (browseReset) {
        browseReset.addEventListener('click', () => {
            document.getElementById('br-source').selectedIndex = 0;
            document.getElementById('br-topic').selectedIndex = 0;
            document.getElementById('br-prasang').selectedIndex = 0;
            document.querySelectorAll('#panel-browse .feed-conditional').forEach(el => { el.style.display = 'none'; });
            document.querySelectorAll('#panel-browse [name="br-date-type"][value="none"]').forEach(r => { r.checked = true; });
            document.getElementById('br-date-single').style.display = 'none';
            document.getElementById('br-date-range').style.display = 'none';
            browseGrid.innerHTML = '';
            browseEmpty.style.display = 'none';
        });
    }

    /* ── Utility ─────────────────────────────────────────────── */
    function showFeedback(el, type, msg) {
        el.className = 'form-feedback ' + type;
        el.textContent = msg;
        el.style.display = '';
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }

});
