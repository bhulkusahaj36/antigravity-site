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
      <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <h1 class="article-title-h1" style="margin-bottom: 0;">${article.title}</h1>
      </div>
      <div class="article-meta-row">
        ${article.author ? `<span>: ${article.author}</span>` : ''}
        ${article.location ? `<span>&nbsp;•&nbsp;સ્થળ: ${article.location}</span>` : ''}
      </div>
      <button class="audio-listen-btn" id="startAudioBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          આ પ્રસંગ સાંભળો (Listen)
      </button>
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

  initAudioPlayer(article.title, article.content);
});

// ============================================================
// KATHA AUDIO PLAYER LOGIC
// ============================================================
function initAudioPlayer(title, content) {
  if (!('speechSynthesis' in window)) return;

  const startBtn = document.getElementById('startAudioBtn');
  const playerWrapper = document.getElementById('kathaPlayer');
  const titleEl = document.getElementById('kathaPlayerTitle');
  const playPauseBtn = document.getElementById('kathaPlayPauseBtn');
  const stopBtn = document.getElementById('kathaStopBtn');
  const progressEl = document.getElementById('kathaProgress');

  let utterance = null;
  let isPlaying = false;

  // Clean text: strip HTML, markdown brackets, etc.
  const cleanText = content.replace(/<[^>]*>?/gm, '').replace(/[\[\]]/g, '');

  startBtn.addEventListener('click', () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'gu-IN';
    utterance.rate = 0.9; // Slightly slower for spiritual reading

    // Find a Gujarati or Hindi voice if possible
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang === 'gu-IN') || voices.find(v => v.lang === 'hi-IN');
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      isPlaying = true;
      playerWrapper.classList.add('active');
      titleEl.textContent = title;
      playPauseBtn.textContent = '⏸';
    };

    utterance.onend = () => {
      isPlaying = false;
      playerWrapper.classList.remove('active');
      progressEl.style.width = '0%';
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error', e);
      playerWrapper.classList.remove('active');
    };

    // Estimate progress roughly based on character count boundary events
    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const percent = Math.min(100, Math.round((e.charIndex / cleanText.length) * 100));
        progressEl.style.width = `${percent}%`;
      }
    };

    speechSynthesis.speak(utterance);
  });

  playPauseBtn.addEventListener('click', () => {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      isPlaying = true;
      playPauseBtn.textContent = '⏸';
    } else if (speechSynthesis.speaking) {
      speechSynthesis.pause();
      isPlaying = false;
      playPauseBtn.textContent = '▶';
    }
  });

  stopBtn.addEventListener('click', () => {
    speechSynthesis.cancel();
    playerWrapper.classList.remove('active');
    progressEl.style.width = '0%';
    isPlaying = false;
  });

  // Ensure speech stops if user navigates away
  window.addEventListener('beforeunload', () => {
    speechSynthesis.cancel();
  });
}
