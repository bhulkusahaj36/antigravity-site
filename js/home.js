// ============================================================
// HOME PAGE
// ============================================================

const ITEMS_PER_PAGE = 4;
let currentPage = 1;
let sortMode = 'latest';
let ALL_ARTICLES = [];

// Prasang display labels (value → Gujarati name) - DEPRECATED (Moved to data.js)
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
        'bhagwan',      // ભગવાન સ્વામિનારાયણ
        'gunatit',      // ગુણાતીતાનંદ સ્વામી
        'bhagatji',     // ભગતજી મહારાજ
        'shastriji',    // શાસ્ત્રીજી મહારાજ
        'yogiji',       // યોગીજી મહારાજ
        'hariprasad',   // હ. સ્વામીજી મહારાજ
        'prabodh',      // પ્રબોધ સ્વમીજી મહારાજ
        'bhakto'        // ભક્તો
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
    // Keep only top 5 latest
    const sorted = getSorted(ALL_ARTICLES).slice(0, 5);

    grid.innerHTML = '';
    sorted.forEach((a, i) => {
        const card = buildCard(a);
        card.style.animationDelay = `${i * 0.07}s`;
        grid.appendChild(card);
    });

    // Clear pagination for home page latest section
    const paginationEl = document.getElementById('pagination');
    if (paginationEl) paginationEl.innerHTML = '';
}

// ============================================================
// 3D ARTICLE CAROUSEL LOGIC
// ============================================================
// ============================================================
// 3D "ZENITH ARC" CAROUSEL LOGIC
// ============================================================
let rotationAngle = 0; // Current scroll position in degrees
let targetAngle = 0;   // Target snap position
let isDragging = false;
let startX = 0;
let currentX = 0;
let velocity = 0;
let lastX = 0;
let autoRotateTimer;

function initArticleCarousel() {
    const wrapper = document.querySelector('.carousel-wrapper');
    const carouselEl = document.getElementById('articleCarousel');
    if (!carouselEl || !ALL_ARTICLES || ALL_ARTICLES.length === 0) return;

    // Get top 10 articles
    const latest = getSorted(ALL_ARTICLES).slice(0, 10);
    const total = latest.length;
    const angleStep = 360 / total; // Space between cards on the circle
    
    carouselEl.innerHTML = '';
    latest.forEach((article, i) => {
        const card = document.createElement('div');
        card.className = 'carousel-card';
        card.onclick = () => { 
            if (Math.abs(velocity) < 0.5) { // Prevent click while fast-scrolling
                window.location.href = `article-detail.html?id=${article.id}`; 
            }
        };

        const topicName = getCategoryName(article.topic || article.category).split(',')[0];
        card.innerHTML = `
            <div class="carousel-card-body">
                <h3 class="carousel-card-title">${article.title}</h3>
                <span class="carousel-card-info">${topicName}</span>
                <img src="${article.image || 'images/article-placeholder.webp'}" alt="${article.title}">
                <p class="carousel-card-excerpt">${article.excerpt || ''}</p>
            </div>
        `;
        carouselEl.appendChild(card);
    });

    const updatePositions = () => {
        const cards = carouselEl.querySelectorAll('.carousel-card');
        const radius = window.innerWidth < 1100 ? 500 : 850; // Radius of the arc

        cards.forEach((card, i) => {
            // Calculate angle on the circle based on current rotation
            const angle = (i * angleStep) + rotationAngle;
            const rad = angle * (Math.PI / 180);

            // Trigonometric positioning for the ARC
            const x = Math.sin(rad) * radius;
            const z = Math.cos(rad) * radius - radius; // Shift Z so front card is at 0
            const rotY = angle;

            // Visibility/Depth logic
            // We only show cards facing the viewer (approx -90 to 90 degrees in front)
            let normalizedAngle = angle % 360;
            if (normalizedAngle < 0) normalizedAngle += 360;
            
            const isFront = normalizedAngle < 75 || normalizedAngle > 285;
            const opacity = isFront ? 1 : 0;
            const scale = isFront ? 1 : 0.5;

            card.style.transform = `translateX(-50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`;
            card.style.opacity = opacity;
            card.style.zIndex = Math.round(z + 1000);
            card.style.visibility = opacity > 0.1 ? 'visible' : 'hidden';
            card.classList.toggle('active', isFront && Math.abs(x) < 100);
        });
    };

    // Interaction Listeners
    const handleStart = (e) => {
        isDragging = true;
        startX = e.pageX || e.touches[0].pageX;
        lastX = startX;
        velocity = 0;
        clearInterval(autoRotateTimer);
        carouselEl.style.transition = 'none';
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        currentX = e.pageX || e.touches[0].pageX;
        const delta = currentX - lastX;
        rotationAngle += delta * 0.15; // Sensitivity
        velocity = delta * 0.15;
        lastX = currentX;
        updatePositions();
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        
        // Start "auto-rotation" after delay
        startAutoRotate();
        
        // Dynamic snap logic (closest card to center)
        const snapTarget = Math.round(rotationAngle / angleStep) * angleStep;
        animateToAngle(snapTarget);
    };

    const animateToAngle = (target) => {
        const start = rotationAngle;
        const distance = target - start;
        let startTime = null;

        const animation = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / 600, 1);
            const ease = 1 - Math.pow(1 - progress, 4); // Quart Ease-Out

            rotationAngle = start + (distance * ease);
            updatePositions();

            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };
        requestAnimationFrame(animation);
    };

    const startAutoRotate = () => {
        clearInterval(autoRotateTimer);
        autoRotateTimer = setInterval(() => {
            if (!isDragging) {
                targetAngle -= angleStep;
                animateToAngle(targetAngle);
            }
        }, 6000);
    };

    // Events
    wrapper.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    wrapper.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    // Initial render
    updatePositions();
    startAutoRotate();
}

