<div align="center">
    <a align="center" width="100%">
        <img width="100px" src="https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/assets/icon.png">
    </a>
    <h1 align="center">Reddit NSFW Unblur</h1>
    <img width="50%" src="https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/assets/before-addon.png"><img width="50%" src="https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/assets/after-addon.png">
</div>

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

Alternative Methods
-------------------

### Adblock filters (ABP is instable)

##### ⚠️ If you are using uBlock and are using an imported list, add to `trustedListPrefixes` the URL -> `https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/filters/ublock.txt`

> 1. [uBlock Origin or Brave](https://subscribe.adblockplus.org/?location=https%3A%2F%2Fraw.githubusercontent.com%2Fzenstorage%2FReddit-NSFW-Unblur%2Fmain%2Ffilters%2Fublock.txt&title=Reddit-Unblur)
> 2. [Adguard](https://subscribe.adblockplus.org/?location=https%3A%2F%2Fraw.githubusercontent.com%2Fzenstorage%2FReddit-NSFW-Unblur%2Fmain%2Ffilters%2Fadguard.txt&title=Reddit-Unblur)  
> 3. [Adblock Plus (Instable)](https://subscribe.adblockplus.org/?location=https%3A%2F%2Fraw.githubusercontent.com%2Fzenstorage%2FReddit-NSFW-Unblur%2Fmain%2Ffilters%2Fabp.txt&title=Reddit-Unblur)

<!---
> 1. [uBlock Origin or Brave](https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/filters/ublock.txt)  
> 2. [Adguard](https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/filters/adguard.txt)  
> 3. [Adblock Plus (Instable)](https://raw.githubusercontent.com/zenstorage/Reddit-NSFW-Unblur/main/filters/abp.txt)
-->

### uBlock Origin

Add to ***My Filters:*** 
```adb
! Reddit - Set revealed
||/deprecated-content-client-js-*.js$replace=/blurred=!0/blurred=!1/,domain=www.reddit.com
! Reddit - Prevent remove revealed
www.reddit.com##+js(trusted-suppress-native-method, Element.prototype.querySelector, '"div[slot="revealed"]"', prevent)
! Reddit - Hide prompt in single post, backdrop overlay, etc...
www.reddit.com##.prompt, .bg-scrim, .overlay, .viewInApp, #configured-xpromo-blocking_xpromo_nsfw_blocking_desktop, #nsfw-qr-dialog, body > [style*="blur(4px)"]
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
