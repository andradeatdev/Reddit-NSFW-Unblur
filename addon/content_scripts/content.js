const PREFS = {
    enabled: true,
    nsfw: true,
    spoiler: false,
    placeholder: false,
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

const $cache = {
    items: new Map(),
    queue: [],
    waiting: new Map(),
    scheduled: false,

    async getThing(id) {
        if (sessionStorage.getItem(id)) return JSON.parse(sessionStorage.getItem(id));
        if (this.items.has(id)) return this.items.get(id);
        if (this.waiting.has(id)) return this.waiting.get(id).promise;

        let resolve;
        const promise = new Promise((r) => (resolve = r));

        this.waiting.set(id, { resolve, promise });
        this.queue.push(id);

        if (!this.scheduled) {
            this.scheduled = true;
            queueMicrotask(() => {
                this.scheduled = false;
                this.sendThing();
            });
        }

        return promise;
    },

    async sendThing() {
        if (!this.queue.length) return;

        const ids = this.queue;
        this.queue = [];

        const res = await fetch(`https://www.reddit.com/api/info.json?raw_json=1&id=${ids.join(",")}`);
        const { data = [] } = await res.json();

        for (const child of data.children) {
            const value = {
                community_icon: child.data.community_icon,
                banner_background_image: child.data.banner_background_image,
            };

            this.items.set(child.data.name, value);
            sessionStorage.setItem(child.data.name, JSON.stringify(value));

            const waiting = this.waiting.get(child.data.name);
            if (waiting) {
                this.waiting.delete(child.data.name);
                waiting.resolve(value);
            }
        }
    },

    async getUser(username) {
        if (sessionStorage.getItem(username)) return JSON.parse(sessionStorage.getItem(username));
        if (this.items.has(username)) return this.items.get(username);
        if (this.waiting.has(username)) return this.waiting.get(username).promise;

        const promise = this.sendUser(username);
        this.waiting.set(username, promise);

        try {
            return await promise;
        } finally {
            this.waiting.delete(username);
        }
    },

    async sendUser(username) {
        const res = await fetch(`https://www.reddit.com/user/${username}/about.json?raw_json=1&show=icon_img`);
        const { data } = await res.json();
        const value = { icon_img: data.icon_img || data.snoovatar_img };

        this.items.set(username, value);
        sessionStorage.setItem(username, JSON.stringify(value));

        return value;
    },
};

function removeOverlays() {
    const selectors = [
        "#blocking-modal",
        "#nsfw-qr-dialog",
        "#configured-xpromo-blocking_xpromo_nsfw_blocking",
        "#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop",
        "#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms",
        "body > [style*='backdrop-filter']",
    ];
    for (const el of $$(selectors.join(", "))) el.remove();

    const embeds = $$("shreddit-embed");
    for (const embed of embeds) {
        if (!embed.mounted && typeof embed.setupEmbed === "function") embed.setupEmbed();
    }

    const promos = $$("xpromo-nsfw-blocking-container");
    for (const promo of promos) {
        const prompt = promo.shadowRoot?.querySelector(".prompt");
        prompt?.remove();
    }

    document.body.classList.remove("rpl-scroll-lock");
}

function removeBlur() {
    const posts = $$("shreddit-blurred-container[reason][blurred]");
    for (const post of posts) {
        const reason = post.getAttribute("reason");
        post.blurred = !PREFS[reason];
    }

    const highlights = $$("community-highlight-card[blurred]:is([nsfw], [spoiler])");
    for (const hl of highlights) {
        if ((hl.hasAttribute("nsfw") && PREFS.nsfw) || (hl.hasAttribute("spoiler") && PREFS.spoiler)) {
            hl.removeAttribute("blurred");
        }
    }

    const thumbs = $$("reddit-pdp-right-rail-post [data-testid='post-thumbnail']:has([icon-name='nsfw-fill'], [icon-name='caution-fill'])");
    for (const t of thumbs) {
        const svg = $("[icon-name]", t);
        const type = svg?.getAttribute("icon-name");
        if ((type === "nsfw-fill" && PREFS.nsfw) || (type === "caution-fill" && PREFS.spoiler)) {
            $("img", t)?.style.removeProperty("filter");
            $(".thumbnail-shadow", t)?.remove();
        }
    }

    const searchs = $$(`search-telemetry-tracker:is([data-faceplate-tracking-context*='"nsfw":true'], [data-faceplate-tracking-context*='"spoiler":true']):has(.thumbnail-blur)`);
    for (const s of searchs) {
        const ctx = s.getAttribute("data-faceplate-tracking-context");
        const isNsfw = ctx.includes('"nsfw":true');
        const isSpoiler = ctx.includes('"spoiler":true');
        if ((isNsfw && PREFS.nsfw) || (isSpoiler && PREFS.spoiler)) {
            $(".thumbnail-blur", s)?.classList.remove("thumbnail-blur");
        }
    }

    const spoilers = $$("shreddit-spoiler:not([data-revealed])");
    for (const s of spoilers) {
        s.dataset.revealed = "";
        s.revealed = true;
    }
}

async function restorePlaceholders() {
    const subreddits = $$(
        "search-telemetry-tracker:is([view-events='search/view/subreddit'], [click-events='search/click/post'], [click-events='search/click/comment']) img[data-testid='nsfw-subreddit-icon'][src*='avatar_over18.png']:not([data-founded])",
    );
    for (const subreddit of subreddits) {
        subreddit.dataset.founded = "";

        const tracker = subreddit.closest("search-telemetry-tracker");
        if (!tracker) continue;

        const ctx = JSON.parse(tracker.getAttribute("data-faceplate-tracking-context"));
        const id = ctx?.subreddit?.id;
        const { community_icon } = await $cache.getThing(id);
        if (community_icon) {
            subreddit.src = community_icon;
            continue;
        }

        subreddit.outerHTML = `<svg rpl="" class="flex items-center shreddit-subreddit-icon__icon rounded-full overflow-hidden nd:visible nd:bg-secondary-background  w-full h-full" fill="currentColor" height="32" icon-name="community-fill" viewBox="0 0 20 20" width="32" xmlns="http://www.w3.org/2000/svg"><path d="M11.977 13.79h-1.955l4.549-10.715a.81.81 0 00-.381-1.032C12.447 1.12 10.37.747 8.179 1.18c-3.612.716-6.471 3.68-7.059 7.316a9.01 9.01 0 0010.409 10.377c3.735-.616 6.741-3.635 7.347-7.371.453-2.8-.388-5.405-2.017-7.322a.505.505 0 00-.853.119l-4.029 9.49zM9.98 8.118a1.752 1.752 0 00-1.148.167 1.664 1.664 0 00-.651.596 1.703 1.703 0 00-.258.948v3.96H5.998V6.322h1.876v1.074h.035c.251-.344.567-.628.948-.851a2.55 2.55 0 011.311-.335c.172 0 .335.014.488.042.153.028.267.058.342.09l-.774 1.849a.766.766 0 00-.244-.073z"></path></svg>`;
    }

    const users = $$("search-telemetry-tracker[view-events='search/view/people'] img[data-testid='nsfw-subreddit-icon'][src*='avatar_over18.png']:not([data-founded])");
    for (const user of users) {
        user.dataset.founded = "";

        const tracker = user.closest("search-telemetry-tracker");
        if (!tracker) continue;

        const ctx = JSON.parse(tracker.getAttribute("data-faceplate-tracking-context"));
        const username = ctx?.profile?.name;
        if (!username) continue;

        const { icon_img } = await $cache.getUser(username);
        if (icon_img) user.src = icon_img;
    }

    const comments = $$(
        "search-telemetry-tracker[view-events='search/view/comment'] [avatar] img[data-testid='nsfw-subreddit-icon'][src*='avatar_over18.png']:not([data-founded])",
    );
    for (const comment of comments) {
        comment.dataset.founded = "";

        const username = comment.closest("a[href]")?.innerText;
        if (!username) continue;

        const { icon_img } = await $cache.getUser(username);
        if (icon_img) comment.src = icon_img;
    }

    const icons = $$("faceplate-hovercard svg[icon-name='nsfw-fill']:not([data-founded])");
    for (const icon of icons) {
        icon.dataset.founded = "";

        const tracker = icon.closest("search-telemetry-tracker");
        if (!tracker) continue;

        const ctx = JSON.parse(tracker.getAttribute("data-faceplate-tracking-context"));
        const id = ctx?.subreddit?.id;
        if (!id) continue;

        const { community_icon } = await $cache.getThing(id);
        icon.outerHTML = `<img src=${community_icon} class="mb-0 shreddit-subreddit-icon__icon rounded-full overflow-hidden nd:visible nd:bg-secondary-background  w-full h-full" width="48" style="width: 48px;" loading="lazy">`;
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
    if (new URL(window.location.href).pathname === "/search/") window.location.reload();
}

function main() {
    enableNSFWSearch();

    const task = () => {
        removeOverlays();

        if (!PREFS.enabled) return;
        if (PREFS.placeholder) restorePlaceholders();
        removeBlur();
    };

    new MutationObserver(task).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributeFilter: ["blurred", "reason"],
    });
}

window.addEventListener("message", (event) => {
    if (event.source === window && event.data.type === "unblur-prefs") {
        Object.assign(PREFS, event.data.prefs);
        main();
    }
});

const stl = `
	body { 
		pointer-events: revert !important; overflow: revert !important; 
	}
	#blocking-modal, 
	#nsfw-qr-dialog, 
	#configured-xpromo-blocking_xpromo_nsfw_blocking, 
	body > [style*='backdrop-filter'], 
	#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop, 
	#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms { 
		display: none !important; 
	}
`;
const style = document.createElement("style");
style.textContent = stl;
document.documentElement.appendChild(style);
