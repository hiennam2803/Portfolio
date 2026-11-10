
/* ===== i18n ===== */
/**
 * Everything on the page comes from three JSON files, index.html holds structure only:
 *   languages.json  text only, per language          "key": { "vi": "...", "en": "..." }
 *   projects.json   projects: year, status, tech, cover + gallery image paths, links
 *   config.json     not text: career start date, contact links, portrait image path
 * Markers in the HTML:
 *   data-t="key"                    element text          (key starting with @ reads config.json, e.g. @links.email)
 *   data-ta="attr:key;attr2:key2"   attributes
 *   data-list="skills.lang"         <li> per key skills.lang.1, .2 ...
 *   data-render="experience"        timeline / certificates built from experience.N.* / education.N.* / certificates.N.*
 *   data-stat="years|projects|tech" numbers computed by code (never typed)
 * Language: ?lang=en  >  last choice (localStorage)  >  first language in the file.
 */
const I18N = { dict: {}, cfg: {}, lang: 'vi', langs: [], projects: [] };

const cfgGet = (path) => path.split('.').reduce((obj, k) => obj?.[k], I18N.cfg);
const initialsOf = (name) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = Array.from(words[0])[0];
  return (first + (words.length > 1 ? Array.from(words[words.length - 1])[0] : '')).toUpperCase();
};
/** Values that are worked out by code instead of being typed. */
const COMPUTED = {
  'links.mailto': () => `mailto:${cfgGet('links.email')}`,
  'site.initials': () => initialsOf(t('site.name')),
};

/** Text for a key. `@path` reads config.json. `{{other.key}}` and `{{year}}` inside a text are resolved too. */
const t = (key) => {
  if (key.startsWith('@')) return String(COMPUTED[key.slice(1)]?.() ?? cfgGet(key.slice(1)) ?? '');
  const entry = I18N.dict[key];
  if (!entry || typeof entry !== 'object') {
    console.warn(`languages.json: missing key "${key}"`);
    return '';
  }
  const value = entry[I18N.lang] ?? entry[I18N.langs[0]] ?? '';
  return value.replace(/\{\{([^}]+)\}\}/g, (_, inner) => (inner === 'year' ? String(new Date().getFullYear()) : t(inner)));
};
const keysMatching = (pattern) => Object.keys(I18N.dict).filter((key) => pattern.test(key));
/** Distinct numbers N found in keys matching a pattern with one (\d+) group, ascending: counts items without a typed count. */
const numbered = (pattern) =>
  [...new Set(keysMatching(pattern).map((key) => Number(key.match(pattern)[1])))].sort((a, b) => a - b);

/** Whole years since a date (career start). */
function yearsSince(date) {
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  if (now.getMonth() < start.getMonth() || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())) years--;
  return Math.max(0, years);
}

/** Timeline + certificate lists: one item per numbered group of keys. */
function renderLists() {
  const li = (n, name) => esc(t(`${name}.${n}`));
  const experience = $('[data-render="experience"]');
  if (experience)
    experience.innerHTML = numbered(/^experience\.(\d+)\.role$/)
      .map((n) => {
        const bullets = numbered(new RegExp(`^experience\\.${n}\\.bullet\\.(\\d+)$`));
        return `<li data-reveal><span class="period">${li('period', `experience.${n}`)}</span><div><h3>${li('role', `experience.${n}`)}</h3><p class="org">${li('org', `experience.${n}`)}</p>${
          bullets.length ? `<ul>${bullets.map((b) => `<li>${esc(t(`experience.${n}.bullet.${b}`))}</li>`).join('')}</ul>` : ''
        }</div></li>`;
      })
      .join('');

  const education = $('[data-render="education"]');
  if (education)
    education.innerHTML = numbered(/^education\.(\d+)\.degree$/)
      .map(
        (n) =>
          `<li data-reveal><span class="period">${li('period', `education.${n}`)}</span><div><h3>${li('degree', `education.${n}`)}</h3><p class="org">${li('school', `education.${n}`)}</p></div></li>`,
      )
      .join('');

  const certificates = $('[data-render="certificates"]');
  if (certificates)
    certificates.innerHTML = numbered(/^certificates\.(\d+)\.name$/)
      .map(
        (n) =>
          `<li data-reveal><div class="row"><span class="n">${li('name', `certificates.${n}`)}</span> <span class="m"> ${li('meta', `certificates.${n}`)} </span></div></li>`,
      )
      .join('');
}

