// admin-theme.js – Light/Dark mode toggle for admin panel
(function() {
  const toggleBtn = document.getElementById('adminThemeToggle');
  if (!toggleBtn) return;

  const root = document.documentElement;
  const STORAGE_KEY = 'adminTheme';

  // Initialize theme from storage
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

  function setIcons(mode) {
    const sun = toggleBtn.querySelector('.sun-icon');
    const moon = toggleBtn.querySelector('.moon-icon');
    if (mode === 'dark') {
      sun.style.display = 'none';
      moon.style.display = 'block';
    } else {
      sun.style.display = 'block';
      moon.style.display = 'none';
    }
  }
})();
