// ============================================================
// STAGING/TEST LOGIC: test.js
// Replaces home.js on test.html ONLY.
// Production (index.html + home.js) is NOT affected.
// ============================================================

const ITEMS_PER_PAGE = 4;
let currentPage = 1;
let sortMode = 'latest';
let ALL_ARTICLES = [];

// ============================================================
// MOCK ARTICLES — used locally when API is unavailable
// ============================================================
const MOCK_ARTICLES = [
    { id: '1000', title: 'ભગવાને રચી અનોખી લીલા: ભક્તોના હૃદયમાં વાસ', excerpt: 'મહારાજે સોમલા ખાચરના દરબારમાં જે લીલા કરી તેની સ્મૃતિ ભક્તો સદાય સંઘરી રાખે છે. ભગવાનની ઇચ્છાથી જ સૌ કંઈ થાય છે, આ ભાવ સ્થિર રાખવો.' },
    { id: '1001', title: 'સત્સંગની મધુરતા: સ્વામીની વાતોનું અમૃત', excerpt: 'ગુણાતીતાનંદ સ્વામીએ જે વાતો કરી તે જીવના કલ્યાણ માટે છે. સહુના દિલ જીતવાનો એક જ રસ્તો છે — આત્મીયતા. ભક્તિ જ ખરો ધ્યેય.' },
    { id: '1002', title: 'નિષ્ઠાનો પાયો: શાસ્ત્રીજી મહારાજની ગુરુભક્તિ', excerpt: 'દુનિયાના વિરોધ વચ્ચે પણ શાસ્ત્રીજી મહારાજે જે અટલ નિષ્ઠા રાખી — એ ભક્તિ માર્ગ આજે પણ પ્રેરણા આપે છે. ગુરુ ઉપર અડગ વિશ્વાસ.' },
    { id: '1003', title: 'આત્મીયતાનો મંત્ર: હરિપ્રસાદ સ્વામીજીની શીખ', excerpt: 'સહુના દિલ જીતવાનો એક જ રસ્તો છે — આત્મીયતા. ગુરુહરી સ્વામીજીએ આ ભાવ જીવનમાં ઉતારી બતાવ્યો. ભક્ત અને ભગવાન વચ્ચે કોઈ અંતર નથી.' },
    { id: '1004', title: 'સેવા જ સંસ્કાર: ભક્તોની લાઇફલાઇન', excerpt: 'સેવા દ્વારા જ અહંકાર ઓગળે છે અને હરિ રાજી થાય છે. ભક્તિ માર્ગ ઉપર ચાલનારને સેવાના સંસ્કાર સ્વાભાવિક રીતે પ્રગટ થાય.' },
    { id: '1005', title: 'સરળતાની મૂર્તિ: યોગીબાપાના ચરિત્ર', excerpt: 'નાના બાળકો સાથે બેસીને રમનારા યોગીબાપાની સાદગી અને નિખાલસ સ્વભાવ — ભક્ત જીવનનો ઉત્તમ નમૂનો. સૌ સાથે પ્રેમ, સૌ સાથે ભક્તિ.' },
    { id: '1006', title: 'સ્વાધ્યાય અને ભજન: આત્મિક શાંતિનો માર્ગ', excerpt: 'રોજિંદા જીવનમાં ભજનનું મહત્ત્વ અને તેની અસર. ભગવાનનું ભજન કરવાથી ચિત્ત સ્થિર થાય, ચિંતા ઓછી થાય અને ઈશ્વર સ્મૃતિ ટકે.' },
    { id: '1007', title: 'પ્રસાદીના પત્રો: ભગવદીઓના પવિત્ર પ્રસંગો', excerpt: 'યોગીજી મહારાજના હસ્તે લખાયેલા પત્રોનો મહિમા. ભક્ત ઉપર ભગવાનની ઇચ્છા — આ ભાવ ભક્ત ભૂલ્યો ન ભૂલ્યો.' },
];

// ============================================================
// CAROUSEL STATE
// ============================================================
let carouselArticles = [];
let carouselActiveIndex = 0;
let carouselTimer = null;

// ── Cylinder parameters ───────────────────────────────────────
const ANGLE_PER_CARD = 38;   // degrees between each slot on the wheel
const CYLINDER_RADIUS = 310; // px — translateZ radius (how deep the curve is)
const CAROUSEL_INTERVAL = 3000; // ms auto-advance

