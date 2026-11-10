/* ===== theme ===== */
/** Light/dark toggle with a circular View Transition reveal from the button. */
function initTheme() {
  const button = $('[data-theme-toggle]');
  if (!button) return;
  button.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      button.setAttribute('aria-pressed', String(next === 'dark'));
      try {
        localStorage.setItem('theme', next);
      } catch {
        /* storage unavailable: the theme still applies for this visit */
      }
    };
    const rect = button.getBoundingClientRect();
    root.style.setProperty('--cx', `${rect.left + rect.width / 2}px`);
    root.style.setProperty('--cy', `${rect.top + rect.height / 2}px`);
    if (!('startViewTransition' in document) || reduced) return apply();
    root.dataset.vt = 'theme';
    document.startViewTransition(apply).finished.finally(() => delete root.dataset.vt);
  });
}
