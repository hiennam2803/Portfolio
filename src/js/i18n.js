
/* ===== i18n ===== */
/**
 * All text lives in languages.json (and project data in projects.json). index.html holds structure only:
 *   data-t="key"                       -> element text
 *   data-ta="attr:key;attr2:key2"      -> attributes
 *   data-list="skills.lang"            -> <li> per key skills.lang.1, .2 ...
 *   data-marquee                       -> every skill, for the scrolling band
 *   data-project-list                  -> project rows + dialogs (renderProjects)
 * Language: ?lang=en  >  last choice (localStorage)  >  first language in the file.
 */
const I18N = { dict: {}, lang: 'vi', langs: [], projects: [] };
const t = (key) => {
  const entry = I18N.dict[key];
  if (!entry || typeof entry !== 'object') {
    console.warn(`languages.json: missing key "${key}"`);
    return '';
  }
  const value = entry[I18N.lang] ?? entry[I18N.langs[0]] ?? '';
  return value.replace(/\{\{([\w.]+)\}\}/g, (_, inner) => t(inner));
};
const keysMatching = (pattern) => Object.keys(I18N.dict).filter((key) => pattern.test(key));

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
  const skills = keysMatching(/^skills\.(lang|fw|tools)\.\d+$/)
    .map((key) => `<li>${esc(t(key))}</li>`)
    .join('');
  $$('[data-marquee]').forEach((list) => (list.innerHTML = skills));

  document.title = t('meta.title');
  $('meta[name="description"]')?.setAttribute('content', t('meta.description'));

  // language switch: points at the next language in the file
  const next = I18N.langs[(I18N.langs.indexOf(I18N.lang) + 1) % I18N.langs.length];
  $$('[data-lang-switch]').forEach((link) => {
    link.href = `?lang=${next}`;
    link.addEventListener('click', () => {
      try {
        localStorage.setItem('lang', next);
      } catch {
        /* storage unavailable: the ?lang= link still works */
      }
    });
  });
}

/** Loads languages.json + projects.json, builds the page content. Resolves when the page is ready to initialise. */
async function initContent() {
  try {
    const [dict, projects] = await Promise.all([
      fetch('languages.json').then((r) => r.json()),
      fetch('projects.json').then((r) => r.json()),
    ]);
    I18N.dict = dict;
    I18N.projects = projects;
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
    applyContent();
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<p style="padding:1rem;font:14px monospace;background:#fee;color:#900">Cannot load languages.json / projects.json. Open the site through a web server (e.g. <code>npx serve</code> or VS Code Live Server), not by double-clicking the file.</p>',
    );
  } finally {
    root.classList.add('ready');
  }
}
