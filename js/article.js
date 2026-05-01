// ============================================================
// ARTICLE DETAIL PAGE
// ============================================================

let ALL_ARTICLES = [];

function getPrevArticle(id) {
  const idx = ALL_ARTICLES.findIndex(a => String(a.id) === String(id));
  return idx > 0 ? ALL_ARTICLES[idx - 1] : null;
}

function getNextArticle(id) {
  const idx = ALL_ARTICLES.findIndex(a => String(a.id) === String(id));
  return idx >= 0 && idx < ALL_ARTICLES.length - 1 ? ALL_ARTICLES[idx + 1] : null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const idParam = getParam('id');
  const content = document.getElementById('articleContent');

  if (!idParam) {
    content.innerHTML = '<p style="color:var(--text-muted);padding:4rem 0;">Article Not Found.</p>';
    return;
  }

  content.innerHTML = '<p style="color:var(--text-muted);padding:4rem 0;">Loading Article...</p>';

  // Fetch the specific article and the compact list in parallel for maximum speed
  let article = null;
  let rawArticles = [];
  try {
    const [articleRes, listRes] = await Promise.all([
      fetch(`/api/articles?id=${encodeURIComponent(idParam)}`),
      fetch('/api/articles?compact=true')
    ]);

    if (articleRes.ok) {
      const artArr = await articleRes.json();
      if (artArr.length > 0) article = artArr[0];
    }
    
    if (listRes.ok) {
        const listData = await listRes.json();
        // Handle both raw array (no limit) and { items, nextToken } (with limit)
        ALL_ARTICLES = Array.isArray(listData) ? listData : (listData.items || []);
        rawArticles = [...ALL_ARTICLES];
    } else {
        if (typeof ARTICLES !== 'undefined') ALL_ARTICLES = [...ARTICLES];
    }
  } catch (error) {
    console.error("Error fetching articles API:", error);
    if (typeof ARTICLES !== 'undefined') ALL_ARTICLES = [...ARTICLES];
  }

  // Fallback to local search if API specific fetch failed but we have data
  if (!article && typeof ARTICLES !== 'undefined') {
      article = ARTICLES.find(a => String(a.id) === String(idParam));
  }

  if (ALL_ARTICLES.length > 0) {
    // Only keep public articles for the "Related" feed
    ALL_ARTICLES = ALL_ARTICLES.filter(a => a.public !== false && a.public !== 'no');
    
    // Sort for Next/Prev queues
    ALL_ARTICLES.sort((a, b) => {
      let dA = a.date && !isNaN(new Date(a.date).getTime()) ? new Date(a.date).getTime() : parseInt(a.id) || 0;
      let dB = b.date && !isNaN(new Date(b.date).getTime()) ? new Date(b.date).getTime() : parseInt(b.id) || 0;
      return dB - dA;
    });
  }

  if (!article) {
    content.innerHTML = '<p style="color:var(--text-muted);padding:4rem 0;">Article Not Found.</p>';
    return;
  }

  // Page meta
  document.getElementById('articlePageTitle').textContent = `${article.title} – હરિપ્રબોધમ કથામૃત`;
  document.getElementById('articlePageMeta').setAttribute('content', article.content ? article.content.substring(0, 150) : '');

  const cat = getCategoryName(article.category || 'bhakti');

  // Build article header + content
  // Use date property if present, otherwise fallback to id or publishDate
  const displayDate = article.date ? article.date : (article.publishDate || '');

  // Format content to preserve paragraphs
  let formattedContent = '';
  if (article.content) {
    formattedContent = article.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${line}</p>`)
      .join('');
  }

  // Estimate Reading time
  let readingTimeBadge = '';
  if (article.type === 'paravani' && formattedContent) {
      const textContent = formattedContent.replace(/<[^>]+>/g, ' ');
      const wordCount = textContent.trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 130)); // slightly slower reading for Gujarati scripts
      readingTimeBadge = `<div class="reading-time-badge">⏱️ ~${readingTime} min read</div>`;
  }

  const shareBox = document.createElement('div');
  shareBox.className = 'article-share-box';
  shareBox.innerHTML = `
    <span>Share:</span>
    <button id="copyLink" class="share-btn" title="Copy Link">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
    </button>
    <a id="whatsappShare" class="share-btn" target="_blank" rel="noopener noreferrer" title="Share on WhatsApp">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
    </a>
    <a id="facebookShare" class="share-btn" target="_blank" rel="noopener noreferrer" title="Share on Facebook">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
    </a>
  `;

  content.innerHTML = `
    <header class="article-header">
      <div class="article-toolbar">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <button class="modern-back-btn" onclick="history.back()">
            <div class="icon-container">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </div>
            <p class="btn-text">Back</p>
          </button>
          <span class="category-badge">${cat}</span>
        </div>
        
        <div class="article-toolbar-actions">
          <div class="article-meta-group">
            ${readingTimeBadge}
            <span class="card-date">${formatDate(displayDate)}</span>
            ${article.location ? `<span class="article-location-badge">📍 ${article.location}</span>` : ''}
          </div>
          
          <div class="article-controls">
            <button class="article-tool-btn font-dec-btn" id="fontDecBtn" title="Decrease Font Size" aria-label="Decrease Font Size" style="font-size: 0.85rem;">A-</button>
            <button class="article-tool-btn font-inc-btn" id="fontIncBtn" title="Increase Font Size" aria-label="Increase Font Size" style="font-size: 1.1rem;">A+</button>
            <button class="article-tool-btn zen-mode-toggle" id="zenModeBtn" aria-label="Toggle Zen Mode" title="Zen Reading Mode">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="zen-icon-enter"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            </button>
          </div>
        </div>
      </div>

      <h1 class="article-title-h1">${article.title}</h1>
    </header>

    ${article.featuredImage ? `<img src="${article.featuredImage}" alt="${article.title}" class="article-featured-img" loading="lazy" />` : ''}

    <div class="article-content">${formattedContent}</div>

    ${article.tags && article.tags.length ? `
      <div class="article-tags">
        ${article.tags.map(t => `<span class="article-tag">${t}</span>`).join('')}
      </div>` : ''}

    <nav class="article-nav">
      ${getPrevArticle(idParam) ? `<a href="article.html?id=${getPrevArticle(idParam).id}">← ${getPrevArticle(idParam).title}</a>` : '<span></span>'}
      ${getNextArticle(idParam) ? `<a href="article.html?id=${getNextArticle(idParam).id}" style="text-align:right">${getNextArticle(idParam).title} →</a>` : ''}
    </nav>
  `;

  if (article.type === 'paravani') {
      document.body.classList.add('paravani-reading-mode');
      const pb = document.createElement('div');
      pb.className = 'reading-progress-bar';
      document.body.appendChild(pb);

      window.addEventListener('scroll', () => {
          const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
          const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          if (height > 0) {
              const scrolled = (winScroll / height) * 100;
              pb.style.width = scrolled + "%";
          }
      });
  }

  // Related articles (same category, exclude current)
  const related = ALL_ARTICLES.filter(a => a.category === article.category && String(a.id) !== String(idParam)).slice(0, 4);
  const relList = document.getElementById('relatedList');
  if (relList) {
    relList.innerHTML = '';
    related.forEach(a => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="article.html?id=${a.id}">${a.title}</a>`;
      relList.appendChild(li);
    });
  }

  const moreCat = document.getElementById('moreCategoryLink');
  if (moreCat) moreCat.href = `category-detail.html?id=${article.category || 'bhakti'}`;

  // Share buttons
  const url = window.location.href;
  const copyBtn = document.getElementById('copyLink');
  if (copyBtn) {
    const originalContent = copyBtn.innerHTML;
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => { copyBtn.innerHTML = originalContent; }, 2000);
      });
    });
  }

  const waBtn = document.getElementById('whatsappShare');
  if (waBtn) waBtn.href = `https://wa.me/?text=${encodeURIComponent(article.title + ' ' + url)}`;

  const fbBtn = document.getElementById('facebookShare');
  if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  initZenMode();
  initFontAdjuster();
  initReadingProgress();
  initSwipeGestures();
});

