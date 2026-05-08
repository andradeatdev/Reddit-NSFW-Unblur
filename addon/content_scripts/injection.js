const PREFS = {
	enabled: true,
	nsfw: true,
	spoiler: false,
};

const mutationsHandler = () => {
	removeModal();
	removeQRNSFW();
	unblurPromo();

	if (PREFS.enabled && (PREFS.nsfw || PREFS.spoiler)) {
		unblurCards();
		unblurPosts();
	}
	if (PREFS.enabled && PREFS.spoiler) unblurTextSpoiler();
};

const observer = new MutationObserver(mutationsHandler);

function init(prefs) {
	Object.assign(PREFS, prefs);
	console.log("Prefs", PREFS, "Stored", prefs);

	observer.observe(document.documentElement || document, {
		childList: true,
		subtree: true,
		attributeFilter: ["blurred", "reason"],
	});
}

window.addEventListener("message", (event) => {
	if (event.source === window && event.data.type === "unblur-prefs") {
		init(event.data.prefs);
	}
});

function removeModal() {
	const modal = document.querySelector(
		"#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop",
	);
	if (modal) modal.remove();

	const blur = document.querySelector("body > [style*='backdrop-filter']");
	if (blur) blur.remove();

	if (
		document.body &&
		(document.body.style.pointerEvents || document.body.style.overflow)
	) {
		document.body.style.removeProperty("overflow");
		document.body.style.removeProperty("pointer-events");
	}
}

function removeQRNSFW() {
	const qr = document.querySelector("#nsfw-qr-dialog");
	if (qr) qr.remove();
}

function unblurCards() {
	const highlights = document.querySelectorAll(
		"community-highlight-card[blurred]",
	);
	for (const highlight of highlights) {
		if (highlight.hasAttribute("nsfw") && PREFS.nsfw)
			highlight.removeAttribute("blurred");
		if (highlight.hasAttribute("spoiler") && PREFS.spoiler)
			highlight.removeAttribute("blurred");
	}

	const rights = document.querySelectorAll(
		"reddit-pdp-right-rail-post [data-testid='post-thumbnail'] [icon-name]",
	);
	for (const right of rights) {
		const type = right.getAttribute("icon-name");
		const scrim = right.closest(".thumbnail-shadow");
		const thumb = right.closest("[data-testid='post-thumbnail']");
		const blur = thumb.querySelector("img[style*='blur']");

		if (type === "nsfw-fill" && PREFS.nsfw) {
			right.style.removeProperty("filter");
			blur.style.removeProperty("filter");
			scrim.remove();
		}
		if (type === "caution-fill" && PREFS.spoiler) {
			right.style.removeProperty("filter");
			blur.style.removeProperty("filter");
			scrim.remove();
		}
	}

	const medias = document.querySelectorAll(
		"search-telemetry-tracker shreddit-blurred-container",
	);
	for (const media of medias) {
		const nextElementIsSpoiler = media.nextElementSibling;

		if (!nextElementIsSpoiler && PREFS.nsfw) media.blurred = false;
		if (nextElementIsSpoiler && PREFS.spoiler) {
			media.blurred = false;
			nextElementIsSpoiler.remove();
		}
	}

	const searchThumbs = document.querySelectorAll(
		`search-telemetry-tracker[data-faceplate-tracking-context*='"type":"thumbnail"']:has(.thumbnail-blur)`,
	);
	for (const searchThumb of searchThumbs) {
		const data = searchThumb.getAttribute("data-faceplate-tracking-context");
		const blur = searchThumb.querySelector(".thumbnail-blur");

		if (data.includes('"nsfw":true') && PREFS.nsfw)
			blur.classList.remove("thumbnail-blur");
		if (data.includes('"spoiler":true') && PREFS.spoiler)
			blur.classList.remove("thumbnail-blur");
	}
}

function unblurPosts() {
	const posts = document.querySelectorAll("shreddit-blurred-container[reason]");
	for (const post of posts) {
		if (post.blurred === false) continue;

		const reason = post.getAttribute("reason");
		post.blurred = !PREFS[reason];
	}
}

function unblurTextSpoiler() {
	const spoilers = document.querySelectorAll("shreddit-spoiler");
	for (const spoiler of spoilers) {
		if (spoiler.revealed === true) continue;
		spoiler.revealed = true;
	}
}

function unblurPromo() {
	const promo = document.querySelector("xpromo-nsfw-blocking-container");
	if (!promo) return;

	const prompt = promo.shadowRoot.querySelector(".prompt");
	if (prompt) prompt.remove();

	const viewInApp = document.querySelector(
		"xpromo-nsfw-blocking-container .viewInApp",
	);
	if (viewInApp) viewInApp.remove();
}

async function enableNSFWSearch() {
	const over18 = await cookieStore.get("over18");
	if (over18?.value === "1") return;

	cookieStore.set({
		name: "over18",
		value: "1",
		path: "/",
		domain: "reddit.com",
	});

	const url = new URL(window.location.href);
	if (url.pathname === "/search/") window.location.reload();
}

const stl = `
    /* CSS Modal Fallback */
    body[style*='pointer-events'] {
        pointer-events: revert !important;
    }
    body[style*='overflow'] {
        overflow: revert !important;
    }
    #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop,
    #nsfw-qr-dialog,
    body > [style*="backdrop-filter"] {
        display: none !important;
    }
`;

document.documentElement.insertAdjacentHTML(
	"beforeend",
	`<style>${stl}</style>`,
);