// ============================================================
// UTILITY: SORTING
// ============================================================
function getSorted(articles) {
    const list = [...articles];
    if (sortMode === 'featured') return list.filter(a => a.featured);
    return list.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
}

// ============================================================
// ARTICLE GRID (below hero — mirrors production)
// ============================================================
function renderArticles() {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;
    const sorted = getSorted(ALL_ARTICLES).slice(0, 5);
    grid.innerHTML = '';
    sorted.forEach((a, i) => {
        const card = buildCard(a); // from utils.js
        card.style.animationDelay = `${i * 0.07}s`;
        grid.appendChild(card);
    });
    const pg = document.getElementById('pagination');
    if (pg) pg.innerHTML = '';
}

// ============================================================
// FEATURED + CATEGORY ROWS (mirrors production)
// ============================================================
function buildAvatarCard(id, label, imgFolder, href) {
    const card = document.createElement('a');
    card.className = 'avatar-card';
    card.href = href;
    const wrap = document.createElement('div');
    wrap.className = 'avatar-img-wrap';
    const cleanLabel = label.replace(/\n/g, ' ');
    if (imgFolder === 'categories') {
        wrap.innerHTML = `<span class="avatar-fallback font-gujarati">${cleanLabel}</span>`;
    } else {
        const img = new Image();
        img.onload = () => { wrap.innerHTML = ''; wrap.appendChild(img); };
        img.onerror = () => {
            if (img.src.endsWith('.webp'))     img.src = `images/${imgFolder}/${id}.svg`;
            else if (img.src.endsWith('.svg')) img.src = `images/${imgFolder}/${id}.jpg`;
            else wrap.innerHTML = `<span class="avatar-fallback font-gujarati">${cleanLabel}</span>`;
        };
        img.src = `images/${imgFolder}/${id}.webp`;
        img.alt = label;
        wrap.innerHTML = `<span class="avatar-fallback font-gujarati">${cleanLabel}</span>`;
    }
    const labelEl = document.createElement('span');
    labelEl.className = 'avatar-label font-gujarati';
    labelEl.textContent = cleanLabel;
    card.appendChild(wrap);
    card.appendChild(labelEl);
    return card;
}

function renderFeatured() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;
    grid.innerHTML = '';
    grid.className = 'avatar-row';
    ['bhagwan','gunatit','bhagatji','shastriji','yogiji','hariprasad','prabodh','bhakto'].forEach(p => {
        grid.appendChild(buildAvatarCard(p, PRASANG_LABELS[p] || p, 'prasang', `prasang.html?prasang=${p}`));
    });
}

function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'avatar-row';
    const topicCount = {};
    ALL_ARTICLES.forEach(a => {
        (a.topic || a.category || '').split(',').map(s => s.trim()).filter(Boolean)
            .forEach(t => { topicCount[t] = (topicCount[t] || 0) + 1; });
    });
    Object.entries(topicCount).sort((a,b) => b[1]-a[1]).slice(0,15).map(([t]) => t)
        .forEach(topicId => {
            let label = getCategoryName(topicId);
            if (label === topicId && TOPIC_LABELS[topicId]) label = TOPIC_LABELS[topicId];
            container.appendChild(buildAvatarCard(topicId, label, 'categories', `category-detail.html?id=${topicId}`));
        });
}

// ============================================================
// 3D CYLINDER CAROUSEL
//
// Each card DOM element is permanently assigned to one article.
// Cards are placed on a cylinder via:
//    rotateY(angle) translateZ(CYLINDER_RADIUS)
//
// When advancing, each card's angle shifts by ±ANGLE_PER_CARD.
// Opacity uses cos(angle) so center=1, sides fade naturally to 0.
// ============================================================

function buildCarouselCard(article) {
    const card = document.createElement('div');
    card.className = 'cflow-card';
    card.innerHTML = `
        <div class="cflow-card-body">
            <p class="cflow-excerpt">${article.excerpt || (article.content || '').substring(0, 200) || ''}</p>
        </div>
        <div class="cflow-card-footer">
            <span class="cflow-title">${article.title || ''}</span>
        </div>`;
    card.addEventListener('click', () => {
        if (article.id) window.location.href = `article.html?id=${article.id}`;
    });
    return card;
}

// ============================================================
// 3D CYLINDER CAROUSEL — continuous rAF rotation (no pauses)
// ============================================================

