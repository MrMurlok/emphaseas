'use strict';

function initPluginGallery() {
  const gallery = document.querySelector('[data-plugin-gallery]');
  if (!gallery) return;

  const slides = Array.from(gallery.querySelectorAll('[data-plugin-slide]'));
  const prevButton = gallery.querySelector('[data-plugin-prev]');
  const nextButton = gallery.querySelector('[data-plugin-next]');
  let currentIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));

  const updateVideoState = () => {
    slides.forEach((slide) => {
      const video = slide.querySelector('video');
      if (!video) return;

      if (slide.classList.contains('is-active')) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  };

  const showSlide = (index) => {
    if (!slides.length) return;
    currentIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === currentIndex;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
    });

    updateVideoState();
  };

  prevButton?.addEventListener('click', () => showSlide(currentIndex - 1));
  nextButton?.addEventListener('click', () => showSlide(currentIndex + 1));

  updateVideoState();
}

document.addEventListener('DOMContentLoaded', initPluginGallery);
