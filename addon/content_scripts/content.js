const PREFS = {
	enabled: true,
	nsfw: true,
	spoiler: false,
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

function removeOverlays() {
	const selectors = [
		'#blocking-modal',
		'#nsfw-qr-dialog',
		'#configured-xpromo-blocking_xpromo_nsfw_blocking',
		'#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop',
		'#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms',
		"body > [style*='backdrop-filter']",
	];
	for (const el of $$(selectors.join(', '))) el.remove();

	const embeds = $$('shreddit-embed');
	for (const embed of embeds) {
		if (!embed.mounted && typeof embed.setupEmbed === 'function')
			embed.setupEmbed();
	}

	const promo = $('xpromo-nsfw-blocking-container');
	const prompt = promo?.shadowRoot?.querySelector('.prompt');
	prompt?.remove();

	document.body.classList.remove('rpl-scroll-lock');
}

function removeBlur() {
	const posts = $$('shreddit-blurred-container[reason][blurred]');
	for (const post of posts) {
		const reason = post.getAttribute('reason');
		post.blurred = !PREFS[reason];
	}

	const highlights = $$(
		'community-highlight-card[blurred]:is([nsfw], [spoiler])',
	);
	for (const hl of highlights) {
		if (
			(hl.hasAttribute('nsfw') && PREFS.nsfw) ||
			(hl.hasAttribute('spoiler') && PREFS.spoiler)
		) {
			hl.removeAttribute('blurred');
		}
	}

	const thumbs = $$(
		"reddit-pdp-right-rail-post [data-testid='post-thumbnail']:has([icon-name='nsfw-fill'], [icon-name='caution-fill'])",
	);
	for (const t of thumbs) {
		const svg = $('[icon-name]', t);
		const type = svg?.getAttribute('icon-name');
		if (
			(type === 'nsfw-fill' && PREFS.nsfw) ||
			(type === 'caution-fill' && PREFS.spoiler)
		) {
			$('img', t)?.style.removeProperty('filter');
			$('.thumbnail-shadow', t)?.remove();
		}
	}

	const searchs = $$(
		`search-telemetry-tracker:is([data-faceplate-tracking-context*='"nsfw":true'], [data-faceplate-tracking-context*='"spoiler":true']):has(.thumbnail-blur)`,
	);
	for (const s of searchs) {
		const ctx = s.getAttribute('data-faceplate-tracking-context');
		const isNsfw = ctx.includes('"nsfw":true');
		const isSpoiler = ctx.includes('"spoiler":true');
		if ((isNsfw && PREFS.nsfw) || (isSpoiler && PREFS.spoiler)) {
			$('.thumbnail-blur', s)?.classList.remove('thumbnail-blur');
		}
	}

	const spoilers = $$('shreddit-spoiler:not([data-revealed])');
	for (const s of spoilers) {
		s.dataset.revealed = '';
		s.revealed = true;
	}
}

async function enableNSFWSearch() {
	const over18 = await cookieStore.get('over18');
	if (over18?.value === '1') return;
	await cookieStore.set({
		name: 'over18',
		value: '1',
		path: '/',
		domain: 'reddit.com',
	});
	if (new URL(window.location.href).pathname === '/search/')
		window.location.reload();
}

function main() {
	enableNSFWSearch();

	const task = () => {
		removeOverlays();
		if (PREFS.enabled) removeBlur();
	};

	new MutationObserver(task).observe(document.body, {
		childList: true,
		subtree: true,
		attributeFilter: ['blurred', 'reason'],
	});
}

window.addEventListener('message', (event) => {
	if (event.source === window && event.data.type === 'unblur-prefs') {
		Object.assign(PREFS, event.data.prefs);
		main();
	}
});

const stl = `
	body[style*='pointer-events'] { pointer-events: revert !important; }
	body[style*='overflow'] { overflow: revert !important; }
	#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop,
	#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms,
	#nsfw-qr-dialog,
	body > [style*="backdrop-filter"] { display: none !important; }
`;
const style = document.createElement('style');
style.textContent = stl;
document.documentElement.appendChild(style);
