// ==UserScript==
// @name            Reddit NSFW Unblur
// @namespace       https://greasyfork.org/users/821661
// @match           https://www.reddit.com/*
// @match           https://sh.reddit.com/*
// @match           https://www.reddittorjg6rue252oqsxryoxengawnmo46qy4kyii5wtqnwfj4ooad.onion/*
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// @run-at          document-body
// @noframes
// @version         5.0.2
// @icon            https://cdn.jsdelivr.net/gh/zenstorage/Reddit-NSFW-Unblur/assets/icon.png
// @author          hdyzen
// @description     Unblur nsfw in Shreddit
// @license         MIT
// @homepage        https://github.com/zenstorage/Reddit-NSFW-Unblur
// @downloadURL none
// ==/UserScript==

const PREFS = {
    enabled: GM_getValue("autoUnblur", true),
    nsfw: GM_getValue("unblurNSFW", true),
    spoiler: GM_getValue("unblurSpoiler", false),
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

function repeatedTask() {
    removeOverlays();

    if (document.readyState !== "loading") initToggles();

    if (PREFS.enabled) removeBlur();
}

function removeOverlays() {
    const overlays = $$(`
        #blocking-modal, 
        #nsfw-qr-dialog,
        #configured-xpromo-blocking_xpromo_nsfw_blocking,
        body > [style*='backdrop-filter'],
        #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop, 
        #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms
    `);
    for (const overlay of overlays) {
        overlay.remove();
    }

    const embeds = $$("shreddit-embed");
    for (const embed of embeds) {
        if (!embed.mounted && typeof embed.setupEmbed === "function") embed.setupEmbed();
    }

    const promo = $("xpromo-nsfw-blocking-container");
    const prompt = promo?.shadowRoot?.querySelector(".prompt");
    prompt?.remove();

    document.body.classList.remove("rpl-scroll-lock");
}

function removeBlur() {
    // /r/{subreddit}/ | /r/{subreddit}/comments/{id}/
    const posts = $$("shreddit-blurred-container[reason][blurred]");
    for (const post of posts) {
        const reason = post.getAttribute("reason");
        post.blurred = !PREFS[reason];
    }

    // /r/{subreddit}/
    const highlights = $$("community-highlight-card[blurred]:is([nsfw], [spoiler])");
    for (const highlight of highlights) {
        if ((highlight.hasAttribute("nsfw") && PREFS.nsfw) || (highlight.hasAttribute("spoiler") && PREFS.spoiler)) {
            highlight.removeAttribute("blurred");
        }
    }

    // /r/{subreddit}/comments/{id}/
    const thumbnails = $$("reddit-pdp-right-rail-post [data-testid='post-thumbnail']:has([icon-name='nsfw-fill'], [icon-name='caution-fill'])");
    for (const thumbnail of thumbnails) {
        const svg = thumbnail.querySelector("[icon-name]");
        const type = svg.getAttribute("icon-name");
        const isNsfw = type === "nsfw-fill";
        const isSpoiler = type === "caution-fill";

        if ((isNsfw && PREFS.nsfw) || (isSpoiler && PREFS.spoiler)) {
            const img = thumbnail.querySelector("img");
            img?.style.removeProperty("filter");
            const shadow = thumbnail.querySelector(".thumbnail-shadow");
            shadow?.remove();
        }
    }

    // /search/ | /r/{subreddit}/search/
    const searchs = $$(`search-telemetry-tracker:is([data-faceplate-tracking-context*='"nsfw":true'], [data-faceplate-tracking-context*='"spoiler":true']):has(.thumbnail-blur)`);
    for (const search of searchs) {
        const isNsfw = search.getAttribute("data-faceplate-tracking-context").includes('"nsfw":true');
        const isSpoiler = search.getAttribute("data-faceplate-tracking-context").includes('"spoiler":true');

        if ((isNsfw && PREFS.nsfw) || (isSpoiler && PREFS.spoiler)) {
            const blur = search.querySelector(".thumbnail-blur");
            if (blur) blur.classList.remove("thumbnail-blur");
        }
    }

    // /r/{subreddit}/ | /r/{subreddit}/comments/{id}/
    const spoilers = $$("shreddit-spoiler:not([data-revealed])");
    for (const spoiler of spoilers) {
        spoiler.dataset.revealed = "";
        spoiler.revealed = true;
    }
}

async function enableNSFWSearch() {
    const over18 = await cookieStore.get("over18");
    if (over18?.value === "1") return;

    await cookieStore.set({
        name: "over18",
        value: "1",
        path: "/",
        domain: "reddit.com",
    });

    const url = new URL(window.location.href);
    if (url.pathname === "/search/") window.location.reload();
}

function createSecondaryToggle(id, labelText, initialState, onChangeHandler) {
    const label = document.createElement("label");
    label.setAttribute("for", id);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = id;
    input.id = id;
    input.checked = initialState;
    input.addEventListener("change", (e) => onChangeHandler(e.target.checked));

    const slider = document.createElement("span");
    slider.className = "slider";

    const labelSpan = document.createElement("span");
    labelSpan.className = "slider-label";
    labelSpan.textContent = labelText;

    label.appendChild(input);
    label.appendChild(slider);
    label.appendChild(labelSpan);

    return label;
}

function updateStatusIndicator(el, isChecked) {
    el.textContent = isChecked ? "ON" : "OFF";
    el.className = isChecked ? "on" : "off";
}

function onMainToggleChange(el, isChecked) {
    GM_setValue("autoUnblur", isChecked);
    PREFS.enabled = isChecked;
    updateStatusIndicator(el, isChecked);
}

function onSecondaryToggleChange(key, isChecked) {
    GM_setValue(key, isChecked);
    PREFS[key === "unblurNSFW" ? "nsfw" : "spoiler"] = isChecked;
}

function initToggles() {
    const wrapperExists = document.querySelector("#unblur-toggles-wrapper-main");
    if (wrapperExists) return;

    const nav = document.querySelector("header.v2 nav");
    if (!nav) return;

    const wrapper = document.createElement("div");
    wrapper.id = "unblur-toggles-wrapper-main";

    const popupToggle = document.createElement("button");
    popupToggle.id = "popup-toggle";
    popupToggle.textContent = "Unblur";

    popupToggle.setAttribute("popovertarget", "status-container");

    const statusContainer = document.createElement("form");
    statusContainer.id = "status-container";
    statusContainer.setAttribute("popover", "auto");

    const statusDiv = document.createElement("div");
    statusDiv.id = "status";
    statusContainer.appendChild(statusDiv);
    updateStatusIndicator(statusDiv, PREFS.enabled);

    const containerToggle = document.createElement("div");
    containerToggle.id = "container-toggle";
    containerToggle.innerHTML = `
        <label for="toggle">
            <input id="toggle" name="toggle" type="checkbox" ${PREFS.enabled ? "checked" : ""}>
            <svg viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M13 3C13 2.44772 12.5523 2 12 2C11.4477 2 11 2.44772 11 3V12C11 12.5523 11.4477 13 12 13C12.5523 13 13 12.5523 13 12V3ZM8.6092 5.8744C9.09211 5.60643 9.26636 4.99771 8.99839 4.5148C8.73042 4.03188 8.12171 3.85763 7.63879 4.1256C4.87453 5.65948 3 8.61014 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 8.66747 19.1882 5.75928 16.5007 4.20465C16.0227 3.92811 15.4109 4.09147 15.1344 4.56953C14.8579 5.04759 15.0212 5.65932 15.4993 5.93586C17.5942 7.14771 19 9.41027 19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 9.3658 6.45462 7.06997 8.6092 5.8744Z"></path>
            </svg>
        </label>
    `;
    statusContainer.appendChild(containerToggle);

    const mainToggleInput = containerToggle.querySelector("#toggle");
    if (mainToggleInput) {
        mainToggleInput.addEventListener("change", (e) => onMainToggleChange(statusDiv, e.target.checked));
    }

    const selectedOps = document.createElement("div");
    selectedOps.id = "selected-ops";

    const nsfwToggle = createSecondaryToggle("toggle-nsfw", "Unblur NSFW", PREFS.nsfw, (isChecked) => onSecondaryToggleChange("unblurNSFW", isChecked));
    selectedOps.appendChild(nsfwToggle);

    const spoilerToggle = createSecondaryToggle("toggle-spoiler", "Unblur Spoiler", PREFS.spoiler, (isChecked) => onSecondaryToggleChange("unblurSpoiler", isChecked));
    selectedOps.appendChild(spoilerToggle);

    statusContainer.appendChild(selectedOps);

    statusContainer.addEventListener("beforetoggle", (e) => {
        if (e.newState === "open" && !CSS.supports("anchor-name: --a")) {
            const rect = popupToggle.getBoundingClientRect();
            statusContainer.style.top = `${rect.bottom + window.scrollY}px`;
            statusContainer.style.right = `${document.documentElement.clientWidth - rect.right}px`;
            statusContainer.style.left = "auto";
        }
    });

    wrapper.appendChild(popupToggle);
    document.body.appendChild(statusContainer);

    nav.appendChild(wrapper);
}

GM_addStyle(`
    /* CSS Modal Fallback */
    body {
        overflow: revert !important;
        pointer-events: revert !important;
    }
    #blocking-modal,
    #nsfw-qr-dialog,
    #configured-xpromo-blocking_xpromo_nsfw_blocking,
    body > [style*="backdrop-filter"],
    #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop,
    #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms {
        display: none !important;
    }
    #unblur-toggles-wrapper-main {
        pointer-events: auto;
        z-index: 999;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        background-color: var(--color-secondary-background);
        border-radius: 999px;
        height: calc(var(--shreddit-header-height) - 1rem);
        display: flex;
        align-items: center;
        justify-content: center;
        grid-column: -1;
        min-width: max-content;
        user-select: none;
        position: relative;
        &:hover {
            background-color: var(--button-color-background-hover);
        }
    }
    #popup-toggle {
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        cursor: pointer;
        padding: 0 15px;
        anchor-name: --unblur-anchor;
    }
    #status-container {
        box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
        cursor: auto;
        background-color: #1f1b19;
        color: #d1c2b7;
        font-family: system-ui, sans-serif;
        font-size: 28px;
        border-radius: 10px;
        border: none;
        padding: 0;
        margin: 0;
        inset: auto;
        position-anchor: --unblur-anchor;
        top: anchor(--unblur-anchor bottom);
        right: anchor(--unblur-anchor right);
        &:not(:popover-open) {
            display: none;
        }
        &:has(input#toggle:not(:checked)) {
            & label {
                color: #bdafa5;
            }
            & #selected-ops input:checked + .slider {
                background-color: hsl(15, 61%, 59%);
                &::before {
                    background-color: hsl(17, 75%, 40%);
                }
            }
        }
    }
    #status {
        padding: 10px;
        width: 180px;
        text-align: center;
        background-color: rgba(255, 255, 255, 0.03);
    }
    #container-toggle {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 80px;
        font-size: 16px;
    }
    #toggle {
        display: none;
        & + svg {
            transition: 0.1s ease;
            cursor: pointer;
            width: 4rem;
            height: auto;
            padding: 5px;
            border-radius: 10px;
            fill: #cc6b47;
            &:hover {
                fill: #db683e;
                background-color: rgba(255, 255, 255, 0.1);
            }
        }
        &:checked + svg {
            fill: #ff3e00;
        }
    }
    #selected-ops {
        font-size: 16px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        --slider-height: 1.4rem;
        --slider-width: 2.4rem;
        --slider-radius: 20px;
        --slider-background: rgba(255, 255, 255, 0.1);
        --slider-active-background: #ff7f55;
        --slider-thumb-size: 1rem;
        --slider-thum-offset: 0.2rem;
        --slider-thumb-background: rgba(202, 57, 0, 0.801);
        & > label {
            display: flex;
            justify-content: start;
            cursor: pointer;
            user-select: none;
            font-size: 16px;
            & input {
                display: none;
                &:checked + .slider {
                    background-color: var(--slider-active-background);
                    &::before {
                        scale: 1.15;
                        left: calc(var(--slider-width) - var(--slider-thumb-size) - var(--slider-thum-offset));
                        background-color: var(--slider-thumb-background);
                    }
                }
            }
            & .slider-label {
                flex-grow: 1;
                text-align: center;
                color: #d1c2b7;
                line-height: normal;
            }
            & .slider {
                position: relative;
                display: flex;
                align-items: center;
                height: var(--slider-height);
                width: var(--slider-width);
                border-radius: var(--slider-radius);
                background-color: var(--slider-background);
                transition: 0.1s ease;
                &::before {
                    content: '';
                    position: absolute;
                    border-radius: inherit;
                    height: var(--slider-thumb-size);
                    width: var(--slider-thumb-size);
                    left: var(--slider-thum-offset);
                    background-color: var(--slider-background);
                    transition: 0.3s ease;
                }
            }
        }
    }
    @media (hover: none) and (any-pointer: coarse) {
        #menu-unblur {
            margin-left: 0.5rem;
        }
    }
`);

function main() {
    enableNSFWSearch();

    const repeatedTask = () => {
        removeOverlays();
        if (PREFS.enabled) removeBlur();
        if (document.readyState !== "loading") initToggles();
    };

    const observer = new MutationObserver(repeatedTask);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributeFilter: ["blurred", "reason"],
    });
}
main();
