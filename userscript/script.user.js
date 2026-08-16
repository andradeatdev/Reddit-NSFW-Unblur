// ==UserScript==
// @name            Reddit NSFW Unblur
// @namespace       https://greasyfork.org/users/821661
// @match           https://www.reddit.com/*
// @match           https://sh.reddit.com/*
// @match           https://www.reddittorjg6rue252oqsxryoxengawnmo46qy4kyii5wtqnwfj4ooad.onion/*
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// @run-at          document-start
// @noframes
// @version         5.0.9
// @icon            https://cdn.jsdelivr.net/gh/zenstorage/Reddit-NSFW-Unblur/assets/icon.png
// @author          hdyzen
// @description     Unblur nsfw in Shreddit
// @license         MIT
// @homepage        https://github.com/zenstorage/Reddit-NSFW-Unblur
// ==/UserScript==

const CONFIG = {
    global: {
        name: "Global",
        description: "Toggle all options.",
        value: GM_getValue("global", true),
        default: true,
    },
    nsfw: {
        name: "NSFW",
        description: "Reveal nsfw posts.",
        value: GM_getValue("nsfw", true),
        default: true,
    },
    spoiler: {
        name: "Spoiler",
        description: "Reveal spoiler posts.",
        value: GM_getValue("spoiler", false),
        default: false,
    },
};

