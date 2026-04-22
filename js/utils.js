// ============================================================
// UTILS — shared helpers used across all pages
// ============================================================

// Navbar scroll shadow + mobile toggle
function initNav() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    });

    if (toggle) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }
}

// Format a date as relative time (e.g. '2 mins ago', 'Today', 'Yesterday') or full Gujarati date
function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    const now = new Date();
    const diffMs = now - d;
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    if (d >= startOfToday) return 'આજે';
    if (d >= startOfYesterday) return 'ગઈ કાલે';
    if (diffDay < 7) return `${diffDay} દિવસ પહેલા`;

    // Older than a week — show full date
    return d.toLocaleDateString('gu-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Get category name by id (handles comma-separated and custom tags)
function getCategoryName(idText) {
    if (!idText) return '';
    const str = String(idText);
    const ids = str.split(',').map(s => s.trim()).filter(Boolean);

    let allCustomTags = [];
    try {
        const stored = localStorage.getItem('hk_custom_tags');
        if (stored) {
            const parsed = JSON.parse(stored);
            allCustomTags = [
                ...(parsed.source || []),
                ...(parsed.topic || []),
                ...(parsed.prasang || [])
            ];
        }
    } catch (e) { }

    return ids.map(id => {
        // 1. Hardcoded in PRASANG_LABELS
        if (typeof PRASANG_LABELS !== 'undefined' && PRASANG_LABELS[id]) {
            return PRASANG_LABELS[id];
        }

        // 2. Hardcoded in CATEGORIES
        const cat = CATEGORIES.find(c => c.id === id);
        if (cat) return cat.name;

        // 3. Hardcoded in TOPIC_LABELS
        if (typeof TOPIC_LABELS !== 'undefined' && TOPIC_LABELS[id]) {
            return TOPIC_LABELS[id];
        }

        // 4. Custom from localStorage
        const custom = allCustomTags.find(t => t.value === id);
        if (custom) return custom.label;

        // If it's a known internal ID that wasn't matched above, return empty or filtered
        // But for now, we'll return the ID if it doesn't look like a technical key
        return id;
    }).filter(Boolean).join(', ');
}

// Get category by id
function getCategory(id) {
    if (!id) return null;
    
    // 1. Hardcoded in PRASANG_LABELS
    if (typeof PRASANG_LABELS !== 'undefined' && PRASANG_LABELS[id]) {
        return { id: id, name: PRASANG_LABELS[id], description: '' };
    }

    // 2. Hardcoded in CATEGORIES
    let cat = CATEGORIES.find(c => c.id === id);
    if (cat) return cat;

    // 3. Hardcoded in TOPIC_LABELS
    if (typeof TOPIC_LABELS !== 'undefined' && TOPIC_LABELS[id]) {
        return { id: id, name: TOPIC_LABELS[id], description: '' };
    }

    try {
        const stored = localStorage.getItem('hk_custom_tags');
        if (stored) {
            const parsed = JSON.parse(stored);
            const allCustomTags = [
                ...(parsed.source || []),
                ...(parsed.topic || []),
                ...(parsed.prasang || [])
            ];
            const custom = allCustomTags.find(t => t.value === id);
            if (custom) return { id: id, name: custom.label, description: '' };
        }
    } catch (e) { }

    return null;
}

// Build a single article card element with 3D flip effect
function buildCard(article, isLatest = false) {
    if (!article || !article.title) return null; // Skip invalid entries

    const el = document.createElement('div');
    el.className = 'article-card neon-latest-card card-animate';

    // Clean content for excerpt (if not already a formatted snippet)
    let excerptText = '';
    if (article.excerpt && article.excerpt.includes('<mark')) {
        // Already a formatted snippet from search
        excerptText = article.excerpt;
    } else {
        const plainText = article.excerpt ? article.excerpt : (article.content ? article.content.replace(/<[^>]*>?/gm, '') : '');
        excerptText = plainText.substring(0, 300).trim() + (plainText.length > 300 ? '...' : '');
    }
    
    // Ensure every card has a visible label (Fall back to category if Prasang is missing)
    const displayLabel = getCategoryName(article.prasang) || getCategoryName(article.category || article.topic || 'bhakti');

    el.innerHTML = `
        <span class="neon-bg-span"></span>
        <div class="content">
          ${article.featured ? '<span class="card-featured-tag">FEATURED</span>' : ''}
          <h3 class="card-title">${article.title}</h3>
          <p class="card-prasang-label">${displayLabel}</p>
          <p class="card-excerpt">${excerptText}</p>
          <div class="card-footer" style="padding-top: 1rem; margin-top: auto;">
            <a href="article.html?id=${article.id}" class="readmore-btn">
              <span class="btn-book-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 126 75" class="book">
                      <rect stroke-width="3" stroke="var(--gold-500)" rx="7.5" height="70" width="121" y="2.5" x="2.5"></rect>
                      <line stroke-width="3" stroke="var(--gold-500)" y2="75" x2="63.5" x1="63.5"></line>
                      <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-300)" d="M25 20H50"></path>
                      <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-300)" d="M101 20H76"></path>
                      <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-300)" d="M16 30L50 30"></path>
                      <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-300)" d="M110 30L76 30"></path>
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="var(--gold-500)" viewBox="0 0 65 75" class="book-page">
                      <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-200)" d="M40 20H15"></path>
                      <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-200)" d="M49 35H15"></path>
                      <path stroke-linecap="round" stroke-width="4" stroke="var(--gold-200)" d="M49 50H15"></path>
                      <path stroke-width="3" stroke="var(--gold-500)" d="M2.5 2.5H55C59.1421 2.5 62.5 5.85786 62.5 10V65C62.5 69.1421 59.1421 72.5 55 72.5H2.5V2.5Z"></path>
                  </svg>
              </span>
              <span class="text">વાંચો</span>
            </a>
          </div>
        </div>
    `;

    el.addEventListener('click', (e) => {
        if (!e.target.closest('.readmore-btn')) {
            window.location.href = `article.html?id=${article.id}`;
        }
    });
    return el;
}

// Removing simple scroll animations to make way for Fluid GSAP ScrollTrigger.

// Render pagination buttons
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', () => onPageChange(i));
        container.appendChild(btn);
    }
}

