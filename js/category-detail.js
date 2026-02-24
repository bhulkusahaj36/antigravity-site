// ============================================================
// CATEGORY DETAIL PAGE
// ============================================================

const CAT_ITEMS_PER_PAGE = 5;
let catPage = 1;
let catSort = 'latest';
let catId = '';
let ALL_ARTICLES = [];

function getSortedCatArticles() {
    let list = ALL_ARTICLES.filter(a => a.category === catId);
    if (catSort === 'popular') list = list.filter(a => a.featured).concat(list.filter(a => !a.featured));
    else list.sort((a, b) => {
        let dA = a.date && !isNaN(new Date(a.date).getTime()) ? new Date(a.date).getTime() : parseInt(a.id) || 0;
        let dB = b.date && !isNaN(new Date(b.date).getTime()) ? new Date(b.date).getTime() : parseInt(b.id) || 0;
        return dB - dA;
    });
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

async function loadCategoryArticles() {
    try {
        const response = await fetch('/api/articles');
        if (response.ok) {
            ALL_ARTICLES = await response.json();

            const count = ALL_ARTICLES.filter(a => a.category === catId).length;
            const headingEl = document.getElementById('catArticlesHeading');
            if (headingEl) headingEl.textContent = `${count} લેખ`;

            renderCatArticles();
        } else {
            console.error("Failed to fetch category articles:", response.status);
        }
    } catch (error) {
        console.error("Error fetching articles API:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    catId = getParam('id') || '';
    const cat = getCategory(catId);

    if (!cat) {
        document.getElementById('catDetailTitle').textContent = 'વિભાગ મળ્યો નહીં';
        return;
    }

    document.title = `${cat.name} – હરિપ્રબોધ કથામૃત`;
    document.getElementById('catDetailTitle').textContent = cat.name;
    if (cat.description) {
        document.getElementById('catDetailDesc').textContent = cat.description;
    }

    // Delay article count rendering until data arrives
    const headingEl = document.getElementById('catArticlesHeading');
    if (headingEl) headingEl.textContent = `લોડ થઈ રહ્યું છે...`;

    // Fetch live articles
    loadCategoryArticles();

    const sortSel = document.getElementById('catSortSelect');
    if (sortSel) {
        sortSel.addEventListener('change', () => {
            catSort = sortSel.value;
            catPage = 1;
            renderCatArticles();
        });
    }
});
