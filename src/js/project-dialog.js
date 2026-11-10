
/**
 * Project details: native <dialog> with animated close, scroll lock, a scroll-snap gallery
 * (buttons, thumbnails, arrow keys, mouse drag), previous / next project and deep links (#project-2).
 */
function initProjectDialog() {
  const CLOSE_FALLBACK_MS = 400;
  const DRAG_THRESHOLD = 4;
  const SWIPE_DISTANCE = 40;

  /** Build the gallery: counter, prev/next, thumbnails, arrow keys, drag. Returns a reset function. */
  function initGallery(gallery) {
    const track = $('.gallery__track', gallery);
    const slides = $$('.gallery__slide', gallery);
    const count = $('.gallery__count', gallery);
    const prev = $('[data-gallery-prev]', gallery);
    const next = $('[data-gallery-next]', gallery);
    const thumbsBox = $('.gallery__thumbs', gallery);
    const label = gallery.dataset.thumbLabel ?? '';
    let index = 0;

    if (slides.length < 2) gallery.toggleAttribute('data-single', true);

    const thumbs = slides.map((slide, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery__thumb';
      button.setAttribute('aria-label', `${label} ${i + 1}`);
      button.textContent = String(i + 1);
      const image = $('img', slide);
      if (image) {
        // show the real picture on the thumbnail; fall back to the number if it is missing
        const thumb = new Image();
        thumb.alt = '';
        thumb.addEventListener('load', () => {
          button.textContent = '';
          button.append(thumb);
        });
        thumb.src = image.currentSrc || image.src;
      }
      button.addEventListener('click', () => goTo(i));
      thumbsBox.append(button);
      return button;
    });

    const render = () => {
      count.textContent = `${index + 1} / ${slides.length}`;
      prev.disabled = index === 0;
      next.disabled = index === slides.length - 1;
      thumbs.forEach((t, i) => t.setAttribute('aria-current', String(i === index)));
    };

    const goTo = (i) => {
      const target = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: target * track.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    };

    let ticking = false;
    track.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          index = Math.round(track.scrollLeft / (track.clientWidth || 1));
          render();
          ticking = false;
        });
      },
      { passive: true },
    );

    prev.addEventListener('click', () => goTo(index - 1));
    next.addEventListener('click', () => goTo(index + 1));
    gallery.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      goTo(index + (e.key === 'ArrowRight' ? 1 : -1));
    });

    // mouse drag (touch already swipes natively)
    let drag = null;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || slides.length < 2) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false };
    });
    track.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD) {
        drag.moved = true;
        track.classList.add('is-dragging');
        track.setPointerCapture(e.pointerId);
      }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    });
    const endDrag = (e) => {
      if (!drag) return;
      const { moved, left, x } = drag;
      drag = null;
      if (!moved) return;
      const dx = e.clientX - x;
      const start = Math.round(left / (track.clientWidth || 1));
      track.classList.remove('is-dragging');
      goTo(start + (dx < -SWIPE_DISTANCE ? 1 : dx > SWIPE_DISTANCE ? -1 : 0));
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    render();
    return () => {
      track.scrollLeft = 0;
      index = 0;
      render();
    };
  }

  const dialogs = $$('dialog.modal');
  const resets = new Map();
  const byId = (id) => {
    const el = document.getElementById(id);
    return el instanceof HTMLDialogElement && el.classList.contains('modal') ? el : null;
  };
  const openDialogs = () => dialogs.filter((d) => d.open);

  /** Keep the address bar in step with the open project, so the link can be copied or shared. */
  const setHash = (id) => {
    const url = `${location.pathname}${location.search}${id ? `#${id}` : ''}`;
    history.replaceState(null, '', url);
  };

  function openDialog(dialog, { switching = false } = {}) {
    if (dialog.open) return;
    root.classList.add('modal-open');
    dialog.classList.toggle('is-switch', switching);
    dialog.showModal();
    $('.modal__scroll', dialog).scrollTop = 0;
    resets.get(dialog)?.();
    setHash(dialog.id);
  }

  function closeDialog(dialog, { instant = false } = {}) {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (instant) return dialog.close();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      dialog.removeEventListener('animationend', onEnd);
      dialog.classList.remove('is-closing');
      dialog.close();
    };
    const onEnd = (e) => e.target === dialog && finish();
    const timer = setTimeout(finish, CLOSE_FALLBACK_MS);
    dialog.addEventListener('animationend', onEnd);
    dialog.classList.add('is-closing');
  }

  dialogs.forEach((dialog) => {
    const gallery = $('[data-gallery]', dialog);
    if (gallery) resets.set(dialog, initGallery(gallery));

    let pressedBackdrop = false;
    dialog.addEventListener('pointerdown', (e) => (pressedBackdrop = e.target === dialog));
    dialog.addEventListener('click', (e) => e.target === dialog && pressedBackdrop && closeDialog(dialog));
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault(); // Escape: run the exit animation first
      closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      dialog.classList.remove('is-switch');
      if (openDialogs().length) return; // another project is taking over
      root.classList.remove('modal-open');
      if (location.hash === `#${dialog.id}`) setHash('');
      // give focus back to the row that opened it
      $(`[data-project-open="${dialog.id}"]`)?.focus({ preventScroll: true });
    });
    $$('[data-modal-close]', dialog).forEach((b) => b.addEventListener('click', () => closeDialog(dialog)));

    // previous / next project
    $$('[data-project-go]', dialog).forEach((button) =>
      button.addEventListener('click', () => {
        const target = byId(button.dataset.projectGo);
        if (!target || target === dialog) return;
        openDialog(target, { switching: true }); // open the next one first: the page never unlocks in between
        closeDialog(dialog, { instant: true });
      }),
    );
  });

  $$('[data-project-open]').forEach((trigger) =>
    trigger.addEventListener('click', (e) => {
      const dialog = byId(trigger.dataset.projectOpen);
      if (!dialog) return;
      e.preventDefault();
      openDialog(dialog);
    }),
  );

  // deep link: /#project-2 opens that project on load (and when the hash changes later)
  const openFromHash = () => {
    const dialog = location.hash.length > 1 ? byId(location.hash.slice(1)) : null;
    if (dialog && !openDialogs().length) openDialog(dialog);
  };
  addEventListener('hashchange', openFromHash);
  openFromHash();
}
