// ============================================================
// HOME PAGE
// ============================================================

const ITEMS_PER_PAGE = 4;
let currentPage = 1;
let sortMode = 'latest';
let ALL_ARTICLES = [];

// Prasang display labels (value → Gujarati name)
const PRASANG_LABELS = {
    bhagwan: 'ભગવાન સ્વામિનારાયણ',
    gunatit: 'ગુણાતીતાનંદ સ્વામી',
    bhagatji: 'ભગતજી\nમહારાજ',
    yogiji: 'યોગીજી\nમહારાજ',
    shastriji: 'શાસ્ત્રીજી\nમહારાજ',
    hariprasad: 'હ.સ્વામીજી\nમહારાજ',
    prabodh: 'પ્રબોધ\nસ્વામીજી',
    bhakto: 'ભક્તો',
    prabhudasbhai: 'પ્રભુદાસભાઈ',
};

// Topic display labels
const TOPIC_LABELS = {
    mahima: 'મહિમા',
    atmiyata: 'આત્મીયતા',
    nishtha: 'નિષ્ઠા',
    seva: 'સેવા',
    bhagvadi: 'ભગવદી',
    bhakti: 'ભક્તોનો મહિમા',
    saralata: 'સરળતા',
    swadharm: 'સ્વધર્મ',
    swadhyay: 'સ્વાધ્યાય',
    bhajan: 'ભજન/સ્વામિનારાયણ મહામંત્ર',
    svasarap: 'સ્વસારપ',
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
        // ID is generated via Date.now() when uploaded, representing true creation time.
        // We use this instead of a.date (the date of the event) to show the true "Latest Added" feed.
        let dA = parseInt(a.id) || 0;
        let dB = parseInt(b.id) || 0;
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
    // Intentionally omitting lazy loading here. In-memory images won't trigger fetching
    // if marked lazy until they are attached to the DOM, causing a chicken-and-egg deadlock.
    img.onload = () => { wrap.innerHTML = ''; wrap.appendChild(img); };
    img.onerror = () => {
        if (img.src.endsWith('.webp')) {
            img.src = `images/${imgFolder}/${id}.svg`;
        } else if (img.src.endsWith('.svg')) {
            img.src = `images/${imgFolder}/${id}.jpg`;
        } else {
            // Final fallback: show full name in circle
            const cleanLabel = label.replace(/\n/g, ' ');
            wrap.innerHTML = `<span class="avatar-fallback">${cleanLabel}</span>`;
        }
    };
    img.src = `images/${imgFolder}/${id}.webp`; // LOAD WEBP FIRST - SVGS ARE HUGE
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

    // Hardcoded fixed sequence as requested by user
    const FIXED_SEQUENCE = [
        'bhagwan',      // ભગવાન સ્વામિનારાયણ
        'gunatit',      // ગુણાતીતાનંદ સ્વામી
        'bhagatji',     // ભગતજી મહારાજ
        'shastriji',    // શાસ્ત્રીજી મહારાજ
        'yogiji',       // યોગીજી મહારાજ
        'hariprasad',   // હ. સ્વામીજી મહારાજ
        'prabodh',      // પ્રબોધ સ્વમીજી મહારાજ
        'bhakto'        // ભક્તો
    ];

    grid.innerHTML = '';
    grid.className = 'avatar-row'; // Switch to avatar row layout

    FIXED_SEQUENCE.forEach(p => {
        const label = PRASANG_LABELS[p] || p;
        const card = buildAvatarCard(p, label, 'prasang', `prasang.html?prasang=${p}`);
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

    // Get top topics with most articles
    const topTopics = Object.entries(topicCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([t]) => t);

    topTopics.forEach(topicId => {
        // Use getCategoryName from utils.js, which checks both CATEGORIES and localStorage tags
        // TOPIC_LABELS was hardcoded, so it didn't work for dynamically created tags.
        let label = getCategoryName(topicId);
        
        // If getCategoryName returns the same ID back (e.g. no custom tag found), 
        // fallback to TOPIC_LABELS just in case it's a hardcoded one not present in CATEGORIES.
        if (label === topicId && TOPIC_LABELS[topicId]) {
            label = TOPIC_LABELS[topicId];
        }

        const card = buildAvatarCard(topicId, label, 'categories', `category-detail.html?id=${topicId}`);
        container.appendChild(card);
    });
}

function renderArticles() {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;
    // Keep only top 5 latest
    const sorted = getSorted(ALL_ARTICLES).slice(0, 5);

    grid.innerHTML = '';
    sorted.forEach((a, i) => {
        const card = buildCard(a);
        card.style.animationDelay = `${i * 0.07}s`;
        grid.appendChild(card);
    });

    // Clear pagination for home page latest section
    const paginationEl = document.getElementById('pagination');
    if (paginationEl) paginationEl.innerHTML = '';
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

function showSkeletonLoader(containerId, isAvatar = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (isAvatar) {
        container.className = 'avatar-row';
        for (let i = 0; i < 6; i++) {
            container.innerHTML += `
               <div class="avatar-card" style="pointer-events:none; opacity: 0.5;">
                   <div class="avatar-img-wrap" style="background:var(--card-bg); animation: pulse 1.5s infinite;"></div>
                   <div style="height:12px; width:60px; background:var(--card-bg); border-radius:4px; margin: 10px auto 0; animation: pulse 1.5s infinite;"></div>
               </div>
            `;
        }
    } else {
        container.className = 'cards-grid';
        for (let i = 0; i < 4; i++) {
            container.innerHTML += `
               <div class="skeleton-card" style="animation: pulse 1.5s infinite;">
                 <div class="skeleton-line skeleton-title" style="background: var(--card-border);"></div>
                 <div class="skeleton-line skeleton-body1" style="background: var(--card-border); margin-top: 1rem;"></div>
                 <div class="skeleton-line skeleton-body2" style="background: var(--card-border);"></div>
               </div>
             `;
        }
    }
}

async function loadHomeArticles() {
    showSkeletonLoader('categoryChips', true);
    // renderFeatured is static content and doesn't need data, load instantly
    renderFeatured();
    showSkeletonLoader('articlesGrid', false);

    try {
        const response = await fetch('/api/articles?t=' + Date.now());
        if (response.ok) {
            ALL_ARTICLES = await response.json();
            console.log("Articles fetched from API");
        } else {
            console.error("API returned error:", response.status);
            if (typeof ARTICLES !== 'undefined') ALL_ARTICLES = ARTICLES;
        }
    } catch (error) {
        console.error("Fetch error, falling back to local data:", error);
        if (typeof ARTICLES !== 'undefined') ALL_ARTICLES = ARTICLES;
    }

    if (ALL_ARTICLES && ALL_ARTICLES.length > 0) {
        renderCategoryChips(); 
        renderArticles();
        renderFeatured();
        if (window.initAvatarScrollButtons) {
            setTimeout(window.initAvatarScrollButtons, 150);
        }
    } else {
        const grid = document.getElementById('articlesGrid');
        if (grid) grid.innerHTML = '<p style="color:var(--text-muted); padding-left:1rem;">કોઈ લેખ મળી શક્યા નથી.</p>';
        document.getElementById('categoryChips').innerHTML = ''; // Clear category chips if no articles
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

    // Expose a function to initialize scroll buttons after dynamic fetches
    window.initAvatarScrollButtons = function() {
        document.querySelectorAll('.section').forEach(section => {
            const prevBtn = section.querySelector('.prev-btn');
            const nextBtn = section.querySelector('.next-btn');
            // Specifically target the scrollable rows within this section
            const row = section.querySelector('.avatar-row') || 
                        section.querySelector('.cards-grid') || 
                        section.querySelector('.category-chips');

            if (prevBtn && nextBtn && row) {
                const updateButtons = () => {
                    // Start of scroll
                    if (row.scrollLeft <= 5) {
                        prevBtn.style.opacity = '0.2';
                        prevBtn.style.pointerEvents = 'none';
                    } else {
                        prevBtn.style.opacity = '1';
                        prevBtn.style.pointerEvents = 'auto';
                    }

                    // End of scroll
                    const maxScroll = row.scrollWidth - row.clientWidth;
                    if (row.scrollLeft >= maxScroll - 5) {
                        nextBtn.style.opacity = '0.2';
                        nextBtn.style.pointerEvents = 'none';
                    } else {
                        nextBtn.style.opacity = '1';
                        nextBtn.style.pointerEvents = 'auto';
                    }
                };

                row.removeEventListener('scroll', updateButtons);
                row.addEventListener('scroll', updateButtons);
                window.addEventListener('resize', updateButtons);
                
                // Initial check
                setTimeout(updateButtons, 150);

                if (!section.dataset.scrollInit) {
                    section.dataset.scrollInit = 'true';
                    prevBtn.addEventListener('click', () => {
                        row.scrollBy({ left: -400, behavior: 'smooth' });
                    });
                    nextBtn.addEventListener('click', () => {
                        row.scrollBy({ left: 400, behavior: 'smooth' });
                    });
                }
            }
        });
    };

    // Attempt init now for featured
    setTimeout(window.initAvatarScrollButtons, 50);
});
