// ============================================================
// PRODUCTION LOGIC: bhulku.com (home.js)
// ============================================================

const ITEMS_PER_PAGE = 4;
let currentPage = 1;
let sortMode = 'latest';
let ALL_ARTICLES = [];

// Prasang display labels (value ΓåÆ Gujarati name) - DEPRECATED (Moved to data.js)
// Topic display labels - DEPRECATED (Moved to data.js)


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
        'bhagwan',      // α¬¡α¬ùα¬╡α¬╛α¬¿ α¬╕α½ìα¬╡α¬╛α¬«α¬┐α¬¿α¬╛α¬░α¬╛α¬»α¬ú
        'gunatit',      // α¬ùα½üα¬úα¬╛α¬ñα½Çα¬ñα¬╛α¬¿α¬éα¬ª α¬╕α½ìα¬╡α¬╛α¬«α½Ç
        'bhagatji',     // α¬¡α¬ùα¬ñα¬£α½Ç α¬«α¬╣α¬╛α¬░α¬╛α¬£
        'shastriji',    // α¬╢α¬╛α¬╕α½ìα¬ñα½ìα¬░α½Çα¬£α½Ç α¬«α¬╣α¬╛α¬░α¬╛α¬£
        'yogiji',       // α¬»α½ïα¬ùα½Çα¬£α½Ç α¬«α¬╣α¬╛α¬░α¬╛α¬£
        'hariprasad',   // α¬╣. α¬╕α½ìα¬╡α¬╛α¬«α½Çα¬£α½Ç α¬«α¬╣α¬╛α¬░α¬╛α¬£
        'prabodh',      // α¬¬α½ìα¬░α¬¼α½ïα¬º α¬╕α½ìα¬╡α¬«α½Çα¬£α½Ç α¬«α¬╣α¬╛α¬░α¬╛α¬£
        'bhakto'        // α¬¡α¬òα½ìα¬ñα½ï
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
    // Keep top 10 latest
    const sorted = getSorted(ALL_ARTICLES).slice(0, 10);

    grid.innerHTML = '';
    // Remove old class if any
    grid.className = 'carousel-3d-inner';

    const count = sorted.length;
    // Set the quantity CSS variable on the inner element so card transforms work correctly
    grid.style.setProperty('--quantity', count);

    sorted.forEach((a, i) => {
        if (!a || !a.title) return; // Skip invalid entries
        
        const item = document.createElement('div');
        item.className = 'carousel-3d-card';
        item.style.setProperty('--index', i);

        // prasang label
        const rawPrasang = a.prasang || a.category || a.topic || 'bhakti';
        const prasangName = getCategoryName(rawPrasang);
        const displayLabel = prasangName ? `${prasangName}` : 'α¬¡α¬òα½ìα¬ñα¬┐';

        // Excerpt text
        const plainText = a.excerpt ? a.excerpt : (a.content ? a.content.replace(/<[^>]*>?/gm, '') : '');
        const excerptText = plainText.substring(0, 110).trim() + (plainText.length > 110 ? '...' : '');

        // Clean title: Topic of the article
        const isPlaceholderTitle = /^[\s._-]+$/.test(a.title || '');
        let cleanTitle = isPlaceholderTitle ? '' : (a.title || '');
        
        // SMART FALLBACK: If the title is empty (or a placeholder), 
        // use a snippet of the content as the title so the card isn't empty.
        if (!cleanTitle || cleanTitle.trim() === displayLabel.trim()) {
            // Take first ~45 chars of plain content as a topic fallback
            const snippet = plainText.substring(0, 45).trim();
            cleanTitle = snippet + (plainText.length > 45 ? '...' : '');
        }

        item.innerHTML = `
            <div class="carousel-3d-content">
                <p class="carousel-3d-label" title="Prasang">${displayLabel}</p>
                <h3 class="carousel-3d-title">${cleanTitle}</h3>
                <div class="carousel-3d-divider"></div>
                <p class="carousel-3d-excerpt">${excerptText}</p>
            </div>
        `;

        item.addEventListener('click', () => {
            window.location.href = `article.html?id=${a.id}`;
        });

        grid.appendChild(item);
    });

    // Clear old pagination
    const paginationEl = document.getElementById('pagination');
    if (paginationEl) paginationEl.innerHTML = '';
}

