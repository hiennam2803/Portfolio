
/* ===== main ===== */
/* Text and projects are loaded from JSON first; every feature starts after that. */
initContent().then(() => {
  initTheme();
  initReveal();
  initNav();
  initMenu();
  initCountUp();
  initScrub();
  initHeroField();
  initMarquee();
  initCopy();
  initRegister();
  initPortraitTilt();
  initProjectDialog();
  initMessageDialog();
  initPointerEffects();
});
