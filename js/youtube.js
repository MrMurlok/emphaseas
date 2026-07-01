'use strict';

(() => {
	const section     = document.querySelector('[data-youtube-section]');
	if (!section) return;

	const linkEl      = section.querySelector('[data-youtube-link]');
	const thumbEl     = section.querySelector('[data-youtube-thumb]');
	const statusEl    = section.querySelector('[data-youtube-status]');
	const lightbox    = document.querySelector('[data-youtube-lightbox]');
	const iframe      = lightbox?.querySelector('[data-youtube-iframe]');

	const CHANNEL_URL = 'https://www.youtube.com/@emphaseas';

	// Определяем путь к API относительно корня сайта
	// Работает и на Fornex, и в подпапке
	function getApiUrl() {
		const scripts = document.querySelectorAll('script[src]');
		// Ищем папку js/ — от неё строим путь к api/
		for (const s of scripts) {
			if (s.src.includes('/js/youtube.js')) {
				return s.src.replace('/js/youtube.js', '/api/youtube_latest.php');
			}
		}
		// Fallback: относительный путь от index.html
		return 'api/youtube_latest.php';
	}

	const setStatus = (text) => {
		if (statusEl) statusEl.textContent = text;
	};

	const setVideo = (video) => {
		const url = video.url || `https://www.youtube.com/watch?v=${video.id}`;

		if (linkEl) {
			linkEl.href = url;
			linkEl.dataset.videoId = video.id;
		}

		if (thumbEl && video.thumbnail) {
			thumbEl.src = video.thumbnail;
			thumbEl.alt = video.title || 'Последнее видео Emphaseas';
		}

		setStatus('');
	};

	const setFallback = (msg = '') => {
		if (linkEl) {
			linkEl.href = CHANNEL_URL;
			delete linkEl.dataset.videoId;
		}
		setStatus('YouTube');
	};

	// ── Лайтбокс ──────────────────────────────────────────
	const openLightbox = (videoId) => {
		if (!lightbox || !iframe || !videoId) return;
		iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
		lightbox.classList.add('is-open');
		lightbox.setAttribute('aria-hidden', 'false');
		document.body.classList.add('youtube-modal-open');
	};

	const closeLightbox = () => {
		if (!lightbox || !iframe) return;
		lightbox.classList.remove('is-open');
		lightbox.setAttribute('aria-hidden', 'true');
		document.body.classList.remove('youtube-modal-open');
		iframe.src = '';
	};

	lightbox?.querySelectorAll('[data-youtube-lightbox-close], .youtube_lightbox-overlay')
		.forEach(el => el.addEventListener('click', closeLightbox));

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && lightbox?.classList.contains('is-open')) closeLightbox();
	});

	if (linkEl) {
		linkEl.addEventListener('click', (e) => {
			const videoId = linkEl.dataset.videoId;
			if (!videoId) return; // нет id — переходим по href как обычная ссылка
			e.preventDefault();
			openLightbox(videoId);
		});
	}

	// ── Загрузка видео ────────────────────────────────────
	const loadVideo = async () => {
		setStatus('Загружаем последнее видео...');

		const apiUrl = getApiUrl();

		let data;
		try {
			const res = await fetch(apiUrl + '?t=' + Date.now(), {
				method: 'GET',
				cache:  'no-store',
				headers: { 'Accept': 'application/json' },
			});

			const text = await res.text();

			// Проверяем что ответ — JSON, а не HTML-ошибка PHP/Apache
			if (!text.trimStart().startsWith('{')) {
				console.error('[YouTube] Не JSON ответ:', text.slice(0, 200));
				setFallback('сервер вернул не JSON — проверьте PHP на хостинге');
				return;
			}

			data = JSON.parse(text);
		} catch (err) {
			console.error('[YouTube] Ошибка fetch:', err);
			setFallback('сетевая ошибка — ' + err.message);
			return;
		}

		if (!data?.ok || !data?.video?.id) {
			console.warn('[YouTube] API ответил с ошибкой:', data?.error);
			setFallback(data?.error || 'пустой ответ API');
			return;
		}

		setVideo(data.video);
	};

	loadVideo();
})();
