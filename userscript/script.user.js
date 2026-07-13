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
// @version         5.0.7
// @icon            https://cdn.jsdelivr.net/gh/zenstorage/Reddit-NSFW-Unblur/assets/icon.png
// @author          hdyzen
// @description     Unblur nsfw in Shreddit
// @license         MIT
// @homepage        https://github.com/zenstorage/Reddit-NSFW-Unblur
// ==/UserScript==

const PREFS = {
    enabled: GM_getValue("autoUnblur", true),
    nsfw: GM_getValue("unblurNSFW", true),
    spoiler: GM_getValue("unblurSpoiler", false),
    placeholder: GM_getValue("unblurPlaceholder", false),
};

const SUBREDDIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="flex items-center rounded-full overflow-hidden nd:visible nd:bg-secondary-background bg-neutral-background border-neutral-background flex items-center justify-center shadow-xs xs:shadow-none w-full h-full" style="color:#ff4500;min-width: 100%;" viewBox="0 0 20 20"><path d="M11.977 13.79h-1.955l4.549-10.715a.81.81 0 0 0-.381-1.032C12.447 1.12 10.37.747 8.179 1.18c-3.612.716-6.471 3.68-7.059 7.316a9.01 9.01 0 0 0 10.409 10.377c3.735-.616 6.741-3.635 7.347-7.371.453-2.8-.388-5.405-2.017-7.322a.505.505 0 0 0-.853.119zM9.98 8.118a1.75 1.75 0 0 0-1.148.167 1.66 1.66 0 0 0-.651.596 1.7 1.7 0 0 0-.258.948v3.96H5.998V6.322h1.876v1.074h.035q.377-.516.948-.851a2.55 2.55 0 0 1 1.311-.335q.258 0 .488.042t.342.09l-.774 1.849a.8.8 0 0 0-.244-.073"></path></svg>`;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

const cache = {
    users: new Map(),
    subreddits: new Map(),
    collected: new Set(),
    waiting: new Map(),

    async getUser(name) {
        if (this.users.has(name)) return this.users.get(name);
        if (this.waiting.has(name)) return this.waiting.get(name);

        const promise = (async () => {
            const res = await fetch(`https://www.reddit.com/user/${name}/about.json?raw_json=1`);
            if (!res.ok) {
                throw new Error(`Failed to fetch user ${name}:`, res);
            }

            const { data } = await res.json();
            const value = { icon: data.icon_img || data.snoovatar_img };

            this.users.set(name, value);
            this.waiting.delete(name);

            return value;
        })();

        this.waiting.set(name, promise);

        try {
            return await promise;
        } finally {
            this.waiting.delete(name);
        }
    },

    getSubreddit(name) {
        if (this.subreddits.has(name)) return this.subreddits.get(name);
        if (this.waiting.has(name)) return this.waiting.get(name).promise;

        let resolvePromise, rejectPromise;
        const promise = new Promise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });

        this.waiting.set(name, {
            promise,
            resolve: resolvePromise,
            reject: rejectPromise,
        });

        setTimeout(() => {
            const waiting = this.waiting.get(name);
            if (!waiting) return;

            console.log("timeout on waiting", name);
            this.waiting.delete(name);
            waiting.reject();
        }, 5000);

        return promise;
    },

    async collectSubreddits() {
        const ids = new Set();

        const faceplates = $$(`[data-faceplate-tracking-context*='"subreddit":']:not([data-collected])`);
        for (const faceplate of faceplates) {
            faceplate.dataset.collected = "";

            const contextAttr = faceplate.dataset.faceplateTrackingContext;
            const context = JSON.parse(contextAttr);

            const id = context?.subreddit?.id;
            ids.add(id);
        }

        const posts = $$("shreddit-post[subreddit-id]:not([data-collected], [subreddit-id=''])");
        for (const post of posts) {
            post.dataset.collected = "";

            const id = post.getAttribute("subreddit-id");
            ids.add(id);
        }

        const rails = $$(`reddit-pdp-right-rail-post[data-faceplate-tracking-context*='"subreddit_id":']:not([data-collected])`);
        for (const rail of rails) {
            rail.dataset.collected = "";

            const contextAttr = rail.dataset.faceplateTrackingContext;
            const context = JSON.parse(contextAttr);

            const id = context?.post?.subreddit_id;
            ids.add(id);
        }

        const unique = [...ids].filter((id) => !this.collected.has(id));

        for (const id of ids) {
            this.collected.add(id);
        }

        // console.log("collected in page", unique.length, "subreddits:", unique);
        // console.log("collected in total", this.collected.size, "subreddits:", this.collected);

        await cache.fetchSubreddits(unique);
    },

    async fetchSubreddits(ids) {
        if (!ids.length) return;

        const res = await fetch(`https://www.reddit.com/api/info.json?raw_json=1&id=${ids.join(",")}`, {
            cache: "force-cache",
        });
        if (!res.ok) {
            console.error("Failed to fetch subreddits", res);
            return;
        }

        const listing = await res.json();
        const childs = listing?.data?.children || [];
        for (const { data } of childs) {
            const value = {
                icon: data.community_icon || data.icon_img,
            };

            if (data.icon_img) this.users.set(data.display_name.replace("u_", ""), value);
            this.subreddits.set(data.display_name, value);

            const waiting = this.waiting.get(data.display_name);
            if (waiting) {
                this.waiting.delete(data.display_name);
                waiting.resolve(value);
            }
        }

        // console.log("fetched", ids.length, "subreddits:", this.items);
    },
};

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

