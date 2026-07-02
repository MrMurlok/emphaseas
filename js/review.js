'use strict';

(() => {
	const escapeHtml = (value = '') => String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');

	const renderReviews = (slider, reviews) => {
		const track = slider.querySelector('[data-review-track]');
		if (!track || !Array.isArray(reviews) || !reviews.length) return;

		track.innerHTML = reviews.map((review, index) => `
			<article class="review_slide${index === 0 ? ' is-active' : ''}" data-review-slide>
				<p class="review_quote text_purple"><img src="assets/icons/quote.svg" alt="" decoding="async" /></p>
				<p class="review_text">${escapeHtml(review.text)}</p>
				<div class="review_stars" aria-label="5 из 5">★★★★★</div>
				<strong>${escapeHtml(review.author)}</strong>
				<span>${escapeHtml(review.label)}</span>
			</article>
		`).join('');
	};

	const initSlider = (slider) => {
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
	};

	const init = (reviews = null) => {
		const sliders = document.querySelectorAll('[data-review-slider]');
		sliders.forEach((slider) => {
			if (reviews) renderReviews(slider, reviews);
			initSlider(slider);
		});
	};

	if (window.emphaseasContentReady) {
		window.emphaseasContentReady.then((data) => init(data?.reviews || null));
	} else {
		init();
	}
})();
