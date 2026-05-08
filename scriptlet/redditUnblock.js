/// reddit-unblock.js
/// alias rub.js
//  reddit.com##+js(rub [, nsfw, spoiler])
//  @description Reddit Unblock - Removes NSFW and Spoiler content blocks on Reddit.
function redditUnblock(...mode) {
	if (window.location.hostname !== "www.reddit.com") return;
	const CONFIG = {
		ON_ELEMENTS: {
			"#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop": (el) =>
				el.remove(),
			"#nsfw-qr-dialog": (el) => el.remove(),
			"body > div[style*='backdrop-filter']": (el) => el.remove(),
			"xpromo-nsfw-blocking-container": (el) => patchShadowForElement(el),
		},
	};
	const mutationsHandler = (mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "attributes") {
				onElement(mutation.target);
				continue;
			}
			for (const node of mutation.addedNodes) {
				if (node.nodeType !== Node.ELEMENT_NODE) continue;
				onElement(node);
				node
					.querySelectorAll(Object.keys(CONFIG.ON_ELEMENTS).join(","))
					.forEach(onElement);
			}
		}
	};
	const onElement = (node) => {
		for (const key in CONFIG.ON_ELEMENTS) {
			if (!node.matches(key)) continue;
			CONFIG.ON_ELEMENTS[key](node);
		}
	};
	const patchShadowForElement = (el) => {
		if (!el || !(el instanceof Element)) return;
		const originalAttachShadow = el.attachShadow;
		el.attachShadow = function (init) {
			const shadow = originalAttachShadow.call(this, init);
			shadow.innerHTML +=
				"<style>.prompt { display: none !important; } </style>";
			return shadow;
		};
	};
	if (mode.includes("nsfw")) {
		CONFIG.ON_ELEMENTS[
			"shreddit-blurred-container[reason='nsfw']:not([is-richtext-content])"
		] = (el) => (el.blurred = false);
		CONFIG.ON_ELEMENTS[
			"shreddit-blurred-container[reason='nsfw'][is-richtext-content]"
		] = (el) =>
			el.replaceWith(el.querySelector("[property='schema:articleBody']"));
	}
	if (mode.includes("spoiler")) {
		CONFIG.ON_ELEMENTS[
			"shreddit-blurred-container[reason='spoiler']:not([is-richtext-content])"
		] = (el) => (el.blurred = false);
		CONFIG.ON_ELEMENTS[
			"shreddit-blurred-container[reason='spoiler'][is-richtext-content]"
		] = (el) =>
			el.replaceWith(el.querySelector("[property='schema:articleBody']"));
	}
	const observer = new MutationObserver(mutationsHandler);
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
	});
	for (const key in CONFIG.ON_ELEMENTS) {
		const el = document.querySelector(key);
		if (el) CONFIG.ON_ELEMENTS[key](el);
	}
}
