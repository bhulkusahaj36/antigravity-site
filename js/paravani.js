// ============================================================
// PRODUCTION LOGIC: paravani.js
// Phase 6: Uses CosmosDB continuation tokens for Load More pagination.
// ============================================================

const PARAVANI_PAGE_SIZE = 12;
let pv_nextToken      = null;   // CosmosDB continuation token for next page
let pv_isLoading      = false;  // Debounce flag
let pv_hasMore        = true;   // Whether more pages exist
let pv_currentAlbum   = null;   // Active album filter (from URL ?album=)
let pv_loadedIds      = new Set(); // De-duplication guard

function pv_parseQueryString() {
    const params = new URLSearchParams(window.location.search);
    pv_currentAlbum = params.get('album');
}

// ── Album card builder ────────────────────────────────────────
function buildAlbumCard(id, label, imgFolder, href) {
    const card = document.createElement('a');
    card.className = 'album-card';
    card.href = href;

    const wrap = document.createElement('div');
    wrap.className = 'album-img-wrap';

    const img = new Image();
    img.onload = () => { wrap.innerHTML = ''; wrap.appendChild(img); };
    img.onerror = () => {
        const cleanLabel = label.replace(/\n/g, ' ');
        wrap.innerHTML = `<span class="album-fallback">${cleanLabel}</span>`;
    };
    img.src = `images/${imgFolder}/${id}.webp`;
    img.alt = label;
    wrap.innerHTML = `<span class="album-fallback">${label.replace(/\n/g, ' ')}</span>`;

    const labelEl = document.createElement('span');
    labelEl.className = 'album-label';
    labelEl.textContent = label.replace(/\n/g, ' ');

    card.appendChild(wrap);
    card.appendChild(labelEl);
    return card;
}

// ── Load albums from /api/albums ─────────────────────────────
async function pv_renderAlbums() {
    const container = document.getElementById('albumGrid');
    const section   = document.getElementById('albumsSection');
    if (!container || !section) return;

    if (pv_currentAlbum) {
        section.style.display = 'none';
        return;
    }

    try {
        const albums = await (window.API
            ? API.get('/api/albums', {}, 300000)
            : fetch('/api/albums').then(r => r.json()));

        if (!Array.isArray(albums) || albums.length === 0) {
            section.style.display = 'none';
            return;
        }

        container.innerHTML = '';
        albums.forEach(album => {
            const slug = String(album.id || album.title).toLowerCase().replace(/\s+/g, '-');
            const card = buildAlbumCard(slug, album.title, 'albums',
                `paravani.html?album=${encodeURIComponent(album.title)}`);
            container.appendChild(card);
        });
    } catch (e) {
        console.warn('Could not load albums from /api/albums:', e.message);
        section.style.display = 'none';
    }
}

// ── Append cards to the grid ──────────────────────────────────
function pv_appendCards(articles) {
    const grid = document.getElementById('paravaniGrid');
    if (!grid) return;

    articles.forEach((a, i) => {
        if (pv_loadedIds.has(String(a.id))) return; // skip dupes
        pv_loadedIds.add(String(a.id));

        const card = buildCard(a, true);
        grid.appendChild(card);

        if (typeof gsap !== 'undefined') {
            gsap.fromTo(card,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.45, delay: i * 0.04, ease: 'power2.out' }
            );
        }
    });
}

// ── Load More button rendering ────────────────────────────────
function pv_updateLoadMoreBtn() {
    const btn = document.getElementById('pvLoadMoreBtn');
    if (!btn) return;
    btn.style.display = pv_hasMore ? 'flex' : 'none';
    btn.disabled = pv_isLoading;
    btn.textContent = pv_isLoading ? 'Loading...' : 'Load More';
}

// ── Fetch a single page ───────────────────────────────────────
async function pv_fetchPage() {
    if (pv_isLoading || !pv_hasMore) return;
    pv_isLoading = true;
    pv_updateLoadMoreBtn();

    const params = {
        compact: 'true',
        type: 'paravani',
        limit: PARAVANI_PAGE_SIZE,
        sortBy: 'createdAt_desc'
    };
    if (pv_currentAlbum)    params.album = pv_currentAlbum;
    if (pv_nextToken)       params.continuationToken = pv_nextToken;

    try {
        let result;
        if (window.API) {
            // API.get with no cache for paginated loads (each page is unique)
            result = await API.get('/api/articles', params, 0);
        } else {
            const qs = new URLSearchParams(params).toString();
            result = await fetch(`/api/articles?${qs}`).then(r => r.json());
        }

        // API returns { items, nextToken } when limit is set
        const items = Array.isArray(result) ? result : (result.items || []);
        const token = result.nextToken || null;

        // Filter: public only
        const publicItems = items.filter(a => a.public !== false && a.public !== 'no');

        pv_appendCards(publicItems);

        pv_nextToken = token;
        pv_hasMore   = !!token && publicItems.length > 0;

        // Show empty state if nothing was rendered
        const grid = document.getElementById('paravaniGrid');
        if (grid && pv_loadedIds.size === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">No content found in this section.</p>';
        }

    } catch (err) {
        console.error('Paravani fetch error:', err);
        pv_hasMore = false;
        const grid = document.getElementById('paravaniGrid');
        if (grid && pv_loadedIds.size === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:3rem 1rem;">Content is loading from the live server. Please visit the live site or check back shortly.</p>';
        }
    } finally {
        pv_isLoading = false;
        pv_updateLoadMoreBtn();
    }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    pv_parseQueryString();
    initNav();

    // Update title if filtering by album
    if (pv_currentAlbum) {
        const titleEl = document.querySelector('#latestSection .section-title');
        if (titleEl) titleEl.textContent = `Album: ${pv_currentAlbum}`;
    }

    // Load More button click
    const loadMoreBtn = document.getElementById('pvLoadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', pv_fetchPage);
    }

    // Horizontal scroll on albums if albums section exists
    if (typeof setupHorizontalScroll === 'function') {
        document.querySelectorAll('.avatar-row-wrapper').forEach(w => setupHorizontalScroll(w));
    }

    pv_renderAlbums();
    pv_fetchPage(); // Initial load
});
