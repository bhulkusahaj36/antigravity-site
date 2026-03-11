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
    content.innerHTML = '<p style="color:var(--text-muted);padding:4rem 0;">લेખ મળ્યો નહीं.</p>';
    return;
  }

  content.innerHTML = '<p style="color:var(--text-muted);padding:4rem 0;">લેખ લોડ થઈ રહ્યો છે...</p>';

  try {
    const response = await fetch('/api/articles?t=' + Date.now());
    if (response.ok) {
      ALL_ARTICLES = await response.json();
      ALL_ARTICLES.sort((a, b) => {
        let dA = a.date && !isNaN(new Date(a.date).getTime()) ? new Date(a.date).getTime() : parseInt(a.id) || 0;
        let dB = b.date && !isNaN(new Date(b.date).getTime()) ? new Date(b.date).getTime() : parseInt(b.id) || 0;
        return dB - dA;
      });
    } else {
      console.error("Failed to fetch articles:", response.status);
    }
  } catch (error) {
    console.error("Error fetching articles API:", error);
  }

  const article = ALL_ARTICLES.find(a => String(a.id) === String(idParam));

  if (!article) {
    content.innerHTML = '<p style="color:var(--text-muted);padding:4rem 0;">લेખ મળ્યો નહीं.</p>';
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
    // Split by newlines, trim whitespace, ignore empty lines, wrap in <p>
    formattedContent = article.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${line}</p>`)
      .join('');
  }

  content.innerHTML = `
    <header class="article-header">
      <div class="article-cat-date">
        <span class="category-badge">${cat}</span>
        <span class="card-date">${formatDate(displayDate)}</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; width: 100%;">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <button onclick="history.back()" class="btn btn-outline" style="padding: 0.4rem 0.8rem; display: flex; align-items: center; gap: 0.5rem; border-color: var(--gold-400); color: var(--gold-400);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
            પાછા જાવ
          </button>
          <h1 class="article-title-h1" style="margin-bottom: 0;">${article.title}</h1>
        </div>
        <button class="zen-mode-toggle" id="zenModeBtn" aria-label="Toggle Zen Mode" title="Zen Reading Mode">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="zen-icon-enter"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
        </button>
      </div>
      <div class="article-meta-row">
        ${article.author ? `<span>: ${article.author}</span>` : ''}
        ${article.location ? `<span>&nbsp;•&nbsp;સ્થળ: ${article.location}</span>` : ''}
      </div>
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
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.textContent = 'કોપી થયું';
        setTimeout(() => { copyBtn.textContent = 'કોપી થયું'; }, 2000);
      });
    });
  }

  const waBtn = document.getElementById('whatsappShare');
  if (waBtn) waBtn.href = `https://wa.me/?text=${encodeURIComponent(article.title + ' ' + url)}`;

  const fbBtn = document.getElementById('facebookShare');
  if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  initZenMode();
  initReadingProgress();
});

// ============================================================
// ZEN READING MODE LOGIC
// ============================================================
function initZenMode() {
  const zenBtn = document.getElementById('zenModeBtn');
  if (!zenBtn) return;

  zenBtn.addEventListener('click', () => {
    document.body.classList.toggle('zen-mode');

    // Toggle the icon from expand (enter zen) to shrink (exit zen)
    if (document.body.classList.contains('zen-mode')) {
      zenBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="zen-icon-exit"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>`;
      zenBtn.setAttribute('title', 'Exit Zen Mode');
    } else {
      zenBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="zen-icon-enter"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`;
      zenBtn.setAttribute('title', 'Zen Reading Mode');
    }
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
