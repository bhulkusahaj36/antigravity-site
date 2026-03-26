// ============================================================
// PRODUCTION LOGIC: bhulku.com (paravani.js)
// ============================================================

const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let ALL_PARAVANI = [];
let currentAlbum = null;

function parseQueryString() {
    const params = new URLSearchParams(window.location.search);
    currentAlbum = params.get('album');
}

function getSorted(articles) {
    return [...articles].sort((a, b) => {
        let dA = parseInt(a.id) || 0;
        let dB = parseInt(b.id) || 0;
        return dB - dA;
    });
}

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
    const cleanLabel = label.replace(/\n/g, ' ');
    wrap.innerHTML = `<span class="album-fallback">${cleanLabel}</span>`;

    const labelEl = document.createElement('span');
    labelEl.className = 'album-label';
    labelEl.textContent = label.replace(/\n/g, ' ');

    card.appendChild(wrap);
    card.appendChild(labelEl);
    return card;
}

function renderAlbums() {
    const container = document.getElementById('albumGrid');
    if (!container) return;
    container.innerHTML = '';
    
    if (currentAlbum) {
        // If we are viewing a specific album, hide the albums section
        document.getElementById('albumsSection').style.display = 'none';
        return;
    }

    const albumsSet = new Set();
    ALL_PARAVANI.forEach(a => {
        if (a.album) albumsSet.add(a.album.trim());
    });
    
    const albumsList = Array.from(albumsSet).sort();

    if (albumsList.length === 0) {
        document.getElementById('albumsSection').style.display = 'none';
        return;
    }

    albumsList.forEach(album => {
        // Use the album name as both ID and Label.
        const slug = album.toLowerCase().replace(/\s+/g, '-');
        const card = buildAlbumCard(slug, album, 'albums', `paravani.html?album=${encodeURIComponent(album)}`);
        container.appendChild(card);
    });
}

function renderFeatured() {
    const grid = document.getElementById('featuredParavaniGrid');
    const section = document.getElementById('featuredSection');
    if (!grid || !section) return;

    if (currentAlbum) {
        section.style.display = 'none';
        return;
    }

    const featured = ALL_PARAVANI.filter(a => a.featured);
    if (featured.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    grid.innerHTML = '';
    featured.slice(0, 3).forEach(a => {
        grid.appendChild(buildCard(a, true));
    });
}

function renderLatest() {
    const grid = document.getElementById('paravaniGrid');
    const paginationEl = document.getElementById('pagination');
    if (!grid || !paginationEl) return;

    let targetArticles = getSorted(ALL_PARAVANI);

    if (currentAlbum) {
        targetArticles = targetArticles.filter(a => a.album && a.album.trim() === currentAlbum);
        document.querySelector('#latestSection .section-title').textContent = `Album: ${currentAlbum}`;
    }

    grid.innerHTML = '';
    paginationEl.innerHTML = '';

    if (targetArticles.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-light);text-align:center;grid-column:1/-1;">આ વિભાગમાં કોઈ પરાવાણી નથી.</p>';
        return;
    }

    const totalPages = Math.ceil(targetArticles.length / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentSlice = targetArticles.slice(startIdx, endIdx);

    currentSlice.forEach((a, index) => {
        const card = buildCard(a, true);
        grid.appendChild(card);
        // stagger animation
        gsap.fromTo(card,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, delay: index * 0.05, ease: 'power2.out' }
        );
    });

    if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-outline';
        prevBtn.textContent = 'પાછળ';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderLatest();
                window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
            }
        };

        const pageIndicator = document.createElement('span');
        pageIndicator.style.color = 'var(--text-light)';
        pageIndicator.textContent = `પેજ ${currentPage} / ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-outline';
        nextBtn.textContent = 'આગળ';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderLatest();
                window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
            }
        };

        paginationEl.appendChild(prevBtn);
        paginationEl.appendChild(pageIndicator);
        paginationEl.appendChild(nextBtn);
    }
}

async function loadParavaniArticles() {
    try {
        const res = await fetch('/api/articles?t=' + Date.now());
        if (res.ok) {
            const dynamicArticles = await res.json();
            const dynamicIds = new Set(dynamicArticles.map(a => String(a.id)));
            const staticFiltered = typeof ARTICLES !== 'undefined' ? ARTICLES.filter(a => !dynamicIds.has(String(a.id))) : [];
            let combined = [...staticFiltered, ...dynamicArticles];

            // Filter for public AND type === 'paravani'
            ALL_PARAVANI = combined.filter(a => a.public !== false && a.public !== 'no' && a.type === 'paravani');
        } else {
            console.warn("API returned error. Falling back to static ARTICLES if available.");
            if (typeof ARTICLES !== 'undefined') {
                ALL_PARAVANI = ARTICLES.filter(a => a.public !== false && a.public !== 'no' && a.type === 'paravani');
            }
        }
    } catch (err) {
        console.warn("Failed fetching from /api/articles. Using local static data.");
        if (typeof ARTICLES !== 'undefined') {
            ALL_PARAVANI = ARTICLES.filter(a => a.public !== false && a.public !== 'no' && a.type === 'paravani');
        }
    }

    renderAlbums();
    renderFeatured();
    renderLatest();
}

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    parseQueryString();

    // Replay horizontal scroll setup if available
    if (typeof setupHorizontalScroll === 'function') {
        const wrappers = document.querySelectorAll('.avatar-row-wrapper');
        wrappers.forEach(w => setupHorizontalScroll(w));
    }

    loadParavaniArticles();
});