let continuousAngle = 0;   // float, degrees — keeps incrementing forever
let carouselRAF = null;
let lastTimestamp = null;
const ROTATION_SPEED = 10; // degrees per second — tweak for faster/slower

/**
 * Updates all card transforms every animation frame.
 * angle is a continuously incrementing float — no discrete steps.
 */
function updateCylinderPositions() {
    const stage = document.getElementById('cfCarousel');
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll('.cflow-card'));
    const n = cards.length;
    if (n === 0) return;

    cards.forEach((card, i) => {
        // Each card i sits at base angle (i * ANGLE_PER_CARD)
        // Subtract continuousAngle to spin the whole wheel
        let angle = (i * ANGLE_PER_CARD) - continuousAngle;

        // Normalise to -180..180 for opacity calc
        angle = ((angle + 180) % 360 + 360) % 360 - 180;

        const rad     = Math.abs(angle) * Math.PI / 180;
        const opacity = Math.abs(angle) >= 90 ? 0 : Math.pow(Math.cos(rad), 1.5);
        const scale   = 0.82 + 0.18 * Math.cos(rad);

        card.style.transform = `rotateY(${angle}deg) translateZ(${CYLINDER_RADIUS}px) scale(${scale})`;
        card.style.opacity   = opacity.toFixed(3);
        card.style.zIndex    = Math.round(100 * opacity);
    });
}

function carouselLoop(timestamp) {
    if (lastTimestamp !== null) {
        const delta = timestamp - lastTimestamp;          // ms since last frame
        continuousAngle += (ROTATION_SPEED * delta) / 1000; // degrees this frame
    }
    lastTimestamp = timestamp;

    updateCylinderPositions();
    carouselRAF = requestAnimationFrame(carouselLoop);
}

function initCarousel() {
    const stage = document.getElementById('cfCarousel');
    if (!stage) return;
    stage.innerHTML = '';

    if (carouselArticles.length === 0) {
        stage.innerHTML = '<p style="color:var(--text-muted);padding:2rem;">No articles yet.</p>';
        return;
    }

    // Build one DOM card per article (cap at 12)
    carouselArticles.slice(0, 12).forEach(article => {
        const card = buildCarouselCard(article);
        // NO CSS transitions — rAF updates every frame
        card.style.transition = 'none';
        stage.appendChild(card);
    });

    // Cancel any previous loop and start fresh
    if (carouselRAF) cancelAnimationFrame(carouselRAF);
    lastTimestamp = null;
    continuousAngle = 0;
    carouselRAF = requestAnimationFrame(carouselLoop);
}

// ============================================================
// ROTATING QUOTE
// ============================================================
function initRotatingQuote() {
    const textEl   = document.getElementById('quoteText');
    const authorEl = document.getElementById('quoteAuthor');
    const dotsEl   = document.getElementById('quotePagination');
    if (!textEl || !QUOTES || QUOTES.length === 0) return;

    let idx = 0;
    if (dotsEl) dotsEl.innerHTML = QUOTES.map(() => '<span class="dot"></span>').join('');

    const show = (i) => {
        const q = QUOTES[i];
        textEl.textContent = typeof q === 'string' ? q : q.text;
        if (authorEl) authorEl.textContent = `- ${typeof q === 'string' ? 'ગુરુહરી હરિપ્રસાદ સ્વામીજી મહારાજ' : (q.author || 'ગુરુહરી')}`;
        if (dotsEl) dotsEl.querySelectorAll('.dot').forEach((d, j) => d.classList.toggle('active', j === i));
    };
    show(0);

    setInterval(() => {
        Object.assign(textEl.style, { opacity:'0', filter:'blur(8px)', transform:'translateY(-12px)', transition:'all 0.4s ease' });
        if (authorEl) Object.assign(authorEl.style, { opacity:'0', transition:'all 0.3s ease' });
        setTimeout(() => {
            idx = (idx + 1) % QUOTES.length;
            show(idx);
            Object.assign(textEl.style, { opacity:'0', filter:'blur(12px)', transform:'translateY(16px)', transition:'none' });
            textEl.offsetHeight; // force reflow
            Object.assign(textEl.style, { opacity:'1', filter:'blur(0)', transform:'translateY(0)', transition:'all 0.55s cubic-bezier(0.16,1,0.3,1)' });
            if (authorEl) Object.assign(authorEl.style, { opacity:'1', transition:'all 0.4s ease 0.1s' });
        }, 420);
    }, 8500);
}

