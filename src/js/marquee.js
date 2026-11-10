/** Marquee rows speed up and skew with scroll velocity, and reverse when you scroll back up. */
function initMarquee() {
  const box = $('.marquee');
  if (!box || reduced) return;
  const tracks = $$('.track', box);
  let lastY = scrollY;
  let boost = 0;
  let frame = 0;

  const apply = () => {
    const rate = (boost < 0 ? -1 : 1) * (1 + Math.abs(boost));
    tracks.forEach((track) => {
      const animation = track.getAnimations()[0];
      if (animation) animation.playbackRate = rate;
    });
    box.style.setProperty('--skew', `${(-boost * 0.8).toFixed(2)}deg`);
  };

  const tick = () => {
    const delta = scrollY - lastY;
    lastY = scrollY;
    const target = Math.max(-12, Math.min(12, delta * 0.3));
    boost += (target - boost) * 0.08;
    if (Math.abs(boost) < 0.02 && Math.abs(delta) < 1) {
      boost = 0;
      apply();
      frame = 0;
      return;
    }
    apply();
    frame = requestAnimationFrame(tick);
  };

  addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(tick);
    },
    { passive: true },
  );
}
