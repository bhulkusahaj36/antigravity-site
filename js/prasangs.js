// ============================================================
// PRASANGS HUB PAGE — Search, filter, browse
// ============================================================

const PS_PAGE_SIZE = 10;
let ps_page = 1;
let PS_ALL = [];           // All loaded articles (non-paravani, public)
let ps_query = '';         // Current search keyword
let ps_filterPrasang = ''; // Current prasang filter
let ps_filterTopic = '';   // Current topic filter
let ps_filterSource = '';  // Current source filter
let ps_sort = 'latest';    // Sort mode
let ps_isSearching = false; // Whether user has active search/filter

// Ordered prasang sequence (same as home.js renderFeatured)
const PS_PRASANG_SEQUENCE = [
    'bhagwan', 'gunatit', 'bhagatji', 'shastriji',
    'yogiji', 'hariprasad', 'prabodh', 'bhakto', 'prabhudasbhai',
];

// ── Avatar Row ──────────────────────────────────────────────
function ps_buildAvatarCard(id, label) {
    const card = document.createElement('a');
    card.className = 'avatar-card';
    card.href = '#psResultsGrid';
    card.addEventListener('click', (e) => {
        // Sync Dropdown
        const fp = document.getElementById('psFilterPrasang');
        if (fp) fp.value = id;
        
        // Update State
        if (typeof ps_filterPrasang !== 'undefined') {
            ps_filterPrasang = id;
            if (typeof ps_updateSearchState === 'function') ps_updateSearchState();
            if (typeof ps_page !== 'undefined') ps_page = 1;
            if (typeof ps_renderChips === 'function') ps_renderChips();
            if (typeof ps_render === 'function') ps_render();
        }
    });

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
            wrap.innerHTML = `<span class="avatar-fallback">${label}</span>`;
        }
    };
    img.src = `images/prasang/${id}.webp`;
    img.alt = label;
    wrap.innerHTML = `<span class="avatar-fallback">${label}</span>`;

    const labelEl = document.createElement('span');
    labelEl.className = 'avatar-label';
    labelEl.textContent = label;

    card.appendChild(wrap);
    card.appendChild(labelEl);
    return card;
}

function ps_renderAvatarRow() {
    const container = document.getElementById('prasangGrid');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'avatar-row';

    PS_PRASANG_SEQUENCE.forEach(key => {
        const label = (typeof PRASANG_LABELS !== 'undefined' && PRASANG_LABELS[key]) || key;
        const card = ps_buildAvatarCard(key, label);
        container.appendChild(card);
    });

    if (typeof setupHorizontalScroll === 'function') {
        document.querySelectorAll('.avatar-row-wrapper').forEach(w => setupHorizontalScroll(w));
    }
}

// ── Filtering & Search Logic ────────────────────────────────

/** Normalize text for fuzzy search */
function ps_norm(str) {
    return (str || '').toLowerCase().trim();
}

/** Check if article matches a comma-separated field (e.g. prasang, topic) */
function ps_fieldMatch(fieldVal, filterVal) {
    if (!filterVal) return true;
    const parts = (fieldVal || '').split(',').map(s => s.trim());
    return parts.includes(filterVal);
}

/** Highlight keyword in text */
function ps_highlight(text, keyword) {
    if (!keyword) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'gi');
    return text.replace(re, '<mark class="ps-highlight">$1</mark>');
}

/** Build a card, optionally highlighting a keyword in title/excerpt */
function ps_buildCard(article, keyword) {
    const el = document.createElement('div');
    el.className = 'article-card neon-latest-card card-animate';

    let excerptText = '';
    if (article.excerpt) {
        const plain = article.excerpt.replace(/<[^>]*>?/gm, '');
        excerptText = plain.substring(0, 120).trim() + (plain.length > 120 ? '…' : '');
    } else if (article.content) {
        const plain = article.content.replace(/<[^>]*>?/gm, '');
        excerptText = plain.substring(0, 120).trim() + (plain.length > 120 ? '…' : '');
    }

    const displayLabel = (typeof getCategoryName === 'function')
        ? (getCategoryName(article.prasang) || getCategoryName(article.category || article.topic || ''))
        : '';

    const titleHtml = ps_highlight(article.title || '', keyword);
    const excerptHtml = ps_highlight(excerptText, keyword);

    el.innerHTML = `
        <span class="neon-bg-span"></span>
        <div class="content">
          ${article.featured ? '<span class="card-featured-tag">FEATURED</span>' : ''}
          <h3 class="card-title">${titleHtml}</h3>
          <p class="card-prasang-label">${displayLabel}</p>
          <p class="card-excerpt">${excerptHtml}</p>
        </div>
    `;

    el.addEventListener('click', () => {
        window.location.href = `article.html?id=${article.id}`;
    });
    return el;
}

