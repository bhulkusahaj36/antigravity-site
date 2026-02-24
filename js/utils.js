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
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'હમણાં જ';
    if (diffMin < 60) return `${diffMin} મિનિટ પહેલા`;
    if (diffHr < 24) return `${diffHr} કલાક પહેલા`;
    if (diffDay === 1) return 'ગઈ કાલે';
    if (diffDay === 0) return 'આજે';
    if (diffDay < 7) return `${diffDay} દિવસ પહેલા`;

    // Older than a week — show full date
    return d.toLocaleDateString('gu-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Get category name by id
function getCategoryName(id) {
    const cat = CATEGORIES.find(c => c.id === id);
    return cat ? cat.name : id;
}

// Get category by id
function getCategory(id) {
    return CATEGORIES.find(c => c.id === id) || null;
}

// Build a single article card element
function buildCard(article) {
    // Use first topic/category tag only (avoid 'seva,other' combined display)
    const primaryCat = (article.topic || article.category || 'bhakti').split(',')[0].trim();
    const cat = getCategoryName(primaryCat);
    const displayDate = article.date ? article.date : (article.publishDate || '');

    // Format date, handle range object if present
    let dateStr = '';
    if (typeof displayDate === 'object' && displayDate !== null) {
        dateStr = (displayDate.from || '') + (displayDate.to ? ' – ' + displayDate.to : '');
    } else {
        dateStr = displayDate ? formatDate(displayDate) : '';
    }

    const displayExcerpt = article.excerpt ? article.excerpt : (article.content ? article.content.replace(/<[^>]*>?/gm, '').substring(0, 140) + '...' : '');

    const el = document.createElement('div');
    el.className = 'article-card card-animate';
    el.innerHTML = `
    <div class="card-top">
      <span class="category-badge">${cat}</span>
    </div>
    <h3 class="card-title">${article.title}</h3>
    <p class="card-excerpt">${displayExcerpt}</p>
    <div class="card-footer">
      <a href="article.html?id=${article.id}" class="read-more">વધુ વાંચો</a>
    </div>
  `;
    el.addEventListener('click', (e) => {
        if (!e.target.classList.contains('read-more')) {
            window.location.href = `article.html?id=${article.id}`;
        }
    });
    return el;
}

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

    function buildCustomSelect(nativeSelect) {
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

        function updateTriggerText() {
            if (nativeSelect.multiple) {
                const selected = Array.from(nativeSelect.selectedOptions).filter(o => o.value !== '');
                const placeholderOpt = Array.from(nativeSelect.options).find(o => o.value === '');

                if (selected.length === 0) {
                    valueSpan.textContent = placeholderOpt ? placeholderOpt.text : 'પસંદ કરો...';
                    valueSpan.className = 'cs-value cs-placeholder';
                } else if (selected.length <= 2) {
                    valueSpan.textContent = selected.map(o => o.text).join(', ');
                    valueSpan.className = 'cs-value';
                } else {
                    valueSpan.textContent = `${selected.length} પસંદ થયેલ`;
                    valueSpan.className = 'cs-value';
                }
            } else {
                const sel = nativeSelect.options[nativeSelect.selectedIndex];
                if (!sel) return;
                valueSpan.textContent = sel.text;
                valueSpan.className = 'cs-value' + (sel.value === '' ? ' cs-placeholder' : '');
            }
        }

        Array.from(nativeSelect.options).forEach((opt, i) => {
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
        }

        function closeDropdown() {
            wrapper.classList.remove('cs-open');
            optList.style.display = 'none';
            trigger.setAttribute('aria-expanded', 'false');
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

    document.querySelectorAll('.feed-select').forEach(buildCustomSelect);

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

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initUIComponents();
});
