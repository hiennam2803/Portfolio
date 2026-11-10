
/* ===== projects render ===== */
/** Builds the project list and one detail dialog per project from projects.json + project.N.* in languages.json. */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderProjects(projects) {
  const list = $('[data-project-list]');
  if (!list) return;
  const svg = (inner, size = 18, extra = '') =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${inner}</svg>`;
  const ICON = {
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"></path>'),
    back: svg('<path d="M5 12h14M13 6l6 6-6 6"></path>', 18, ' style="transform: scaleX(-1)"'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"></path>', 20),
    image:
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="8" width="38" height="32" rx="3" /><circle cx="17" cy="19" r="4" /><path d="M5 34l11-10 8 8 6-6 13 12" /></svg>',
  };
  const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
  const pad = (n) => String(n).padStart(2, '0');
  const pageUrl = location.href.split('#')[0].split('?')[0];

  list.innerHTML = projects
    .map((p, index) => {
      const id = p.id;
      const text = (name) => esc(t(`project.${id}.${name}`));
      const title = text('title');
      const neighbour = (step) => projects[(index + step + projects.length) % projects.length];

      const slides = range(p.images)
        .map(
          (n) => `<figure class="gallery__slide">
  <div class="gallery__media">
    <span class="gallery__ph">${n}</span>
    <img src="images/projects/project-${id}-${n}.webp" alt="" width="1280" height="800" loading="lazy" decoding="async" onerror="this.remove()" />
  </div>
  <figcaption>${text(`caption.${n}`)}</figcaption>
</figure>`,
        )
        .join('');

      const metrics = p.metrics
        ? `<ul class="metrics" aria-label="${esc(t('dialog.metrics_aria'))}">${range(p.metrics)
            .map((n) => `<li><strong>${text(`metric.${n}.value`)}</strong><span>${text(`metric.${n}.label`)}</span></li>`)
            .join('')}</ul>`
        : '';

      const highlights = p.highlights
        ? `<div><h4>${esc(t('dialog.highlights'))}</h4><ul class="highlights">${range(p.highlights)
            .map((n) => `<li>${text(`highlight.${n}`)}</li>`)
            .join('')}</ul></div>`
        : '';

      const links = [
        p.live &&
          `<a class="btn solid" href="${esc(p.live)}" target="_blank" rel="noopener">${esc(t('dialog.live'))}${ICON.arrow}</a>`,
        p.repo && `<a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener">${esc(t('dialog.source'))}</a>`,
      ]
        .filter(Boolean)
        .join('');

      const pager =
        projects.length > 1
          ? `<nav class="modal__pager" aria-label="${esc(t('dialog.pager_aria'))}">
  <button class="pager" type="button" data-project-go="project-${neighbour(-1).id}"><span class="pager__dir">&larr; ${esc(t('dialog.prev_project'))}</span><span class="pager__title">${esc(t(`project.${neighbour(-1).id}.title`))}</span></button>
  <button class="pager" type="button" data-project-go="project-${neighbour(1).id}"><span class="pager__dir">${esc(t('dialog.next_project'))} &rarr;</span><span class="pager__title">${esc(t(`project.${neighbour(1).id}.title`))}</span></button>
</nav>`
          : '';

      const row = `<a class="row" data-tilt data-project-open="project-${id}" href="#project-${id}" aria-haspopup="dialog" aria-label="${esc(t('projects.aria_open').replace('{title}', t(`project.${id}.title`)))}">
  <span class="frame" aria-hidden="true">
    <span class="chrome"> <i></i> <i></i> <i></i> </span>
    <span class="screen">
      <span class="ph" aria-hidden="true">${ICON.image}</span>
      <img src="images/projects/project-${id}.webp" alt="" width="640" height="400" loading="lazy" decoding="async" onerror="this.remove()" />
    </span>
  </span>
  <span class="info">
    <span class="meta"><span>${esc(p.year)}</span> <span class="stack">${esc(p.tech.join(' · '))}</span></span>
    <h3>${title}</h3>
    <p>${text('summary')}</p>
    <span class="go">${esc(t('projects.view_details'))}${ICON.arrow}</span>
  </span>
</a>`;

      const dialog = `<dialog class="modal" id="project-${id}" aria-labelledby="project-${id}-title" data-index="${index}">
  <div class="modal__top">
    <p class="modal__crumb"><span>${esc(t('dialog.label'))}</span><b>${pad(index + 1)} / ${pad(projects.length)}</b></p>
    <button class="modal__close" type="button" data-modal-close aria-label="${esc(t('common.close'))}">${ICON.close}</button>
  </div>
  <div class="modal__scroll">
    <div class="modal__layout">
      <div class="gallery" data-gallery data-thumb-label="${esc(t('dialog.image'))}">
        <div class="gallery__track" tabindex="0" role="group" aria-roledescription="carousel" aria-label="${esc(t('dialog.gallery_aria'))}">${slides}</div>
        <div class="gallery__bar">
          <span class="gallery__count" aria-live="polite">1 / ${p.images}</span>
          <div class="gallery__nav">
            <button class="gallery__btn" type="button" data-gallery-prev aria-label="${esc(t('dialog.prev_image'))}">${ICON.back}</button>
            <button class="gallery__btn" type="button" data-gallery-next aria-label="${esc(t('dialog.next_image'))}">${ICON.arrow}</button>
          </div>
        </div>
        <div class="gallery__thumbs"></div>
      </div>
      <div class="modal__info" data-stagger>
        <p class="modal__meta"><span>${esc(p.year)}</span><span class="modal__status" data-status="${esc(p.status)}">${esc(t(`dialog.status_${p.status}`))}</span></p>
        <h3 id="project-${id}-title">${title}</h3>
        <p class="modal__lead">${text('summary')}</p>
        ${metrics}
        <p class="modal__text">${text('overview')}</p>
        <dl class="facts">
          <div><dt>${esc(t('dialog.role'))}</dt><dd>${text('role')}</dd></div>
          <div><dt>${esc(t('dialog.duration'))}</dt><dd>${text('duration')}</dd></div>
          <div><dt>${esc(t('dialog.team'))}</dt><dd>${text('team')}</dd></div>
        </dl>
        <ol class="case">
          <li><h4>${esc(t('dialog.problem'))}</h4><p>${text('problem')}</p></li>
          <li><h4>${esc(t('dialog.solution'))}</h4><p>${text('solution')}</p></li>
          <li><h4>${esc(t('dialog.result'))}</h4><p>${text('result')}</p></li>
        </ol>
        ${highlights}
        <div><h4>${esc(t('dialog.stack'))}</h4><ul class="tags">${p.tech.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="modal__links">${links}<button class="btn" type="button" data-copy="${esc(`${pageUrl}#project-${id}`)}" data-copied="${esc(t('contact.copied'))}">${esc(t('dialog.copy_link'))}</button></div>
      </div>
    </div>
    ${pager}
  </div>
</dialog>`;

      return `<li data-reveal>${row}${dialog}</li>`;
    })
    .join('');
}
