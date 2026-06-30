'use strict';

function initPluginGallery() {
	const gallery = document.querySelector('[data-plugin-gallery]');
	if (!gallery) return;

	const slides = Array.from(gallery.querySelectorAll('[data-plugin-slide]'));
	const prevButton = gallery.querySelector('[data-plugin-prev]');
	const nextButton = gallery.querySelector('[data-plugin-next]');

	let currentIndex = Math.max(
		0,
		slides.findIndex((slide) => slide.classList.contains('is-active'))
	);

	const setGalleryRatio = () => {
		const activeSlide = slides[currentIndex];
		const media = activeSlide?.querySelector('.plugin_gallery-media');

		if (!media) return;

		let width = 0;
		let height = 0;

		if (media.tagName === 'IMG') {
			width = media.naturalWidth;
			height = media.naturalHeight;
		}

		if (media.tagName === 'VIDEO') {
			width = media.videoWidth;
			height = media.videoHeight;
		}

		if (width && height) {
			gallery.style.setProperty('--plugin-gallery-ratio', `${width} / ${height}`);
		}
	};

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

		setGalleryRatio();
		updateVideoState();
	};

	slides.forEach((slide) => {
		const media = slide.querySelector('.plugin_gallery-media');
		if (!media) return;

		if (media.tagName === 'IMG') {
			if (media.complete) {
				setGalleryRatio();
			} else {
				media.addEventListener('load', setGalleryRatio);
			}
		}

		if (media.tagName === 'VIDEO') {
			media.addEventListener('loadedmetadata', setGalleryRatio);
		}
	});

	prevButton?.addEventListener('click', () => showSlide(currentIndex - 1));
	nextButton?.addEventListener('click', () => showSlide(currentIndex + 1));

	setGalleryRatio();
	updateVideoState();
}

document.addEventListener('DOMContentLoaded', initPluginGallery);