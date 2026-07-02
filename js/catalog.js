'use strict';

(() => {
	const catalog = document.querySelector('[data-catalog]');
	const track = document.querySelector('[data-catalog-track]');
	const player = document.querySelector('[data-catalog-player]');
	const body = document.body;

	if (!catalog || !track || !player) return;

	const releases = [
		{
			title: 'Futuristic',
			artist: 'Monotype',
			cover: 'assets/img/album_1.jpg',
			audio: 'assets/audio/Monotype - Futuristic.mp3',
		},
		{
			title: 'Percwerk',
			artist: 'EastColors',
			cover: 'assets/img/album_2.jpg',
			audio: 'assets/audio/EastColors - Percwerk.mp3',
		},
		{
			title: 'Tendency',
			artist: 'EastColors',
			cover: 'assets/img/album_3.jpg',
			audio: 'assets/audio/EastColors - Tendency.mp3',
		},
		{
			title: 'Release 04',
			artist: 'Emphaseas Music',
			cover: 'assets/img/album_4.jpg',
			audio: 'assets/audio/Monotype - Futuristic.mp3',
		},
		{
			title: 'Release 05',
			artist: 'Emphaseas Music',
			cover: 'assets/img/album_5.jpg',
			audio: 'assets/audio/EastColors - Percwerk.mp3',
		},
		{
			title: 'Release 06',
			artist: 'Emphaseas Music',
			cover: 'assets/img/album_6.jpg',
			audio: 'assets/audio/EastColors - Tendency.mp3',
		},
		{
			title: 'Release 07',
			artist: 'Emphaseas Music',
			cover: 'assets/img/album_1.jpg',
			audio: 'assets/audio/Monotype - Futuristic.mp3',
		},
		{
			title: 'Release 08',
			artist: 'Emphaseas Music',
			cover: 'assets/img/album_2.jpg',
			audio: 'assets/audio/EastColors - Percwerk.mp3',
		},
	];

	const audio = new Audio();
	audio.preload = 'metadata';

	let activeIndex = 0;
	let columnIndex = 0;
	let userSeeking = false;

	const prevBtn = catalog.querySelector('[data-catalog-prev]');
	const nextBtn = catalog.querySelector('[data-catalog-next]');
	const coverEl = player.querySelector('[data-catalog-player-cover]');
	const titleEl = player.querySelector('[data-catalog-player-title]');
	const artistEl = player.querySelector('[data-catalog-player-artist]');
	const playerPrevBtn = player.querySelector('[data-catalog-player-prev]');
	const playerNextBtn = player.querySelector('[data-catalog-player-next]');
	const toggleBtn = player.querySelector('[data-catalog-player-toggle]');
	const currentTimeEl = player.querySelector('[data-catalog-player-current]');
	const leftTimeEl = player.querySelector('[data-catalog-player-left]');
	const seekEl = player.querySelector('[data-catalog-player-seek]');

	const closeBtn = player.querySelector('[data-catalog-player-close]');
	const playIcon = player.querySelector('[data-catalog-player-play-icon]');
	const updatePlayerOffset = () => {
		const height = player.classList.contains('is-visible') ? player.offsetHeight : 0;
		body.style.setProperty('--catalog-player-height', `${height}px`);
	};

	const formatTime = (seconds) => {
		if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
		return `${mins}:${secs}`;
	};

	const getVisibleColumns = () => {
		if (window.matchMedia('(max-width: 720px)').matches) return 1;
		if (window.matchMedia('(max-width: 1100px)').matches) return 2;
		return 3;
	};

	const getTotalColumns = () => Math.ceil(releases.length / 2);
	const getMaxColumnIndex = () => Math.max(0, getTotalColumns() - getVisibleColumns());

	const updateCarousel = () => {
		columnIndex = Math.min(columnIndex, getMaxColumnIndex());
		const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
		const firstCard = track.querySelector('.catalog_release');
		const columnWidth = firstCard ? firstCard.getBoundingClientRect().width : 0;
		track.style.transform = `translateX(-${columnIndex * (columnWidth + gap)}px)`;
		prevBtn.disabled = columnIndex === 0;
		nextBtn.disabled = columnIndex >= getMaxColumnIndex();
	};

	const updateActiveCard = () => {
		track.querySelectorAll('.catalog_release').forEach((card, index) => {
			card.classList.toggle('is-active', index === activeIndex);
		});
	};

	const updatePlayerInfo = () => {
		const release = releases[activeIndex];
		coverEl.src = release.cover;
		coverEl.alt = release.title;
		titleEl.textContent = release.title;
		artistEl.textContent = release.artist;
		updateActiveCard();
	};

	const setPlayingState = (isPlaying) => {
		toggleBtn.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Воспроизвести');
		playIcon.src = isPlaying ? 'assets/icons/pause.svg' : 'assets/icons/play_2.svg';
	};

	const playRelease = async (index) => {
		activeIndex = (index + releases.length) % releases.length;
		const release = releases[activeIndex];

		player.classList.add('is-visible');
		player.setAttribute('aria-hidden', 'false');
		body.classList.add('catalog-player-visible');
		updatePlayerOffset();
		updatePlayerInfo();

		if (audio.src !== new URL(release.audio, window.location.href).href) {
			audio.src = release.audio;
			audio.load();
			seekEl.value = 0;
			currentTimeEl.textContent = '0:00';
			leftTimeEl.textContent = '-0:00';
		}

		try {
			await audio.play();
			setPlayingState(true);
		} catch (error) {
			setPlayingState(false);
		}
	};

	releases.forEach((release, index) => {
		const card = document.createElement('button');
		card.className = 'catalog_release';
		card.type = 'button';
		card.innerHTML = `
			<img class="catalog_release-cover" src="${release.cover}" alt="${release.title}" loading="lazy" decoding="async" />
			<span class="catalog_release-title">${release.title}</span>
			<span class="catalog_release-artist">${release.artist}</span>
		`;
		card.addEventListener('click', () => playRelease(index));
		track.append(card);
	});

	prevBtn.addEventListener('click', () => {
		columnIndex = Math.max(0, columnIndex - 1);
		updateCarousel();
	});

	nextBtn.addEventListener('click', () => {
		columnIndex = Math.min(getMaxColumnIndex(), columnIndex + 1);
		updateCarousel();
	});

	playerPrevBtn.addEventListener('click', () => playRelease(activeIndex - 1));
	playerNextBtn.addEventListener('click', () => playRelease(activeIndex + 1));

	toggleBtn.addEventListener('click', () => {
		if (!audio.src) {
			playRelease(activeIndex);
			return;
		}

		if (audio.paused) {
			audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
		} else {
			audio.pause();
			setPlayingState(false);
		}
	});

	audio.addEventListener('timeupdate', () => {
		if (!userSeeking && Number.isFinite(audio.duration) && audio.duration > 0) {
			seekEl.value = String((audio.currentTime / audio.duration) * 1000);
		}
		currentTimeEl.textContent = formatTime(audio.currentTime);
		leftTimeEl.textContent = `-${formatTime(audio.duration - audio.currentTime)}`;
	});

	audio.addEventListener('loadedmetadata', () => {
		currentTimeEl.textContent = formatTime(audio.currentTime);
		leftTimeEl.textContent = `-${formatTime(audio.duration - audio.currentTime)}`;
	});

	audio.addEventListener('ended', () => playRelease(activeIndex + 1));
	audio.addEventListener('pause', () => setPlayingState(false));
	audio.addEventListener('play', () => setPlayingState(true));

	seekEl.addEventListener('input', () => {
		userSeeking = true;
		if (Number.isFinite(audio.duration) && audio.duration > 0) {
			audio.currentTime = (Number(seekEl.value) / 1000) * audio.duration;
		}
	});

	seekEl.addEventListener('change', () => {
		userSeeking = false;
	});

	closeBtn.addEventListener('click', () => {
		audio.pause();
		player.classList.remove('is-visible');
		player.setAttribute('aria-hidden', 'true');
		body.classList.remove('catalog-player-visible');
		body.style.removeProperty('--catalog-player-height');
	});

	window.addEventListener('resize', updatePlayerOffset);

	updatePlayerInfo();
	updateCarousel();
})();