/** Get filtered & sorted article list */
function ps_getFiltered() {
    const q = ps_norm(ps_query);

    let results = PS_ALL.filter(a => {
        // Prasang filter
        if (ps_filterPrasang && !ps_fieldMatch(a.prasang, ps_filterPrasang)) return false;
        // Topic filter
        if (ps_filterTopic && !ps_fieldMatch(a.topic || a.category, ps_filterTopic)) return false;
        // Source filter
        if (ps_filterSource && !ps_fieldMatch(a.source, ps_filterSource)) return false;
        // Keyword search
        if (q) {
            const fields = [a.title, a.excerpt, a.content, a.prasang, a.topic, a.source]
                .map(f => ps_norm(f || '')).join(' ');
            if (!fields.includes(q)) return false;
        }
        return true;
    });

    // Sort
    const sortVal = ps_sort;
    if (sortVal === 'newest') {
        results.sort((a, b) => String(b.id).localeCompare(String(a.id)));
    } else if (sortVal === 'oldest') {
        results.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    }

    return results;
}

// ── Render ──────────────────────────────────────────────────

function ps_render() {
    const grid = document.getElementById('psResultsGrid');
    const emptyEl = document.getElementById('psEmpty');
    const emptyMsg = document.getElementById('psEmptyMsg');
    const summaryEl = document.getElementById('psSummary');
    const paginationEl = document.getElementById('psPagination');
    if (!grid) return;

    const results = ps_getFiltered();
    const isFiltered = ps_isSearching;
    const total = results.length;

    // Update summary
    const q = ps_query.trim();
    if (isFiltered) {
        let summaryParts = [];
        if (q) summaryParts.push(`"<strong>${q}</strong>"`);
        if (ps_filterPrasang && typeof PRASANG_LABELS !== 'undefined') {
            summaryParts.push(PRASANG_LABELS[ps_filterPrasang] || ps_filterPrasang);
        }
        const filterDesc = summaryParts.length ? ` · ${summaryParts.join(', ')}` : '';
        summaryEl.innerHTML = `<strong>${total}</strong> results found${filterDesc}`;
    } else {
        summaryEl.innerHTML = `<strong>${PS_ALL.length}</strong> prasang articles`;
    }

    // Slice for pagination
    const totalPages = Math.ceil(total / PS_PAGE_SIZE) || 1;
    if (ps_page > totalPages) ps_page = 1;
    const start = (ps_page - 1) * PS_PAGE_SIZE;
    const slice = results.slice(start, start + PS_PAGE_SIZE);

    // Render cards
    grid.innerHTML = '';
    paginationEl.innerHTML = '';

    if (slice.length === 0) {
        emptyEl.style.display = 'block';
        if (q) {
            emptyMsg.textContent = `"${q}" માટે કોઈ પ્રસંગ મળ્યા નથી.`;
        } else {
            emptyMsg.textContent = 'આ ફિલ્ટર માટે કોઈ પ્રસંગ મળ્યા નથી.';
        }
        return;
    }

    emptyEl.style.display = 'none';

    slice.forEach((a, i) => {
        const card = ps_buildCard(a, q);
        grid.appendChild(card);
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(card,
                { opacity: 0, y: 18 },
                { opacity: 1, y: 0, duration: 0.45, delay: i * 0.045, ease: 'power2.out' }
            );
        }
    });

    // Pagination
    ps_buildPagination(paginationEl, ps_page, totalPages, grid);
}

