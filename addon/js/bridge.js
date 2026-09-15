const browser = globalThis.browser ?? globalThis.chrome;

const PREFS = {
    enabled: true,
    nsfw: true,
    spoiler: false,
    placeholder: false,
};

function sendEvent(prefs) {
    const event = new CustomEvent("rnu:event", { detail: JSON.stringify(prefs) });
    document.dispatchEvent(event);
}

async function main() {
    const stored = await browser.storage.local.get(PREFS);
    sendEvent({ ...PREFS, ...stored });

    browser.storage.onChanged.addListener(async changes => {
        for (const key in changes) PREFS[key] = changes[key].newValue;

        sendEvent({ ...PREFS });
    });
}
main();