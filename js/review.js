'use strict';

(() => {
	const sliders = document.querySelectorAll('[data-review-slider]');

	sliders.forEach((slider) => {
		const slides = Array.from(slider.querySelectorAll('[data-review-slide]'));
		const prevButton = slider.querySelector('[data-review-prev]');
		const nextButton = slider.querySelector('[data-review-next]');
		const dotsRoot = slider.querySelector('[data-review-dots]');

		if (!slides.length) return;

		let currentIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
		let dots = [];

		const render = () => {
			slides.forEach((slide, index) => {
				slide.classList.toggle('is-active', index === currentIndex);
				slide.setAttribute('aria-hidden', index === currentIndex ? 'false' : 'true');
			});

			dots.forEach((dot, index) => {
				dot.classList.toggle('is-active', index === currentIndex);
				dot.setAttribute('aria-current', index === currentIndex ? 'true' : 'false');
			});
		};

		const goTo = (index) => {
			currentIndex = (index + slides.length) % slides.length;
			render();
		};

		if (dotsRoot && slides.length > 1) {
			dotsRoot.innerHTML = '';
			dots = slides.map((_, index) => {
				const dot = document.createElement('button');
				dot.className = 'review_dot';
				dot.type = 'button';
				dot.setAttribute('aria-label', `Показать отзыв ${index + 1}`);
				dot.addEventListener('click', () => goTo(index));
				dotsRoot.appendChild(dot);
				return dot;
			});
		}

		prevButton?.addEventListener('click', () => goTo(currentIndex - 1));
		nextButton?.addEventListener('click', () => goTo(currentIndex + 1));

		render();
	});
})();
