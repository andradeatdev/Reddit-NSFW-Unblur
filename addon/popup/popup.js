const toggle = document.querySelector("#toggle");
const toggleNsfw = document.querySelector("#toggle-nsfw");
const toggleSpoiler = document.querySelector("#toggle-spoiler");
const togglePlaceholder = document.querySelector("#toggle-placeholder");
const form = document.querySelector("#selected-ops");

async function loadStoredSettings() {
	const PREFS = {
		enabled: true,
		nsfw: true,
		spoiler: false,
		placeholder: false,
	};
	const stored = await browser.storage.local.get(PREFS);
	Object.assign(PREFS, stored);

	toggle.checked = PREFS.enabled;
	toggleNsfw.checked = PREFS.nsfw;
	toggleSpoiler.checked = PREFS.spoiler;
	togglePlaceholder.checked = PREFS.placeholder;
}

function saveStatus() {
	browser.storage.local.set({ enabled: toggle.checked });
}

function saveSwitches() {
	browser.storage.local.set({
		enabled: toggle.checked,
		nsfw: toggleNsfw.checked,
		spoiler: toggleSpoiler.checked,
		placeholder: togglePlaceholder.checked,
	});
}

toggle.addEventListener("click", saveStatus);
form.addEventListener("change", saveSwitches);

loadStoredSettings();
