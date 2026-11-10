/* ===== register ===== */
/**
 * Project register: the image preview plate follows the pointer inside the hovered row and
 * tilts in 3D toward the direction the pointer moves (wide screens, mouse only).
 */
function initRegister() {
  if (!finePointer || reduced) return;
  $$('[data-tilt]').forEach((row) => {
    let lastX = null;
    let lastY = null;
    let settle = 0;
    row.addEventListener('pointermove', (e) => {
      const rect = row.getBoundingClientRect();
      row.style.setProperty('--px', `${Math.round(e.clientX - rect.left + 28)}px`);
      row.style.setProperty('--py', `${Math.round(e.clientY - rect.top)}px`);

      const dx = lastX === null ? 0 : e.clientX - lastX;
      const dy = lastY === null ? 0 : e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const clamp = (v, max) => Math.max(-max, Math.min(max, v));
      row.style.setProperty('--tilt', clamp(dx * 0.9, 10).toFixed(1));
      row.style.setProperty('--ry', `${clamp(dx * 1.4, 18).toFixed(1)}deg`);
      row.style.setProperty('--rx', `${clamp(-dy * 1.4, 14).toFixed(1)}deg`);
      clearTimeout(settle);
      settle = setTimeout(() => {
        row.style.setProperty('--tilt', '0');
        row.style.setProperty('--ry', '0deg');
        row.style.setProperty('--rx', '0deg');
      }, 140);
    });
    row.addEventListener('pointerleave', () => {
      lastX = null;
      lastY = null;
      clearTimeout(settle);
      ['--tilt', '--rx', '--ry'].forEach((name) => row.style.removeProperty(name));
    });
  });
}
