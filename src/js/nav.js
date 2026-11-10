/* ===== nav ===== */
const HIDE_AFTER = 240; // px scrolled before the header may hide (phones only)
const SCROLL_DELTA = 6; // ignore jitter smaller than this

const header = $('[data-header]');
const nav = $('[data-nav]');
const indicator = $('[data-indicator]');
const navLinks = $$('[data-nav] a[href^="#"]');
const currentLink = () => $('[data-nav] a[data-active]');
let hovering = false;

function placeIndicator(link) {
  if (!indicator) return;
  if (!link) {
    indicator.style.opacity = '0';
    return;
  }
  indicator.style.setProperty('--x', `${link.offsetLeft}px`);
  indicator.style.setProperty('--w', String(link.offsetWidth));
  indicator.style.opacity = '1';
}

/** Mark the nav link of the section in view (the underline follows unless the pointer is on the nav). */
function setActive(id) {
  navLinks.forEach((link) => {
    const active = link.hash === `#${id}`;
    link.toggleAttribute('data-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (!hovering) placeIndicator(currentLink());
}

/** Underline glides to whichever link is hovered or focused, then back to the current section. */
function initIndicator() {
  if (!nav || !indicator) return;
  requestAnimationFrame(() => requestAnimationFrame(() => indicator.classList.add('is-ready')));
  document.fonts?.ready.then(() => !hovering && placeIndicator(currentLink()));
  addEventListener('resize', () => placeIndicator(currentLink()), { passive: true });

  navLinks.forEach((link) => {
    link.addEventListener('pointerenter', () => {
      hovering = true;
      placeIndicator(link);
    });
    link.addEventListener('focus', () => placeIndicator(link));
  });
  nav.addEventListener('pointerleave', () => {
    hovering = false;
    placeIndicator(currentLink());
  });
  nav.addEventListener('focusout', (e) => !nav.contains(e.relatedTarget) && placeIndicator(currentLink()));
}

/** Highlight the section crossing the middle of the viewport. */
function trackSections() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
    { rootMargin: '-45% 0px -50% 0px' },
  );
  $$('main section[id]').forEach((section) => observer.observe(section));
}

/** Phones: hide the header while scrolling down, reveal it when scrolling up. Wide screens keep it fixed. */
function autoHideHeader() {
  if (!header) return;
  const phone = matchMedia('(max-width: 63.99rem)');
  let lastY = scrollY;
  let ticking = false;

  const update = () => {
    const y = scrollY;
    const delta = y - lastY;
    if (phone.matches && !header.hasAttribute('data-open')) {
      if (y > HIDE_AFTER && delta > SCROLL_DELTA) header.setAttribute('data-hidden', '');
      else if (delta < -SCROLL_DELTA || y <= HIDE_AFTER) header.removeAttribute('data-hidden');
    } else {
      header.removeAttribute('data-hidden');
    }
    if (Math.abs(delta) > SCROLL_DELTA) lastY = y;
    if (y < 200) setActive('');
    ticking = false;
  };

  update();
  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
}

function initNav() {
  initIndicator();
  trackSections();
  autoHideHeader();
}