async function restorePlaceholders() {
    cache.collectSubreddits();

    const subAvatarsOver18 = $$(`[data-faceplate-tracking-context*='"subreddit":'] img[src*='avatar_over18.png']:not([data-founded])`);
    for (const avatar of subAvatarsOver18) {
        avatar.dataset.founded = "";

        const faceplate = avatar.closest("[data-faceplate-tracking-context]");
        const contextAttr = faceplate.dataset.faceplateTrackingContext;
        const context = JSON.parse(contextAttr);
        const name = context?.subreddit?.name;

        if (!name) continue;

        (async () => {
            const data = await cache.getSubreddit(name);
            if (data?.icon === "") {
                avatar.outerHTML = SUBREDDIT_SVG;
                return;
            }

            if (data?.icon) avatar.src = data.icon;
        })();
    }

    const subIconsOver18 = $$("faceplate-hovercard[label^='r/'] svg[icon-name='nsfw-fill']:not([data-founded])");
    for (const icon of subIconsOver18) {
        icon.dataset.founded = "";

        const label = icon.closest("faceplate-hovercard");
        const name = label?.label?.replace("r/", "");
        if (!name) continue;

        (async () => {
            const data = await cache.getSubreddit(name);
            if (data?.icon === "") {
                icon.outerHTML = SUBREDDIT_SVG;
                return;
            }

            if (data?.icon)
                icon.outerHTML = `<img src=${data.icon} class="mb-0 shreddit-subreddit-icon__icon rounded-full overflow-hidden nd:visible nd:bg-secondary-background  w-full h-full" width="48" style="width: 48px;" loading="lazy">`;
        })();
    }

    const subIcons = $$("shreddit-post[subreddit-name] svg.avatar[icon-name='nsfw-fill']:not([data-founded])");
    for (const icon of subIcons) {
        icon.dataset.founded = "";

        const post = icon.closest("shreddit-post");
        const name = post?.getAttribute("subreddit-name");
        if (!name) continue;

        (async () => {
            const data = await cache.getSubreddit(name);
            if (data?.icon === "") {
                icon.outerHTML = SUBREDDIT_SVG;
                return;
            }

            if (data?.icon)
                icon.outerHTML = `<img src=${data.icon} class="mb-0 shreddit-subreddit-icon__icon rounded-full overflow-hidden nd:visible nd:bg-secondary-background  w-full h-full" width="48" style="width: 48px;" loading="lazy">`;
        })();
    }

    const userAvatarsOver18 = $$(`[data-faceplate-tracking-context*='"profile":'][view-events="search/view/people"] img[src*='avatar_over18.png']:not([data-founded])`);
    for (const avatar of userAvatarsOver18) {
        avatar.dataset.founded = "";

        const faceplate = avatar.closest("[data-faceplate-tracking-context]");
        const contextAttr = faceplate.dataset.faceplateTrackingContext;
        const context = JSON.parse(contextAttr);
        const name = context?.profile?.name;
        if (!name) continue;

        console.log(name, avatar, cache.users);

        (async () => {
            const data = await cache.getUser(name);
            console.log("data", data);
            if (data?.icon === "") {
                avatar.outerHTML = SUBREDDIT_SVG;
                return;
            }

            if (data?.icon) avatar.src = data.icon;
        })();
    }

    const userIconsOver18 = $$("faceplate-hovercard a[href^='/user/'] svg[icon-name='nsfw-fill']:not([data-founded])");
    for (const icon of userIconsOver18) {
        icon.dataset.founded = "";

        const link = icon.closest("a[href^='/user/']");
        const name = link?.href?.split("/").at(-2);
        if (!name) continue;

        (async () => {
            const data = await cache.getUser(name);
            if (data?.icon === "") {
                icon.outerHTML = SUBREDDIT_SVG;
                return;
            }

            if (data?.icon)
                icon.outerHTML = `<img src=${data.icon} class="mb-0 shreddit-subreddit-icon__icon rounded-full overflow-hidden nd:visible nd:bg-secondary-background  w-full h-full" width="48" style="width: 48px;" loading="lazy">`;
        })();
    }

    const userAvatars = $$("shreddit-post[author] img[src*='avatar_default']:not([data-founded])");
    for (const avatar of userAvatars) {
        avatar.dataset.founded = "";

        const author = avatar.closest("shreddit-post[author]");
        const name = author?.getAttribute("author");
        if (!name) continue;

        console.log(name, avatar, cache.users);

        (async () => {
            const data = await cache.getUser(name);
            console.log("data", data, name);
            if (data?.icon === "") {
                avatar.outerHTML = SUBREDDIT_SVG;
                return;
            }

            if (data?.icon) avatar.src = data.icon;
        })();
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
    window.location.reload();
}

function onSecondaryToggleChange(key, isChecked) {
    GM_setValue(key, isChecked);
    PREFS[key === "unblurNSFW" ? "nsfw" : "spoiler"] = isChecked;
    window.location.reload();
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

    const nsfwToggle = createSecondaryToggle("toggle-nsfw", "NSFW", PREFS.nsfw, (isChecked) => onSecondaryToggleChange("unblurNSFW", isChecked));
    selectedOps.appendChild(nsfwToggle);

    const spoilerToggle = createSecondaryToggle("toggle-spoiler", "Spoiler", PREFS.spoiler, (isChecked) => onSecondaryToggleChange("unblurSpoiler", isChecked));
    selectedOps.appendChild(spoilerToggle);

    const placeholderToggle = createSecondaryToggle("toggle-placeholder", "Placeholder (Careful)", PREFS.placeholder, (isChecked) =>
        onSecondaryToggleChange("unblurPlaceholder", isChecked),
    );
    selectedOps.appendChild(placeholderToggle);

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
    body {
        overflow: revert !important;
        pointer-events: revert !important;
    }
    #blocking-modal, #nsfw-qr-dialog, #configured-xpromo-blocking_xpromo_nsfw_blocking, body > [style*='backdrop-filter'], #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop, #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms {
        display: none !important;
    }
    #unblur-toggles-wrapper-main {
        pointer-events: auto; 
        z-index: 999; 
        font-size: 15px; 
        font-weight: 600;
        cursor: pointer; 
        background-color: var(--button-color-background, #2a3236); 
        color: var(--button-color-text, #fff); 
        border-radius: 999px; 
        height: calc(var(--shreddit-header-height) - 1rem);
        display: flex; 
        align-items: center; 
        justify-content: center;
        grid-column: -1; 
        min-width: max-content; 
        user-select: none; 
        position: relative;
        margin-left: 0.5rem;

    }
    #unblur-toggles-wrapper-main:hover {
        background-color: var(--button-color-background-hover);
    }
    #popup-toggle {
        anchor-name: --unblur-anchor;
        background: none; 
        border: none; 
        color: inherit; 
        font: inherit;
        cursor: pointer; 
        padding: 0 15px; 
    }
    #status-container {
        width: max-content;
        position-anchor: --unblur-anchor;
        position-area: bottom center;
        box-shadow: 0 0 10px 0 rgba(0,0,0,0.5); 
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
    }
    #status-container:not(:popover-open) { display: none; }
    #status-container:has(input#toggle:not(:checked)) label { color: #bdafa5; }
    #status-container:has(input#toggle:not(:checked)) #selected-ops input:checked + .slider {
        background-color: hsl(15, 61%, 59%);
    }
    #status-container:has(input#toggle:not(:checked)) #selected-ops input:checked + .slider::before {
        background-color: hsl(17, 75%, 40%);
    }
    #status {
        padding: 10px; text-align: center;
        background-color: rgba(255,255,255,0.03);
    }
    #container-toggle {
        display: flex; justify-content: center; align-items: center;
        width: 100%; height: 80px; font-size: 16px;
    }
    #toggle { display: none; }
    #toggle + svg {
        transition: 0.1s ease; cursor: pointer; width: 4rem; height: auto;
        padding: 5px; border-radius: 10px; fill: #cc6b47;
    }
    #toggle + svg:hover { fill: #db683e; background-color: rgba(255,255,255,0.1); }
    #toggle:checked + svg { fill: #ff3e00; }
    #selected-ops {
        font-size: 16px; padding: 10px; display: flex; flex-direction: column; gap: 8px;
        --slider-height: 1.4rem; --slider-width: 2.4rem; --slider-radius: 20px;
        --slider-background: rgba(255,255,255,0.1);
        --slider-active-background: #ff7f55;
        --slider-thumb-size: 1rem; --slider-thum-offset: 0.2rem;
        --slider-thumb-background: rgba(202,57,0,0.801);
    }
    #selected-ops > label {
        display: flex; justify-content: start; cursor: pointer;
        user-select: none; font-size: 16px;
    }
    #selected-ops input { display: none; }
    #selected-ops input:checked + .slider {
        background-color: var(--slider-active-background);
    }
    #selected-ops input:checked + .slider::before {
        scale: 1.15;
        left: calc(var(--slider-width) - var(--slider-thumb-size) - var(--slider-thum-offset));
        background-color: var(--slider-thumb-background);
    }
    #selected-ops .slider-label {
        flex-grow: 1; text-align: center; color: #d1c2b7; line-height: normal;
    }
    #selected-ops .slider {
        position: relative; display: flex; align-items: center;
        height: var(--slider-height); width: var(--slider-width);
        border-radius: var(--slider-radius); background-color: var(--slider-background);
        transition: 0.1s ease;
    }
    #selected-ops .slider::before {
        content: ''; position: absolute; border-radius: inherit;
        height: var(--slider-thumb-size); width: var(--slider-thumb-size);
        left: var(--slider-thum-offset); background-color: var(--slider-background);
        transition: 0.3s ease;
    }
    @media (hover: none) and (any-pointer: coarse) {
        #menu-unblur { margin-left: 0.5rem; }
    }
`);

function debounce(fn, ms) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), ms);
    };
}

function main() {
    enableNSFWSearch();
    const restorePlaceholdersDebounced = debounce(restorePlaceholders, 10);

    const task = () => {
        if (document.readyState !== "loading") initToggles();

        removeOverlays();
        if (!PREFS.enabled) return;
        if (PREFS.placeholder) restorePlaceholdersDebounced();
        removeBlur();
    };

    const observer = new MutationObserver(task);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributeFilter: ["blurred", "reason"],
    });
}
main();
