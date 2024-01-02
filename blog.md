# Social Minefield - the minesweeper game with consequences

![social minefield logo](./misc/logo.png)

This is the accompanying blog post to [socialminefield.app](https://socialminefield.app), the game of minesweeper that exploits Clickjacking to like controversial sites on social media.

Here, we'll cover how it works, how we got here, and where to go.

## What's Clickjacking?

Probably the least sexy of all front-end exploits, clickjacking is a kind of software vulnerability which lets attackers embed a copy of a site on their own site, and where specially placed clicks from the end user will activate unintended functionality (such as liking a Facebook page, or even purchasing an item online).

How it works is simple:

(TODO: Diagram with a "hot goths in your area!" button over top a "+cool!" button).

It's not just limited to one click, you can cleverly design your UI to trick people to make multiple.

(TODO: an animation showing maybe an OSU game?? and a user clicking multiple things to buy something online)

Most established sites of consequence have it patched, but every so often, a new web-app will forget to close the hole, and be affected by it for a short (but long enough to be exploited) time, and be granted to the security hall of shame. They then apply the relevant fix, and go on their merry-way, likely to never run into the problem ever again.

## How does the website work?

Very similar to the above example. First, we let a user click a square, at which point we generate 10 unique positions to place a mine, that are not the starting click. This ensures that the first piece that a player picks is not a mine, as that's a bit unfair.

(TODO: picture of the empty board, with a mouse at position X, Y, clicking)

At each of these positions we place a "mine". This is simply a like button in that square of the board.

(TODO: picture of the board with a like button in each position)

We number each square based on how many mines are adjacent.

(TODO: picture of the board with numbers)

Then, we cover up the numbered squares with buttons with some code to handle what happens when you click them (reveal itself, etc).

(TODO: Picture of the squares without like buttons covered up)

Finally, we cover up the like buttons with elements with special code that mean that clicks get ignored, and instead click below it.

(TODO: Picture of the final board, with a graphic showing `pointer-events: none;` is applied to the "blanks" above the mines).

Finito.

## How to fix my app!!!
If you're a developer and run an interactive website, all you need to do is add these headers, which disable the ability for someone to load your site into an `<iframe>`.

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

## Why is this the behaviour?
Facebook intentionally allows other sites to embed the like button on any page, as that's what like buttons on website are for.

What isn't clear, is why this is default behaviour. To prevent someone else embedding your website on theirs, you need to add a HTTP header, as described earlier. This is opt-in security, or, insecure by default.

This is not okay. Clickjacking has been a well known attack in security circles since 2008.

#### So, what's the solution?

Browsers make it default that only same-origin sites will be able to embed sites. That is, it's fine for [amazon.com](https://amazon.com) to have embed an iframe of `amazon.com` on itself.

As it's possible to opt in, it means existing websites that being able to be embedded on other people's sites will set a HTTP header that says "allow any website to embed me". In fact, we already have that HTTP header: `Content-Security-Policy: frame-ancestors *`.

My proposed behaviour is making websites effectively have the header `Content-Security-Policy: frame-ancestors 'self'` set implicitly.

I suggest the following timeline:

##### Near future
Add a deprecation warning to embeds that do not specify `Content-Security-Policy: frame-ancestors *` that are hosted on non-same-origin sites. It should suggest a well-written post that is translated in as many languages as possible, and clearly readable from a beginner's perspective.

A bad example is the CORS warning message that pops up, and its MDN page it suggests. While pretty in-depth, it is pretty abstract and kind of hard to understand for beginners.

##### Mid-late 2024
Switch over to the proposed behaviour. Make it log a warning in the console. If you're particularly brave, perhaps make it spawn an alert modal or display a banner to indicate to non-technical users that the site is broken and needs fixing. 🙃

That's it. That will fix the default insecure nature of Clickjacking, and make me happy.

#### Enterprise edge case
If a website is unable to be updated to add the HTTP header to the web server, it is possible to write a browser extension that will append headers to the response.
TODO: Write this extension? Or at least, write how to do it. There's a bunch of these extensions around, I'm curious how they work:
 - I decompiled https://addons.mozilla.org/en-US/firefox/addon/modify-header-value/ and it seems fairly simple.
  - To decompile:
   - Right click the add to firefox, copy link.
   - Wget that file, rename to .zip and decompress.
   - View the lib/common.js file to see how it works. Pretty simple.

## Why hasn't Facebook fixed this?
Because they're using `<iframes>` to track people across the web. If they nuke the feature, they'll break old sites using the feature (who plonked it on their site many years ago), and potentially lose some tracking data.

There's a few heuristics they could use to detect this, but it's a known issue that's been around for ages. Plus, this site isn't very harmful, so who cares.

## I don't see my likes on Facebook
Yeah, so it turns out Facebook has globally broken their like feature for "Pages". A few developers have noticed it a few months ago, so it's been broken for a while, so I had to resort to users liking web pages, which aren't exposed to the user well on the official website (but may, or may not, affect their advertising profile).

TODO: Investigate if we can fix it.

## How to prevent your site from working??
The best way is to use privacy preserving browser extensions like Privacy Badger. If you use Firefox (which I highly recommend for privacy reasons), the built-in privacy features automatically block Facebook resources and scripts to stop them stalking you across the Internet.
