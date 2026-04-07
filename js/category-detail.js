// ============================================================
// CATEGORY DETAIL PAGE
// Phase 6: Uses CosmosDB continuation tokens for Load More pagination.
// ============================================================

const CAT_PAGE_SIZE  = 12;
let catSort          = 'latest';
let catId            = '';
let ALL_CAT_ARTICLES = [];
let cat_nextToken    = null;
let cat_isLoading    = false;
let cat_loadedIds    = new Set();

function getSortedCatArticles() {
    let list = ALL_CAT_ARTICLES.filter(a => {
        const fields = (a.category || '') + ',' + (a.topic || '') + ',' + (a.prasang || '');
        return fields.split(',').map(s => s.trim()).includes(catId);
    });
    if (catSort === 'popular') {
        list = list.filter(a => a.featured).concat(list.filter(a => !a.featured));
    } else {
        list.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
    }
    return list;
}

function cat_renderCards(articles) {
    const grid = document.getElementById('catArticlesGrid');
    if (!grid) return;

    articles.forEach((a, i) => {
        if (cat_loadedIds.has(String(a.id))) return;
        cat_loadedIds.add(String(a.id));

        const card = buildCard(a);
        card.style.animationDelay = `${i * 0.06}s`;
        grid.appendChild(card);
    });
}

function cat_updateLoadMoreBtn() {
    const btn = document.getElementById('catLoadMoreBtn');
    if (!btn) return;
    btn.style.display = cat_nextToken ? 'flex' : 'none';
    btn.disabled = cat_isLoading;
    btn.textContent = cat_isLoading ? 'Loading...' : 'Load More';
}

async function cat_fetchPage() {
    if (cat_isLoading) return;
    cat_isLoading = true;
    cat_updateLoadMoreBtn();

    const params = {
        compact: 'true',
        limit: CAT_PAGE_SIZE,
        sortBy: 'createdAt_desc'
    };
    if (cat_nextToken) params.continuationToken = cat_nextToken;

    try {
        let result;
        if (window.API) {
            result = await API.get('/api/articles', params, 0);
        } else {
            const qs = new URLSearchParams(params).toString();
            result = await fetch(`/api/articles?${qs}`).then(r => r.json());
        }

        const items  = Array.isArray(result) ? result : (result.items || []);
        const token  = Array.isArray(result) ? null   : (result.nextToken || null);

        const publicItems = items.filter(a => a.public !== false && a.public !== 'no');

        const existingIds = new Set(ALL_CAT_ARTICLES.map(a => String(a.id)));
        ALL_CAT_ARTICLES = [...ALL_CAT_ARTICLES, ...publicItems.filter(a => !existingIds.has(String(a.id)))];

        cat_nextToken = token;

        // Render only the new slice for this category
        const filtered    = getSortedCatArticles();
        const newlyVisible = filtered.filter(a => !cat_loadedIds.has(String(a.id)));
        cat_renderCards(newlyVisible);

        // Update article count
        const headingEl = document.getElementById('catArticlesHeading');
        if (headingEl) headingEl.textContent = `${filtered.length} Articles`;

    } catch (err) {
        console.error('category-detail fetch error:', err);
        // Fallback to static data
        if (ALL_CAT_ARTICLES.length === 0 && typeof ARTICLES !== 'undefined') {
            ALL_CAT_ARTICLES = ARTICLES.filter(a => a.public !== false && a.public !== 'no');
            const filtered = getSortedCatArticles();
            cat_renderCards(filtered);
            const headingEl = document.getElementById('catArticlesHeading');
            if (headingEl) headingEl.textContent = `${filtered.length} Articles`;
        }
        cat_nextToken = null;
    } finally {
        cat_isLoading = false;
        cat_updateLoadMoreBtn();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    catId = getParam('id') || '';
    const cat = getCategory(catId);

    if (!cat) {
        const titleEl = document.getElementById('catDetailTitle');
        if (titleEl) titleEl.textContent = 'વિભાગ મળ્યો નહીં';
        return;
    }

    document.title = `${cat.name} – હરિપ્રબોધમ કથામૃત`;
    const titleEl = document.getElementById('catDetailTitle');
    if (titleEl) titleEl.textContent = cat.name;
    const descEl = document.getElementById('catDetailDesc');
    if (descEl && cat.description) descEl.textContent = cat.description;

    const headingEl = document.getElementById('catArticlesHeading');
    if (headingEl) headingEl.textContent = 'Loading...';

    // Load More button
    const loadMoreBtn = document.getElementById('catLoadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
        loadMoreBtn.addEventListener('click', cat_fetchPage);
    }

    // Sort select
    const sortSel = document.getElementById('catSortSelect');
    if (sortSel) {
        sortSel.addEventListener('change', () => {
            catSort = sortSel.value;
            // Re-render all loaded articles in new sort order
            const grid = document.getElementById('catArticlesGrid');
            if (grid) grid.innerHTML = '';
            cat_loadedIds.clear();
            cat_renderCards(getSortedCatArticles());
        });
    }

    // Initial fetch
    cat_fetchPage();
});