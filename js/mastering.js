'use strict';

(() => {
	const players = Array.from(document.querySelectorAll('[data-mastering-player]'));
	if (!players.length) return;

	const playIcon = 'assets/icons/play_1.svg';
	const pauseIcon = 'assets/icons/pause.svg';
	let activePlayer = null;
	let audioContext = null;

	const formatTime = (seconds) => {
		if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	};

	const getContext = () => {
		if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
		return audioContext;
	};

	class ComparePlayer {
		constructor(root) {
			this.root = root;
			this.afterAudio = new Audio();
			this.beforeAudio = new Audio();
			this.audios = [this.afterAudio, this.beforeAudio];
			this.audioSourcesLoaded = false;
			this.playButton = root.querySelector('[data-play]');
			this.playButtonIcon = root.querySelector('[data-play-icon]');
			this.mixSlider = root.querySelector('[data-mix-slider]');
			this.seek = root.querySelector('[data-seek]');
			this.current = root.querySelector('[data-current]');
			this.remaining = root.querySelector('[data-remaining]');
			this.canvas = root.querySelector('[data-equalizer]');
			this.ctx = this.canvas.getContext('2d');
			this.isPlaying = false;
			this.isSeeking = false;
			this.ready = false;
			this.animationFrame = null;

			this.audios.forEach((audio) => {
				audio.preload = 'none';
				audio.addEventListener('loadedmetadata', () => this.updateTime());
				audio.addEventListener('timeupdate', () => this.updateTime());
				audio.addEventListener('ended', () => this.stop());
			});

			this.playButton.addEventListener('click', () => this.toggle());
			this.mixSlider.addEventListener('input', () => this.updateMix());
			this.seek.addEventListener('input', () => this.previewSeek());
			this.seek.addEventListener('change', () => this.commitSeek());
			this.seek.addEventListener('pointerdown', () => (this.isSeeking = true));
			this.seek.addEventListener('pointerup', () => this.commitSeek());

			this.updateMix();
			this.drawIdleEqualizer();
		}

		loadSources() {
			if (this.audioSourcesLoaded) return;
			this.afterAudio.src = this.root.dataset.afterSrc || 'assets/audio/audio_1.mp3';
			this.beforeAudio.src = this.root.dataset.beforeSrc || 'assets/audio/audio_2.mp3';
			this.audioSourcesLoaded = true;
		}

		setupAudio() {
			if (this.ready) return;
			this.loadSources();
			const context = getContext();
			this.afterSource = context.createMediaElementSource(this.afterAudio);
			this.beforeSource = context.createMediaElementSource(this.beforeAudio);
			this.afterGain = context.createGain();
			this.beforeGain = context.createGain();
			this.analyser = context.createAnalyser();
			this.analyser.fftSize = 256;
			this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

			this.afterSource.connect(this.afterGain);
			this.beforeSource.connect(this.beforeGain);
			this.afterGain.connect(this.analyser);
			this.beforeGain.connect(this.analyser);
			this.analyser.connect(context.destination);
			this.ready = true;
			this.updateMix();
		}

		async toggle() {
			if (this.isPlaying) {
				this.pause();
				return;
			}
			await this.play();
		}

		async play() {
			if (activePlayer && activePlayer !== this) activePlayer.pause();
			activePlayer = this;
			this.loadSources();
			this.setupAudio();
			await getContext().resume();
			this.syncBeforeToAfter();
			await Promise.all(this.audios.map(async (audio) => {
				try {
					await audio.play();
				} catch (error) {
					console.warn('Audio play failed:', error);
				}
			}));
			this.isPlaying = this.audios.some((audio) => !audio.paused);
			this.playButtonIcon.src = pauseIcon;
			this.drawLiveEqualizer();
		}

		pause() {
			this.audios.forEach((audio) => audio.pause());
			this.isPlaying = false;
			this.playButtonIcon.src = playIcon;
			this.drawIdleEqualizer();
		}

		stop() {
			this.pause();
			this.audios.forEach((audio) => (audio.currentTime = 0));
			this.seek.value = 0;
			this.updateTime();
		}

		syncBeforeToAfter() {
			const time = this.afterAudio.currentTime || this.beforeAudio.currentTime || 0;
			this.audios.forEach((audio) => {
				if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(time, audio.duration - 0.05);
			});
		}

		updateMix() {
			// 0% = left position = Audio 1 / After, 100% = right position = Audio 2 / Before.
			// Both tracks always play together; the slider only crossfades their volumes.
			const mix = Number(this.mixSlider.value) / 100;
			const afterVolume = Math.max(0, Math.min(1, 1 - mix));
			const beforeVolume = Math.max(0, Math.min(1, mix));
			this.mixSlider.style.setProperty('--mix', `${this.mixSlider.value}%`);

			// Дублируем громкость и на HTMLAudioElement, и на GainNode.
			// Так переключение After/Before стабильно работает и локально, и на хостинге.
			this.afterAudio.volume = afterVolume;
			this.beforeAudio.volume = beforeVolume;

			if (this.afterGain && this.beforeGain) {
				const contextTime = getContext().currentTime;
				this.afterGain.gain.setTargetAtTime(afterVolume, contextTime, 0.015);
				this.beforeGain.gain.setTargetAtTime(beforeVolume, contextTime, 0.015);
			}
		}

		getDuration() {
			const durations = this.audios.map((audio) => audio.duration).filter(Number.isFinite);
			return durations.length ? Math.min(...durations) : 0;
		}

		updateTime() {
			if (this.isSeeking) return;
			const duration = this.getDuration();
			const time = this.afterAudio.currentTime || this.beforeAudio.currentTime || 0;
			const progress = duration ? Math.min(time / duration, 1) : 0;
			this.seek.value = Math.round(progress * 1000);
			this.seek.style.setProperty('--progress', `${progress * 100}%`);
			this.current.textContent = formatTime(time);
			this.remaining.textContent = `-${formatTime(duration - time)}`;
		}

		previewSeek() {
			this.isSeeking = true;
			const duration = this.getDuration();
			const time = duration * (Number(this.seek.value) / 1000);
			this.seek.style.setProperty('--progress', `${Number(this.seek.value) / 10}%`);
			this.current.textContent = formatTime(time);
			this.remaining.textContent = `-${formatTime(duration - time)}`;
		}

		commitSeek() {
			const duration = this.getDuration();
			const time = duration * (Number(this.seek.value) / 1000);
			this.audios.forEach((audio) => {
				if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(time, audio.duration - 0.05);
			});
			this.isSeeking = false;
			this.updateTime();
		}

		drawBars(values) {
			const canvas = this.canvas;
			const width = canvas.width;
			const height = canvas.height;
			const bars = 54;
			const gap = 8;
			const barWidth = Math.max(4, (width - gap * (bars - 1)) / bars);
			this.ctx.clearRect(0, 0, width, height);
			this.ctx.fillStyle = '#8d3cff';
			for (let i = 0; i < bars; i++) {
				const value = values ? values[Math.floor((i / bars) * values.length)] / 255 : 0.35 + Math.abs(Math.sin(i * 0.72)) * 0.45;
				const barHeight = Math.max(18, value * (height - 10));
				const x = i * (barWidth + gap);
				const y = height - barHeight;
				this.roundRect(x, y, barWidth, barHeight, barWidth / 2);
			}
		}

		roundRect(x, y, width, height, radius) {
			this.ctx.beginPath();
			this.ctx.roundRect(x, y, width, height, radius);
			this.ctx.fill();
		}

		drawIdleEqualizer() {
			cancelAnimationFrame(this.animationFrame);
			this.drawBars(null);
		}

		drawLiveEqualizer() {
			if (!this.isPlaying || !this.analyser) return;
			this.analyser.getByteFrequencyData(this.frequencyData);
			this.drawBars(this.frequencyData);
			this.animationFrame = requestAnimationFrame(() => this.drawLiveEqualizer());
		}
	}

	players.map((player) => new ComparePlayer(player));
})();
