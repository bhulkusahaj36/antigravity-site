/**
 * admin-ui.js
 * Handles the new sidebar navigation + all interactive UI components.
 */

document.addEventListener('DOMContentLoaded', () => {
    initSidebarNav();
    initVisibilityToggle();
    initFeaturedToggle();
    initSegmentedDateControl();
    initAutoGrowTextarea();
    initUnsavedIndicator();
    insertFieldIcons();
    initAdminTheme();
});

/**
 * Handles Light/Dark mode toggle for the admin panel.
 * Consistently applies theme based on localStorage.
 */
function initAdminTheme() {
    const toggleBtn = document.getElementById('adminThemeToggle');
    if (!toggleBtn) return;

    const root = document.documentElement;
    const STORAGE_KEY = 'adminTheme';

    const setIcons = (mode) => {
        const sun = toggleBtn.querySelector('.sun-icon');
        const moon = toggleBtn.querySelector('.moon-icon');
        if (!sun || !moon) return;
        if (mode === 'dark') {
            sun.style.display = 'none';
            moon.style.display = 'block';
        } else {
            sun.style.display = 'block';
            moon.style.display = 'none';
        }
    };

    // Initialize
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') {
        root.dataset.theme = 'dark';
        setIcons('dark');
    } else {
        root.dataset.theme = '';
        setIcons('light');
    }

    toggleBtn.addEventListener('click', () => {
        const isDark = root.dataset.theme === 'dark';
        if (isDark) {
            root.dataset.theme = '';
            localStorage.setItem(STORAGE_KEY, 'light');
            setIcons('light');
        } else {
            root.dataset.theme = 'dark';
            localStorage.setItem(STORAGE_KEY, 'dark');
            setIcons('dark');
        }
    });
}


// ── Panel/Breadcrumb labels ─────────────────────────────────
const PANEL_LABELS = {
    'panel-dashboard': 'Dashboard',
    'panel-add':       'Add / Edit',
    'panel-manage':    'Manage',
    'panel-quotes':    'Quotes',
    'panel-tasks':     'Tasks',
    'panel-activity':  'Activity Log',
    'panel-sync':      'Maintenance',
};

/**
 * Initialises sidebar + mobile bottom nav navigation.
 * Replaces the old .feed-tab system.
 */
function initSidebarNav() {
    const navItems      = document.querySelectorAll('.admin-nav-item');
    const mobileButtons = document.querySelectorAll('.admin-mobile-nav-btn');
    const panels        = document.querySelectorAll('.admin-panel');
    const breadcrumb    = document.getElementById('adminBreadcrumbCurrent');

    function switchPanel(targetPanelId) {
        // Deactivate all nav items
        navItems.forEach(n => n.classList.remove('active'));
        mobileButtons.forEach(b => b.classList.remove('active'));

        // Activate matching nav items
        document.querySelectorAll(`[data-panel="${targetPanelId}"]`).forEach(el => {
            el.classList.add('active');
        });

        // Update breadcrumb
        if (breadcrumb) breadcrumb.textContent = PANEL_LABELS[targetPanelId] || '';

        // Switch panels
        panels.forEach(p => p.classList.remove('active'));
        const target = document.getElementById(targetPanelId);
        if (target) target.classList.add('active');

        // Trigger panel-specific logic
        if (targetPanelId === 'panel-manage') {
            if (typeof initManageTabs === 'function') {
                initManageTabs();
                document.querySelector('.manage-subtab[data-target="manage-prasangs"]')?.click();
            }
        } else if (targetPanelId === 'panel-dashboard') {
            if (typeof loadDashboardAnalytics === 'function') loadDashboardAnalytics();
        } else if (targetPanelId === 'panel-quotes') {
            if (typeof initQuotesPanel === 'function') initQuotesPanel();
        } else if (targetPanelId === 'panel-tasks') {
            if (typeof renderTasks === 'function') renderTasks();
        } else if (targetPanelId === 'panel-activity') {
            if (typeof renderActivityLog === 'function') renderActivityLog();
        } else if (targetPanelId === 'panel-sync') {
            if (typeof initSyncTool === 'function') initSyncTool();
        }
    }

    // Sidebar items
    navItems.forEach(item => {
        item.addEventListener('click', () => switchPanel(item.getAttribute('data-panel')));
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchPanel(item.getAttribute('data-panel'));
            }
        });
    });

    // Mobile bottom bar buttons
    mobileButtons.forEach(btn => {
        btn.addEventListener('click', () => switchPanel(btn.getAttribute('data-panel')));
    });

    // If ?editId= is in the URL, go straight to the Add/Edit panel
    const _urlParams = new URLSearchParams(window.location.search);
    if (_urlParams.get('editId')) {
        // Switch to add/edit panel without triggering dashboard load
        switchPanel('panel-add');
    } else {
        // Auto-load dashboard on page load
        setTimeout(() => {
            if (typeof loadDashboardAnalytics === 'function') loadDashboardAnalytics();
        }, 100);
    }
}

