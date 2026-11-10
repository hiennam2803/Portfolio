#!/usr/bin/env node
/*
 * Builds the site from small source files. No dependencies: just run `node build.mjs`
 * (add --watch to rebuild on every save).
 *
 *   languages.json  every piece of text, as  "key": { "vi": "...", "en": "..." }
 *   projects.json   project data that is not text (year, tech, links, image count ...)
 *   parts/          HTML templates, one set for ALL languages. Use {{some.key}} to print a text
 *   src/css/        CSS: tokens, base, components, sections/, widgets/   -> css/style.css
 *   src/js/         JS: one file per feature                             -> js/main.js
 *
 * Output: index.html (vi), en/index.html (en), css/style.css, js/main.js
 */
import { mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://example.com/'; // your real domain (used for canonical + hreflang + project share links)

/** Add a language: add an entry here AND a "xx" value to every key in languages.json. */
const LANGS = [
  { code: 'vi', output: 'index.html', root: '', path: '' },
  { code: 'en', output: 'en/index.html', root: '../', path: 'en/' },
];
const FALLBACK = 'vi'; // used (with a warning) when a key has no text for a language

/** Order in which section files are stacked on the page. */
const SECTIONS = [
  'hero',
  'marquee',
  'about',
  'skills',
  'projects',
  'experience',
  'education',
  'certificates',
  'contact',
];

/** Stylesheet order matters: later files can override earlier ones. */
const CSS_FILES = [
  'fonts',
  'tokens',
  'base',
  'components',
  'motion',
  'sections/section',
  'sections/header',
  'sections/hero',
  'sections/marquee',
  'sections/about',
  'sections/skills',
  'sections/projects',
  'sections/timeline',
  'sections/certificates',
  'sections/contact',
  'sections/footer',
  'widgets/panel',
  'widgets/hud',
  'widgets/project-dialog',
  'widgets/message-dialog',
  'widgets/fab',
];

/** Scripts are joined inside one wrapper; the order is listed in src/js/ORDER.txt (`main` stays last). */
const JS_FILES = readFileSync(join(ROOT, 'src/js/ORDER.txt'), 'utf8').trim().split('\n');

const read = (file) => readFileSync(join(ROOT, file), 'utf8').trim();
const write = (file, content) => {
  const target = join(ROOT, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${content}\n`);
  console.log(`built ${file}`);
};

/* ---------- small SVG icons used by generated markup ---------- */
const svg = (inner, size = 18, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${inner}</svg>`;
const ICON = {
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"></path>'),
  arrowBack: svg('<path d="M5 12h14M13 6l6 6-6 6"></path>', 18, ' style="transform: scaleX(-1)"'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"></path>', 20),
  image: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="8" width="38" height="32" rx="3" /><circle cx="17" cy="19" r="4" /><path d="M5 34l11-10 8 8 6-6 13 12" /></svg>`,
};

/* ---------- languages ---------- */
let LANG = {};
let usedKeys = new Set();
const warned = new Set();

function loadLanguages() {
  LANG = JSON.parse(read('languages.json'));
  usedKeys = new Set();
  warned.clear();
}

/** Returns the text for `key` in language `code`. `{{other.key}}` inside a text is resolved too. */
function makeT(code) {
  const t = (key, depth = 0) => {
    const entry = LANG[key];
    if (!entry || typeof entry !== 'object') throw new Error(`languages.json: unknown key "${key}"`);
    usedKeys.add(key);
    let value = entry[code];
    if (value === undefined || value === '') {
      const tag = `${key}:${code}`;
      if (!warned.has(tag)) {
        warned.add(tag);
        console.warn(`warning: "${key}" has no "${code}" text, using "${FALLBACK}"`);
      }
      value = entry[FALLBACK] ?? '';
    }
    if (depth > 4) throw new Error(`languages.json: "${key}" refers to itself`);
    return value.replace(/\{\{([\w.]+)\}\}/g, (_, inner) => t(inner, depth + 1));
  };
  return t;
}

/** True when `offset` sits inside an HTML tag (so the value is an attribute and quotes need escaping). */
const insideTag = (html, offset) => html.lastIndexOf('<', offset) > html.lastIndexOf('>', offset);

/** Replaces {{name}} with a variable (no dot) or a translated text (dotted key). One pass: output is not re-scanned. */
function fill(template, vars, t) {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, key, offset, whole) => {
    const value = key in vars ? String(vars[key]) : t(key);
    return insideTag(whole, offset) ? value.replaceAll('"', '&quot;') : value;
  });
}

const keysMatching = (pattern) => Object.keys(LANG).filter((key) => pattern.test(key));
const listItems = (keys, t) => keys.map((key) => `<li>${t(key)}</li>`).join('\n');

/* ---------- projects ---------- */
function renderProject(project, index, all, lang, t, projectTemplate) {
  const id = project.id;
  const text = (name) => t(`project.${id}.${name}`);
  const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
  const title = text('title');
  const pad = (n) => String(n).padStart(2, '0');
  const neighbour = (step) => all[(index + step + all.length) % all.length];

  const slides = range(project.images)
    .map(
      (n) => `<figure class="gallery__slide">
  <div class="gallery__media">
    <span class="gallery__ph">${n}</span>
    <img src="${lang.root}images/projects/project-${id}-${n}.webp" alt="" width="1280" height="800" loading="lazy" decoding="async" onerror="this.remove()" />
  </div>
  <figcaption>${text(`caption.${n}`)}</figcaption>
</figure>`,
    )
    .join('\n');

  const metrics = project.metrics
    ? `<ul class="metrics" aria-label="${t('dialog.metrics_aria')}">
${range(project.metrics)
  .map(
    (n) => `  <li><strong>${text(`metric.${n}.value`)}</strong><span>${text(`metric.${n}.label`)}</span></li>`,
  )
  .join('\n')}
</ul>`
    : '';

  const highlights = project.highlights
    ? `<div>
  <h4>${t('dialog.highlights')}</h4>
  <ul class="highlights">
${range(project.highlights)
  .map((n) => `    <li>${text(`highlight.${n}`)}</li>`)
  .join('\n')}
  </ul>
</div>`
    : '';

  const links = [
    project.live &&
      `<a class="btn solid" href="${project.live}" target="_blank" rel="noopener">${t('dialog.live')}${ICON.arrow}</a>`,
    project.repo && `<a class="btn" href="${project.repo}" target="_blank" rel="noopener">${t('dialog.source')}</a>`,
  ]
    .filter(Boolean)
    .join('\n');

  const pager =
    all.length > 1
      ? `<nav class="modal__pager" aria-label="${t('dialog.pager_aria')}">
  <button class="pager" type="button" data-project-go="project-${neighbour(-1).id}">
    <span class="pager__dir">&larr; ${t('dialog.prev_project')}</span>
    <span class="pager__title">${t(`project.${neighbour(-1).id}.title`)}</span>
  </button>
  <button class="pager" type="button" data-project-go="project-${neighbour(1).id}">
    <span class="pager__dir">${t('dialog.next_project')} &rarr;</span>
    <span class="pager__title">${t(`project.${neighbour(1).id}.title`)}</span>
  </button>
</nav>`
      : '';

  const vars = {
    id,
    index,
    root: lang.root,
    position: `${pad(index + 1)} / ${pad(all.length)}`,
    year: project.year,
    status: project.status,
    status_text: t(`dialog.status_${project.status}`),
    title,
    summary: text('summary'),
    overview: text('overview'),
    problem: text('problem'),
    solution: text('solution'),
    result: text('result'),
    role: text('role'),
    duration: text('duration'),
    team: text('team'),
    aria_open: t('projects.aria_open').replace('{title}', title),
    tech_inline: project.tech.join(' · '),
    tags: project.tech.map((tech) => `<li>${tech}</li>`).join('\n'),
    image_count: project.images,
    share_url: `${SITE_URL}${lang.path}#project-${id}`,
    slides,
    metrics,
    highlights,
    links,
    pager,
    icon_arrow: ICON.arrow,
    icon_arrow_back: ICON.arrowBack,
    icon_close: ICON.close,
    icon_image: ICON.image,
  };
  return fill(projectTemplate, vars, t);
}

/* ---------- build ---------- */
function buildAssets() {
  const css = CSS_FILES.map((name) => read(`src/css/${name}.css`)).join('\n\n');
  write('css/style.css', `/* Generated by build.mjs from src/css/. Do not edit. */\n\n${css}`);

  const js = JS_FILES.map((name) => read(`src/js/${name}.js`)).join('\n\n');
  write(
    'js/main.js',
    `/* Generated by build.mjs from src/js/. Do not edit. */\n(() => {\n'use strict';\n\n${js}\n})();`,
  );
}

function buildPages() {
  loadLanguages();
  const layout = read('parts/layout.html');
  const projects = JSON.parse(read('projects.json'));
  const projectTemplate = read('parts/project.html');
  const skillKeys = {
    lang: keysMatching(/^skills\.lang\.\d+$/),
    fw: keysMatching(/^skills\.fw\.\d+$/),
    tools: keysMatching(/^skills\.tools\.\d+$/),
  };

  for (const lang of LANGS) {
    const t = makeT(lang.code);
    const shared = {
      lang: lang.code,
      root: lang.root,
      canonical: SITE_URL + lang.path,
      alt_vi: SITE_URL,
      alt_en: `${SITE_URL}en/`,
      title: t('meta.title'),
      description: t('meta.description'),
      skills_lang: listItems(skillKeys.lang, t),
      skills_fw: listItems(skillKeys.fw, t),
      skills_tools: listItems(skillKeys.tools, t),
      // the scrolling word band shows every skill
      marquee_items: listItems([...skillKeys.lang, ...skillKeys.fw, ...skillKeys.tools], t),
      project_items: projects
        .map((project, i) => renderProject(project, i, projects, lang, t, projectTemplate))
        .join('\n'),
    };
    const part = (name) => fill(read(`parts/${name}.html`), shared, t);

    const html = fill(
      layout,
      {
        ...shared,
        header: part('header'),
        main: SECTIONS.map(part).join('\n\n'),
        footer: part('footer'),
        dialogs: part('message-dialog'),
      },
      t,
    );
    write(lang.output, html);
  }

  const unused = Object.keys(LANG).filter((key) => !key.startsWith('_') && !usedKeys.has(key));
  if (unused.length) console.warn(`warning: ${unused.length} unused key(s) in languages.json: ${unused.join(', ')}`);
}

function build() {
  buildAssets();
  buildPages();
}

build();

if (process.argv.includes('--watch')) {
  console.log('watching parts/, src/, languages.json, projects.json ... (Ctrl+C to stop)');
  let timer;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } catch (error) {
        console.error(error.message);
      }
    }, 100);
  };
  for (const dir of ['parts', 'src']) watch(join(ROOT, dir), { recursive: true }, rebuild);
  for (const file of ['languages.json', 'projects.json']) watch(join(ROOT, file), rebuild);
}