/**
 * Setup horizontal scroll controls for a container (prev/next buttons)
 * @param {HTMLElement} wrapper - The outer wrapper containing the controls and the scrollable list
 */
function setupHorizontalScroll(wrapper) {
    const scrollContainer = wrapper.querySelector('.avatar-row, .cards-grid, .category-chips');
    const prevBtn = wrapper.closest('section')?.querySelector('.prev-btn') || wrapper.querySelector('.prev-btn');
    const nextBtn = wrapper.closest('section')?.querySelector('.next-btn') || wrapper.querySelector('.next-btn');

    if (!scrollContainer) return;

    const scrollAmount = 340; // Approx width of card + gap

    if (prevBtn) {
        prevBtn.onclick = () => {
            scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        };
    }

    // Optional: Hide/Disable buttons based on scroll position
    const updateButtons = () => {
        if (prevBtn) prevBtn.style.opacity = scrollContainer.scrollLeft <= 0 ? '0.3' : '1';
        if (nextBtn) {
            const isAtEnd = scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 10;
            nextBtn.style.opacity = isAtEnd ? '0.3' : '1';
        }
    };

    scrollContainer.addEventListener('scroll', updateButtons);
    window.addEventListener('resize', updateButtons);
    setTimeout(updateButtons, 500); // Initial check
}

// Parse query string param
function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

