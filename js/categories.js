// ============================================================
// CATEGORIES PAGE
// ============================================================

function getArticleCount(catId) {
    return ARTICLES.filter(a => a.category === catId).length;
}

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    CATEGORIES.forEach((cat, i) => {
        const count = getArticleCount(cat.id);
        const card = document.createElement('a');
        card.className = 'category-card';
        card.href = `category-detail.html?id=${cat.id}`;
        card.style.animationDelay = `${i * 0.08}s`;
        card.innerHTML = `
      <div class="category-card-name">${cat.name}</div>
      <div class="category-card-count">${count} લેખ</div>
      ${cat.description ? `<div class="category-card-description">${cat.description}</div>` : ''}
    `;
        card.classList.add('card-animate');
        grid.appendChild(card);
    });
});
