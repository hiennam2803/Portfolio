/* ===== portrait ===== */
/**
 * Portrait photo floats and tilts in 3D toward the pointer, with a highlight that follows it.
 * Works with mouse and touch. Springs back when the pointer leaves.
 */
function initPortraitTilt() {
  if (reduced) return;
  const portrait = $('.portrait');
  if (!portrait) return;
  const MAX_DEG = 14;
  let release = 0;

  const tilt = (e) => {
    const rect = portrait.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    portrait.style.setProperty('--ry', `${((px - 0.5) * 2 * MAX_DEG).toFixed(1)}deg`);
    portrait.style.setProperty('--rx', `${(-(py - 0.5) * 2 * MAX_DEG).toFixed(1)}deg`);
    portrait.style.setProperty('--gx', `${(px * 100).toFixed(0)}%`);
    portrait.style.setProperty('--gy', `${(py * 100).toFixed(0)}%`);
    portrait.classList.add('is-tilting');
  };
  const rest = () => {
    ['--rx', '--ry', '--gx', '--gy'].forEach((name) => portrait.style.removeProperty(name));
    portrait.classList.remove('is-tilting');
  };

  portrait.addEventListener('pointerenter', tilt);
  portrait.addEventListener('pointermove', tilt);
  portrait.addEventListener('pointerdown', tilt);
  portrait.addEventListener('pointerleave', rest);
  portrait.addEventListener('pointercancel', rest);
  portrait.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    clearTimeout(release);
    release = setTimeout(rest, 600);
  });
}
