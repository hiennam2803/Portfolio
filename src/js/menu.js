/* ===== menu ===== */
/** Full-screen mobile menu: toggle, close on link/Escape/desktop breakpoint. */
function initMenu() {
  const header = $('[data-header]');
  const button = $('[data-menu-btn]');
  if (!header || !button) return;
  const setOpen = (open) => {
    header.toggleAttribute('data-open', open);
    button.setAttribute('aria-expanded', String(open));
    root.style.overflow = open ? 'hidden' : '';
  };
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  $$('[data-mobile-nav] a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  matchMedia('(min-width: 56rem)').addEventListener('change', (m) => m.matches && setOpen(false));
}
