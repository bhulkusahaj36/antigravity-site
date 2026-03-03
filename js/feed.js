// ============================================================
// FEED PAGE — Tabs + Conditional fields + Browse logic
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    wireDateRadio('add');
    wireDateRadio('br');

    /* ── Add Form submit ─────────────────────────────────────── */
    const addForm = document.getElementById('addForm');
    const addFeedback = document.getElementById('add-feedback');

    // Initialize Quill Rich Text Editor if container exists
    let quill;
    if (document.getElementById('editor-container')) {
        quill = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'અહીં પ્રસંગ લખો (બુલેટ પોઇન્ટ, બોલ્ડ, વગેરેનો ઉપયોગ કરી શકો છો)...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                    ['clean']
                ]
            }
        });
    }

    /* ── Admin Edit Mode Initialization ──────────────────────── */
    let editingArticleId = null;
    const editId = getParam('editId');
    if (editId && localStorage.getItem('hk_isAdmin') === 'true') {
        editingArticleId = editId;
        document.querySelector('.auth-header h2').textContent = 'પ્રસંગ સંપાદિત કરો (Edit)';
        const submitBtn = document.querySelector('#addForm button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Save Changes';

        // Fetch article and populate form
        fetch('/api/articles?t=' + Date.now())
            .then(res => res.json())
            .then(articles => {
                const article = articles.find(a => String(a.id) === String(editId));
                if (article) {
                    document.getElementById('add-title').value = article.title || '';
                    document.getElementById('add-author').value = article.author || '';
                    document.getElementById('add-location').value = article.location || '';

                    if (quill) {
                        quill.clipboard.dangerouslyPasteHTML(article.content || '');
                    } else if (document.getElementById('add-content')) {
                        document.getElementById('add-content').value = article.content || '';
                    }

                    // Pre-select multiple dropdowns
                    const setMultiSelect = (id, valuesCsv) => {
                        const sel = document.getElementById(id);
                        if (!sel || !valuesCsv) return;
                        const vals = valuesCsv.split(',');
                        Array.from(sel.options).forEach(opt => {
                            opt.selected = vals.includes(opt.value);
                            // Custom dropdown UI sync trigger
                            const csOpt = opt.closest('.cs-wrapper')?.querySelector(`.cs-option[data-value="${opt.value}"]`);
                            if (csOpt) {
                                csOpt.classList.toggle('cs-selected', opt.selected);
                                csOpt.setAttribute('aria-selected', opt.selected);
                            }
                        });
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                    };

                    setMultiSelect('add-source', article.source);
                    setMultiSelect('add-topic', article.topic);
                    setMultiSelect('add-prasang', article.prasang);
                }
            })
            .catch(err => console.error("Error loading article for editing:", err));
    }

    if (addForm) {
        addForm.addEventListener('submit', async e => {
            e.preventDefault();
            const title = document.getElementById('add-title').value.trim();
            let content = '';
            if (quill) {
                content = quill.getText().trim() === '' ? '' : quill.root.innerHTML;
            } else {
                content = document.getElementById('add-content') ? document.getElementById('add-content').value.trim() : '';
            }

            if (!title || !content) {
                showFeedback(addFeedback, 'error', 'શીર્ષક અને સંદેશ ભરવા જરૂરી છે.');
                return;
            }

            // Handle custom dynamic tags if "other" is selected
            let finalSource = Array.from(document.getElementById('add-source').selectedOptions).map(o => o.value).filter(v => v);
            if (finalSource.includes('other')) {
                const otherText = document.getElementById('add-source-other-text')?.value.trim();
                if (otherText) {
                    const slug = 'custom-source-' + Date.now();
                    saveCustomTag('source', slug, otherText);
                    finalSource = finalSource.map(v => v === 'other' ? slug : v);
                }
            }

            let finalTopic = Array.from(document.getElementById('add-topic').selectedOptions).map(o => o.value).filter(v => v);
            if (finalTopic.includes('other')) {
                const otherText = document.getElementById('add-topic-other-text')?.value.trim();
                if (otherText) {
                    const slug = 'custom-topic-' + Date.now();
                    saveCustomTag('topic', slug, otherText);
                    finalTopic = finalTopic.map(v => v === 'other' ? slug : v);
                }
            }

            let finalPrasang = Array.from(document.getElementById('add-prasang').selectedOptions).map(o => o.value).filter(v => v);
            if (finalPrasang.includes('bhakto')) {
                const otherText = document.getElementById('add-prasang-bhakto-text')?.value.trim();
                if (otherText) {
                    const slug = 'custom-prasang-' + Date.now();
                    saveCustomTag('prasang', slug, otherText);
                    finalPrasang = finalPrasang.map(v => v === 'bhakto' ? slug : v);
                }
            }

            // Build article object
            const article = {
                id: editingArticleId || String(Date.now()),
                title,
                content,
                author: document.getElementById('add-author').value.trim() || 'અજ્ઞાત',
                source: finalSource.join(','),
                topic: finalTopic.join(','),
                prasang: finalPrasang.join(','),
                date: getDateValue('add'),
                location: document.getElementById('add-location') ? document.getElementById('add-location').value.trim() : '',
                featured: false,
                category: finalTopic.join(',') || 'bhakti',
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
                    if (quill) {
                        quill.setContents([]);
                    }

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