function initRotatingQuote() {
    const textEl = document.getElementById('quoteText');
    const authorEl = document.getElementById('quoteAuthor');
    const paginationEl = document.getElementById('quotePagination');
    if (!textEl || !QUOTES || QUOTES.length === 0) return;
    
    let idx = 0;
    
    // Initialize Pagination Dots
    if (paginationEl) {
        paginationEl.innerHTML = QUOTES.map(() => '<span class="dot"></span>').join('');
    }

    const updateUI = (index) => {
        const quote = QUOTES[index];
        textEl.textContent = quote.text;
        if (authorEl) {
            authorEl.textContent = `- ${quote.author}`;
        }
        
        // Update dots
        if (paginationEl) {
            const dots = paginationEl.querySelectorAll('.dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
    };

    // Set initial state
    updateUI(0);

    setInterval(() => {
        // Rise exit animation: Slide UP and fade out
        const exitStyles = {
            opacity: '0',
            filter: 'blur(10px)',
            transform: 'translateY(-20px) scale(0.98)',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        };

        Object.assign(textEl.style, exitStyles);
        if (authorEl) Object.assign(authorEl.style, exitStyles);
        
        setTimeout(() => {
            idx = (idx + 1) % QUOTES.length;
            updateUI(idx);
            
            // Prepare for entry: Position below and invisible
            const entryInitialStyles = {
                opacity: '0',
                filter: 'blur(12px)',
                transform: 'translateY(30px) scale(1.02)',
                transition: 'none'
            };
            Object.assign(textEl.style, entryInitialStyles);
            if (authorEl) Object.assign(authorEl.style, entryInitialStyles);

            // Trigger reflow
            textEl.offsetHeight; 

            // Rise entry animation: Rise from below to normal position
            const entryFinalStyles = {
                opacity: '1',
                filter: 'blur(0)',
                transform: 'translateY(0) scale(1)',
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            };
            Object.assign(textEl.style, entryFinalStyles);
            if (authorEl) Object.assign(authorEl.style, entryFinalStyles);

        }, 400); 
    }, 8500); // Slightly longer than carousel for independent rhythm
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
        const response = await fetch('/api/articles?t=' + Date.now());
        if (response.ok) {
            ALL_ARTICLES = await response.json();
            console.log("Articles fetched from API");
        } else {
            console.error("API returned error:", response.status);
            if (typeof ARTICLES !== 'undefined') ALL_ARTICLES = ARTICLES;
        }
    } catch (error) {
        console.error("Fetch error, falling back to local data:", error);
        if (typeof ARTICLES !== 'undefined') ALL_ARTICLES = ARTICLES;
    }

    if (ALL_ARTICLES && ALL_ARTICLES.length > 0) {
        renderCategoryChips(); 
        renderArticles();
        renderFeatured();
        initArticleCarousel(); // Start the 3D Carousel
        if (window.initAvatarScrollButtons) {
            setTimeout(window.initAvatarScrollButtons, 150);
        }
    } else {
        const grid = document.getElementById('articlesGrid');
        if (grid) grid.innerHTML = '<p style="color:var(--text-muted); padding-left:1rem;">કોઈ લેખ મળી શક્યા નથી.</p>';
        document.getElementById('categoryChips').innerHTML = ''; // Clear category chips if no articles
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initRotatingQuote();

    // Fetch live articles — chips, featured, and latest all rendered after
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
                        section.querySelector('.category-chips');

            if (prevBtn && nextBtn && row) {
                const updateButtons = () => {
                    // Start of scroll
                    if (row.scrollLeft <= 5) {
                        prevBtn.style.opacity = '0.2';
                        prevBtn.style.pointerEvents = 'none';
                    } else {
                        prevBtn.style.opacity = '1';
                        prevBtn.style.pointerEvents = 'auto';
                    }

                    // End of scroll
                    const maxScroll = row.scrollWidth - row.clientWidth;
                    if (row.scrollLeft >= maxScroll - 5) {
                        nextBtn.style.opacity = '0.2';
                        nextBtn.style.pointerEvents = 'none';
                    } else {
                        nextBtn.style.opacity = '1';
                        nextBtn.style.pointerEvents = 'auto';
                    }
                };

                row.removeEventListener('scroll', updateButtons);
                row.addEventListener('scroll', updateButtons);
                window.addEventListener('resize', updateButtons);
                
                // Initial check
                setTimeout(updateButtons, 150);

                if (!section.dataset.scrollInit) {
                    section.dataset.scrollInit = 'true';
                    prevBtn.addEventListener('click', () => {
                        row.scrollBy({ left: -400, behavior: 'smooth' });
                    });
                    nextBtn.addEventListener('click', () => {
                        row.scrollBy({ left: 400, behavior: 'smooth' });
                    });
                }
            }
        });
    };

    // Attempt init now for featured
    setTimeout(window.initAvatarScrollButtons, 50);
});