// ============================================================
// SKELETON LOADERS
// ============================================================
function showSkeletonLoader(containerId, isAvatar = false) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    if (isAvatar) {
        c.className = 'avatar-row';
        for (let i = 0; i < 6; i++) c.innerHTML += `
            <div class="avatar-card" style="pointer-events:none;opacity:0.5;">
                <div class="avatar-img-wrap" style="background:var(--card-bg);animation:pulse 1.5s infinite;"></div>
                <div style="height:12px;width:60px;background:var(--card-bg);border-radius:4px;margin:10px auto 0;animation:pulse 1.5s infinite;"></div>
            </div>`;
    } else {
        c.className = 'cards-grid';
        for (let i = 0; i < 4; i++) c.innerHTML += `
            <div class="skeleton-card" style="animation:pulse 1.5s infinite;">
              <div class="skeleton-line skeleton-title" style="background:var(--card-border);"></div>
              <div class="skeleton-line skeleton-body1" style="background:var(--card-border);margin-top:1rem;"></div>
              <div class="skeleton-line skeleton-body2" style="background:var(--card-border);"></div>
            </div>`;
    }
}

// ============================================================
// SCROLL BUTTONS
// ============================================================
window.initAvatarScrollButtons = function () {
    document.querySelectorAll('.section').forEach(section => {
        const prevBtn = section.querySelector('.prev-btn');
        const nextBtn = section.querySelector('.next-btn');
        const row = section.querySelector('.avatar-row') || section.querySelector('.cards-grid') || section.querySelector('.category-chips');
        if (!prevBtn || !nextBtn || !row) return;
        const upd = () => {
            const max = row.scrollWidth - row.clientWidth;
            prevBtn.style.opacity = row.scrollLeft <= 5 ? '0.2' : '1';
            prevBtn.style.pointerEvents = row.scrollLeft <= 5 ? 'none' : 'auto';
            nextBtn.style.opacity = row.scrollLeft >= max - 5 ? '0.2' : '1';
            nextBtn.style.pointerEvents = row.scrollLeft >= max - 5 ? 'none' : 'auto';
        };
        row.removeEventListener('scroll', upd);
        row.addEventListener('scroll', upd);
        window.addEventListener('resize', upd);
        setTimeout(upd, 150);
        if (!section.dataset.scrollInit) {
            section.dataset.scrollInit = 'true';
            prevBtn.addEventListener('click', () => row.scrollBy({ left: -400, behavior: 'smooth' }));
            nextBtn.addEventListener('click', () => row.scrollBy({ left:  400, behavior: 'smooth' }));
        }
    });
};

// ============================================================
// MAIN DATA LOAD
// ============================================================
async function loadHomeArticles() {
    showSkeletonLoader('categoryChips', true);
    renderFeatured();
    showSkeletonLoader('articlesGrid', false);

    try {
        const res = await fetch('/api/articles?t=' + Date.now());
        if (res.ok) {
            ALL_ARTICLES = await res.json();
            console.log('[test.js] Loaded from API:', ALL_ARTICLES.length);
        } else {
            console.warn('[test.js] API', res.status, '— trying local ARTICLES');
            if (typeof ARTICLES !== 'undefined' && ARTICLES.length > 0) ALL_ARTICLES = ARTICLES;
        }
    } catch (err) {
        console.warn('[test.js] Fetch failed (local file?) — using mock data');
        if (typeof ARTICLES !== 'undefined' && ARTICLES.length > 0) ALL_ARTICLES = ARTICLES;
    }

    // Final safety net — always show something
    if (!ALL_ARTICLES || ALL_ARTICLES.length === 0) {
        ALL_ARTICLES = MOCK_ARTICLES;
        console.log('[test.js] Using MOCK_ARTICLES for local preview');
    }

    carouselArticles = getSorted(ALL_ARTICLES);
    initCarousel();

    renderCategoryChips();
    renderArticles();
    renderFeatured();
    setTimeout(window.initAvatarScrollButtons, 150);
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initRotatingQuote();
    loadHomeArticles();

    const sortSel = document.getElementById('sortSelect');
    if (sortSel) {
        sortSel.addEventListener('change', () => {
            sortMode = sortSel.value;
            currentPage = 1;
            renderArticles();
        });
    }

    setTimeout(window.initAvatarScrollButtons, 50);
});