async function initRotatingQuote() {
    const el = document.getElementById('quoteText');
    if (!el) return;

    let quotes = [];

    // Try to fetch live quotes from the API (admin-managed)
    try {
        const res = await fetch('/api/quotes', { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const apiQuotes = await res.json();
            if (apiQuotes && apiQuotes.length > 0) {
                quotes = apiQuotes.filter(q => q && ((typeof q === 'string' && q.trim().length > 0) || (q.text && q.text.trim().length > 0)));
            }
        }
    } catch (err) {
        console.warn('Could not fetch quotes from API, using static fallback:', err.message);
    }

    // Fallback to the static QUOTES array from data.js
    if (quotes.length === 0 && typeof QUOTES !== 'undefined' && QUOTES.length > 0) {
        quotes = QUOTES;
    }

    if (quotes.length === 0) return;

    // Show first quote immediately
    const firstQ = quotes[0];
    el.textContent = typeof firstQ === 'string' ? firstQ : firstQ.text;

    let idx = 0;
    setInterval(() => {
        el.style.opacity = '0';
        setTimeout(() => {
            idx = (idx + 1) % quotes.length;
            const q = quotes[idx];
            el.textContent = typeof q === 'string' ? q : q.text;
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
        const response = await fetch('/api/articles?compact=true&limit=20');
        if (response.ok) {
            const data = await response.json();
            // Handle both raw array (no limit) and { items, nextToken } (with limit)
            let fetchedData = Array.isArray(data) ? data : (data.items || []);
            // Filter out garbage objects that have no title, avoiding "undefined" text errors
            ALL_ARTICLES = fetchedData.filter(a => a && a.title && String(a.title).trim().length > 0);
            console.log("Articles fetched and filtered from API:", ALL_ARTICLES.length);
        } else {
            console.error("API returned error:", response.status);
            if (typeof ARTICLES !== 'undefined') ALL_ARTICLES = [...ARTICLES];
        }
    } catch (error) {
        console.error("Fetch error, falling back to local data:", error);
        if (typeof ARTICLES !== 'undefined') ALL_ARTICLES = [...ARTICLES];
    }
    
    // Fix for 2d rotating cards not being visible locally, or if live API returned only garbage data:
    // If local data logic or filtering returns an empty array, provide some robust mock articles.
    if (!ALL_ARTICLES || ALL_ARTICLES.length === 0) {
        ALL_ARTICLES = [
            { id: '1000', title: 'α¬¡α¬ùα¬╡α¬╛α¬¿α½ç α¬░α¬Üα½Ç α¬àα¬¿α½ïα¬ûα½Ç α¬▓α½Çα¬▓α¬╛: α¬¡α¬òα½ìα¬ñα½ïα¬¿α¬╛ α¬╣α½âα¬ªα¬»α¬«α¬╛α¬é α¬╡α¬╛α¬╕', excerpt: 'α¬«α¬╣α¬╛α¬░α¬╛α¬£α½ç α¬╕α½ïα¬«α¬▓α¬╛ α¬ûα¬╛α¬Üα¬░α¬¿α¬╛ α¬ªα¬░α¬¼α¬╛α¬░α¬«α¬╛α¬é α¬£α½ç α¬▓α½Çα¬▓α¬╛ α¬òα¬░α½Ç α¬ñα½çα¬¿α½Ç α¬╕α½ìα¬«α½âα¬ñα¬┐ α¬¡α¬òα½ìα¬ñα½ï α¬╕α¬ªα¬╛α¬» α¬╕α¬éα¬ÿα¬░α½Ç α¬░α¬╛α¬ûα½ç α¬¢α½ç.', prasang: 'bhagwan', featured: true },
            { id: '1001', title: 'α¬╕α¬ñα½ìα¬╕α¬éα¬ùα¬¿α½Ç α¬«α¬ºα½üα¬░α¬ñα¬╛: α¬╕α½ìα¬╡α¬╛α¬«α½Çα¬¿α½Ç α¬╡α¬╛α¬ñα½ïα¬¿α½üα¬é α¬àα¬«α½âα¬ñ', excerpt: 'α¬ùα½üα¬úα¬╛α¬ñα½Çα¬ñα¬╛α¬¿α¬éα¬ª α¬╕α½ìα¬╡α¬╛α¬«α½Çα¬Å α¬£α½ç α¬╡α¬╛α¬ñα½ï α¬òα¬░α½Ç α¬ñα½ç α¬£α½Çα¬╡α¬¿α¬╛ α¬òα¬▓α½ìα¬»α¬╛α¬ú α¬«α¬╛α¬ƒα½ç α¬¢α½ç.', prasang: 'gunatit', featured: true },
            { id: '1002', title: 'α¬¿α¬┐α¬╖α½ìα¬áα¬╛α¬¿α½ï α¬¬α¬╛α¬»α½ï: α¬╢α¬╛α¬╕α½ìα¬ñα½ìα¬░α½Çα¬£α½Ç α¬«α¬╣α¬╛α¬░α¬╛α¬£α¬¿α½Ç α¬ùα½üα¬░α½üα¬¡α¬òα½ìα¬ñα¬┐', excerpt: 'α¬╢α¬╛α¬╕α½ìα¬ñα½ìα¬░α½Çα¬£α½Ç α¬«α¬╣α¬╛α¬░α¬╛α¬£α½ç α¬£α½ç α¬àα¬ƒα¬▓ α¬¿α¬┐α¬╖α½ìα¬áα¬╛ α¬░α¬╛α¬ûα½Ç ΓÇö α¬Å α¬¡α¬òα½ìα¬ñα¬┐ α¬«α¬╛α¬░α½ìα¬ù α¬åα¬£α½ç α¬¬α¬ú α¬¬α½ìα¬░α½çα¬░α¬úα¬╛ α¬åα¬¬α½ç α¬¢α½ç.', prasang: 'shastriji', featured: true },
            { id: '1003', title: 'α¬åα¬ñα½ìα¬«α½Çα¬»α¬ñα¬╛α¬¿α½ï α¬«α¬éα¬ñα½ìα¬░: α¬╣α¬░α¬┐α¬¬α½ìα¬░α¬╕α¬╛α¬ª α¬╕α½ìα¬╡α¬╛α¬«α½Çα¬£α½Çα¬¿α½Ç α¬╢α½Çα¬û', excerpt: 'α¬╕α¬╣α½üα¬¿α¬╛ α¬ªα¬┐α¬▓ α¬£α½Çα¬ñα¬╡α¬╛α¬¿α½ï α¬Åα¬ò α¬£ α¬░α¬╕α½ìα¬ñα½ï α¬¢α½ç ΓÇö α¬åα¬ñα½ìα¬«α½Çα¬»α¬ñα¬╛.', prasang: 'hariprasad', featured: true },
            { id: '1004', title: 'α¬╕α½çα¬╡α¬╛ α¬£ α¬╕α¬éα¬╕α½ìα¬òα¬╛α¬░: α¬¡α¬òα½ìα¬ñα½ïα¬¿α½Ç α¬▓α¬╛α¬çα¬½α¬▓α¬╛α¬çα¬¿', excerpt: 'α¬╕α½çα¬╡α¬╛ α¬ªα½ìα¬╡α¬╛α¬░α¬╛ α¬£ α¬àα¬╣α¬éα¬òα¬╛α¬░ α¬ôα¬ùα¬│α½ç α¬¢α½ç α¬àα¬¿α½ç α¬╣α¬░α¬┐ α¬░α¬╛α¬£α½Ç α¬Ñα¬╛α¬» α¬¢α½ç.', prasang: 'bhakto', featured: true },
            { id: '1005', title: 'α¬╕α¬░α¬│α¬ñα¬╛α¬¿α½Ç α¬«α½éα¬░α½ìα¬ñα¬┐: α¬»α½ïα¬ùα½Çα¬¼α¬╛α¬¬α¬╛α¬¿α¬╛ α¬Üα¬░α¬┐α¬ñα½ìα¬░', excerpt: 'α¬»α½ïα¬ùα½Çα¬¼α¬╛α¬¬α¬╛α¬¿α½Ç α¬╕α¬╛α¬ªα¬ùα½Ç α¬àα¬¿α½ç α¬¿α¬┐α¬ûα¬╛α¬▓α¬╕ α¬╕α½ìα¬╡α¬¡α¬╛α¬╡ ΓÇö α¬¡α¬òα½ìα¬ñ α¬£α½Çα¬╡α¬¿α¬¿α½ï α¬ëα¬ñα½ìα¬ñα¬« α¬¿α¬«α½éα¬¿α½ï.', prasang: 'yogiji', featured: true },
        ];
        console.log("Injected mock articles to prevent empty carousel locally.");
    }

    if (ALL_ARTICLES) {
        // Ensure private articles and Paravani (long-form) are hidden from the Prasang homepage feed
        ALL_ARTICLES = ALL_ARTICLES.filter(a => a.public !== false && a.public !== 'no');
        ALL_ARTICLES = ALL_ARTICLES.filter(a => a.type !== 'paravani');
    }

    if (ALL_ARTICLES && ALL_ARTICLES.length > 0) {
        renderCategoryChips(); 
        renderArticles();
        renderFeatured();
        
        // Re-initialize scroll buttons multiple times to ensure we catch the final layout paint
        if (window.initAvatarScrollButtons) {
            setTimeout(window.initAvatarScrollButtons, 50);
            setTimeout(window.initAvatarScrollButtons, 300);
            setTimeout(window.initAvatarScrollButtons, 800);
        }
    } else {
        const grid = document.getElementById('articlesGrid');
        if (grid) {
            grid.innerHTML = '';
            grid.style.display = 'flex';
            grid.style.justifyContent = 'center';
            grid.style.alignItems = 'center';
            grid.style.color = 'rgba(245,158,11,0.5)';
            grid.style.fontFamily = 'var(--font-gu-sans)';
            grid.style.fontSize = '0.9rem';
            grid.style.letterSpacing = '0.05em';
            grid.textContent = 'Visit the live site to see the latest articles.';
        }
        document.getElementById('categoryChips').innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initRotatingQuote();

    // Fetch live articles ΓÇö chips, featured, and latest all rendered after
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
                        section.querySelector('.category-chips') ||
                        section.querySelector('.avatar-row-wrapper .featured-grid');

            if (prevBtn && nextBtn && row) {
                const updateButtons = () => {
                    const scrollLeft = Math.ceil(row.scrollLeft);
                    const maxScroll = row.scrollWidth - row.clientWidth;
                    
                    // Start of scroll
                    if (scrollLeft <= 10) {
                        prevBtn.style.opacity = '0.15';
                        prevBtn.style.pointerEvents = 'none';
                        prevBtn.style.filter = 'grayscale(1)';
                    } else {
                        prevBtn.style.opacity = '1';
                        prevBtn.style.pointerEvents = 'auto';
                        prevBtn.style.filter = 'none';
                    }

                    // End of scroll
                    if (scrollLeft >= maxScroll - 15 || maxScroll <= 0) {
                        nextBtn.style.opacity = '0.15';
                        nextBtn.style.pointerEvents = 'none';
                        nextBtn.style.filter = 'grayscale(1)';
                    } else {
                        nextBtn.style.opacity = '1';
                        nextBtn.style.pointerEvents = 'auto';
                        nextBtn.style.filter = 'none';
                    }
                };

                // Clear listeners to avoid duplicates
                row.removeEventListener('scroll', updateButtons);
                row.addEventListener('scroll', updateButtons, { passive: true });
                window.removeEventListener('resize', updateButtons);
                window.addEventListener('resize', updateButtons);
                
                // Initial check after a short wait for CSS layouts
                updateButtons();
                setTimeout(updateButtons, 100);

                if (!section.dataset.scrollInit) {
                    section.dataset.scrollInit = 'true';
                    prevBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const amount = Math.min(row.clientWidth * 0.8, 500);
                        row.scrollBy({ left: -amount, behavior: 'smooth' });
                    });
                    nextBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const amount = Math.min(row.clientWidth * 0.8, 500);
                        row.scrollBy({ left: amount, behavior: 'smooth' });
                    });
                }
            }
        });
    };

    // Attempt init now for featured
    setTimeout(window.initAvatarScrollButtons, 50);
});