function applyContent() {
  $$('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t)));
  $$('[data-ta]').forEach((el) =>
    el.dataset.ta.split(';').forEach((pair) => {
      const cut = pair.indexOf(':');
      el.setAttribute(pair.slice(0, cut), t(pair.slice(cut + 1)));
    }),
  );
  $$('[data-list]').forEach((list) => {
    const pattern = new RegExp(`^${list.dataset.list.replace(/\./g, '\\.')}\\.\\d+$`);
    list.innerHTML = keysMatching(pattern)
      .map((key) => `<li>${esc(t(key))}</li>`)
      .join('');
  });
  const skillKeys = keysMatching(/^skills\.(lang|fw|tools)\.\d+$/);
  const skills = skillKeys.map((key) => `<li>${esc(t(key))}</li>`).join('');
  $$('[data-marquee]').forEach((list) => (list.innerHTML = skills));

  // numbers counted by code
  const two = (n) => String(n).padStart(2, '0');
  const stats = {
    years: `${two(yearsSince(I18N.cfg.careerStart))}+`,
    projects: two(I18N.projects.length),
    tech: two(skillKeys.length),
  };
  $$('[data-stat]').forEach((el) => (el.textContent = stats[el.dataset.stat] ?? ''));

  document.title = t('meta.title');
  $('meta[name="description"]')?.setAttribute('content', t('meta.description'));

  // language switch: points at the next language in the file; label and name come from the language code
  const next = I18N.langs[(I18N.langs.indexOf(I18N.lang) + 1) % I18N.langs.length];
  let nextName = next.toUpperCase();
  try {
    nextName = new Intl.DisplayNames([next], { type: 'language' }).of(next) ?? nextName;
  } catch {
    /* old browser: keep the code */
  }
  $$('[data-lang-switch]').forEach((link) => {
    link.href = `?lang=${next}`;
    link.hreflang = next;
    link.lang = next;
    link.textContent = next.toUpperCase();
    link.setAttribute('aria-label', nextName);
    link.addEventListener('click', () => {
      try {
        localStorage.setItem('lang', next);
      } catch {
        /* storage unavailable: the ?lang= link still works */
      }
    });
  });
}

/** Loads the JSON files and builds the page content. Resolves when the page is ready to initialise. */
async function initContent() {
  try {
    const [dict, projects, cfg] = await Promise.all(
      ['languages.json', 'projects.json', 'config.json'].map((file) => fetch(file).then((r) => r.json())),
    );
    I18N.dict = dict;
    I18N.projects = projects;
    I18N.cfg = cfg;
    I18N.langs = Object.keys(dict['meta.title'] ?? {});
    let saved = null;
    try {
      saved = localStorage.getItem('lang');
    } catch {
      /* ignore */
    }
    const wanted = new URLSearchParams(location.search).get('lang') ?? saved;
    I18N.lang = I18N.langs.includes(wanted) ? wanted : I18N.langs[0];
    root.lang = I18N.lang;
    renderProjects(projects);
    renderLists();
    applyContent();
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<p style="padding:1rem;font:14px monospace;background:#fee;color:#900">Cannot load languages.json / projects.json / config.json. Open the site through a web server (e.g. <code>npx serve</code> or VS Code Live Server), not by double-clicking the file.</p>',
    );
  } finally {
    root.classList.add('ready');
  }
}