function ps_buildPagination(container, current, total, scrollTarget) {
    if (total <= 1) return;

    const nav = (label, page, disabled) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline';
        btn.textContent = label;
        btn.disabled = disabled;
        btn.style.padding = '0.5rem 1.2rem';
        btn.style.fontSize = '0.85rem';
        btn.addEventListener('click', () => {
            ps_page = page;
            ps_render();
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return btn;
    };

    const indicator = document.createElement('span');
    indicator.style.cssText = 'color:var(--text-muted);font-size:0.85rem;align-self:center;';
    indicator.textContent = `${current} / ${total}`;

    container.appendChild(nav('← Back', current - 1, current === 1));
    container.appendChild(indicator);
    container.appendChild(nav('Next →', current + 1, current === total));
}

// ── Active Filter Chips ─────────────────────────────────────

function ps_renderChips() {
    const container = document.getElementById('psActiveChips');
    const clearBtn = document.getElementById('psClearBtn');
    if (!container) return;
    container.innerHTML = '';

    const chips = [];

    if (ps_query.trim()) {
        chips.push({ label: `"${ps_query}"`, clear: () => { ps_query = ''; document.getElementById('psSearchInput').value = ''; } });
    }
    if (ps_filterPrasang) {
        const label = (typeof PRASANG_LABELS !== 'undefined' && PRASANG_LABELS[ps_filterPrasang]) || ps_filterPrasang;
        chips.push({ label, clear: () => { ps_filterPrasang = ''; document.getElementById('psFilterPrasang').value = ''; } });
    }
    if (ps_filterTopic) {
        const sel = document.getElementById('psFilterTopic');
        const opt = sel ? Array.from(sel.options).find(o => o.value === ps_filterTopic) : null;
        const label = opt ? opt.text : ps_filterTopic;
        chips.push({ label, clear: () => { ps_filterTopic = ''; document.getElementById('psFilterTopic').value = ''; } });
    }
    if (ps_filterSource) {
        const sel = document.getElementById('psFilterSource');
        const opt = sel ? Array.from(sel.options).find(o => o.value === ps_filterSource) : null;
        const label = opt ? opt.text : ps_filterSource;
        chips.push({ label, clear: () => { ps_filterSource = ''; document.getElementById('psFilterSource').value = ''; } });
    }

    chips.forEach(chip => {
        const el = document.createElement('div');
        el.className = 'ps-chip';
        el.innerHTML = `${chip.label} <span class="ps-chip-x" aria-label="Remove">×</span>`;
        el.addEventListener('click', () => {
            chip.clear();
            ps_updateSearchState();
            ps_page = 1;
            ps_renderChips();
            ps_render();
        });
        container.appendChild(el);
    });

    if (clearBtn) {
        clearBtn.classList.toggle('visible', chips.length > 0);
    }
}

function ps_updateSearchState() {
    ps_isSearching = !!(ps_query.trim() || ps_filterPrasang || ps_filterTopic || ps_filterSource);
}

// ── Event Wiring ─────────────────────────────────────────────

function ps_wireEvents() {
    const searchInput = document.getElementById('psSearchInput');
    const searchBtn = document.getElementById('psSearchBtn');
    const clearBtn = document.getElementById('psClearBtn');
    const filterPrasang = document.getElementById('psFilterPrasang');
    const filterTopic = document.getElementById('psFilterTopic');
    const filterSource = document.getElementById('psFilterSource');
    const sortSel = document.getElementById('psSortSelect');

    // Instant search as user types (debounced 300ms)
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                ps_query = searchInput.value;
                ps_updateSearchState();
                ps_page = 1;
                ps_renderChips();
                ps_render();
            }, 300);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(debounceTimer);
                ps_query = searchInput.value;
                ps_updateSearchState();
                ps_page = 1;
                ps_renderChips();
                ps_render();
            }
        });
    }

    // Search button
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            ps_query = (searchInput ? searchInput.value : '');
            ps_updateSearchState();
            ps_page = 1;
            ps_renderChips();
            ps_render();
        });
    }

    // Filter dropdowns
    if (filterPrasang) {
        filterPrasang.addEventListener('change', () => {
            ps_filterPrasang = filterPrasang.value;
            ps_updateSearchState();
            ps_page = 1;
            ps_renderChips();
            ps_render();
        });
    }
    if (filterTopic) {
        filterTopic.addEventListener('change', () => {
            ps_filterTopic = filterTopic.value;
            ps_updateSearchState();
            ps_page = 1;
            ps_renderChips();
            ps_render();
        });
    }
    if (filterSource) {
        filterSource.addEventListener('change', () => {
            ps_filterSource = filterSource.value;
            ps_updateSearchState();
            ps_page = 1;
            ps_renderChips();
            ps_render();
        });
    }

    // Sort
    if (sortSel) {
        sortSel.addEventListener('change', () => {
            ps_sort = sortSel.value;
            ps_page = 1;
            ps_render();
        });
    }

    // Clear all
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            ps_query = '';
            ps_filterPrasang = '';
            ps_filterTopic = '';
            ps_filterSource = '';
            if (searchInput) searchInput.value = '';
            if (filterPrasang) filterPrasang.value = '';
            if (filterTopic) filterTopic.value = '';
            if (filterSource) filterSource.value = '';
            ps_updateSearchState();
            ps_page = 1;
            ps_renderChips();
            ps_render();
        });
    }
}

