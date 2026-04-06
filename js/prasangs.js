// ============================================================
// PRASANGS HUB PAGE – List all prasang categories + latest
// ============================================================

const PRASANG_LABELS = {
    bhagwan:    'ભગવાન સ્વામિનારાયણ',
    gunatit:    'ગુણાતીતાનંદ સ્વામી',
    bhagatji:   'ભગતજી મહારાજ',
    yogiji:     'યોગીજી મહારાજ',
    shastriji:  'શાસ્ત્રીજી મહારાજ',
    hariprasad: 'હરિપ્રસાદ સ્વામીજી મહારાજ',
    prabodh:    'પ્રબોધ સ્વામીજી',
    bhakto:     'ભક્તો',
    prabhudasbhai: 'પ્રભુદાસભાઈ',
};

const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let ALL_PRASANG = [];
let currentPrasang = null;

function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    currentPrasang = params.get('prasang') || null;
}

function getSorted(articles) {
    return [...articles].sort((a, b) => {
        const dA = parseInt(a.id) || 0;
        const dB = parseInt(b.id) || 0;
        return dB - dA;
    });
}

function buildPrasangCard(id, label) {
    const card = document.createElement('a');
    card.className = 'album-card';
    card.href = `prasang.html?prasang=${encodeURIComponent(id)}`;

    const wrap = document.createElement('div');
    wrap.className = 'album-img-wrap';

    // Try to load image; fall back to initials text
    const img = new Image();
    img.onload = () => { wrap.innerHTML = ''; wrap.appendChild(img); };
    img.onerror = () => {
        wrap.innerHTML = `<span class="album-fallback">${label}</span>`;
    };
    img.src = `images/prasang/${id}.webp`;
    img.alt = label;
    // Show fallback immediately while image loads
    wrap.innerHTML = `<span class="album-fallback">${label}</span>`;

    const labelEl = document.createElement('span');
    labelEl.className = 'album-label';
    labelEl.textContent = label;

    card.appendChild(wrap);
    card.appendChild(labelEl);
    return card;
}

function renderPrasangCategories() {
    const container = document.getElementById('prasangGrid');
    if (!container) return;
    container.innerHTML = '';

    if (currentPrasang) {
        // Hide the category row when viewing a specific prasang
        const section = document.getElementById('prasangsSection');
        if (section) section.style.display = 'none';
        return;
    }

    // Build from the known prasang keys, ordered by tradition
    const orderedKeys = Object.keys(PRASANG_LABELS);
    orderedKeys.forEach(key => {
        const card = buildPrasangCard(key, PRASANG_LABELS[key]);
        container.appendChild(card);
    });
}

function renderLatest() {
    const grid = document.getElementById('prasangsGrid');
    const paginationEl = document.getElementById('pagination');
    const heading = document.getElementById('latestHeading');
    if (!grid || !paginationEl) return;

    let targetArticles = getSorted(ALL_PRASANG);

    if (currentPrasang) {
        targetArticles = targetArticles.filter(a =>
            (a.prasang || '').split(',').map(s => s.trim()).includes(currentPrasang)
        );
        const label = PRASANG_LABELS[currentPrasang] || currentPrasang;
        if (heading) heading.textContent = label + 'ના પ્રસંગ';
    }

    grid.innerHTML = '';
    paginationEl.innerHTML = '';

    if (targetArticles.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-light);text-align:center;grid-column:1/-1;">No articles found.</p>';
        return;
    }

    const totalPages = Math.ceil(targetArticles.length / ITEMS_PER_PAGE);
    const slice = targetArticles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    slice.forEach((a, i) => {
        const card = buildCard(a, true);
        grid.appendChild(card);
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(card,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, delay: i * 0.05, ease: 'power2.out' }
            );
        }
    });

    if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-outline';
        prevBtn.textContent = 'Back';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) { currentPage--; renderLatest(); window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' }); }
        };

        const pageIndicator = document.createElement('span');
        pageIndicator.style.color = 'var(--text-light)';
        pageIndicator.textContent = `Page ${currentPage} / ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-outline';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) { currentPage++; renderLatest(); window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' }); }
        };

        paginationEl.appendChild(prevBtn);
        paginationEl.appendChild(pageIndicator);
        paginationEl.appendChild(nextBtn);
    }
}

async function loadArticles() {
    try {
        const res = await fetch('/api/articles?compact=true');
        if (res.ok) {
            const dynamic = await res.json();
            const dynamicIds = new Set(dynamic.map(a => String(a.id)));
            const staticFiltered = typeof ARTICLES !== 'undefined'
                ? ARTICLES.filter(a => !dynamicIds.has(String(a.id)))
                : [];
            let combined = [...staticFiltered, ...dynamic];
            // Only public prasang articles
            ALL_PRASANG = combined.filter(a =>
                a.public !== false && a.public !== 'no' && a.type === 'prasang'
            );
        } else {
            if (typeof ARTICLES !== 'undefined') {
                ALL_PRASANG = ARTICLES.filter(a =>
                    a.public !== false && a.public !== 'no' && a.type === 'prasang'
                );
            }
        }
    } catch (e) {
        console.warn('Failed fetching from /api/articles. Using local static data.');
        if (typeof ARTICLES !== 'undefined') {
            ALL_PRASANG = ARTICLES.filter(a =>
                a.public !== false && a.public !== 'no' && a.type === 'prasang'
            );
        }
    }

    renderPrasangCategories();
    renderLatest();
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initNav === 'function') initNav();
    parseQuery();

    // Setup horizontal scroll for avatar row
    if (typeof setupHorizontalScroll === 'function') {
        const wrappers = document.querySelectorAll('.avatar-row-wrapper');
        wrappers.forEach(w => setupHorizontalScroll(w));
    }

    loadArticles();
});
