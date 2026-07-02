'use strict';

window.emphaseasContentReady = fetch('data/content.json', { cache: 'no-cache' })
	.then((response) => {
		if (!response.ok) throw new Error('Content not available');
		return response.json();
	})
	.then((data) => {
		window.emphaseasContent = data;
		document.dispatchEvent(new CustomEvent('emphaseas:content', { detail: data }));
		return data;
	})
	.catch(() => null);
