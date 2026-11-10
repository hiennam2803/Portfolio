/* ===== pointer ===== */
/** Buttons drift slightly toward the pointer. */
function initMagnetic() {
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(e.clientX - rect.left - rect.width / 2) * 0.25}px`);
      el.style.setProperty('--my', `${(e.clientY - rect.top - rect.height / 2) * 0.35}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    });
  });
}

/** Pointer-only effects: skipped on touch devices and with reduced motion. */
function initPointerEffects() {
  if (!finePointer || reduced) return;
  initMagnetic();
}
