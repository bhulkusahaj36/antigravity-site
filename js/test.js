// ============================================================
// HOME PAGE
// ============================================================

const ITEMS_PER_PAGE = 4;
let currentPage = 1;
let sortMode = 'latest';
let ALL_ARTICLES = [];

const MOCK_ARTICLES = [
    { id: 'mock1', title: 'ભગવાને રચી અનોખી લીલા: ભક્તોના હૃદયમાં વાસ', category: 'mahima', excerpt: 'મહારાજે સોમલા ખાચરના દરબારમાં જે લીલા કરી તેની સ્મૃતિ...', image: 'images/article-placeholder.webp' },
    { id: 'mock2', title: 'સત્સંગની મધુરતા: સ્વામીની વાતોનું અમૃત', category: 'swamini', excerpt: 'ગુણાતીતાનંદ સ્વામીએ જે વાતો કરી તે જીવના કલ્યાણ માટે...', image: 'images/article-placeholder.webp' },
    { id: 'mock3', title: 'નિષ્ઠાનો પાયો: શાસ્ત્રીજી મહારાજની ગુરુભક્તિ', category: 'nishtha', excerpt: 'દુનિયાના વિરોધ વચ્ચે પણ શાસ્ત્રીજી મહારાજે જે અટલ નિષ્ઠા...', image: 'images/article-placeholder.webp' },
    { id: 'mock4', title: 'આત્મીયતાનો મંત્ર: હરિપ્રસાદ સ્વામીજીની શીખ', category: 'atmiyata', excerpt: 'સહુના દિલ જીતવાનો એક જ રસ્તો છે - આત્મીયતા...', image: 'images/article-placeholder.webp' },
    { id: 'mock5', title: 'સેવા એ જ સંસ્કાર: ભક્તોની લાઈફલાઈન', category: 'seva', excerpt: 'સેવા દ્વારા જ અહંકાર ઓગળે છે અને હરિ રાજી થાય છે...', image: 'images/article-placeholder.webp' },
    { id: 'mock6', title: 'પ્રસાદીના પત્રો: ભગવદીઓના પવિત્ર પ્રસંગો', category: 'bhagvadi', excerpt: 'યોગીજી મહારાજના હસ્તે લખાયેલા પત્રોનો મહિમા...', image: 'images/article-placeholder.webp' },
    { id: 'mock7', title: 'સરળતાની મૂર્તિ: યોગીબાપાના ચરિત્ર', category: 'saralata', excerpt: 'નાના બાળકો સાથે બેસીને રમનારા યોગીબાપાની સાદગી...', image: 'images/article-placeholder.webp' },
    { id: 'mock8', title: 'સ્વાધ્યાય અને ભજન: આત્મિક શાંતિનો માર્ગ', category: 'swadhyay', excerpt: 'રોજિંદા જીવનમાં ભજનનું મહત્વ અને તેની અસર...', image: 'images/article-placeholder.webp' }
];


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


