// ============================================================
// PRASANG PAGE — show articles filtered by prasang + sidebar
// ============================================================

const PRASANG_LABELS_PG = {
    bhagwan: 'ભગવાન સ્વામિનારાયણ',
    gunatit: 'ગુણાતીતાનંદ સ્વામી',
    bhagatji: 'ભગતજી મહારાજ',
    yogiji: 'યોગીજી મહારાજ',
    shastriji: 'શાસ્ત્રીજી મહારાજ',
    hariprasad: 'હ.સ્વામીજી મહારાજ',
    prabodh: 'પ્રબોધ સ્વામીજી',
    bhakto: 'ભક્તો',
};

let ALL_ARTICLES_PG = [];
let currentPrasang = '';

function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key) || '';
}

function matches(fieldVal, filterVals) {
    if (!filterVals || filterVals.length === 0) return true;
    const parts = (fieldVal || '').split(',').map(s => s.trim());
    return filterVals.some(f => parts.includes(f));
}

function getFilterVals(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return [];
    const vals = Array.from(sel.selectedOptions).map(o => o.value).filter(v => v);
    return vals;
}

function applyFilters() {
    const topics = getFilterVals('pf-topic');
    const sources = getFilterVals('pf-source');

    let results = ALL_ARTICLES_PG.filter(a => {
        const inPrasang = (a.prasang || '').split(',').map(s => s.trim()).includes(currentPrasang);
        if (!inPrasang) return false;
        if (!matches(a.topic || a.category, topics)) return false;
        if (!matches(a.source, sources)) return false;
        return true;
    });

    renderResults(results);
}

function renderResults(articles) {
    const grid = document.getElementById('prasangResults');
    const empty = document.getElementById('prasangEmpty');
    const count = document.getElementById('prasangCount');

    grid.innerHTML = '';
    if (articles.length === 0) {
        empty.style.display = 'block';
        if (count) count.textContent = 'કોઈ લેખ મળ્યો નહીં';
        return;
    }
    empty.style.display = 'none';
    if (count) count.textContent = `${articles.length} લેખ`;

    articles.forEach((a, i) => {
        const card = buildCard(a);
        card.style.animationDelay = `${i * 0.06}s`;
        grid.appendChild(card);
    });
}

function setHeader() {
    const label = PRASANG_LABELS_PG[currentPrasang] || currentPrasang;

    // Title
    const titleEl = document.getElementById('prasangTitle');
    if (titleEl) titleEl.textContent = label;

    // Avatar
    const wrap = document.getElementById('prasangAvatar');
    const fallback = document.getElementById('prasangFallback');
    if (!wrap) return;

    fallback.textContent = label;

    const img = new Image();
    img.onload = () => {
        fallback.style.display = 'none';
        img.className = 'prasang-banner-avatar-img';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        wrap.appendChild(img);
    };
    img.onerror = () => {
        if (!img.src.endsWith('.svg')) {
            img.src = `images/prasang/${currentPrasang}.svg`;
        }
    };
    img.src = `images/prasang/${currentPrasang}.jpg`;
    img.alt = label;
}

async function init() {
    initNav();
    currentPrasang = getQueryParam('prasang');

    if (!currentPrasang) {
        window.location.href = 'index.html';
        return;
    }

    setHeader();

    try {
        const res = await fetch('/api/articles?t=' + Date.now());
        if (res.ok) {
            ALL_ARTICLES_PG = await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch articles:', e);
    }

    applyFilters();

    // Wire up filter listeners
    ['pf-topic', 'pf-source'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
    });

    // Reset button
    const resetBtn = document.getElementById('pfResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('pf-topic').selectedIndex = -1;
            document.getElementById('pf-source').selectedIndex = -1;
            applyFilters();
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
