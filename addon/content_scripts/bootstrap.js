/** biome-ignore-all lint/correctness/noInvalidUseBeforeDeclaration: this is a content script */
if (typeof browser === "undefined") {
    // biome-ignore lint/correctness/noInnerDeclarations: this is a extension
    var browser = chrome;
}

const PREFS = {
    enabled: true,
    nsfw: true,
    spoiler: false,
    placeholder: false,
};

function injectScript() {
    const script = document.createElement("script");
    script.src = browser.runtime.getURL("content_scripts/content.js");
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => {
        script.remove();
    };
}

async function init() {
    try {
        const stored = await browser.storage.local.get(PREFS);
        Object.assign(PREFS, stored);
    } catch (error) {
        console.error("Error getting prefs from storage", error);
    } finally {
        injectScript();
        window.postMessage({ type: "unblur-prefs", prefs: PREFS });
    }
}

init();
