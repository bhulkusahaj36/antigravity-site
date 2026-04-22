// ============================================================
// SEARCH PAGE — Premium v2
// ============================================================

const SEARCH_PAGE_SIZE = 12;
let allResults = [];
let displayedCount = 0;
let searchDebounceTimer = null;
let cachedArticles = null;

// ── Fetch all articles once and cache ──────────────────────────
async function fetchAllArticles() {
    if (cachedArticles) return cachedArticles;
    try {
        const res = await fetch('/api/articles');
        if (res.ok) {
            const data = await res.json();
            const dynamic = Array.isArray(data) ? data : (data.items || []);
            const staticArt = typeof ARTICLES !== 'undefined' ? ARTICLES : [];
            const dynamicIds = new Set(dynamic.map(a => String(a.id)));
            cachedArticles = [...staticArt.filter(a => !dynamicIds.has(String(a.id))), ...dynamic];
            cachedArticles = cachedArticles.filter(a => a.public !== false && a.public !== 'no');
        }
    } catch (err) {
        console.error('Failed to load articles:', err);
        cachedArticles = typeof ARTICLES !== 'undefined' ? [...ARTICLES].filter(a => a.public !== false && a.public !== 'no') : [];
    }
    return cachedArticles || [];
}

// ── Build premium search result card ──────────────────────────
function buildSearchCard(a, q) {
    let snippetHtml = '';
    if (q && a.content) {
        const clean = a.content.replace(/<[^>]*>?/gm, '');
        const idx = clean.toLowerCase().indexOf(q.toLowerCase());
        if (idx !== -1) {
            const start = Math.max(0, idx - 80);
            const end = Math.min(clean.length, idx + q.length + 120);
            let snip = (start > 0 ? '…' : '') + clean.substring(start, end) + (end < clean.length ? '…' : '');
            snip = snip.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                '<mark class="search-highlight">$1</mark>');
            snippetHtml = snip;
        }
    }
    if (!snippetHtml) {
        const plain = (a.excerpt || a.content || '').replace(/<[^>]*>?/gm, '');
        snippetHtml = plain.substring(0, 220).trim() + (plain.length > 220 ? '…' : '');
    }

    const card = buildCard({ ...a, excerpt: snippetHtml });
    return card;
}

