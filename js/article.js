// ============================================================
// ARTICLE DETAIL PAGE
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const id = parseInt(getParam('id'), 10);
    const article = ARTICLES.find(a => a.id === id);
    const content = document.getElementById('articleContent');

    if (!article) {
        content.innerHTML = '<p style="color:var(--text-muted);padding:4rem 0;">લेখ મળ્યો નહीं.</p>';
        return;
    }

    // Page meta
    document.getElementById('articlePageTitle').textContent = `${article.title} – हरिप्रबोध कथामृत`;
    document.getElementById('articlePageMeta').setAttribute('content', article.excerpt);

    const cat = getCategoryName(article.category);

    // Build article header + content
    content.innerHTML = `
    <header class="article-header">
      <div class="article-cat-date">
        <span class="category-badge">${cat}</span>
        <span class="card-date">${formatDate(article.publishDate)}</span>
      </div>
      <h1 class="article-title-h1">${article.title}</h1>
      <div class="article-meta-row">
        ${article.author ? `<span>લેखક: ${article.author}</span>` : ''}
      </div>
    </header>

    ${article.featuredImage ? `<img src="${article.featuredImage}" alt="${article.title}" class="article-featured-img" loading="lazy" />` : ''}

    <div class="article-content">${article.content}</div>

    ${article.tags && article.tags.length ? `
      <div class="article-tags">
        ${article.tags.map(t => `<span class="article-tag">${t}</span>`).join('')}
      </div>` : ''}

    <nav class="article-nav">
      ${getPrevArticle(id) ? `<a href="article.html?id=${getPrevArticle(id).id}">← ${getPrevArticle(id).title}</a>` : '<span></span>'}
      ${getNextArticle(id) ? `<a href="article.html?id=${getNextArticle(id).id}" style="text-align:right">${getNextArticle(id).title} →</a>` : ''}
    </nav>
  `;

    // Related articles (same category, exclude current)
    const related = ARTICLES.filter(a => a.category === article.category && a.id !== id).slice(0, 4);
    const relList = document.getElementById('relatedList');
    if (relList) {
        related.forEach(a => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="article.html?id=${a.id}">${a.title}</a>`;
            relList.appendChild(li);
        });
    }

    const moreCat = document.getElementById('moreCategoryLink');
    if (moreCat) moreCat.href = `category-detail.html?id=${article.category}`;

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

function getPrevArticle(id) {
    const idx = ARTICLES.findIndex(a => a.id === id);
    return idx > 0 ? ARTICLES[idx - 1] : null;
}

function getNextArticle(id) {
    const idx = ARTICLES.findIndex(a => a.id === id);
    return idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;
}
