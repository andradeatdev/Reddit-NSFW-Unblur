// ==UserScript==
// @name            Reddit NSFW Unblur
// @namespace       https://greasyfork.org/users/821661
// @match           https://www.reddit.com/*
// @match           https://sh.reddit.com/*
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// @run-at          document-body
// @noframes
// @version         4.5.3
// @icon            https://cdn.jsdelivr.net/gh/zenstorage/Reddit-NSFW-Unblur/assets/icon.png
// @author          hdyzen
// @description     Unblur NSFW and Spoiler content on Reddit.
// @license         MIT
// @homepage        https://github.com/zenstorage/Reddit-NSFW-Unblur
// ==/UserScript==

const PREFS = {
    enabled: GM_getValue("autoUnblur", true),
    nsfw: GM_getValue("unblurNSFW", true),
    spoiler: GM_getValue("unblurSpoiler", false),
    hasSeenPopover: GM_getValue("hasSeenPopover", false),
};

const ICONS = {
    eye: `<svg class="unblur-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg class="unblur-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
    info: `<svg class="unblur-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    chevron: `<svg class="unblur-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
};

const App = {
    init() {
        this.injectStyles();
        this.syncBody();
        this.handleAgeGate();
        this.initObserver();
        this.setupUI();

        document.addEventListener("click", (e) => {
            const menu = document.querySelector("#unblur-dropdown");
            const trigger = document.querySelector("#unblur-trigger");
            if (menu && menu.classList.contains("show")) {
                if (!menu.contains(e.target) && !trigger.contains(e.target)) {
                    menu.classList.remove("show");
                }
            }
        });
    },

    syncBody() {
        document.body.dataset.unblurEnabled = PREFS.enabled;
        document.body.dataset.unblurNsfw = PREFS.nsfw;
        document.body.dataset.unblurSpoiler = PREFS.spoiler;
    },

    injectStyles() {
        GM_addStyle(`
                body[data-unblur-enabled="true"][data-unblur-nsfw="true"] :is(shreddit-blurred-container[reason="nsfw"], community-highlight-card[nsfw]) {
                    --blur-radius: 0px !important;
                    filter: none !important;
                }
                body[data-unblur-enabled="true"][data-unblur-spoiler="true"] :is(shreddit-blurred-container[reason="spoiler"], community-highlight-card[spoiler], shreddit-spoiler) {
                    --blur-radius: 0px !important;
                    filter: none !important;
                }
                body[data-unblur-enabled="true"][data-unblur-nsfw="true"] [data-testid='post-thumbnail'] :is([icon-name='nsfw-fill'], .thumbnail-shadow, img[style*='blur']) {
                    filter: none !important;
                    display: none !important;
                }
                body[data-unblur-enabled="true"][data-unblur-nsfw="true"] [data-testid='post-thumbnail'] img[style*='blur'] {
                    display: block !important;
                }
                #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop, 
                #blocking-modal,
                #nsfw-qr-dialog, 
                body > [style*="backdrop-filter"] { 
                    display: none !important; 
                }
                body.rpl-scroll-lock { 
                    pointer-events: revert !important; 
                    overflow: revert !important; 
                }
                #unblur-trigger {
                    display: flex;
                    align-items: center;
                    height: 32px;
                    border-radius: 16px;
                    background: var(--color-neutral-background-weak, #f6f7f8);
                    color: var(--color-neutral-content-weak, #878a8c);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    user-select: none;
                    margin-left: 8px;
                    position: relative;
                    padding: 0 4px;
                    border: 1px solid transparent;
                }
                #unblur-trigger:hover {
                    background: var(--color-neutral-background-hover, #e3e6e8);
                    color: var(--color-neutral-content, #1c1c1c);
                }
                #unblur-trigger.active {
                    color: #ff4500;
                }
                .unblur-eye-zone, .unblur-chevron-zone {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 24px;
                    border-radius: 50%;
                    transition: background 0.1s;
                }
                .unblur-eye-zone {
                    width: 32px;
                }
                .unblur-chevron-zone {
                    width: 20px;
                    border-left: 1px solid var(--color-neutral-border-weak, #edeff1);
                    border-radius: 0 16px 16px 0;
                    margin-left: 2px;
                    padding-left: 4px;
                }
                .unblur-eye-zone:hover, .unblur-chevron-zone:hover {
                    background: rgba(0, 0, 0, 0.05);
                }
                #unblur-trigger.active .unblur-eye-zone svg {
                    stroke: #ff4500;
                }
                svg.unblur-icon {
                    width: 18px;
                    height: 18px;
                    stroke: currentColor;
                    pointer-events: none;
                }
                .unblur-chevron-zone svg {
                    width: 14px;
                    height: 14px;
                }
                #unblur-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    width: 240px;
                    background: var(--color-canvas, #ffffff);
                    border: 1px solid var(--color-neutral-border-weak, #edeff1);
                    border-radius: 12px;
                    box-shadow: var(--shadow-elevated, 0 4px 12px rgba(0,0,0,0.15));
                    z-index: 10001;
                    display: none;
                    flex-direction: column;
                    padding: 8px 0;
                    pointer-events: auto;
                    font-family: var(--font-sans, system-ui, sans-serif);
                }
                #unblur-dropdown.show {
                    display: flex;
                    animation: unblur-pop 0.15s cubic-bezier(0.2, 0, 0.13, 1.5);
                }
                @keyframes unblur-pop {
                    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .unblur-menu-header {
                    padding: 12px 16px 8px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #7c7c7c;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }
                .unblur-menu-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 16px;
                    cursor: pointer;
                    transition: background 0.1s;
                }
                .unblur-menu-item:hover {
                    background: rgba(0, 0, 0, 0.04);
                }
                .unblur-label {
                    font-size: 14px;
                    color: #1c1c1c;
                    font-weight: 500;
                }
                .unblur-switch {
                    position: relative;
                    display: inline-block;
                    width: 36px;
                    height: 20px;
                }
                .unblur-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .unblur-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #ccc;
                    transition: .2s;
                    border-radius: 20px;
                }
                .unblur-slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .2s;
                    border-radius: 50%;
                }
                input:checked + .unblur-slider {
                    background-color: #ff4500;
                }
                input:checked + .unblur-slider:before {
                    transform: translateX(16px);
                }
                @media (prefers-color-scheme: dark) {
                    #unblur-trigger:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: #d7dadc;
                    }
                    #unblur-dropdown {
                        background: #1a1a1b;
                        border-color: #343536;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    }
                    .unblur-menu-header {
                        color: #818384;
                    }
                    .unblur-menu-item:hover {
                        background: #272729;
                    }
                    .unblur-label {
                        color: #d7dadc;
                    }
                    .unblur-slider {
                        background-color: #343536;
                    }
                    #unblur-onboarding-popover {
                        background: #1a1a1b;
                        border-color: #343536;
                        color: #d7dadc;
                    }
                    .onboarding-body {
                        color: #818384;
                    }
                    .onboarding-body strong {
                        color: #d7dadc;
                    }
                }
                #unblur-onboarding-popover {
                    border: 1px solid var(--color-neutral-border-weak, #edeff1);
                    border-radius: 12px;
                    padding: 16px;
                    background: var(--color-canvas, #ffffff);
                    color: var(--color-neutral-content, #1c1c1c);
                    box-shadow: var(--shadow-elevated, 0 8px 24px rgba(0,0,0,0.2));
                    font-family: var(--font-sans, system-ui, sans-serif);
                    width: 260px;
                    margin: 0;
                    inset: auto;
                    position: fixed;
                    z-index: 10002;
                }
                #unblur-onboarding-popover::backdrop {
                    background: rgba(0, 0, 0, 0.1);
                }
                .onboarding-title {
                    font-weight: 700;
                    margin-bottom: 8px;
                    font-size: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #ff4500;
                }
                .onboarding-title svg {
                    width: 18px;
                    height: 18px;
                }
                .onboarding-body {
                    font-size: 13px;
                    line-height: 1.5;
                    color: var(--color-neutral-content-weak, #7c7c7c);
                }
                .onboarding-body strong {
                    color: var(--color-neutral-content, #1c1c1c);
                    font-weight: 600;
                }
            `);
    },

    handleAgeGate() {
        cookieStore.get("over18").then((over18) => {
            if (over18?.value !== "1") {
                cookieStore.set({ name: "over18", value: "1", path: "/", domain: "reddit.com" });
                if (location.pathname === "/search/") location.reload();
            }
        });
    },

    initObserver() {
        let timeout;
        const observer = new MutationObserver(() => {
            if (timeout) cancelAnimationFrame(timeout);
            timeout = requestAnimationFrame(() => this.runTasks());
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributeFilter: ["blurred", "reason"],
        });
    },

    runTasks() {
        this.unblurJSFallbacks();
        this.setupUI();
    },

    unblurJSFallbacks() {
        if (!PREFS.enabled) return;
        if (PREFS.nsfw || PREFS.spoiler) {
            document.querySelectorAll("community-highlight-card[blurred]").forEach((card) => {
                const isNsfw = card.hasAttribute("nsfw");
                if ((isNsfw && PREFS.nsfw) || (!isNsfw && PREFS.spoiler)) card.removeAttribute("blurred");
            });
            document.querySelectorAll("shreddit-blurred-container[blurred]").forEach((container) => {
                const reason = container.getAttribute("reason");
                if (PREFS[reason]) container.blurred = false;
            });
        }
        if (PREFS.spoiler) {
            document.querySelectorAll("shreddit-spoiler[revealed='false'], shreddit-spoiler:not([revealed])").forEach((s) => (s.revealed = true));
        }
        const promo = document.querySelector("xpromo-nsfw-blocking-container");
        if (promo) {
            promo.shadowRoot?.querySelector(".prompt")?.remove();
            promo.querySelector(".viewInApp")?.remove();
        }
    },

    setupUI() {
        if (document.querySelector("#unblur-trigger")) return;
        const target = document.querySelector("shreddit-app header nav, header.v2 nav, header nav");
        if (!target) return;

        const container = document.createElement("div");
        container.id = "unblur-trigger";
        if (PREFS.enabled) container.classList.add("active");
        container.innerHTML = `
                <div class="unblur-eye-zone" title="Toggle Unblur">
                    ${PREFS.enabled ? ICONS.eye : ICONS.eyeOff}
                </div>
                <div class="unblur-chevron-zone" title="Settings">
                    ${ICONS.chevron}
                </div>
                <div id="unblur-dropdown">
                    <div class="unblur-menu-header">Advanced Settings</div>
                    <div class="unblur-menu-item" data-action="toggle-nsfw">
                        <span class="unblur-label">NSFW Content</span>
                        <label class="unblur-switch">
                            <input type="checkbox" id="unblur-nsfw-check" ${PREFS.nsfw ? "checked" : ""}>
                            <span class="unblur-slider"></span>
                        </label>
                    </div>
                    <div class="unblur-menu-item" data-action="toggle-spoiler">
                        <span class="unblur-label">Spoilers</span>
                        <label class="unblur-switch">
                            <input type="checkbox" id="unblur-spoiler-check" ${PREFS.spoiler ? "checked" : ""}>
                            <span class="unblur-slider"></span>
                        </label>
                    </div>
                </div>
            `;

        target.appendChild(container);

        container.querySelector(".unblur-eye-zone").addEventListener("click", (e) => {
            PREFS.enabled = !PREFS.enabled;
            GM_setValue("autoUnblur", PREFS.enabled);
            container.classList.toggle("active", PREFS.enabled);
            container.querySelector(".unblur-eye-zone").innerHTML = PREFS.enabled ? ICONS.eye : ICONS.eyeOff;
            this.syncBody();
            this.runTasks();
        });

        container.querySelector(".unblur-chevron-zone").addEventListener("click", (e) => {
            const dropdown = container.querySelector("#unblur-dropdown");
            dropdown.classList.toggle("show");
        });

        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const dropdown = container.querySelector("#unblur-dropdown");
            dropdown.classList.toggle("show");
        });

        container.querySelectorAll(".unblur-menu-item").forEach((item) => {
            const input = item.querySelector("input");
            const key = item.dataset.action.replace("toggle-", "");
            const gmKey = key === "nsfw" ? "unblurNSFW" : "unblurSpoiler";

            input.addEventListener("change", (e) => {
                PREFS[key] = e.target.checked;
                GM_setValue(gmKey, PREFS[key]);
                this.syncBody();
                this.runTasks();
            });

            item.addEventListener("click", (e) => {
                if (!e.target.closest(".unblur-switch")) {
                    input.checked = !input.checked;
                    input.dispatchEvent(new Event("change"));
                }
            });
        });

        if (!PREFS.hasSeenPopover) {
            const popover = document.createElement("div");
            popover.id = "unblur-onboarding-popover";
            popover.setAttribute("popover", "auto");
            popover.innerHTML = `
                    <div class="onboarding-title">${ICONS.info} Reddit Unblur</div>
                    <div class="onboarding-body">
                        <strong>Left Click:</strong> Toggle global unblur.<br>
                        <strong>Right Click / Arrow:</strong> Open settings.
                    </div>
                `;
            document.body.appendChild(popover);
            const rect = container.getBoundingClientRect();
            popover.style.top = `${rect.bottom + 10}px`;
            popover.style.left = `${rect.left - 220}px`;
            try {
                popover.showPopover();
                GM_setValue("hasSeenPopover", true);
            } catch (e) {}
        }
    },
};

App.init();
