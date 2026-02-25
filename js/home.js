// ============================================================
// HOME PAGE
// ============================================================

const ITEMS_PER_PAGE = 4;
let currentPage = 1;
let sortMode = 'latest';
let ALL_ARTICLES = [];

// Prasang display labels (value → Gujarati name)
const PRASANG_LABELS = {
    bhagwan: 'ભગવાન સ્વામિ\nનારાયણ',
    gunatit: 'ગુણાતીત\nાનંદ સ્વામી',
    bhagatji: 'ભગતજી\nમહારાજ',
    yogiji: 'યોગીજી\nમહારાજ',
    shastriji: 'શાસ્ત્રીજી\nમહારાજ',
    hariprasad: 'હ.સ્વામીજી\nમહારાજ',
    prabodh: 'પ્રબોધ\nસ્વામીજી',
    bhakto: 'ભક્તો',
};

// Topic display labels
const TOPIC_LABELS = {
    mahima: 'મહિમા',
    nishtha: 'નિષ્ઠા',
    seva: 'સેવા',
    bhagvadi: 'ભગવદી',
    bhakti: 'ભક્તિ',
    saralata: 'સરળતા',
    swadharm: 'સ્વધર્મ',
    swadhyay: 'સ્વાધ્યાય',
    bhajan: 'ભજન',
    vachanamrut: 'વચનામૃત',
    swamini: 'સ્વામીની',
    shikshapatri: 'શિક્ષાપત્રી',
    samagam: 'સમાગમ',
    'katha-varta': 'કથા-વાર્તા',
    other: 'અન્ય',
};

function getSorted(articles) {
    const list = [...articles];
    if (sortMode === 'featured') return list.filter(a => a.featured);
    return list.sort((a, b) => {
        let dA = a.date && !isNaN(new Date(a.date).getTime()) ? new Date(a.date).getTime() : parseInt(a.id) || 0;
        let dB = b.date && !isNaN(new Date(b.date).getTime()) ? new Date(b.date).getTime() : parseInt(b.id) || 0;
        return dB - dA;
    });
}

// Build a circular avatar card element
function buildAvatarCard(id, label, imgFolder, href) {
    const card = document.createElement('a');
    card.className = 'avatar-card';
    card.href = href;

    const wrap = document.createElement('div');
    wrap.className = 'avatar-img-wrap';

    const img = new Image();
    img.onload = () => { wrap.innerHTML = ''; wrap.appendChild(img); };
    img.onerror = () => {
        // Try .svg if .jpg failed
        if (!img.src.endsWith('.svg')) {
            img.src = `images/${imgFolder}/${id}.svg`;
        } else {
            // Final fallback: show full name in circle
            const cleanLabel = label.replace(/\n/g, ' ');
            wrap.innerHTML = `<span class="avatar-fallback">${cleanLabel}</span>`;
        }
    };
    img.src = `images/${imgFolder}/${id}.jpg`;
    img.alt = label;
    // Show full name while loading
    const cleanLabel = label.replace(/\n/g, ' ');
    wrap.innerHTML = `<span class="avatar-fallback">${cleanLabel}</span>`;

    const labelEl = document.createElement('span');
    labelEl.className = 'avatar-label';
    labelEl.textContent = label.replace(/\n/g, ' ');

    card.appendChild(wrap);
    card.appendChild(labelEl);
    return card;
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

    grid.innerHTML = '';
    grid.className = 'avatar-row'; // Switch to avatar row layout

    if (top5Prasangs.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted)">કોઈ Featured લeખ નથી.</p>';
        return;
    }

    top5Prasangs.forEach(p => {
        const label = PRASANG_LABELS[p] || p;
        const card = buildAvatarCard(p, label, 'prasang', `search.html?prasang=${p}`);
        grid.appendChild(card);
    });
}

function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'avatar-row';

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
        const label = TOPIC_LABELS[topicId] || topicId;
        const card = buildAvatarCard(topicId, label, 'categories', `category-detail.html?id=${topicId}`);
        container.appendChild(card);
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
