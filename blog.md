# Social Minefield - the minesweeper game with ramifications

(social minefield logo)

This is the accompanying blog post to [socialminefield.app](https://socialminefield.app), the game of minesweeper that exploits Clickjacking to like controversial sites on social media.

Here, we'll cover how it works, how we got here, and where to go.

## What's Clickjacking?

Probably the least sexy of all front-end exploits, clickjacking is a kind of software vulnerability which lets attackers embed a copy of a site on their own site, and where specially placed clicks from the end user will activate unintended functionality (such as liking a Facebook page, or even purchasing an item online).

Most established sites of consequence have it patched, but every so often, a new web-app will forget to close the hole, and be affected by it for a short (but long enough to be exploited) time, and be granted to the security wall of shame. They then apply the relevant fix, and go on their merry-way, likely to never run into the problem ever again.

How it works is simple:

(TODO: Diagram with a "hot goths in your area!" button over top a "+cool!" button).

It's not just limited to one click, you can cleverly design your UI to trick people to make 

## Why do I care?

## How's the game work?

## Fun things along the way

## How to fix my app!!!
If you're running a web-app, all you need to do is add these headers, which disable the ability for someone to load your site into an `<iframe>`.

```
# xxx: you should already have some csp settings enabled, but having some headers is better than none
blah csp blah blah
# And for compatibility for older browsers
blah blah x-frame-options deny blah ablh
```

That's it.

Instructions for different servers:

TODO: Nginx
TODO: Caddy
TODO: Apache
TODO: Tomcat
TODO: ????

Other good suggestions for CSP rules can be found on [the OWASP Content Security Policy sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html). These extended rules help protect against [XSS Attacks](TODO), HTTP downgrades, cross-site leaking, and other attacks. However, implementing some of those CSP rules can also break other functionality (especially third-party scripts), so it may take some tweaking to get these things right.

It's recommended to use both CSP and the `X-Frame-Options` header to implement this, to protect older browsers which don't support it. Most major browsers supported `X-Frame-Options` from mid-2015 onwards (some browsers implemented as early as 2009), whilst CSP was supported at least from late-2016 onwards (first in late 2011).

If `<iframe>`s are necessary for your site to use, you can allow your OWN site to host itself in an iframe. Amazon do this, for example. They don't use CSP, but implement it using the `X-Frame-Options: SAMEORIGIN` header. It's good news, because Amazon suppports 1-click purchasing, so if there was no protection against Clickjacking, we'd be spending a lot more money on random crap!

## Why hasn't Facebook fixed this?
Because they're using `<iframes>` to track people across the web. If they nuke the feature, they'll break old sites using the feature (who plonked it on their site many years ago), and potentially lose some tracking data.

There's a few heuristics they could use to detect this, but it's a known issue that's been around for ages. Plus, this site isn't very harmful, so who cares.

## I don't see my likes on Facebook
Yeah, so it turns out Facebook has globally broken their like feature for "Pages". A few developers have noticed it a few months ago, so it's been broken for a while, so I had to resort to users liking web pages, which aren't exposed to the user well on the official website (but may, or may not, affect their advertising profile).

TODO: Investigate if we can fix it.

## How to prevent your site from working??
The best way is to use privacy preserving browser extensions like Privacy Badger. If you use Firefox (which I highly recommend for privacy reasons), the built-in privacy features automatically block Facebook scripts to stop them stalking you across the Internet.