// ============================================================
// MODERN 3D ROTATING ARTICLE CAROUSEL (v1.3.0)
// ============================================================
function initArticleCarousel() {
    console.log("Staging: Initializing Modern 3D Carousel");
    const carouselEl = document.getElementById('articleCarouselModern');
    if (!carouselEl) return;

    // Fixed sequence requested by user
    const REQ_CARDS = [
        { title: 'Draft an email', excerpt: 'લખી શકાય તેવો પત્ર ડ્રાફ્ટ કરો...' },
        { title: 'Summarise unread emails', excerpt: 'વણવાંચેલા પત્રોનો સારાંશ મેળવો...' },
        { title: 'Draft a status update', excerpt: 'સ્થિતિની અપડેટ ડ્રાફ્ટ કરો...' },
        { title: 'Article Body, limited lines', excerpt: 'લેખનો મુખ્ય ભાગ, મર્યાદિત પંક્તિઓ...' }
    ];

    // Merge requested cards with dynamic data
    const latestArticles = getSorted(ALL_ARTICLES).slice(0, 6);
    const displayList = [...REQ_CARDS];
    latestArticles.forEach(a => {
        if (!displayList.some(d => d.title === a.title)) {
            displayList.push(a);
        }
    });

    carouselEl.innerHTML = '';
    
    displayList.forEach((article, i) => {
        const cardWrap = document.createElement('div');
        cardWrap.className = 'hover-3d-wrap shrink-0 snap-center py-4';
        
        const card = document.createElement('div');
        // Combined user styles with 3D functional classes - Sized for Model 3.0
        card.className = 'carousel-card-3d card w-[380px] h-[400px] bg-bg-700/90 backdrop-blur-2xl border border-white/10 border-b-saffron-500 rounded-[40px] shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing group relative perspective-[1200px] transition-all duration-300';
        
        const topicName = article.topic || article.category || 'Divine';
        const imageSrc = article.image || 'images/article-placeholder.webp';

        card.innerHTML = `
            <!-- Card thumbnail (Model Layout - Larger Image Head) -->
            <div class="h-[55%] relative overflow-hidden pointer-events-none rounded-t-[40px]">
                <img src="${imageSrc}" alt="" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div class="absolute inset-0 bg-gradient-to-t from-bg-700/80 to-transparent"></div>
                <div class="absolute top-4 left-6">
                    <span class="px-3 py-1 bg-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-gold/30">${topicName}</span>
                </div>
            </div>
            
            <!-- Card content -->
            <div class="px-8 py-6 h-[45%] flex flex-col justify-start pointer-events-none">
                <h3 class="text-xl font-bold text-white mb-3 group-hover:text-gold transition-colors leading-tight font-gujarati">${article.title}</h3>
                <div class="mt-auto flex items-center text-gold/60 text-xs font-bold gap-2">
                    Read Story <span class="group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </div>
            
            <!-- 3D Glow / Shimmer Layer -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
                 style="background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.05) 0%, transparent 60%);"></div>
        `;

        // 3D Tilt Logic
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (centerY - y) / 10; // Max ~15deg
            const rotateY = (x - centerX) / 10;
            
            card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);

            // Spawn gold particle trail
            if (window.spawnGoldParticle) {
                window.spawnGoldParticle(e.clientX, e.clientY);
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });

        card.onclick = () => {
            if (article.id) window.location.href = `article-detail.html?id=${article.id}`;
        };

        cardWrap.appendChild(card);
        carouselEl.appendChild(cardWrap);
    });

    // Grab-to-scroll logic
    let isDown = false;
    let startX;
    let scrollLeft;

    carouselEl.addEventListener('mousedown', (e) => {
        isDown = true;
        carouselEl.classList.add('active');
        startX = e.pageX - carouselEl.offsetLeft;
        scrollLeft = carouselEl.scrollLeft;
    });

    carouselEl.addEventListener('mouseleave', () => {
        isDown = false;
    });

    carouselEl.addEventListener('mouseup', () => {
        isDown = false;
    });

    carouselEl.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - carouselEl.offsetLeft;
        const walk = (x - startX) * 2;
        carouselEl.scrollLeft = scrollLeft - walk;
    });
}

// Gold Particle Trail Functionality
window.spawnGoldParticle = function(x, y) {
    const p = document.createElement('div');
    p.className = 'fixed pointer-events-none z-[9999] rounded-full bg-gold shadow-[0_0_10px_#f59e0b]';
    const size = Math.random() * 4 + 2;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.opacity = '0.8';
    
    document.body.appendChild(p);
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 2 + 1;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    
    let op = 0.8;
    const anim = setInterval(() => {
        x += vx;
        y += vy;
        op -= 0.05;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.opacity = op;
        if (op <= 0) {
            clearInterval(anim);
            p.remove();
        }
    }, 16);
};

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
        // Handle both string and object formats for robustness
        const text = typeof quote === 'string' ? quote : quote.text;
        const author = typeof quote === 'string' ? 'ગુરુહરી હરિપ્રસાદ સ્વામીજી મહારાજ' : (quote.author || 'ગુરુહરી હરિપ્રસાદ સ્વામીજી મહારાજ');

        textEl.textContent = text;
        if (authorEl) {
            authorEl.textContent = `- ${author}`;
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
            const apiArticles = await response.json();
            ALL_ARTICLES = [...MOCK_ARTICLES, ...apiArticles]; // Merge Mock + Live
            console.log("Staging: Articles fetched and merged. Total:", ALL_ARTICLES.length);
        } else {
            console.warn("Staging: API returned", response.status, "- Falling back to MOCK_ARTICLES");
            ALL_ARTICLES = [...MOCK_ARTICLES];
        }
    } catch (error) {
        console.error("Staging: Fetch failed. Error:", error.message, "- Using MOCK_ARTICLES");
        ALL_ARTICLES = [...MOCK_ARTICLES];
    }

    console.log("Staging: Final ALL_ARTICLES readiness:", !!ALL_ARTICLES, ALL_ARTICLES?.length);

    if (ALL_ARTICLES && ALL_ARTICLES.length > 0) {
        renderCategoryChips(); 
        renderFeatured();
        initArticleCarousel(); // Start the 3D Carousel
        if (window.initAvatarScrollButtons) {
            setTimeout(window.initAvatarScrollButtons, 150);
        }
    } else {
        console.error("Staging: No articles found in any source.");
        document.getElementById('categoryChips').innerHTML = ''; 
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

