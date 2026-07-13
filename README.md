<div align="center">
    <a align="center" width="100%">
        <img width="100px" src="https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/assets/icon.png">
    </a>
    <h1 align="center">Reddit NSFW Unblur</h1>
    <img width="50%" src="https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/assets/before-addon.png"><img width="50%" src="https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/assets/after-addon.png">
    <br>
    <a href="https://addons.mozilla.org/pt-BR/firefox/addon/reddit-nsfw-spoiler-unblur/"><img src="https://img.shields.io/badge/Firefox_Addon-AMO-blue" alt="Firefox Addon"></a>
    <a href="https://greasyfork.org/scripts/485608"><img src="https://img.shields.io/badge/Userscript-Greasyfork-yellow" alt="Greasyfork"></a>
    <a href="https://github.com/zenstorage/Reddit-NSFW-Unblur/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License"></a>
</div>

## Features

- Remove NSFW and spoiler blur on posts, thumbnails, and search results
- Remove overlay modals (xpromo blocking, scroll lock, backdrop filter)
- Toggle NSFW / Spoiler / Placeholder independently
- Placeholder restore: replace Reddit's NSFW placeholder icons with actual subreddit and user avatars
- .onion support (Tor mirror: `reddittorjg6rue252oqsxryoxengawnmo46qy4kyii5wtqnwfj4ooad.onion`)
- Available as Firefox addon, userscript, or adblock filter

# Installation

## Browser Extension

Only for Firefox

[Firefox Addon](https://addons.mozilla.org/pt-BR/firefox/addon/reddit-nsfw-spoiler-unblur/)

## Userscript

First install a userscript manager:

### Firefox:

> [Tampermonkey](https://addons.mozilla.org/pt-BR/firefox/addon/tampermonkey/)  
> [Violentmonkey](https://addons.mozilla.org/pt-BR/firefox/addon/violentmonkey/)  
> [Firemonkey](https://addons.mozilla.org/pt-BR/firefox/addon/firemonkey/)

### Chrome:

> [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)  
> [Violentmonkey](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)

Then install userscript:

[Reddit NSFW Unblur](https://greasyfork.org/scripts/485608)

<details>
<summary><strong>Alternative Methods</strong></summary>

### Adblock filters (ABP is instable)

> If you are using uBlock with an imported list, add to `trustedListPrefixes` the URL:  
> `https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/filters/ublock.txt`

> 1. [uBlock Origin or Brave](https://subscribe.adblockplus.org/?location=https%3A%2F%2Fraw.githubusercontent.com%2Fzenstorage%2FReddit-NSFW-Unblur%2Fmain%2Ffilters%2Fublock.txt&title=Reddit-Unblur)
> 2. [Adguard](https://subscribe.adblockplus.org/?location=https%3A%2F%2Fraw.githubusercontent.com%2Fzenstorage%2FReddit-NSFW-Unblur%2Fmain%2Ffilters%2Fadguard.txt&title=Reddit-Unblur)  
> 3. [Adblock Plus (Instable)](https://subscribe.adblockplus.org/?location=https%3A%2F%2Fraw.githubusercontent.com%2Fzenstorage%2FReddit-NSFW-Unblur%2Fmain%2Ffilters%2Fabp.txt&title=Reddit-Unblur)

### uBlock Origin

Add to ***My Filters:*** 
```adb
! Reddit - Set revealed
||/deprecated-content-client-js-*.js$replace=/blurred=!0/blurred=!1/,domain=www.reddit.com
! Reddit - Prevent remove revealed
www.reddit.com##+js(trusted-suppress-native-method, Element.prototype.querySelector, '"div[slot="revealed"]"', prevent)
! Reddit - Hide prompt in single post, backdrop overlay, etc...
www.reddit.com##.prompt, .bg-scrim, .overlay, .viewInApp, #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop, #blocking-modal, #nsfw-qr-dialog, body > [style*="blur(4px)"]
! Reddit - Remove scroll/click block
www.reddit.com##body[style]:remove-attr(style)
```

### Scriptlet
For uBlock Origin, you also can use the scriptlet to unblur NSFW content.

Add to ***My Filters***, one of them:
```
// Unblur NSFW and spoiler
reddit.com##+js(rub, nsfw, spoiler)

// Unblur only NSFW
reddit.com##+js(rub, nsfw)

// Unblur only spoiler
reddit.com##+js(rub, spoiler)

// Only remove block
reddit.com##+js(rub)
```

And add the scriptlet to the `User Resources` section in uBlock Origin's advanced settings: `https://cdn.jsdelivr.net/gh/zenstorage/Reddit-NSFW-Unblur/scriptlet/redditUnblock.js`

</details>

# Development

```bash
# Lint addon
web-ext lint -s ./addon

# Run addon locally (Firefox only)
web-ext run -s ./addon

# Build unsigned xpi
web-ext build -s ./addon -o
```

Release is automated via GitHub Actions when a version tag (`v*`) is pushed.

# License

[MIT](LICENSE)
