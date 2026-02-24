// ============================================================
// HOME PAGE
// ============================================================

const ITEMS_PER_PAGE = 4;
let currentPage = 1;
let sortMode = 'latest';

function getSorted(articles) {
    const list = [...articles];
    if (sortMode === 'featured') return list.filter(a => a.featured);
    return list.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
}

function renderFeatured() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;
    const featured = ARTICLES.filter(a => a.featured).slice(0, 3);
    grid.innerHTML = '';
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

    CATEGORIES.forEach(cat => {
        const chip = document.createElement('a');
        chip.className = 'category-chip';
        chip.textContent = cat.name;
        chip.href = `category-detail.html?id=${cat.id}`;
        container.appendChild(chip);
    });
}

function renderArticles() {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;
    const sorted = getSorted(ARTICLES);
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

document.addEventListener('DOMContentLoaded', () => {
    renderFeatured();
    renderCategoryChips();
    renderArticles();
    initRotatingQuote();

    const sortSel = document.getElementById('sortSelect');
    if (sortSel) {
        sortSel.addEventListener('change', () => {
            sortMode = sortSel.value;
            currentPage = 1;
            renderArticles();
        });
    }
});
