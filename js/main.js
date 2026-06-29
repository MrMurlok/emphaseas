'use strict';

const body = document.body;
const nav = document.querySelector('[data-nav]');
const burger = document.querySelector('[data-burger]');
const modalOpenButtons = document.querySelectorAll('[data-modal-open]');
const modalCloseButtons = document.querySelectorAll('[data-modal-close]');
const faqHeads = document.querySelectorAll('.faq_head-flex');
const modalAccordionHeads = document.querySelectorAll('[data-modal-accordion-head]');

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