const eye = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`;

function main() {
    enableNSFWSearch();

    const rnuTrigger = createRNUTrigger();
    const rnuMenu = createRNUMenu();
    document.documentElement.append(rnuMenu);

    // Modal blocking
    waitDefined("configured-xpromo-modal", "showModal", ({ target, thisArg, argArray }) => {
        const shouldBlock = ["blocking_xpromo_nsfw_blocking", "blocking_xpromo_nsfw_blocking_desktop", "blocking_xpromo_nsfw_blocking_desktop_cms"];
        const isNsfwModal = shouldBlock.some(e => thisArg.dataset.faceplateTrackingContext.includes(e));
        if (isNsfwModal) return;

        return Reflect.apply(target, thisArg, argArray);
    });

    // Overlay in individual post
    waitDefined("xpromo-nsfw-blocking-container", "update", ({ thisArg }) => {
        thisArg.shadowRoot?.append(document.createElement("slot"));
    });

    // Embed (iframe)
    waitDefined("shreddit-embed", "update", ({ target, thisArg, argArray }) => {
        if (!thisArg.mounted && typeof thisArg.setupEmbed === "function") thisArg.setupEmbed();
        return Reflect.apply(target, thisArg, argArray);
    });

    // Append RNU trigger
    waitDefined("shreddit-app", "update", ({ target, thisArg, argArray }) => {
        const toAppend = thisArg.querySelector("header :is(nav [data-part='secondary'], nav > :last-child)");
        toAppend?.insertAdjacentElement("afterbegin", rnuTrigger);
        return Reflect.apply(target, thisArg, argArray);
    });

    if (!CONFIG.global.value) return;

    // Feed/Subreddit/Post
    waitDefined("shreddit-blurred-container", "render", ({ target, thisArg, argArray }) => {
        if (CONFIG[thisArg.reason]?.value) thisArg.blurred = false;

        return Reflect.apply(target, thisArg, argArray);
    });

    // Mini cards in subreddit
    waitDefined("community-highlight-card", "render", ({ target, thisArg, argArray }) => {
        if (CONFIG.nsfw.value) thisArg.isBlurred = false;
        return Reflect.apply(target, thisArg, argArray);
    });

    // Blur gate cards in subreddit
    waitDefined("devvit2-blur-gate", "update", ({ target, thisArg, argArray }) => {
        if (CONFIG.nsfw.value) thisArg._blur = false;
        return Reflect.apply(target, thisArg, argArray);
    });

    // Inline text spoilers
    waitDefined("shreddit-spoiler", "render", ({ target, thisArg, argArray }) => {
        if (CONFIG.spoiler.value) thisArg.revealed = true;
        return Reflect.apply(target, thisArg, argArray);
    });

    // Search results
    waitDefined("faceplate-img", "render", ({ target, thisArg, argArray }) => {
        const isNsfw = thisArg.closest(`[click-events="search/click/post"][data-faceplate-tracking-context*='"nsfw":true']`);
        const isSpoiler = thisArg.closest(`[click-events="search/click/post"][data-faceplate-tracking-context*='"spoiler":true']`);

        if ((isNsfw && CONFIG.nsfw.value) || (isSpoiler && CONFIG.spoiler.value)) thisArg.classList.remove("thumbnail-blur");

        return Reflect.apply(target, thisArg, argArray);
    });

    // Post
    waitDefined("reddit-pdp-right-rail-post", "render", ({ target, thisArg, argArray }) => {
        const result = Reflect.apply(target, thisArg, argArray);
        const isSpoiler = thisArg.querySelector("[icon-name='caution-fill']");
        const isNsfw = thisArg.querySelector("[icon-name='nsfw-fill']");

        if ((isNsfw && CONFIG.nsfw.value) || (isSpoiler && CONFIG.spoiler.value)) {
            const img = thisArg.querySelector('[data-testid="post-thumbnail"] img');

            img?.removeAttribute("style");
            thisArg.querySelector(".thumbnail-shadow")?.remove();
        }

        return result;
    });
}
main();

async function waitDefined(name, prop, callback) {
    const ctor = await customElements.whenDefined(name);

    ctor.prototype[prop] = new Proxy(ctor.prototype[prop], {
        apply(target, thisArg, argArray) {
            return callback({ target, thisArg, argArray });
        },
    });
}

async function enableNSFWSearch() {
    const over18 = await cookieStore.get("over18");
    if (over18) return;

    await cookieStore.set({
        name: "over18",
        value: "1",
        path: "/",
        domain: "reddit.com",
    });

    const url = new URL(window.location.href);
    if (url.pathname === "/search/") window.location.reload();
}

function createRNUTrigger() {
    const button = document.createElement("button");
    button.id = "rnu-trigger";
    // button.textContent = "Unblur";
    button.innerHTML = `${eye} Unblur`;
    button.type = "button";
    button.setAttribute("popovertarget", "rnu-menu");
    return button;
}

function createRNUMenu() {
    const createItem = (optionName, name, checked) => {
        const label = document.createElement("label");
        const div = document.createElement("div");
        const h1 = document.createElement("h1");
        const p = document.createElement("p");
        h1.textContent = optionName;
        p.textContent = CONFIG[name].description;
        div.appendChild(h1);
        div.appendChild(p);
        label.appendChild(div);

        const input = document.createElement("input");
        input.hidden = true;
        input.type = "checkbox";
        input.name = name;
        input.checked = checked;
        label.appendChild(input);

        const slider = document.createElement("span");
        slider.name = name;
        label.appendChild(slider);

        return label;
    };

    const rnuMenu = document.createElement("div");
    rnuMenu.id = "rnu-menu";
    rnuMenu.setAttribute("popover", "");

    for (const key in CONFIG) {
        const item = createItem(CONFIG[key].name, key, CONFIG[key].value);
        rnuMenu.appendChild(item);
    }

    rnuMenu.addEventListener("input", e => {
        if (!e.target.name) return;

        const name = e.target.name;
        CONFIG[name].value = e.target.checked;
        GM_setValue(name, e.target.checked);

        window.location.reload();
    });

    return rnuMenu;
}

GM_addStyle(`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap');

    body {
        overflow: revert !important;
        pointer-events: revert !important;
    }
    #blocking-modal, #nsfw-qr-dialog, #configured-xpromo-blocking_xpromo_nsfw_blocking, body > [style*='backdrop-filter'], #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop, #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms {
        display: none !important;
    }

    [slot="post-media-container"] .relative {
        height: 100% !important;
    }

    #rnu-trigger {
        anchor-name: --rnu-trigger;

        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;

        padding-inline: 0.75rem;

        height: var(--size-button-md-h);

        font-size: 14px;

        background-color: transparent;
        color: #DBE4E9;
    }

    #rnu-trigger:hover {
        background-color: #333D42;
    }

    @scope (#rnu-menu) {
        * {
            box-sizing: border-box;
            text-transform: none;
        }

        :scope {
            flex-direction: column;

            position-anchor: --rnu-trigger;
            position-area: center bottom;

            width: max-content;
            
            padding: 0.5rem;
            margin-top: 0.25rem;
            
            box-shadow: 0 0.75rem 0.75rem 0 #00000033,0 1rem 2rem 0 #00000080;
            
            background-color: rgb(24 28 31);
            backdrop-filter: blur(12px);
            border: 1px solid rgb(255 255 255 / .1);
            border-radius: .5rem;

        }

        :scope:popover-open {
            display: flex;
        }

        label {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;

            padding: 0.5rem 0.75rem;

            cursor: pointer;
            user-select: none;

            border-radius: 0.5rem;
            color: rgb(242 244 245);
            transition: background-color 0.25s ease;
        }

        label:hover {
            background-color: rgb(255 255 255 / 0.07);
        }

        label div {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;

            font-family: Nunito, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI';

        }

        label h1 {
            margin: 0;

            font-size: 1rem;
            font-weight: 600;
        }

        label p {
            margin: 0;

            font-size: 0.75rem;
            font-weight: 400;
        }

        label input {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
            pointer-events: none;
        }

        label span {
            position: relative;
            display: inline-flex;
            flex-shrink: 0;

            width: 2.75rem;
            height: 1.5rem;

            background-color: rgb(255 255 255 / 0.07);
            outline: 1px solid rgb(255 255 255 / 0.1);
            border-radius: 9999px;

            transition: background 0.25s ease, outline 0.25s ease;
        }

        label span::before {
            content: "";
            position: absolute;

            top: .125rem;
            left: .125rem;
            bottom: .125rem;
            aspect-ratio: 1;

            translate: 0;

            background: white;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);

            transition: translate 0.25s ease;
        }

        label input:checked+span {
            background-color: rgb(255 255 255 / 0.1);
        }

        label input:checked+span::before {
            translate: 1.25rem 0;
        }
`);
