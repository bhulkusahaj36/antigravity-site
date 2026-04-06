// ============================================================
// PRASANGS HUB PAGE – Prasang category browser
// Mirrors the home page Featured (prasang avatar row) pattern
// ============================================================

const ITEMS_PER_PAGE_PG = 10;
let currentPagePG = 1;
let ALL_PRASANG_ARTICLES = [];

// Ordered prasang sequence (same as home.js renderFeatured)
const PRASANG_SEQUENCE = [
    'bhagwan',
    'gunatit',
    'bhagatji',
    'shastriji',
    'yogiji',
    'hariprasad',
    'prabodh',
    'bhakto',
    'prabhudasbhai',
];

// Build a circular avatar card (matches home.js buildAvatarCard exactly)
function buildPrasangAvatarCard(id, label) {
    const card = document.createElement('a');
    card.className = 'avatar-card';
    card.href = `prasang.html?prasang=${encodeURIComponent(id)}`;

    const wrap = document.createElement('div');
    wrap.className = 'avatar-img-wrap';

    const img = new Image();
    img.onload = () => { wrap.innerHTML = ''; wrap.appendChild(img); };
    img.onerror = () => {
        if (img.src.endsWith('.webp')) {
            img.src = `images/prasang/${id}.svg`;
        } else if (img.src.endsWith('.svg')) {
            img.src = `images/prasang/${id}.jpg`;
        } else {
            const cleanLabel = label.replace(/\n/g, ' ');
            wrap.innerHTML = `<span class="avatar-fallback">${cleanLabel}</span>`;
        }
    };
    img.src = `images/prasang/${id}.webp`;
    img.alt = label;
    const cleanLabel = label.replace(/\n/g, ' ');
    wrap.innerHTML = `<span class="avatar-fallback">${cleanLabel}</span>`;

    const labelEl = document.createElement('span');
    labelEl.className = 'avatar-label';
    labelEl.textContent = label.replace(/\n/g, ' ');

    card.appendChild(wrap);
    card.appendChild(labelEl);
    return card;
}

function renderPrasangAvatarRow() {
    const container = document.getElementById('prasangGrid');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'avatar-row';

    PRASANG_SEQUENCE.forEach(key => {
        // PRASANG_LABELS is defined in data.js
        const label = (typeof PRASANG_LABELS !== 'undefined' && PRASANG_LABELS[key]) || key;
        const card = buildPrasangAvatarCard(key, label);
        container.appendChild(card);
    });

    // Init scroll buttons after rendering
    if (typeof setupHorizontalScroll === 'function') {
        const wrappers = document.querySelectorAll('.avatar-row-wrapper');
        wrappers.forEach(w => setupHorizontalScroll(w));
    }
}

function getSortedPG(articles) {
    return [...articles].sort((a, b) => {
        const dA = parseInt(a.id) || 0;
        const dB = parseInt(b.id) || 0;
        return dB - dA;
    });
}

function renderLatestPrasang() {
    const grid = document.getElementById('prasangsGrid');
    const paginationEl = document.getElementById('pagination');
    if (!grid || !paginationEl) return;

    const sorted = getSortedPG(ALL_PRASANG_ARTICLES);

    grid.innerHTML = '';
    paginationEl.innerHTML = '';

    if (sorted.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:2rem;">કોઈ પ્રસંગ લેખ મળ્યા નથી.</p>';
        return;
    }

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE_PG);
    const slice = sorted.slice((currentPagePG - 1) * ITEMS_PER_PAGE_PG, currentPagePG * ITEMS_PER_PAGE_PG);

    slice.forEach((a, i) => {
        const card = buildCard(a, true);
        card.style.animationDelay = `${i * 0.06}s`;
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
        prevBtn.disabled = currentPagePG === 1;
        prevBtn.onclick = () => {
            if (currentPagePG > 1) {
                currentPagePG--;
                renderLatestPrasang();
                window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
            }
        };

        const pageIndicator = document.createElement('span');
        pageIndicator.style.color = 'var(--text-light)';
        pageIndicator.textContent = `Page ${currentPagePG} / ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-outline';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = currentPagePG === totalPages;
        nextBtn.onclick = () => {
            if (currentPagePG < totalPages) {
                currentPagePG++;
                renderLatestPrasang();
                window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
            }
        };

        paginationEl.appendChild(prevBtn);
        paginationEl.appendChild(pageIndicator);
        paginationEl.appendChild(nextBtn);
    }
}

async function loadPrasangsArticles() {
    // Show skeleton while loading
    const grid = document.getElementById('prasangsGrid');
    if (grid) {
        grid.className = 'cards-grid stacked-grid';
        grid.innerHTML = Array(4).fill(`
            <div class="skeleton-card" style="animation: pulse 1.5s infinite;">
                <div class="skeleton-line skeleton-title" style="background: var(--card-border);"></div>
                <div class="skeleton-line skeleton-body1" style="background: var(--card-border); margin-top: 1rem;"></div>
                <div class="skeleton-line skeleton-body2" style="background: var(--card-border);"></div>
            </div>
        `).join('');
    }

    try {
        const res = await fetch('/api/articles?compact=true');
        if (res.ok) {
            const dynamic = await res.json();
            const dynamicIds = new Set(dynamic.map(a => String(a.id)));
            const staticFiltered = typeof ARTICLES !== 'undefined'
                ? ARTICLES.filter(a => !dynamicIds.has(String(a.id)))
                : [];
            let combined = [...staticFiltered, ...dynamic];
            // Show all public, non-paravani articles (same logic as home.js)
            ALL_PRASANG_ARTICLES = combined.filter(a =>
                a.public !== false && a.public !== 'no' && a.type !== 'paravani'
            );
        } else {
            if (typeof ARTICLES !== 'undefined') {
                ALL_PRASANG_ARTICLES = ARTICLES.filter(a =>
                    a.public !== false && a.public !== 'no' && a.type !== 'paravani'
                );
            }
        }
    } catch (e) {
        console.warn('Falling back to local static data:', e);
        if (typeof ARTICLES !== 'undefined') {
            ALL_PRASANG_ARTICLES = ARTICLES.filter(a =>
                a.public !== false && a.public !== 'no' && a.type !== 'paravani'
            );
        }
    }

    renderLatestPrasang();
}

document.addEventListener('DOMContentLoaded', () => {
    // Avatar row is static — render immediately
    renderPrasangAvatarRow();

    // Load articles from API
    loadPrasangsArticles();
});
