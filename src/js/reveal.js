/* ===== reveal ===== */
/** Wrap each word of [data-split] elements so CSS can mask-reveal them. */
function splitWords() {
  $$('[data-split]').forEach((el) => {
    const words = (el.textContent ?? '').trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const mask = document.createElement('span');
      const inner = document.createElement('span');
      mask.className = 'w';
      inner.style.setProperty('--w', String(i));
      inner.textContent = word;
      mask.append(inner);
      el.append(mask, ' ');
    });
  });
}
/** Give children of [data-stagger] an index used for transition delays. */
function indexStaggerChildren() {
  $$('[data-stagger]').forEach((parent) =>
    Array.from(parent.children).forEach((child, i) => child.style.setProperty('--i', String(i))),
  );
}
/** One observer reveals every [data-reveal | data-split | data-draw] element once. */
function initReveal() {
  splitWords();
  indexStaggerChildren();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );
  $$('[data-reveal], [data-split], [data-draw]').forEach((el) => observer.observe(el));
}
/** Animate numeric stats (e.g. "12+") from zero after the hero has settled. */
function initCountUp() {
  if (reduced) return;
  const DELAY = 1300 + (root.classList.contains('seen') ? 0 : 900); // wait for the opening curtain
  const DURATION = 1400;
  $$('[data-count]').forEach((el) => {
    const match = (el.textContent ?? '').match(/^(\D*)(\d+)(\D*)$/);
    if (!match) return;
    const [, prefix, digits, suffix] = match;
    const target = Number(digits);
    setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        el.textContent = prefix + String(Math.round(target * eased)).padStart(digits.length, '0') + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, DELAY);
  });
}
