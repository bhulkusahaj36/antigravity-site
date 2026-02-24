// ============================================================
// CATEGORY DETAIL PAGE
// ============================================================

const CAT_ITEMS_PER_PAGE = 5;
let catPage = 1;
let catSort = 'latest';
let catId = '';

function getSortedCatArticles() {
    let list = ARTICLES.filter(a => a.category === catId);
    if (catSort === 'popular') list = list.filter(a => a.featured).concat(list.filter(a => !a.featured));
    else list.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    return list;
}

function renderCatArticles() {
    const grid = document.getElementById('catArticlesGrid');
    if (!grid) return;
    const all = getSortedCatArticles();
    const total = Math.ceil(all.length / CAT_ITEMS_PER_PAGE);
    const slice = all.slice((catPage - 1) * CAT_ITEMS_PER_PAGE, catPage * CAT_ITEMS_PER_PAGE);

    grid.innerHTML = '';
    slice.forEach((a, i) => {
        const card = buildCard(a);
        card.style.animationDelay = `${i * 0.07}s`;
        grid.appendChild(card);
    });

    renderPagination('catPagination', catPage, total, (page) => {
        catPage = page;
        renderCatArticles();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    catId = getParam('id') || '';
    const cat = getCategory(catId);

    if (!cat) {
        document.getElementById('catDetailTitle').textContent = 'વિભાગ મળ્યો નહીં';
        return;
    }

    document.title = `${cat.name} – હरिप्रबोध कथामृत`;
    document.getElementById('catDetailTitle').textContent = cat.name;
    if (cat.description) {
        document.getElementById('catDetailDesc').textContent = cat.description;
    }

    const count = ARTICLES.filter(a => a.category === catId).length;
    document.getElementById('catArticlesHeading').textContent = `${count} લেখ`;

    renderCatArticles();

    const sortSel = document.getElementById('catSortSelect');
    if (sortSel) {
        sortSel.addEventListener('change', () => {
            catSort = sortSel.value;
            catPage = 1;
            renderCatArticles();
        });
    }
});