// ── Render next batch of results ──────────────────────────────
function renderBatch() {
    const grid = document.getElementById('searchResults');
    const loadMoreWrap = document.getElementById('loadMoreWrap');
    const batch = allResults.slice(displayedCount, displayedCount + SEARCH_PAGE_SIZE);
    const q = document.getElementById('searchInput').value.trim().toLowerCase();

    batch.forEach((a, i) => {
        const card = buildSearchCard(a, q);
        if (!card) return;
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`;
        grid.appendChild(card);
        requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    });

    displayedCount += batch.length;

    // Update Load More button
    const remaining = allResults.length - displayedCount;
    if (loadMoreWrap) {
        if (remaining > 0) {
            loadMoreWrap.style.display = 'flex';
            const btn = document.getElementById('loadMoreBtn');
            if (btn) btn.innerHTML = `
                <span>વધુ લોડ કરો</span>
                <span class="lm-count">${remaining} બાકી</span>
            `;
        } else {
            loadMoreWrap.style.display = 'none';
        }
    }
}

// ── Main search function ──────────────────────────────────────
async function doSearch() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const grid = document.getElementById('searchResults');
    const empty = document.getElementById('emptyState');
    const summary = document.getElementById('searchSummary');
    const loadMoreWrap = document.getElementById('loadMoreWrap');

    // Show skeleton loader
    grid.innerHTML = '';
    if (loadMoreWrap) loadMoreWrap.style.display = 'none';
    empty.style.display = 'none';
    summary.innerHTML = '';

    for (let i = 0; i < 6; i++) {
        const sk = document.createElement('div');
        sk.className = 'search-skeleton';
        sk.innerHTML = `
            <div class="sk-line sk-title"></div>
            <div class="sk-line sk-tag"></div>
            <div class="sk-line sk-body"></div>
            <div class="sk-line sk-body short"></div>
        `;
        grid.appendChild(sk);
    }

    // Collect filters
    const typeSel = document.getElementById('br-type');
    const typeVal = typeSel?.value || '';
    const typeText = typeSel && typeSel.value ? typeSel.options[typeSel.selectedIndex].text : '';

    const sourceOpts = Array.from(document.getElementById('br-source').selectedOptions).filter(o => o.value);
    const sources = sourceOpts.map(o => o.value);
    const sourcesText = sourceOpts.map(o => o.text);

    const topicOpts = Array.from(document.getElementById('br-topic').selectedOptions).filter(o => o.value);
    const topics = topicOpts.map(o => o.value);
    const topicsText = topicOpts.map(o => o.text);

    const prasangOpts = Array.from(document.getElementById('br-prasang').selectedOptions).filter(o => o.value);
    const prasangs = prasangOpts.map(o => o.value);
    const prasangsText = prasangOpts.map(o => o.text);

    const dateVal = typeof getDateValue === 'function' ? getDateValue('br') : null;

    let results = await fetchAllArticles();

    // Type filter
    if (typeVal === 'paravani') results = results.filter(a => a.type === 'paravani');
    if (typeVal === 'prasang') results = results.filter(a => a.type !== 'paravani');

    function fieldMatches(prop, selections) {
        if (!selections.length) return true;
        if (!prop) return false;
        const parts = typeof prop === 'string' ? prop.split(',').map(s => s.trim()) : prop;
        return selections.some(s => parts.includes(s));
    }

    if (sources.length) results = results.filter(a => fieldMatches(a.source, sources));
    if (topics.length) results = results.filter(a => fieldMatches(a.category, topics) || fieldMatches(a.topic, topics));
    if (prasangs.length) results = results.filter(a => fieldMatches(a.prasang, prasangs));

    if (dateVal && typeof dateVal === 'string') {
        results = results.filter(a => a.date === dateVal || a.publishDate === dateVal);
    } else if (dateVal?.from) {
        results = results.filter(a => {
            const d = a.date || a.publishDate || '';
            return !d || (d >= dateVal.from && d <= dateVal.to);
        });
    }

    if (q) {
        results = results.filter(a =>
            a.title?.toLowerCase().includes(q) ||
            a.content?.toLowerCase().includes(q) ||
            a.excerpt?.toLowerCase().includes(q) ||
            a.tags?.some(t => t.toLowerCase().includes(q))
        );
    }

    // Sort newest first
    results.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));

    grid.innerHTML = '';

    const hasSearch = q || sources.length || topics.length || prasangs.length || dateVal;

    if (!hasSearch) {
        // Show all on empty query
        allResults = results;
    } else {
        allResults = results;
    }

    displayedCount = 0;

    if (allResults.length === 0) {
        if (hasSearch) {
            empty.style.display = 'block';
        }
        return;
    }

    // Result count bar
    const activeFilters = [
        q ? `"${q}"` : '',
        typeText,
        ...sourcesText, ...topicsText, ...prasangsText,
    ].filter(Boolean);

    summary.innerHTML = `
        <span class="sr-count">${allResults.length}</span>
        <span class="sr-label">results found${activeFilters.length ? ' for ' : ''}</span>
        ${activeFilters.map(f => `<span class="sr-chip">${f}</span>`).join('')}
    `;

    renderBatch();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof wireDateRadio === 'function') wireDateRadio('br');

    // Pre-warm article cache in background
    fetchAllArticles();

    // Pre-fill from URL ?q=
    const urlQ = getParam('q');
    if (urlQ) {
        document.getElementById('searchInput').value = urlQ;
        doSearch();
    } else {
        doSearch();
    }

    // Live debounced search
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(doSearch, 350);
    });

    document.getElementById('searchInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') { clearTimeout(searchDebounceTimer); doSearch(); }
    });

    document.getElementById('searchBtn').addEventListener('click', doSearch);

    // Auto-search on filter change
    document.querySelectorAll('.search-advanced-filters select').forEach(sel =>
        sel.addEventListener('change', doSearch)
    );
    document.querySelectorAll('.date-inputs input[type="date"]').forEach(inp =>
        inp.addEventListener('change', doSearch)
    );
    document.querySelectorAll('input[name="br-date-type"]').forEach(r =>
        r.addEventListener('change', doSearch)
    );

    // Load More
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadMoreBtn.classList.add('loading');
            loadMoreBtn.innerHTML = '<span class="lm-spinner"></span>';
            setTimeout(() => {
                renderBatch();
                loadMoreBtn.classList.remove('loading');
            }, 400);
        });
    }

    // Reset
    document.getElementById('browseResetBtn')?.addEventListener('click', () => {
        document.getElementById('br-type').selectedIndex = 0;
        document.getElementById('br-source').selectedIndex = 0;
        document.getElementById('br-topic').selectedIndex = 0;
        document.getElementById('br-prasang').selectedIndex = 0;
        document.querySelectorAll('.search-advanced-filters select').forEach(s => s.dispatchEvent(new Event('change')));
        document.getElementById('searchInput').value = '';
        document.querySelector('[name="br-date-type"][value="none"]').checked = true;
        document.querySelector('[name="br-date-type"][value="none"]').dispatchEvent(new Event('change'));
        doSearch();
    });
});