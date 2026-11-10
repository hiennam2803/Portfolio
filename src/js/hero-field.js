/* ===== hero-field ===== */
/**
 * Hero: a drafting grid of "+" marks that rotate to "×" and flare orange around the pointer,
 * and name letters whose width swells near it (one rAF loop, mouse only).
 */
function initHeroField() {
  const hero = $('.hero');
  const canvas = hero && $('.field', hero);
  const ctx = canvas && canvas.getContext('2d');
  if (!hero || !canvas || !ctx) return;

  const GAP = 36; // distance between grid marks (px)
  const RADIUS = 190; // pointer influence radius (px)
  const ARM = 3.5; // resting half-length of a mark
  const ARM_MAX = 11; // half-length next to the pointer
  const PUSH = 14; // how far marks are pushed away (px)
  const WDTH_MIN = 66; // resting letter width (Archivo wdth axis: 62-125)
  const WDTH_RANGE = 44; // extra width next to the pointer
  const REACH = 340; // letter reaction distance (px)

  let width = 0;
  let height = 0;
  let colors = { line: '#b3bfca', signal: '#f0501c' };
  const pointer = { x: -9999, y: -9999, vx: -9999, vy: -9999 };
  let energy = 0; // 0 = at rest, 1 = pointer fully engaged
  let engaged = false;
  let visible = true;
  let frame = 0;

  const interactive = finePointer && !reduced;
  const letters = [];

  if (interactive) {
    const h1 = $('h1', hero);
    $$('.line > span', hero).forEach((word) => {
      const text = (word.textContent ?? '').normalize('NFC');
      word.textContent = '';
      for (const char of Array.from(text)) {
        const el = document.createElement('span');
        el.className = 'ch';
        el.setAttribute('aria-hidden', 'true');
        el.textContent = char === ' ' ? '\u00a0' : char;
        word.append(el);
        letters.push({ el, width: WDTH_MIN, shown: WDTH_MIN });
      }
    });
    h1?.setAttribute(
      'aria-label',
      $$('.line', hero)
        .map((l) => l.textContent?.trim())
        .join(' '),
    );
  }

  const readColors = () => {
    const style = getComputedStyle(root);
    colors = {
      line: style.getPropertyValue('--line').trim(),
      signal: style.getPropertyValue('--signal').trim(),
    };
  };

  const draw = () => {
    if (!width) return;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    const near = [];

    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    for (let y = GAP / 2; y < height; y += GAP) {
      for (let x = GAP / 2; x < width; x += GAP) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (energy < 0.01 || d > RADIUS) {
          ctx.moveTo(x - ARM, y);
          ctx.lineTo(x + ARM, y);
          ctx.moveTo(x, y - ARM);
          ctx.lineTo(x, y + ARM);
        } else {
          near.push(x, y, dx, dy, d);
        }
      }
    }
    ctx.stroke();

    ctx.strokeStyle = colors.signal;
    for (let i = 0; i < near.length; i += 5) {
      const [x, y, dx, dy, d] = near.slice(i, i + 5);
      const f = (1 - d / RADIUS) * energy;
      const k = f * f;
      const push = d ? (PUSH * k) / d : 0;
      const cx = x + dx * push;
      const cy = y + dy * push;
      const arm = ARM + (ARM_MAX - ARM) * k;
      const angle = k * (Math.PI / 4);
      const c = Math.cos(angle) * arm;
      const s = Math.sin(angle) * arm;
      ctx.globalAlpha = 0.35 + 0.65 * f;
      ctx.beginPath();
      ctx.moveTo(cx - c, cy - s);
      ctx.lineTo(cx + c, cy + s);
      ctx.moveTo(cx + s, cy - c);
      ctx.lineTo(cx - s, cy + c);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const updateLetters = () => {
    for (const letter of letters) {
      const rect = letter.el.getBoundingClientRect();
      const d = Math.hypot(rect.left + rect.width / 2 - pointer.vx, rect.top + rect.height / 2 - pointer.vy);
      const target = WDTH_MIN + WDTH_RANGE * Math.max(0, 1 - d / REACH) * energy;
      letter.width += (target - letter.width) * 0.2;
      const rounded = Math.round(letter.width);
      if (rounded !== letter.shown) {
        letter.shown = rounded;
        letter.el.style.fontVariationSettings = `'wdth' ${rounded}`;
      }
    }
  };

  const tick = () => {
    energy += ((engaged ? 1 : 0) - energy) * 0.12;
    draw();
    updateLetters();
    frame = (engaged || energy > 0.01) && visible ? requestAnimationFrame(tick) : 0;
  };
  const start = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readColors();
    draw();
  };

  new ResizeObserver(resize).observe(hero);
  new MutationObserver(() => {
    readColors();
    draw();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && (engaged || energy > 0.01)) start();
  }).observe(hero);

  if (!interactive) return;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.vx = e.clientX;
    pointer.vy = e.clientY;
    engaged = true;
    start();
  });
  hero.addEventListener('pointerleave', () => {
    engaged = false;
    start();
  });
}