// ── If arriving from avatar click on home (via ?prasang=xxx) ─
function ps_checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('prasang');
    if (p) {
        ps_filterPrasang = p;
        const sel = document.getElementById('psFilterPrasang');
        if (sel) sel.value = p;
        ps_updateSearchState();
    }
}

// ── Data Load (Continuation Token aware) ─────────────────────

let ps_nextToken  = null;
let ps_loadingMore = false;

async function ps_fetchBatch(isLoadMore = false) {
    if (ps_loadingMore) return;
    ps_loadingMore = true;

    const params = {
        compact: 'true',
        limit: isLoadMore ? 20 : 40,   // First load: 40 articles; subsequent: 20
        sortBy: 'createdAt_desc'
    };
    if (ps_nextToken) params.continuationToken = ps_nextToken;

    try {
        let result;
        if (window.API) {
            result = await API.get('/api/articles', params, 0);
        } else {
            const qs = new URLSearchParams(params).toString();
            result = await fetch(`/api/articles?${qs}`).then(r => r.json());
        }

        const items  = Array.isArray(result) ? result : (result.items || []);
        const token  = Array.isArray(result) ? null   : (result.nextToken || null);

        const newItems = items.filter(a =>
            a.public !== false && a.public !== 'no' && a.type !== 'paravani'
        );

        if (isLoadMore) {
            const existingIds = new Set(PS_ALL.map(a => String(a.id)));
            PS_ALL = [...PS_ALL, ...newItems.filter(a => !existingIds.has(String(a.id)))];
        } else {
            // Merge with static fallback on initial load
            const staticData = typeof ARTICLES !== 'undefined'
                ? ARTICLES.filter(a => a.public !== false && a.public !== 'no' && a.type !== 'paravani')
                : [];
            const dynIds = new Set(newItems.map(a => String(a.id)));
            const merged = [...staticData.filter(a => !dynIds.has(String(a.id))), ...newItems];
            PS_ALL = merged;
        }

        ps_nextToken = token;

        // Update Load More button
        const loadMoreBtn = document.getElementById('psLoadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = token ? 'flex' : 'none';
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'Load More';
        }

    } catch (err) {
        console.warn('prasangs.js API error:', err.message);
        if (!isLoadMore && typeof ARTICLES !== 'undefined') {
            PS_ALL = ARTICLES.filter(a =>
                a.public !== false && a.public !== 'no' && a.type !== 'paravani'
            );
        }
    } finally {
        ps_loadingMore = false;
    }
}

async function ps_load() {
    // Show skeleton
    const grid = document.getElementById('psResultsGrid');
    if (grid) {
        grid.className = 'cards-grid stacked-grid';
        grid.innerHTML = Array(4).fill(`
            <div class="skeleton-card" style="animation:pulse 1.5s infinite;">
                <div class="skeleton-line skeleton-title" style="background:var(--card-border);"></div>
                <div class="skeleton-line skeleton-body1" style="background:var(--card-border);margin-top:1rem;"></div>
                <div class="skeleton-line skeleton-body2" style="background:var(--card-border);"></div>
            </div>
        `).join('');
    }

    await ps_fetchBatch(false);
    ps_renderChips();
    ps_render();
}

// ── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    ps_renderAvatarRow();
    ps_checkUrlParams();
    ps_wireEvents();

    // Wire Load More button
    const loadMoreBtn = document.getElementById('psLoadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none'; // hidden until first API response tells us there's more
        loadMoreBtn.addEventListener('click', async () => {
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = 'Loading...';
            await ps_fetchBatch(true);
            ps_render();
        });
    }

    ps_load();
});
