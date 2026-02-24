// ============================================================
// HOME PAGE
// ============================================================

const ITEMS_PER_PAGE = 4;
let currentPage = 1;
let sortMode = 'latest';
let ALL_ARTICLES = [];

function getSorted(articles) {
    const list = [...articles];
    if (sortMode === 'featured') return list.filter(a => a.featured);
    return list.sort((a, b) => {
        let dA = a.date && !isNaN(new Date(a.date).getTime()) ? new Date(a.date).getTime() : parseInt(a.id) || 0;
        let dB = b.date && !isNaN(new Date(b.date).getTime()) ? new Date(b.date).getTime() : parseInt(b.id) || 0;
        return dB - dA;
    });
}

function renderFeatured() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;

    // Count prasang occurrences across all articles
    const prasangCount = {};
    ALL_ARTICLES.forEach(a => {
        const vals = (a.prasang || '').split(',').map(s => s.trim()).filter(Boolean);
        vals.forEach(p => { prasangCount[p] = (prasangCount[p] || 0) + 1; });
    });

    // Get top 5 prasangs by article count
    const top5Prasangs = Object.entries(prasangCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([p]) => p);

    // Gather one representative article per top prasang
    const featured = top5Prasangs.map(p =>
        ALL_ARTICLES.find(a => (a.prasang || '').split(',').map(s => s.trim()).includes(p))
    ).filter(Boolean);

    grid.innerHTML = '';
    if (featured.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted)">કોઈ featured લeখ નથી.</p>';
        return;
    }
    featured.forEach(a => grid.appendChild(buildCard(a)));
}

function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    if (!container) return;
    container.innerHTML = '';

    const allChip = document.createElement('a');
    allChip.className = 'category-chip active';
    allChip.textContent = 'બધા';
    allChip.href = 'categories.html';
    container.appendChild(allChip);

    // Count articles per topic
    const topicCount = {};
    ALL_ARTICLES.forEach(a => {
        const vals = (a.topic || a.category || '').split(',').map(s => s.trim()).filter(Boolean);
        vals.forEach(t => { topicCount[t] = (topicCount[t] || 0) + 1; });
    });

    // Get top 5 topics with most articles
    const top5Topics = Object.entries(topicCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t]) => t);

    top5Topics.forEach(topicId => {
        // Try to find matching CATEGORY by id, else show raw id
        const cat = CATEGORIES.find(c => c.id === topicId);
        const chip = document.createElement('a');
        chip.className = 'category-chip';
        chip.textContent = cat ? cat.name : topicId;
        chip.href = `category-detail.html?id=${topicId}`;
        container.appendChild(chip);
    });
}

function renderArticles() {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;
    const sorted = getSorted(ALL_ARTICLES);
    const total = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const slice = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    grid.innerHTML = '';
    slice.forEach((a, i) => {
        const card = buildCard(a);
        card.style.animationDelay = `${i * 0.07}s`;
        grid.appendChild(card);
    });

    renderPagination('pagination', currentPage, total, (page) => {
        currentPage = page;
        renderArticles();
        document.getElementById('articles').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function initRotatingQuote() {
    const el = document.getElementById('quoteText');
    if (!el) return;
    let idx = 0;
    setInterval(() => {
        el.style.opacity = '0';
        setTimeout(() => {
            idx = (idx + 1) % QUOTES.length;
            el.textContent = QUOTES[idx];
            el.style.opacity = '1';
        }, 400);
    }, 4000);
}

async function loadHomeArticles() {
    try {
        const response = await fetch('/api/articles?t=' + Date.now());
        if (response.ok) {
            ALL_ARTICLES = await response.json();
            renderCategoryChips(); // Now data-driven
            renderFeatured();
            renderArticles();
        } else {
            console.error("Failed to fetch articles:", response.status);
        }
    } catch (error) {
        console.error("Error fetching articles API:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initRotatingQuote();

    // Fetch live articles — chips, featured, and latest all rendered after
    loadHomeArticles();

    const sortSel = document.getElementById('sortSelect');
    if (sortSel) {
        sortSel.addEventListener('change', () => {
            sortMode = sortSel.value;
            currentPage = 1;
            renderArticles();
        });
    }
});