/**
 * Syncs the Visibility Toggle Switch with the hidden Select element
 */
function initVisibilityToggle() {
    const toggle = document.getElementById('add-public-toggle');
    const hiddenSelect = document.getElementById('add-public');
    
    if (!toggle || !hiddenSelect) return;

    toggle.addEventListener('change', () => {
        hiddenSelect.value = toggle.checked ? 'yes' : 'no';
        hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    toggle.checked = (hiddenSelect.value === 'yes');
}

/**
 * Syncs the Featured Toggle Switch with the hidden Select element
 */
function initFeaturedToggle() {
    const toggle = document.getElementById('add-featured-toggle');
    const hiddenSelect = document.getElementById('add-featured');
    
    if (!toggle || !hiddenSelect) return;

    toggle.addEventListener('change', () => {
        hiddenSelect.value = toggle.checked ? 'yes' : 'no';
        hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    toggle.checked = (hiddenSelect.value === 'yes');
}

/**
 * Handles the Segmented Control for Date Selection
 */
function initSegmentedDateControl() {
    const radios = document.querySelectorAll('input[name="add-date-type"]');
    const singleReveal = document.getElementById('add-date-single-reveal');
    const rangeReveal = document.getElementById('add-date-range-reveal');
    const container = document.getElementById('date-picker-container');

    if (!radios.length) return;

    const updateReveal = (value) => {
        if (value === 'none') {
            container.classList.remove('show');
            setTimeout(() => {
                singleReveal.style.display = 'none';
                rangeReveal.style.display = 'none';
            }, 300);
        } else if (value === 'date') {
            singleReveal.style.display = 'block';
            rangeReveal.style.display = 'none';
            container.classList.add('show');
        } else if (value === 'range') {
            singleReveal.style.display = 'none';
            rangeReveal.style.display = 'block';
            container.classList.add('show');
        }
    };

    radios.forEach(r => r.addEventListener('change', () => updateReveal(r.value)));

    const checked = document.querySelector('input[name="add-date-type"]:checked');
    if (checked) updateReveal(checked.value);
}

/**
 * Auto-growing Textarea Logic
 */
function initAutoGrowTextarea() {
    document.querySelectorAll('.auto-grow').forEach(ta => {
        const adjust = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
        ta.addEventListener('input', adjust);
        setTimeout(adjust, 0);
    });
}

/**
 * Tracks if the form has unsaved changes
 */
function initUnsavedIndicator() {
    const form = document.getElementById('addForm');
    const indicator = document.getElementById('unsaved-indicator');
    if (!form || !indicator) return;

    let isDirty = false;
    const setDirty = () => {
        if (!isDirty) {
            isDirty = true;
            indicator.style.display = 'inline-block';
        }
    };

    form.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('change', setDirty);
        if (input.tagName !== 'SELECT') input.addEventListener('input', setDirty);
    });

    form.addEventListener('submit', () => {
        isDirty = false;
        indicator.style.display = 'none';
    });
}

/**
 * Inserts SVG icons into field-icon elements
 */
function insertFieldIcons() {
    const icons = {
        'icon-type':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
        'icon-album':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        'icon-eye':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        'icon-source':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
        'icon-subject': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        'icon-calendar':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        'icon-pin':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="12" r="3"/></svg>',
        'icon-title':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
        'icon-user':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        'icon-content': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    };

    Object.keys(icons).forEach(cls => {
        document.querySelectorAll('.' + cls).forEach(c => { c.innerHTML = icons[cls]; });
    });
}
