/* ===== message-dialog ===== */
/**
 * Message dialog with two modes (tabs):
 *   chat   a plain message: name, email and one message, shown as a small chat thread
 *   brief  a project request: the five-step conversation (needs, budget, direction of the project ...)
 * It opens with a circular reveal from the pressed button; data-message-open="brief" opens the brief tab.
 * Answers stay in the forms until sent, so closing and reopening resumes where you left off.
 */
function initMessageDialog() {
  const dialog = $('#message-dialog');
  const form = dialog && $('[data-msg-form]', dialog);
  if (!dialog || !form) return;

  const CLOSE_FALLBACK_MS = 700;
  const TAU = Math.PI * 2;
  const steps = $$('[data-step]', form);
  const total = steps.length;
  const progress = $('.msg__progress', dialog);
  if (progress) progress.innerHTML = '<i></i>'.repeat(total); // one bar per step, counted
  const bars = $$('.msg__progress i', dialog);
  $$('[data-total]', dialog).forEach((el) => (el.textContent = String(total)));
  const current = $('[data-current]', dialog);
  const trail = $('[data-trail]', dialog);
  const back = $('[data-msg-back]', dialog);
  const next = $('[data-msg-next]', dialog);
  const nextLabel = $('span', next);
  const hint = $('[data-hint]', dialog);
  const status = $('[data-status]', dialog);
  const done = $('.msg__done', dialog);
  const counter = $('[data-counter]', dialog);
  if (counter) counter.textContent = `0/${$('textarea', form)?.maxLength ?? 600}`;
  const data = form.dataset;
  const words = (dialog.dataset.words ?? '').split('|').filter(Boolean);

  /* ---- modes: chat | brief ---- */
  const tabs = $$('[data-msg-tab]', dialog);
  const panels = $$('[data-panel]', dialog);
  const chatForm = $('[data-chat-form]', dialog);
  const thread = $('[data-thread]', dialog);
  const chatError = $('[data-chat-error]', dialog);
  const chatStatus = $('[data-chat-status]', dialog);
  const chatSend = $('.chat__send', dialog);
  let mode = 'chat';

  let hello = $('[data-hello]', dialog);
  let helloTimer = 0;
  let helloIndex = 0;
  let index = 0;
  let sent = false;

  const fieldOf = (step) => $('input:not([type="checkbox"]):not([type="radio"]), textarea', step);
  const answerOf = (step) => {
    const field = fieldOf(step);
    return field
      ? field.value.trim()
      : $$('input:checked', step)
          .map((i) => i.value)
          .join(', ');
  };

  /* ---- greeting rotation on the left panel ---- */
  const startHello = () => {
    if (!hello || reduced || words.length < 2) return;
    helloTimer = setInterval(() => {
      helloIndex = (helloIndex + 1) % words.length;
      const word = document.createElement('span');
      word.dataset.hello = '';
      word.textContent = words[helloIndex];
      hello.replaceWith(word);
      hello = word;
    }, 2400);
  };
  const stopHello = () => clearInterval(helloTimer);

  /* ---- answered steps appear as chips; click one to edit it ---- */
  function renderTrail() {
    trail.replaceChildren();
    steps.slice(0, index).forEach((step, i) => {
      const value = answerOf(step);
      if (!value) return;
      const item = document.createElement('li');
      const chip = document.createElement('button');
      const label = document.createElement('b');
      chip.type = 'button';
      chip.className = 'msg__chip';
      chip.dataset.goto = String(i);
      label.textContent = step.dataset.label ?? '';
      chip.append(label, value.length > 28 ? `${value.slice(0, 27)}…` : value);
      item.append(chip);
      trail.append(item);
    });
  }

  function goTo(target, { focus = true } = {}) {
    index = Math.max(0, Math.min(total - 1, target));
    steps.forEach((step, k) => {
      step.classList.toggle('is-active', k === index);
      step.classList.toggle('is-before', k < index);
      step.inert = k !== index;
    });
    bars.forEach((bar, k) => bar.classList.toggle('on', k <= index));
    current.textContent = String(index + 1);
    back.disabled = index === 0;
    const last = index === total - 1;
    nextLabel.textContent = (last ? next.dataset.labelSend : next.dataset.labelNext) ?? '';
    hint.textContent = (last ? hint.dataset.hintSend : hint.dataset.hintNext) ?? '';
    status.textContent = '';
    renderTrail();
    if (focus) setTimeout(() => $('input, textarea', steps[index])?.focus({ preventScroll: true }), 150);
  }

  function validate(step) {
    const field = fieldOf(step);
    if (!field) return true;
    const valid = field.checkValidity();
    field.setAttribute('aria-invalid', String(!valid));
    const output = $('.msg__error', step);
    if (output) output.textContent = valid ? '' : (step.dataset.error ?? '');
    if (!valid) {
      step.classList.remove('is-shaking');
      void step.offsetWidth; // restart the shake animation
      step.classList.add('is-shaking');
      field.focus({ preventScroll: true });
    }
    return valid;
  }

  function collect() {
    const lines = steps
      .map((step) => [step.dataset.label ?? '', answerOf(step)])
      .filter(([, value]) => value);
    const get = (name) => form.elements.namedItem(name)?.value?.trim?.() ?? '';
    return {
      name: get('name'),
      email: get('email'),
      topics: $$('input[name="topics"]:checked', form).map((i) => i.value),
      budget: $$('input[name="budget"]:checked', form)[0]?.value ?? '',
      message: get('message'),
      text: lines.map(([label, value]) => `${label}: ${value}`).join('\n'),
    };
  }

  function burst() {
    const box = $('.msg__burst', done);
    box.replaceChildren();
    if (reduced) return;
    const colors = ['var(--accent)', 'var(--accent-2)', 'var(--ok)', '#ffc34d', '#ff6b6b'];
    for (let i = 0; i < 24; i++) {
      const piece = document.createElement('i');
      const angle = (i / 24) * TAU + Math.random() * 0.4;
      const distance = 90 + Math.random() * 110;
      piece.style.cssText = [
        `--x:${Math.cos(angle) * distance}px`,
        `--y:${Math.sin(angle) * distance - 30}px`,
        `--r:${Math.round(Math.random() * 360)}deg`,
        `--s:${6 + Math.round(Math.random() * 5)}px`,
        `--c:${colors[i % colors.length]}`,
      ].join(';');
      box.append(piece);
    }
  }

  function showDone(name, viaMail) {
    sent = true;
    dialog.dataset.state = 'sent';
    done.inert = false;
    $('[data-done-title]', done).textContent = (data.doneTitle ?? '').replace('{name}', name.slice(0, 24));
    $('[data-done-text]', done).textContent = (viaMail ? data.okMail : data.ok) ?? '';
    burst();
    $('[data-msg-again]', done).focus({ preventScroll: true });
  }

  async function submit() {
    const body = collect();
    next.disabled = true;
    next.classList.add('is-loading');
    status.textContent = data.sending ?? '';
    let viaMail = false;
    try {
      if (data.endpoint) {
        const response = await fetch(data.endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(response.statusText);
      } else {
        viaMail = true;
        const subject = encodeURIComponent(`[Portfolio] ${(data.subject ?? '{name}').replace('{name}', body.name)}`);
        location.href = `mailto:${data.email}?subject=${subject}&body=${encodeURIComponent(`${body.text}\n`)}`;
      }
    } catch {
      status.textContent = data.fail ?? '';
      next.disabled = false;
      next.classList.remove('is-loading');
      return;
    }
    next.disabled = false;
    next.classList.remove('is-loading');
    showDone(body.name, viaMail);
  }

  const advance = () => {
    if (!validate(steps[index])) return;
    if (index < total - 1) goTo(index + 1);
    else void submit();
  };

  function reset() {
    form.reset();
    $$('[aria-invalid]', form).forEach((f) => f.removeAttribute('aria-invalid'));
    $$('.msg__error', form).forEach((e) => (e.textContent = ''));
    counter.textContent = `0/${$('textarea', form)?.maxLength ?? 600}`;
    delete dialog.dataset.state;
    done.inert = true;
    sent = false;
    goTo(0);
  }

  /* ---- tabs ---- */
  function setMode(next, { focus = true } = {}) {
    mode = next === 'brief' ? 'brief' : 'chat';
    dialog.dataset.mode = mode;
    tabs.forEach((tab) => {
      const on = tab.dataset.msgTab === mode;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel) => (panel.hidden = panel.dataset.panel !== mode));
    if (!focus) return;
    if (mode === 'brief') goTo(index);
    else focusChat();
  }

  /* ---- chat: a plain message shown as a small thread ---- */
  function focusChat() {
    if (!chatForm) return;
    const empty = [...chatForm.querySelectorAll('input, textarea')].find((field) => !field.value.trim());
    setTimeout(() => (empty ?? chatForm.elements.namedItem('message'))?.focus({ preventScroll: true }), 150);
  }

  function addBubble(text, who) {
    const bubble = document.createElement('p');
    bubble.className = `bubble bubble--${who}`;
    bubble.textContent = text;
    thread.append(bubble);
    thread.scrollTo({ top: thread.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }

  async function sendChat() {
    const el = (name) => chatForm.elements.namedItem(name);
    const fields = ['name', 'email', 'message'].map(el);
    fields.forEach((field) => field.removeAttribute('aria-invalid'));
    chatError.textContent = '';
    const bad = fields.find((field) => !field.checkValidity() || !field.value.trim());
    if (bad) {
      bad.setAttribute('aria-invalid', 'true');
      chatError.textContent = bad.dataset.error ?? '';
      bad.focus({ preventScroll: true });
      return;
    }
    const [name, email, message] = fields.map((field) => field.value.trim());
    const cd = chatForm.dataset;
    chatSend.disabled = true;
    chatStatus.textContent = cd.sending ?? '';
    let viaMail = false;
    try {
      const endpoint = cd.endpoint || data.endpoint;
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'chat', name, email, message }),
        });
        if (!response.ok) throw new Error(response.statusText);
      } else {
        viaMail = true;
        const subject = encodeURIComponent(`[Portfolio] ${(cd.subject ?? '{name}').replace('{name}', name)}`);
        const body = encodeURIComponent(`${message}\n\n— ${name} <${email}>\n`);
        location.href = `mailto:${cd.email}?subject=${subject}&body=${body}`;
      }
    } catch {
      chatStatus.textContent = cd.fail ?? '';
      chatSend.disabled = false;
      return;
    }
    chatSend.disabled = false;
    chatStatus.textContent = '';
    addBubble(message, 'me');
    el('message').value = '';
    const reply = ((viaMail ? cd.replyMail : cd.reply) ?? '').replace('{name}', name.slice(0, 24));
    setTimeout(() => addBubble(reply, 'them'), reduced ? 0 : 700);
    el('message').focus({ preventScroll: true });
  }

  /* ---- avatar: your photo if it exists, else Gravatar for the email, else the portrait, else initials ---- */
  async function initAvatar() {
    const photo = $('.msg__photo', dialog);
    if (!photo) return;
    const sources = [cfgGet('images.avatar')];
    if (cfgGet('images.gravatar') && window.crypto?.subtle) {
      try {
        const bytes = new TextEncoder().encode(String(cfgGet('links.email')).trim().toLowerCase());
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        sources.push(`https://gravatar.com/avatar/${hash}?s=160&d=404`);
      } catch {
        /* no Gravatar: skip it */
      }
    }
    sources.push(cfgGet('images.portrait'));
    for (const src of sources.filter(Boolean)) {
      const ok = await new Promise((resolve) => {
        const probe = new Image();
        probe.onload = () => resolve(true);
        probe.onerror = () => resolve(false);
        probe.src = src;
      });
      if (ok) {
        photo.src = src;
        photo.hidden = false;
        return;
      }
    }
  }

  /* ---- open / close ---- */
  function open(trigger) {
    root.classList.add('modal-open');
    dialog.showModal();
    const box = dialog.getBoundingClientRect();
    const spot = trigger.getBoundingClientRect();
    dialog.style.setProperty('--ox', `${spot.left + spot.width / 2 - box.left}px`);
    dialog.style.setProperty('--oy', `${spot.top + spot.height / 2 - box.top}px`);
    if (sent) reset();
    const wanted = trigger.dataset.messageOpen === 'brief' ? 'brief' : 'chat';
    goTo(index, { focus: false });
    setMode(wanted);
    startHello();
  }

  function close() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      dialog.removeEventListener('animationend', onEnd);
      dialog.classList.remove('is-closing');
      dialog.close();
      stopHello();
    };
    const onEnd = (e) => e.target === dialog && /out$/.test(e.animationName) && finish();
    const timer = setTimeout(finish, CLOSE_FALLBACK_MS);
    dialog.addEventListener('animationend', onEnd);
    dialog.classList.add('is-closing');
  }

  /* ---- events ---- */
  $$('[data-message-open]').forEach((trigger) =>
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      open(trigger);
    }),
  );
  $$('[data-msg-close]', dialog).forEach((b) => b.addEventListener('click', close));
  let pressedBackdrop = false;
  dialog.addEventListener('pointerdown', (e) => (pressedBackdrop = e.target === dialog));
  dialog.addEventListener('click', (e) => e.target === dialog && pressedBackdrop && close());
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault(); // Escape: play the exit animation first
    close();
  });
  dialog.addEventListener('close', () => root.classList.remove('modal-open'));

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => setMode(tab.dataset.msgTab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const other = tabs[(i + 1) % tabs.length];
      other.focus();
      setMode(other.dataset.msgTab, { focus: false });
    });
  });
  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    void sendChat();
  });
  chatForm?.addEventListener('keydown', (e) => {
    // Enter sends, Shift+Enter makes a new line (not while an input method is composing, e.g. Telex)
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target instanceof HTMLTextAreaElement) {
      e.preventDefault();
      void sendChat();
    }
  });
  chatForm?.addEventListener('input', (e) => {
    const field = e.target;
    if (field instanceof HTMLElement && field.getAttribute('aria-invalid') === 'true') {
      field.removeAttribute('aria-invalid');
      chatError.textContent = '';
    }
  });
  back.addEventListener('click', () => goTo(index - 1));
  trail.addEventListener('click', (e) => {
    const chip = e.target instanceof Element ? e.target.closest('[data-goto]') : null;
    if (chip instanceof HTMLElement) goTo(Number(chip.dataset.goto));
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    advance();
  });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target instanceof HTMLTextAreaElement) {
      e.preventDefault();
      advance();
    }
  });
  form.addEventListener('input', (e) => {
    const field = e.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
    if (field.getAttribute('aria-invalid') === 'true') validate(steps[index]);
    if (field instanceof HTMLTextAreaElement)
      counter.textContent = `${field.value.length}/${field.maxLength}`;
  });
  $('[data-msg-again]', done).addEventListener('click', reset);

  /* ---- floating button: only while the hero and the contact section are both off screen ---- */
  const fab = $('.fab');
  if (fab) {
    let heroVisible = true;
    let contactVisible = false;
    const sync = () => root.classList.toggle('fab-on', !heroVisible && !contactVisible);
    const watch = (el, set) => {
      if (!el) return;
      new IntersectionObserver(([entry]) => {
        set(entry.isIntersecting);
        sync();
      }).observe(el);
    };
    watch($('.hero'), (v) => (heroVisible = v));
    watch($('#contact'), (v) => (contactVisible = v));
  }

  goTo(0, { focus: false });
  setMode('chat', { focus: false });
  void initAvatar();
}
