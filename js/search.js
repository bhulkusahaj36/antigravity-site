// ============================================================
// SEARCH PAGE
// ============================================================

async function doSearch() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();

    // Advanced filters
    const sources = Array.from(document.getElementById('br-source').selectedOptions).map(o => o.value).filter(v => v);
    const topics = Array.from(document.getElementById('br-topic').selectedOptions).map(o => o.value).filter(v => v);
    const prasangs = Array.from(document.getElementById('br-prasang').selectedOptions).map(o => o.value).filter(v => v);
    const dateVal = getDateValue('br');

    // Combine static ARTICLES and dynamically added hk_articles
    let dynamicArticles = [];
    try {
        const res = await fetch('/api/articles');
        if (res.ok) {
            dynamicArticles = await res.json();
        }
    } catch (err) {
        console.error("Failed to load articles from API:", err);
    }
    let results = [...ARTICLES, ...dynamicArticles];

    // Helper to check overlap between array of selections and a single string OR array property from article
    function matches(articleProp, selections) {
        if (selections.length === 0) return true;
        if (!articleProp) return false;
        const props = typeof articleProp === 'string' ? articleProp.split(',') : articleProp;
        return selections.some(sel => props.includes(sel));
    }

    // Apply exact match dropdown filters via overlap
    if (sources.length > 0) results = results.filter(a => matches(a.source, sources));
    if (topics.length > 0) results = results.filter(a => matches(a.category, topics) || matches(a.topic, topics));
    if (prasangs.length > 0) results = results.filter(a => matches(a.prasang, prasangs));

    // Date filters
    if (dateVal && typeof dateVal === 'string' && dateVal) {
        results = results.filter(a => a.date === dateVal || a.publishDate === dateVal);
    } else if (dateVal && typeof dateVal === 'object' && dateVal.from) {
        results = results.filter(a => {
            const d = typeof a.date === 'string' ? a.date : (a.publishDate || (a.date ? a.date.from : ''));
            if (!d) return true;
            return d >= dateVal.from && d <= dateVal.to;
        });
    }

    // Text query search
    if (q) {
        results = results.filter(a =>
            a.title.toLowerCase().includes(q) ||
            (a.content && a.content.toLowerCase().includes(q)) ||
            (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
            (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
        );
    }

    const hasSearch = q || sources.length > 0 || topics.length > 0 || prasangs.length > 0 || dateVal;

    const grid = document.getElementById('searchResults');
    const summary = document.getElementById('searchSummary');
    const empty = document.getElementById('emptyState');

    grid.innerHTML = '';

    if (!hasSearch) {
        summary.innerHTML = '';
        empty.style.display = 'none';
        return;
    }

    if (results.length === 0) {
        summary.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    const label = q ? `"<strong>${q}</strong>"` : 'ફિલ્ટર્સ';
    summary.innerHTML = `${results.length} પરિણામ ${label} માટે`;

    results.forEach((a, i) => {
        const excerptText = a.excerpt ? a.excerpt : (a.content ? a.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...' : '');

        const card = document.createElement('div');
        card.className = 'article-card card-animate';
        card.innerHTML = `
            <h3 class="card-title">${a.title}</h3>
            <p class="card-excerpt" style="margin-top: 0.4rem;">${excerptText}</p>
            <div class="card-footer">
                <a href="article.html?id=${a.id}" class="read-more">વધુ વાંચો</a>
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('read-more')) {
                window.location.href = `article.html?id=${a.id}`;
            }
        });

        card.style.animationDelay = `${i * 0.07}s`;
        grid.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {

    // Wire the date radio logic (from utils.js)
    if (typeof wireDateRadio === 'function') {
        wireDateRadio('br');
    }

    // Pre-fill from URL ?q=
    const urlQ = getParam('q');
    if (urlQ) {
        document.getElementById('searchInput').value = urlQ;
        doSearch();
    } else {
        // Initial blank search to load all
        doSearch();
    }

    // Search button
    document.getElementById('searchBtn').addEventListener('click', doSearch);

    // Enter key
    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            doSearch();
        }
    });

    // Auto-search when dropdowns change
    document.querySelectorAll('.search-advanced-filters select').forEach(sel => {
        sel.addEventListener('change', doSearch);
    });

    // Auto-search for date inputs
    document.querySelectorAll('.date-inputs input[type="date"]').forEach(inp => {
        inp.addEventListener('change', doSearch);
    });
    document.querySelectorAll('input[name="br-date-type"]').forEach(radio => {
        radio.addEventListener('change', doSearch);
    });

    // Reset filters
    const resetBtn = document.getElementById('browseResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Reset native dropdowns
            document.getElementById('br-source').selectedIndex = 0;
            document.getElementById('br-topic').selectedIndex = 0;
            document.getElementById('br-prasang').selectedIndex = 0;

            // Trigger change so custom select UI updates
            document.querySelectorAll('.search-advanced-filters select.feed-select').forEach(s => {
                s.dispatchEvent(new Event('change'));
            });

            // Reset text query
            document.getElementById('searchInput').value = '';

            // Reset dates
            document.querySelector('[name="br-date-type"][value="none"]').checked = true;
            document.querySelector('[name="br-date-type"][value="none"]').dispatchEvent(new Event('change'));

            doSearch();
        });
    }
});
