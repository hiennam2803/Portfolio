/* ===== message-dialog ===== */
/**
 * Message dialog with two modes (tabs):
 *   chat   a plain message: name, email and one message, shown as a small chat thread
 *   brief  a project request: the five-step conversation (needs, budget, direction of the project ...)
 * It opens with a circular reveal from the pressed button; data-message-open="brief" opens the brief tab.
 * Answers stay in the forms until sent, so closing and reopening resumes where you left off.
 * Both forms send a real email through EmailJS (config.json -> "emailjs"); nothing opens a mail app.
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

  /* ---- sending: EmailJS REST API (no mail app, no server; works on GitHub Pages) ----
   * IDs come from config.json -> "emailjs" (publicKey, serviceId, templateId). The Public Key is meant to be public.
   * Never put the Private Key (Access Token) anywhere in this site: it would be visible to every visitor.
   * Visitor-side limits below only stop casual spam; the real protection is set in the EmailJS dashboard (see README). */
  const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
  const SEND_TIMEOUT_MS = 15000;
  const MIN_FILL_MS = 1500; // opening the dialog and writing a message takes a person longer than this
  const COOLDOWN_MS = 30000; // pause between two sent messages
  const HOUR_MS = 3600000;
  const MAX_PER_HOUR = 5; // sent messages per browser per hour
  const MAX_LINKS = 5; // links allowed in one message
  const LIMITS = { name: 80, email: 254, message: 600, topics: 200, budget: 80 };
  const SENT_KEY = 'mail-sent'; // only timestamps are stored, never what the visitor wrote
  const OWNER_TZ = 'Asia/Ho_Chi_Minh';
  const EMAIL_RE = /^[^\s@<>"(),:;\\[\]]+@[^\s@<>"(),:;\\[\]]+\.[^\s@<>"(),:;\\[\]]{2,}$/;
  const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

  let busy = false; // one send at a time, for both forms
  let openedAt = Date.now();

  /** kind: config (IDs missing) | network (offline / timeout) | busy (429) | rejected (anything else EmailJS refuses) */
  class MailError extends Error {
    constructor(kind, detail = '') {
      super(detail);
      this.kind = kind;
    }
  }

  /** Text in the site owner's language (the first language in languages.json): the email is written for you, not for the visitor. */
  const owner = (key) => I18N.dict[key]?.[I18N.langs[0]] ?? '';
  const oneLine = (value, max) =>
    String(value ?? '').replace(CONTROL, '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const multiLine = (value, max) =>
    String(value ?? '').replace(/\r\n?/g, '\n').replace(CONTROL, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
  const isEmail = (value) => value.length <= LIMITS.email && !value.includes('..') && EMAIL_RE.test(value);
  const countLinks = (text) => (text.match(/https?:\/\/|www\./gi) ?? []).length;

  /** The error text for a field, or '' when it is fine. `fallback` is the field's own message (data-error). */
  function problemOf(field, fallback) {
    const value = field.value.trim();
    if (field.required && !value) return fallback;
    if (field.type === 'email' && !isEmail(value)) return fallback;
    if (field.name === 'message' && countLinks(value) > MAX_LINKS) return t('msg.err_links');
    return '';
  }

  /* Hidden field that people never see but simple bots fill in; kept out of focus order and out of screen readers. */
  const makeTrap = (target) => {
    if (!target) return null;
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'extra_info';
    input.tabIndex = -1;
    input.autocomplete = 'off';
    input.setAttribute('aria-hidden', 'true');
    input.dataset.trap = '';
    input.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
    target.append(input);
    return input;
  };
  const briefTrap = makeTrap(form);
  const chatTrap = makeTrap(chatForm);
  $$('input[name="name"]', dialog).forEach((input) => (input.maxLength = LIMITS.name));
  $$('input[name="email"]', dialog).forEach((input) => (input.maxLength = LIMITS.email));

  let sentLog = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]');
      return Array.isArray(saved) ? saved.filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  })();
  /** '' = allowed. Otherwise the text to show: too soon after the last message, or too many this hour. */
  function throttle() {
    const now = Date.now();
    sentLog = sentLog.filter((time) => time <= now && now - time < HOUR_MS);
    if (!sentLog.length) return '';
    const wait = COOLDOWN_MS - (now - Math.max(...sentLog));
    if (wait > 0) return t('msg.wait').replace('{seconds}', String(Math.ceil(wait / 1000)));
    return sentLog.length >= MAX_PER_HOUR ? t('msg.limit') : '';
  }
  function remember() {
    sentLog.push(Date.now());
    try {
      localStorage.setItem(SENT_KEY, JSON.stringify(sentLog));
    } catch {
      /* storage blocked: the in-memory log still limits this visit */
    }
  }
  /** '' = go ahead. Bots (filled the hidden field, or answered instantly) get the generic failure and nothing is sent. */
  function preflight(trap) {
    if (trap?.value || Date.now() - openedAt < MIN_FILL_MS) return t('msg.fail');
    return throttle();
  }

  const stamp = () => {
    try {
      return new Intl.DateTimeFormat(I18N.langs[0], { dateStyle: 'medium', timeStyle: 'short', timeZone: OWNER_TZ }).format(new Date());
    } catch {
      return new Date().toISOString();
    }
  };

  /** What the EmailJS template receives. Everything is trimmed, cut to a safe length and stripped of control characters. */
  function buildParams(kind, raw) {
    const brief = kind === 'brief';
    const name = oneLine(raw.name, LIMITS.name);
    const email = oneLine(raw.email, LIMITS.email);
    const message = multiLine(raw.message, LIMITS.message);
    const topics = (raw.topics ?? []).map((item) => oneLine(item, 60)).filter(Boolean).join(', ').slice(0, LIMITS.topics);
    const budget = oneLine(raw.budget, LIMITS.budget);
    if (!name || !isEmail(email) || !message) throw new MailError('rejected', 'invalid input');
    const none = owner('mail.none');
    return {
      subject: `[Portfolio] ${owner(brief ? 'msg.subject_brief' : 'chat.subject').replace('{name}', name)}`,
      form_type: owner(brief ? 'msg.tab_brief' : 'msg.tab_chat'),
      from_name: name,
      from_email: email,
      reply_to: email,
      project_type: topics,
      budget,
      details: brief ? `${owner('mail.type')}: ${topics || none}\n${owner('mail.budget')}: ${budget || none}` : '',
      message,
      sent_at: stamp(),
      visitor_lang: I18N.lang,
    };
  }

  /** Resolves only when EmailJS answers 200. Anything else throws a MailError. */
  async function deliver(params) {
    const { publicKey, serviceId, templateId } = cfgGet('emailjs') ?? {};
    const ids = [publicKey, serviceId, templateId].map((value) => (typeof value === 'string' ? value.trim() : ''));
    if (ids.some((value) => !value)) {
      console.error('[contact] EmailJS is not configured: fill publicKey, serviceId and templateId under "emailjs" in config.json.');
      throw new MailError('config');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(EMAILJS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: ids[1], template_id: ids[2], user_id: ids[0], template_params: params }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new MailError('network', error?.message);
    } finally {
      clearTimeout(timer);
    }
    if (response.ok) return;
    const detail = await response.text().catch(() => '');
    console.error(`[contact] EmailJS answered ${response.status}: ${detail}`); // for you in the console; visitors only see a short message
    throw new MailError(response.status === 429 ? 'busy' : 'rejected', detail);
  }

  const failText = (error) => {
    if (!(error instanceof MailError)) console.error(error);
    return t({ config: 'msg.fail_config', network: 'msg.fail_network', busy: 'msg.fail_busy' }[error?.kind] ?? 'msg.fail');
  };
  const lockFields = (scope, on) =>
    $$('input:not([type="checkbox"]):not([type="radio"]), textarea', scope).forEach((field) => (field.readOnly = on));
  const show = (el, text, isError = false) => {
    el.textContent = text;
    el.style.color = isError ? 'var(--danger)' : '';
    el.setAttribute('role', isError ? 'alert' : 'status');
  };

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
    const problem = problemOf(field, step.dataset.error ?? '');
    const valid = !problem;
    field.setAttribute('aria-invalid', String(!valid));
    const output = $('.msg__error', step);
    if (output) output.textContent = problem;
    if (!valid) {
      step.classList.remove('is-shaking');
      void step.offsetWidth; // restart the shake animation
      step.classList.add('is-shaking');
      field.focus({ preventScroll: true });
    }
    return valid;
  }

  /* Choices are read in the owner's language (not the visitor's), so every email looks the same to you. */
  const choiceLabel = (input) => {
    const key = (input.dataset.ta ?? '').match(/value:([\w.]+)/)?.[1];
    return (key && owner(key)) || input.value;
  };
  function collect() {
    const get = (name) => form.elements.namedItem(name)?.value ?? '';
    const picked = (name) => $$(`input[name="${name}"]:checked`, form).map(choiceLabel);
    return {
      name: get('name'),
      email: get('email'),
      topics: picked('topics'),
      budget: picked('budget')[0] ?? '',
      message: get('message'),
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

  function showDone(name) {
    sent = true;
    dialog.dataset.state = 'sent';
    done.inert = false;
    $('[data-done-title]', done).textContent = (data.doneTitle ?? '').replace('{name}', name.slice(0, 24));
    $('[data-done-text]', done).textContent = data.ok ?? '';
    burst();
    $('[data-msg-again]', done).focus({ preventScroll: true });
  }

  async function submit() {
    if (busy) return;
    // every answer is checked again right before sending, not only the last step
    const badStep = steps.findIndex((step) => {
      const field = fieldOf(step);
      return field && problemOf(field, step.dataset.error || 'invalid');
    });
    if (badStep !== -1) {
      goTo(badStep);
      validate(steps[badStep]);
      return;
    }
    const blocked = preflight(briefTrap);
    if (blocked) {
      show(status, blocked, true);
      return;
    }
    busy = true;
    next.disabled = true;
    next.classList.add('is-loading');
    lockFields(form, true);
    show(status, data.sending ?? '');
    let params;
    try {
      params = buildParams('brief', collect());
      await deliver(params); // only a 200 from EmailJS gets past this line
    } catch (error) {
      show(status, failText(error), true);
      return;
    } finally {
      busy = false;
      next.disabled = false;
      next.classList.remove('is-loading');
      lockFields(form, false);
    }
    remember();
    show(status, '');
    showDone(params.from_name);
  }

  const advance = () => {
    if (busy) return;
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
    const empty = [...chatForm.querySelectorAll('input:not([data-trap]), textarea')].find((field) => !field.value.trim());
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
    if (busy) return;
    const el = (name) => chatForm.elements.namedItem(name);
    const fields = ['name', 'email', 'message'].map(el);
    fields.forEach((field) => field.removeAttribute('aria-invalid'));
    chatError.textContent = '';
    for (const field of fields) {
      const problem = problemOf(field, field.dataset.error ?? '');
      if (!problem) continue;
      field.setAttribute('aria-invalid', 'true');
      chatError.textContent = problem;
      field.focus({ preventScroll: true });
      return;
    }
    const blocked = preflight(chatTrap);
    if (blocked) {
      chatError.textContent = blocked;
      return;
    }
    const cd = chatForm.dataset;
    busy = true;
    chatSend.disabled = true;
    chatSend.setAttribute('aria-busy', 'true');
    lockFields(chatForm, true);
    chatStatus.textContent = cd.sending ?? '';
    let params;
    try {
      params = buildParams('chat', { name: el('name').value, email: el('email').value, message: el('message').value });
      await deliver(params); // only a 200 from EmailJS gets past this line
    } catch (error) {
      chatStatus.textContent = '';
      chatError.textContent = failText(error);
      return;
    } finally {
      busy = false;
      chatSend.disabled = false;
      chatSend.removeAttribute('aria-busy');
      lockFields(chatForm, false);
    }
    remember();
    chatStatus.textContent = '';
    addBubble(params.message, 'me');
    el('message').value = '';
    const reply = (cd.reply ?? '').replace('{name}', params.from_name.slice(0, 24));
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
    openedAt = Date.now();
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
  back.addEventListener('click', () => !busy && goTo(index - 1));
  trail.addEventListener('click', (e) => {
    const chip = e.target instanceof Element ? e.target.closest('[data-goto]') : null;
    if (chip instanceof HTMLElement && !busy) goTo(Number(chip.dataset.goto));
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
