'use strict';

const body = document.body;
const nav = document.querySelector('[data-nav]');
const burger = document.querySelector('[data-burger]');
const modalOpenButtons = document.querySelectorAll('[data-modal-open]');
const modalCloseButtons = document.querySelectorAll('[data-modal-close]');
const faqHeads = document.querySelectorAll('.faq_head-flex');
const modalAccordionHeads = document.querySelectorAll('[data-modal-accordion-head]');
const revealItems = document.querySelectorAll([
  '.hero_content-flex',
  '.plugin_info-flex',
  '.plugin_gallery-grid',
  '.plugin_actions-flex',
  '.studio_info-flex',
  '.mastering_group',
  '.faq_title',
  '.faq_item',
  '.education_info-flex',
  '.education_media',
  '.review_card-flex',
  '.label_info-flex',
  '.catalog_block',
  '.label_links-demo',
  '.label_links-platforms',
  '.youtube_info-flex',
  '.youtube_preview',
  '.contacts_info-flex',
  '.contacts_form-flex',
  '.footer_brand-flex',
  '.footer_nav-flex',
  '.footer_links-flex',
  '.footer_contacts-flex',
].join(','));

const revealDirections = ['reveal_from-left', 'reveal_from-right', 'reveal_from-bottom', 'reveal_from-top'];

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const renderFaq = (items) => {
  const root = document.querySelector('.faq_list-flex');
  if (!root || !Array.isArray(items) || !items.length) return;
  root.innerHTML = items.map((item) => `
    <article class="faq_item">
      <button class="faq_head-flex" type="button">${escapeHtml(item.question)}<span>+</span></button>
      <p>${escapeHtml(item.answer)}</p>
    </article>
  `).join('');
  root.querySelectorAll('.faq_head-flex').forEach((head) => {
    head.addEventListener('click', () => {
      head.closest('.faq_item')?.classList.toggle('is-open');
    });
  });
};

const applyContent = (data) => {
  if (!data) return;
  const download = document.querySelector('[data-massimizer-download]');
  if (download && data.massimizer?.download) download.href = data.massimizer.download;
  renderFaq(data.faq);
};

if (window.emphaseasContentReady) window.emphaseasContentReady.then(applyContent);

if (revealItems.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  revealItems.forEach((item, index) => {
    item.classList.add('reveal', revealDirections[index % revealDirections.length]);
    item.style.setProperty('--reveal-delay', `${Math.min(index % 3, 2) * 90}ms`);
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: '0px 0px -8% 0px',
  });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

burger?.addEventListener('click', () => {
  nav?.classList.toggle('is-open');
  body.classList.toggle('menu-open');
});

modalOpenButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const modal = document.getElementById(button.dataset.modalOpen);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    body.classList.add('modal-open');
  });
});

modalCloseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const modal = button.closest('.modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    body.classList.remove('modal-open');
  });
});

faqHeads.forEach((head) => {
  head.addEventListener('click', () => {
    head.closest('.faq_item')?.classList.toggle('is-open');
  });
});


modalAccordionHeads.forEach((head) => {
  head.addEventListener('click', () => {
    head.closest('.modal_accordion-item')?.classList.toggle('is-open');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  const openedModal = document.querySelector('.modal.is-open');
  if (!openedModal) return;

  openedModal.classList.remove('is-open');
  openedModal.setAttribute('aria-hidden', 'true');
  body.classList.remove('modal-open');
});