// ============================================================
// UI COMPONENTS (Shared across Feed and Search)
// ============================================================
function initUIComponents() {
    /* ── Custom Select Engine ────────────────────────────────── */
    const ARROW_SVG = `<svg class="cs-arrow" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
    </svg>`;

    // Add a checkmark svg for multiple select options
    const CHECK_SVG = `<svg class="cs-check" viewBox="0 0 24 24" fill="none"
        stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
        style="width:16px; height:16px; margin-right: 8px; opacity: 0; transition: opacity 0.2s;">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;

    window.buildCustomSelect = function(nativeSelect) {
        if (nativeSelect._csWrapper) return; // Prevent double build

        const wrapper = document.createElement('div');
        wrapper.className = 'cs-wrapper' + (nativeSelect.multiple ? ' cs-multiple' : '');

        if (nativeSelect.classList.contains('feed-conditional')) {
            wrapper.classList.add('feed-conditional');
            wrapper.dataset.showFor = nativeSelect.dataset.showFor;
            wrapper.style.display = nativeSelect.style.display;
        }

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'cs-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const valueSpan = document.createElement('span');
        valueSpan.className = 'cs-value';

        trigger.appendChild(valueSpan);
        trigger.insertAdjacentHTML('beforeend', ARROW_SVG);

        const optList = document.createElement('ul');
        optList.className = 'cs-options';
        optList.setAttribute('role', 'listbox');
        if (nativeSelect.multiple) optList.setAttribute('aria-multiselectable', 'true');
        optList.style.display = 'none';

        // ======= ADD SEARCH INPUT =======
        const searchLi = document.createElement('li');
        searchLi.className = 'cs-search-wrapper';
        searchLi.style.padding = '0.5rem';
        searchLi.style.position = 'sticky';
        searchLi.style.top = '0';
        searchLi.style.background = 'var(--bg-900, #111827)'; // matching theme background
        searchLi.style.zIndex = '2';
        searchLi.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        searchLi.style.cursor = 'default';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'feed-input';
        searchInput.placeholder = 'Search options...';
        searchInput.style.width = '100%';
        searchInput.style.padding = '0.4rem 0.6rem';
        searchInput.style.fontSize = '0.9rem';
        searchInput.style.marginBottom = '0';

        searchLi.appendChild(searchInput);

        searchLi.addEventListener('click', e => e.stopPropagation());

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            optList.querySelectorAll('.cs-option').forEach(li => {
                const text = li.textContent.toLowerCase();
                li.style.display = text.includes(term) ? (nativeSelect.multiple ? 'flex' : '') : 'none';
            });
        });

        optList.appendChild(searchLi);
        // ================================

        // Helper to get effective text (resolves linked conditional inputs like "other")
        function getOptionText(o) {
            const linkedInput = document.querySelector(`input[data-show-for="${nativeSelect.id}=${o.value}"]`);
            if (linkedInput && linkedInput.value.trim() !== '') {
                return linkedInput.value.trim();
            }
            return o.text;
        }

        function updateTriggerText() {
            const selectedOptions = Array.from(nativeSelect.selectedOptions);
            const hasValue = selectedOptions.some(o => o.value !== "");
            wrapper.classList.toggle('cs-has-value', hasValue);

            if (nativeSelect.multiple) {
                const selectedNonEmpty = selectedOptions.filter(o => o.value !== '');
                const placeholderOpt = Array.from(nativeSelect.options).find(o => o.value === '');

                if (selectedNonEmpty.length === 0) {
                    valueSpan.textContent = nativeSelect.getAttribute('placeholder') || (placeholderOpt ? placeholderOpt.text : 'પસંદ કરો...');
                    valueSpan.classList.add('cs-placeholder');
                } else if (selectedNonEmpty.length <= 2) {
                    valueSpan.textContent = selectedNonEmpty.map(o => getOptionText(o)).join(', ');
                    valueSpan.classList.remove('cs-placeholder');
                } else {
                    valueSpan.textContent = `${selectedNonEmpty.length} પસંદ થયેલ`;
                    valueSpan.classList.remove('cs-placeholder');
                }
            } else {
                const sel = nativeSelect.options[nativeSelect.selectedIndex];
                if (!sel) return;
                valueSpan.textContent = getOptionText(sel);
                valueSpan.className = 'cs-value' + (sel.value === '' ? ' cs-placeholder' : '');
            }
        }

        // Listen for typing in linked custom inputs so we live-update the dropdown trigger text
        if (nativeSelect.id) {
            document.querySelectorAll(`input[data-show-for^="${nativeSelect.id}="]`).forEach(input => {
                // Ensure we don't bind multiple times if buildCustomSelect runs again
                if (!input._hasCsListener) {
                    input.addEventListener('input', updateTriggerText);
                    input._hasCsListener = true;
                }
            });
        }

        Array.from(nativeSelect.options).forEach((opt, i) => {
            if (opt.value === '') return; // Skip the placeholder option so it doesn't appear in the menu list

            const li = document.createElement('li');
            li.className = 'cs-option' + (opt.selected ? ' cs-selected' : '');
            li.dataset.value = opt.value;

            // For multiple select, we prepend a checkmark that becomes visible when selected
            if (nativeSelect.multiple) {
                li.innerHTML = CHECK_SVG + `<span>${opt.text}</span>`;
                li.style.display = 'flex';
                li.style.alignItems = 'center';
            } else {
                li.textContent = opt.text;
            }

            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', opt.selected);

            li.addEventListener('click', (e) => {
                if (nativeSelect.multiple) {
                    e.stopPropagation(); // Don't close dropdown on multi-select

                    if (opt.value === '') {
                        // "All" or Placeholder clicked - deselect everything else
                        Array.from(nativeSelect.options).forEach(o => o.selected = false);
                        opt.selected = true;
                    } else {
                        // Regular option clicked - deselect placeholder, toggle this one
                        const placeholderOpt = Array.from(nativeSelect.options).find(o => o.value === '');
                        if (placeholderOpt) placeholderOpt.selected = false;
                        opt.selected = !opt.selected;
                    }

                    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));

                    // Sync UI checks
                    optList.querySelectorAll('.cs-option').forEach(otherLi => {
                        const isSel = Array.from(nativeSelect.selectedOptions).some(so => so.value === otherLi.dataset.value);
                        otherLi.classList.toggle('cs-selected', isSel);
                        otherLi.setAttribute('aria-selected', isSel);
                    });

                    // Auto-close for all multiselects EXCEPT Subject (topic)
                    if (nativeSelect.id !== 'add-topic' && nativeSelect.id !== 'br-topic') {
                        closeDropdown();
                    }

                } else {
                    nativeSelect.value = opt.value;
                    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));

                    optList.querySelectorAll('.cs-option').forEach(o => {
                        o.classList.remove('cs-selected');
                        o.setAttribute('aria-selected', 'false');
                    });
                    li.classList.add('cs-selected');
                    li.setAttribute('aria-selected', 'true');
                    closeDropdown();
                }
                updateTriggerText();
            });

            optList.appendChild(li);
        });

        updateTriggerText();

        function openDropdown() {
            document.querySelectorAll('.cs-wrapper.cs-open').forEach(w => {
                if (w !== wrapper) closeOther(w);
            });
            wrapper.classList.add('cs-open');
            optList.style.display = '';
            trigger.setAttribute('aria-expanded', 'true');
            // Focus search
            setTimeout(() => searchInput.focus(), 10);
        }

        function closeDropdown() {
            wrapper.classList.remove('cs-open');
            optList.style.display = 'none';
            trigger.setAttribute('aria-expanded', 'false');
            // Reset search
            searchInput.value = '';
            optList.querySelectorAll('.cs-option').forEach(li => {
                li.style.display = nativeSelect.multiple ? 'flex' : '';
            });
        }

        function closeOther(w) {
            w.classList.remove('cs-open');
            const ol = w.querySelector('.cs-options');
            if (ol) ol.style.display = 'none';
            const t = w.querySelector('.cs-trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', e => {
            e.stopPropagation();
            wrapper.classList.contains('cs-open') ? closeDropdown() : openDropdown();
        });

        document.addEventListener('click', () => closeDropdown());
        wrapper.addEventListener('click', e => e.stopPropagation());

        trigger.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeDropdown();
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(optList);

        nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
        nativeSelect.classList.add('cs-hidden');
        nativeSelect._csWrapper = wrapper;

        nativeSelect.addEventListener('change', () => {
            updateTriggerText();
            optList.querySelectorAll('.cs-option').forEach(li => {
                const isSelected = nativeSelect.multiple
                    ? Array.from(nativeSelect.selectedOptions).some(o => o.value === li.dataset.value)
                    : nativeSelect.value === li.dataset.value;
                li.classList.toggle('cs-selected', isSelected);
                li.setAttribute('aria-selected', isSelected);
            });
        });
    }

    document.querySelectorAll('.feed-select').forEach(window.buildCustomSelect);

    // Track if inputs have values for CSS "Interactive Reveal"
    function trackInputValues() {
        const inputs = document.querySelectorAll('.feed-input');
        inputs.forEach(input => {
            const field = input.closest('.feed-field');
            if (!field) return;

            const update = () => {
                field.classList.toggle('field-has-value', input.value.trim() !== "");
            };
            input.addEventListener('input', update);
            update(); // Initial check
        });
    }
    trackInputValues();

    function wireConditional(selectEl) {
        const id = selectEl.id;
        const conditionals = document.querySelectorAll(`[data-show-for^="${id}="]`);

        selectEl.addEventListener('change', () => {
            conditionals.forEach(el => {
                const target = el._csWrapper || el;
                const [, val] = el.dataset.showFor.split('=');

                let visible = false;
                if (selectEl.multiple) {
                    visible = Array.from(selectEl.selectedOptions).some(o => o.value === val);
                } else {
                    visible = selectEl.value === val;
                }

                target.style.display = visible ? '' : 'none';
                if (!visible) {
                    if (el.tagName === 'INPUT') el.value = '';
                    if (el.tagName === 'SELECT') {
                        if (el.multiple) {
                            Array.from(el.options).forEach(o => o.selected = false);
                        } else {
                            el.selectedIndex = 0;
                        }
                        el.dispatchEvent(new Event('change'));
                    }
                }
            });
        });
    }

    document.querySelectorAll('[data-conditional]').forEach(wireConditional);
}

// Shared Date Radio Toggle setup
function wireDateRadio(prefix) {
    const radios = document.querySelectorAll(`[name="${prefix}-date-type"]`);
    const single = document.getElementById(`${prefix}-date-single`);
    const range = document.getElementById(`${prefix}-date-range`);
    if (!radios.length) return;

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            single.style.display = radio.value === 'date' ? '' : 'none';
            range.style.display = radio.value === 'range' ? '' : 'none';

            if (radio.value !== 'date') { const el = document.getElementById(`${prefix}-date-val`); if (el) el.value = ''; }
            if (radio.value !== 'range') {
                const f = document.getElementById(`${prefix}-date-from`);
                const t = document.getElementById(`${prefix}-date-to`);
                if (f) f.value = '';
                if (t) t.value = '';
            }
        });
    });
}

// Helper to get date value from the UI group
function getDateValue(prefix) {
    const type = document.querySelector(`[name="${prefix}-date-type"]:checked`)?.value;
    if (type === 'date') return document.getElementById(`${prefix}-date-val`)?.value || '';
    if (type === 'range') return {
        from: document.getElementById(`${prefix}-date-from`)?.value || '',
        to: document.getElementById(`${prefix}-date-to`)?.value || '',
    };
    return null;
}

// ============================================================
// DYNAMIC "OTHER" OPTIONS (CROSS-SITE PERSISTENCE)
// ============================================================

// Load custom tags from localStorage
function getCustomTags() {
    try {
        const stored = localStorage.getItem('hk_custom_tags');
        let tags = stored ? JSON.parse(stored) : { source: [], topic: [], prasang: [] };

        // --- PATCH: Auto-cleanup bad entries from previous bugs ---
        let modified = false;
        if (tags.prasang && Array.isArray(tags.prasang)) {
            const originalLength = tags.prasang.length;
            tags.prasang = tags.prasang.filter(t => t.label !== 'ભગા દોશી');
            if (tags.prasang.length !== originalLength) modified = true;
        }
        if (modified) {
            localStorage.setItem('hk_custom_tags', JSON.stringify(tags));
        }
        // ----------------------------------------------------------

        return tags;
    } catch (e) {
        console.error("Error reading custom tags", e);
        return { source: [], topic: [], prasang: [] };
    }
}

// Save a new custom tag
function saveCustomTag(category, value, label) {
    const tags = getCustomTags();
    if (!tags[category]) tags[category] = [];

    // Check if already exists
    if (!tags[category].some(t => t.value === value)) {
        tags[category].push({ value, label });
        localStorage.setItem('hk_custom_tags', JSON.stringify(tags));
    }
}

// Map dropdown IDs to their tag categories
const DROPDOWN_CATEGORY_MAP = {
    'add-source': 'source',
    'br-source': 'source',
    'add-topic': 'topic',
    'br-topic': 'topic',
    'add-prasang': 'prasang',
    'br-prasang': 'prasang'
};

// Inject custom tags into native <select> elements
function injectCustomOptions() {
    const tags = getCustomTags();

    Object.keys(DROPDOWN_CATEGORY_MAP).forEach(selectId => {
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;

        const category = DROPDOWN_CATEGORY_MAP[selectId];
        const customItems = tags[category] || [];

        customItems.forEach(item => {
            // Check if option already exists natively
            if (!selectEl.querySelector(`option[value="${item.value}"]`)) {
                const opt = document.createElement('option');
                opt.value = item.value;
                opt.textContent = item.label;
                opt.classList.add('custom-injected-option');

                // Insert right before the "other" or "anya" option if it exists, otherwise at the end
                const otherOpt = Array.from(selectEl.options).find(o => o.value === 'other' || o.value === 'anya');
                if (otherOpt) {
                    selectEl.insertBefore(opt, otherOpt);
                } else {
                    selectEl.appendChild(opt);
                }
            }
        });
    });
}

// ============================================================
// SEAMLESS FADE TRANSITIONS
// ============================================================
function initPageTransitions() {
    // 1. Initial entering state when DOM is loaded
    document.body.classList.add('page-entering');

    // Remove entering state slightly after to trigger CSS transition
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.remove('page-entering');
        });
    });

    // 2. BFCACHE FIX: Clear states when navigating back
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            document.body.classList.remove('page-exiting', 'page-entering');
        }
    });

    // 3. Intercept internal link clicks for the exit animation
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');

        if (!link || !link.href) return;

        // Don't intercept external links, page anchors, or ctrl/cmd clicks
        if (link.hostname !== window.location.hostname ||
            link.target === '_blank' ||
            link.href.includes('#') ||
            link.href.startsWith('mailto:') ||
            e.ctrlKey || e.metaKey) {
            return;
        }

        e.preventDefault();
        const targetUrl = link.href;

        // Apply exiting animation
        document.body.classList.add('page-exiting');

        // Show the global loader animation again for page transition
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'flex';
            // Force reflow
            loader.offsetHeight;
            loader.classList.remove('fade-out');
        }

        // FAIL-SAFE: If navigation is cancelled/delayed, restore visibility
        setTimeout(() => {
            document.body.classList.remove('page-exiting');
            if (loader) {
                loader.classList.add('fade-out');
                setTimeout(() => { loader.style.display = 'none'; }, 600);
            }
        }, 1000);

        // Navigate after transition finishes (500ms allows loader to fade completely in)
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 500);
    });
}

// ============================================================
// SECURITY / COPY PROTECTION
// ============================================================
function initSecurity() {
    // 1. Check for Admin Bypass (Developer Mode)
    // To enable: Open console once and type: localStorage.setItem('hk_debug_mode', 'true'); then refresh.
    const isDebugMode = localStorage.getItem('hk_debug_mode') === 'true';
    if (isDebugMode) {
        console.log("🛠️ Developer Mode Active: Protections Disabled.");
        return;
    }

    // 2. Exclude specific management/login pages
    const path = window.location.pathname.toLowerCase();
    const isUrlAdmin = path.includes('admin') || path.includes('feed.html') || path.includes('recovered_admin');
    if (isUrlAdmin) return;

    // 3. Apply Visual Protections
    document.body.classList.add('copy-protected');

    // 4. (REMOVED) Block Context Menu (Right-Click) 
    // Re-enabled as requested to allow standard browser menu functionality.

    // 5. Block Copy/Cut/Paste
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('cut', e => e.preventDefault());

    // 6. Block Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+U, etc.)
    document.addEventListener('keydown', e => {
        if (
            (e.ctrlKey || e.metaKey) &&
            (e.key === 'c' || e.key === 'C' ||
                e.key === 'a' || e.key === 'A' ||
                e.key === 'u' || e.key === 'U' ||
                e.key === 's' || e.key === 'S' ||
                e.key === 'p' || e.key === 'P' ||
                e.key === 'x' || e.key === 'X' ||
                e.key === 'j' || e.key === 'J') ||
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'c' || e.key === 'C' || e.key === 'j' || e.key === 'J'))
        ) {
            e.preventDefault();
            return false;
        }
    });

    // 7. Block Drag and Drop
    document.addEventListener('dragstart', e => e.preventDefault());

    // 8. Security Monitoring
    // (Aggressive deterrent loop removed for standard cross-browser compatibility)
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
    injectCustomOptions();
    initUIComponents();
    initPageTransitions();
    initSecurity();
});

// ============================================================
// THEME DEFAULT (LIGHT & DARK)
// ============================================================
function initTheme() {
    const savedTheme = localStorage.getItem('hk_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    const themeToggles = document.querySelectorAll('.theme-toggle');
    themeToggles.forEach(toggle => {
        const sunIcon = toggle.querySelector('.sun-icon');
        const moonIcon = toggle.querySelector('.moon-icon');

        if (savedTheme === 'light') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }

        toggle.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-mode');
            localStorage.setItem('hk_theme', isLight ? 'light' : 'dark');

            if (isLight) {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            } else {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            }
        });
    });
}

// Global Page Loader hide logic
window.addEventListener('load', () => {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.add('fade-out');
        // Completely remove from render tree after fade finish (600ms buffer)
        setTimeout(() => {
            loader.style.display = 'none';
        }, 650);
    }
});
