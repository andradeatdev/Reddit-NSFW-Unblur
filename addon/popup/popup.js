const toggle = document.getElementById("toggle");
const toggleNsfw = document.getElementById("toggle-nsfw");
const toggleSpoiler = document.getElementById("toggle-spoiler");
const togglePlaceholder = document.getElementById("toggle-placeholder");
const form = document.getElementById("selected-ops");

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
