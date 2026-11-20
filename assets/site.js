(() => {
  'use strict';
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Reading remains available when storage is disabled. */ } };
  const validBookmark = (bookmark, slug) => bookmark && typeof bookmark.path === 'string' && new RegExp(`^/novels/${slug}/chapter-[1-9][0-9]*/$`).test(bookmark.path);
  document.querySelectorAll('[data-resume]').forEach(link => {
    const slug = link.dataset.resume;
    const bookmark = read(`reading:${slug}`);
    if (validBookmark(bookmark, slug)) {
      link.href = bookmark.path + (typeof bookmark.paragraph === 'string' && /^p-\d+$/.test(bookmark.paragraph) ? `#${bookmark.paragraph}` : '');
      link.hidden = false;
    }
  });
  const body = document.body;
  if (!body.classList.contains('reader')) return;
  const settings = read('reading:settings') || {};
  let size = Number.isFinite(settings.size) ? Math.max(16, Math.min(28, settings.size)) : 20;
  let theme = ['light', 'paper', 'dark'].includes(settings.theme) ? settings.theme : 'light';
  const sizeValue = document.getElementById('font-value');
  const down = document.getElementById('font-down');
  const up = document.getElementById('font-up');
  const themeButtons = [...document.querySelectorAll('[data-theme]')];
  function applySettings() {
    body.style.setProperty('--reader-size', `${size}px`);
    body.dataset.theme = theme;
    sizeValue.value = String(size);
    down.disabled = size <= 16;
    up.disabled = size >= 28;
    themeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
    save('reading:settings', { size, theme });
  }
  applySettings();
  down.addEventListener('click', () => { size = Math.max(16, size - 2); applySettings(); });
  up.addEventListener('click', () => { size = Math.min(28, size + 2); applySettings(); });
  themeButtons.forEach(button => button.addEventListener('click', () => { theme = button.dataset.theme; applySettings(); }));
  const dialog = document.getElementById('reading-settings');
  const toggle = document.getElementById('settings-toggle');
  toggle.addEventListener('click', () => { dialog.showModal(); toggle.setAttribute('aria-expanded', 'true'); });
  document.getElementById('settings-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => toggle.setAttribute('aria-expanded', 'false'));
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  document.getElementById('chapter-select').addEventListener('change', event => { location.href = event.target.value; });
  const paragraphs = [...document.querySelectorAll('[data-paragraph]')];
  const bar = document.querySelector('.reading-progress span');
  let scheduled = false;
  let lastParagraph = null;
  function currentParagraph() {
    // Paragraphs are in document order; a binary search avoids scanning a long novel on scroll.
    let left = 0, right = paragraphs.length - 1;
    while (left < right) {
      const middle = Math.ceil((left + right) / 2);
      if (paragraphs[middle].getBoundingClientRect().top <= 130) left = middle;
      else right = middle - 1;
    }
    return paragraphs[left]?.id || 'p-1';
  }
  function update(force = false) {
    scheduled = false;
    const maximum = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = `${maximum > 0 ? Math.min(100, scrollY / maximum * 100) : 100}%`;
    const paragraph = currentParagraph();
    if (force || paragraph !== lastParagraph) {
      save(`reading:${body.dataset.book}`, { path: location.pathname, paragraph });
      lastParagraph = paragraph;
    }
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(() => update()); } }, { passive: true });
  document.addEventListener('click', event => {
    if (event.target.closest('a[href]')) update(true);
  }, { capture: true });
  addEventListener('pagehide', () => update(true));
  addEventListener('resize', () => update());
  addEventListener('load', () => update(true));
  // No automatic jumps: the explicit Continue link uses a stable paragraph anchor.
})();
