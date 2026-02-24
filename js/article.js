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
  document.getElementById('articlePageTitle').textContent = `${article.title} – हरिप्रबोध कथामृत`;
  document.getElementById('articlePageMeta').setAttribute('content', article.content ? article.content.substring(0, 150) : '');

  const cat = getCategoryName(article.category || 'bhakti');

  // Build article header + content
  // Use date property if present, otherwise fallback to id or publishDate
  const displayDate = article.date ? article.date : (article.publishDate || '');

  content.innerHTML = `
    <header class="article-header">
      <div class="article-cat-date">
        <span class="category-badge">${cat}</span>
        <span class="card-date">${formatDate(displayDate)}</span>
      </div>
      <h1 class="article-title-h1">${article.title}</h1>
      <div class="article-meta-row">
        ${article.author ? `<span>લેखક: ${article.author}</span>` : ''}
        ${article.location ? `<span>&nbsp;•&nbsp;સ્થળ: ${article.location}</span>` : ''}
      </div>
    </header>

    ${article.featuredImage ? `<img src="${article.featuredImage}" alt="${article.title}" class="article-featured-img" loading="lazy" />` : ''}

    <div class="article-content">${article.content || ''}</div>

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
        copyBtn.textContent = 'કૉपी थयुं';
        setTimeout(() => { copyBtn.textContent = 'लिंक कॉपि'; }, 2000);
      });
    });
  }

  const waBtn = document.getElementById('whatsappShare');
  if (waBtn) waBtn.href = `https://wa.me/?text=${encodeURIComponent(article.title + ' ' + url)}`;

  const fbBtn = document.getElementById('facebookShare');
  if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
});