// ============================================================
// SWIPE GESTURES FOR MOBILE NAVIGATION
// ============================================================
function initSwipeGestures() {
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 80;

  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const currentId = getParam('id');

    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        // Swipe Right -> Previous Article
        const prev = getPrevArticle(currentId);
        if (prev) {
          document.body.classList.add('page-exiting');
          setTimeout(() => { window.location.href = `article.html?id=${prev.id}`; }, 400);
        }
      } else {
        // Swipe Left -> Next Article
        const next = getNextArticle(currentId);
        if (next) {
          document.body.classList.add('page-exiting');
          setTimeout(() => { window.location.href = `article.html?id=${next.id}`; }, 400);
        }
      }
    }
  }
}

// ============================================================
// FONT ADJUSTER LOGIC
// ============================================================
function initFontAdjuster() {
  const decBtn = document.getElementById('fontDecBtn');
  const incBtn = document.getElementById('fontIncBtn');
  let currentScale = 1.0; 
  const minScale = 0.75;
  const maxScale = 1.75;
  
  const updateFont = () => {
    document.documentElement.style.setProperty('--font-scale', currentScale);
  };

  if(decBtn) decBtn.addEventListener('click', () => {
    if(currentScale > minScale) {
      currentScale -= 0.1;
      updateFont();
    }
  });

  if(incBtn) incBtn.addEventListener('click', () => {
    if(currentScale < maxScale) {
      currentScale += 0.1;
      updateFont();
    }
  });
}

// ============================================================
// ZEN READING MODE LOGIC
// ============================================================
function initZenMode() {
  const zenBtn = document.getElementById('zenModeBtn');
  if (!zenBtn) return;



  function updateZenIcon() {
    if (document.body.classList.contains('zen-mode')) {
      zenBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="zen-icon-exit"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>`;
      zenBtn.setAttribute('title', 'Exit Zen Mode');
    } else {
      zenBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="zen-icon-enter"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`;
      zenBtn.setAttribute('title', 'Zen Reading Mode');
    }
  }

  zenBtn.addEventListener('click', () => {
    document.body.classList.toggle('zen-mode');
    updateZenIcon();
  });
}

// ============================================================
// ZEN DYNAMIC READING PROGRESS BAR
// ============================================================
function initReadingProgress() {
  const progressBar = document.getElementById('readingProgressBar');
  if (!progressBar) return;

  function updateProgress() {
    // Current scroll amount from exact top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    // Total scrollable height (entire document height minus viewport window)
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    // Calculate percentage (ensure we bounds check 0 to 100)
    const scrolled = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));

    progressBar.style.width = scrolled + '%';
  }

  // Bind to scroll with a passive listener for buttery 60fps performance
  window.addEventListener('scroll', () => {
    requestAnimationFrame(updateProgress);
  }, { passive: true });

  // Call once on load to set initial state
  requestAnimationFrame(updateProgress);
}