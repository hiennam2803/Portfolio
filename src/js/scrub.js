/* ===== scrub ===== */
/** Text that fills in word by word while it scrolls through the viewport (one passive listener). */
function initScrub() {
  const items = $$('[data-scrub]').map((el) => {
    const words = (el.textContent ?? '').trim().split(/\s+/);
    el.textContent = '';
    const spans = words.map((word) => {
      const span = document.createElement('span');
      span.className = 'sw';
      span.textContent = word;
      el.append(span, ' ');
      return span;
    });
    return { el, spans };
  });
  if (!items.length) return;

  if (reduced) {
    items.forEach(({ spans }) => spans.forEach((s) => s.classList.add('on')));
    return;
  }

  let ticking = false;
  const update = () => {
    const vh = innerHeight;
    items.forEach(({ el, spans }) => {
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (rect.height + vh * 0.3)));
      const lit = Math.round(progress * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < lit));
    });
    ticking = false;
  };
  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  update();
}
