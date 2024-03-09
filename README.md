# Social Minefield

![Social Minefield Logo](./misc/logo.png)

A high-stakes game of minesweeper.

## Running

You'll need to first install the dependencies.

```
# Make and initialise the virtual environment
python3 -m venv venv/
source venv/bin/activate

pip3 install -r requirements.txt
```

Running the demo:

```
# In one terminal window run:
source venv/bin/activate
cd malicioussite
python3 app.py

# In another:
source venv/bin/activate
cd friendlysite
python3 app.py

```

## TODO
 - [x] Write a service to easily check websites for clickjacking vulnerability.
  - The security-headers is robust, but not very simple to use.
  - [ ] Run an analysis over the top 1m sites, see what the state of everything is. Survey of what kind of headers they use, most common settings, etc. Ratio of X-frame-options vs CSP?
   - Use the majestic million list, or cloudflare's. The former is nicer because it includes rank.
   - Would be cool to correlate the rank and clickjacking protection.
  - [ ] Initially, don't bother about adding a captcha. Only do so after like a few days. I probably don't need to worry about too many calls as long its over a short period of time.
 - [ ] Add a progress meter to the interactive demos.
  - Consider not making the demos interactive, and instead splat the content inline?
  - Idk, this is a hard call, I'll need to ask around (normies and techies).
 - [ ] Serve the font ourselves, we need to ensure the dimensions are exactly what we're setting it to be.
  - We probably need to overwrite all styles, to guarantee the click boxes are exactly where we're expecting them.
 - [ ] I need to write the /developers page for detailed information how to protect your site against it.
 - [ ] Consider adding the feature to allow users to provide their own links.
 - [ ] Game over screen
 - [ ] Game won screen.
 - [x] Before I continue too much further with the game, attempt to check if it actually works with the real social media link. I don't want to do all this work for nothing.
  - We have a somewhat simple HTML that kind of looks like a minesweeper, but before any gameplay logic comes into play
 - [ ] Are we allowed to load multiple like buttons at once? Or should we make it a modified game of minesweeper where it's only one flag out of the 10 that's a super mine.
   - I reckon Facebook might implement a timing heuristic that detects this. If instead we stream the HTML to the client, using magic HTTP streaming shit, we can ruin that. Obviously is a cat and mouse game.
 - [ ] Need to be able to detect when a iframe is clicked in, so as to know when it's game over (and which thing they liked).
  - https://stackoverflow.com/questions/2381336/detect-click-into-iframe-using-javascript/32138108#32138108
  - Looks reasonable to do.
 - [ ] See if there's a way to get page liking to work.
  - Or things like Videos on FB, or whatever. Things that would show up on the timeline.
 - There are some limitations I don't think we can avoid:
  - Is element hovering possible for clickjacked squares? I don't think so: https://moshfeu.github.io/show-tooltip-on-pointer-events-none-element/
  - Is right clicking possible for clickjacked squares? Maybe something exploiting blurring, idk. This might trigger the iframe click code?
    - Maybe let's pop up a modal on the user's first attempt at right clicking (this will only work on the non-clickjacked squares), to hopefully scare them off doing it.
    - Big warning saying not too.
 - [ ] Ability to generate a random game. I think it'll be very difficult to make minesweeper play like the legit version, which generates a board upon revealing the first square (to guarantee the first square isn't a failure).
  - What we'll need to do, is to get them to click a square, wherein we redirect to a page with that revealed.
  - Alternatively we can capture all clicks with an over the top div(?), and use flex-box ordering to reshuffle around the elements. There's probably some maths to involve it. We cannot move the iframes around the DOM without them resetting (which could be detected by FB maybe).
 - [ ] Add random mine facts during the game, which should distract them
  - The rat that demines
  - Canaries don't like mines, yada yada yada
 - [x] Add a flag placer. It's not possible to place flags because right click isn't handled.
  - The way I imagine this working, is that you click a toggle to change which mode you're in.
  - Then when in that mode, left clicking will place a flag. Clicking the toggle again returns you to regular mode.
  - I don't want it to automatically re-enter the game mode after placing a single flag, as it's easy to accidentally click on a mine if you didn't know that it only activated once.
 - [ ] Add some styling to make it preeeetty.
  - [ ] Optimise opensans font - we probably will only need semi-bold and regular weights, so as to strip down the font.
  - Also consider limiting the range. https://web.dev/articles/reduce-webfont-size#unicode-range_subsetting
    - I switched to using sans serif (default browser font).

## Experiments with the Like Button
So, if you insert an iframe with the following code:
```
<iframe referrerpolicy="no-referrer" src="https://www.facebook.com/plugins/like.php?href=https%3A%2F%2Fdevelopers.facebook.com%2Fdocs%2Fplugins%2F&width=100px&layout&action&size&share=false&height=35&appId" width="100px" height="35" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
```

This seems to work. It can like internet pages. This is the same as the autogenerated iframe snippet as per the documentation, but with the `referrerpolicy="no-referrer"` added, to stop them being able to carte-blanche blacklist our site.

However, if I make it a facebook page (Mr Beast):
```
<iframe referrerpolicy="no-referrer" src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FMrBeast6000&tabs=timeline&width=180&height=70&small_header=true&adapt_container_width=false&hide_cover=true&show_facepile=false&appId" width="180" height="70" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
```

It doesn't work for liking, but oddly does for disliking. Perhaps this indicates a partial fix for Clickjacking?

For the unliked version, I see:

```
<div id="u_0_0_pw">
  <div>
    <button
      id="icon-button"
      type="submit"
      class="inlineBlock _2tga _89n_ _8j9v"
      title="Follow MrBeast's Page on Facebook"
    >
      <span class="_8f1i"></span>
      <div class="">
        <span class="_3jn- inlineBlock _2v7"
          ><span class="_3jn_"></span
          ><span class="_49vg"
            ><svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              class="_1pbq"
              color="#ffffff"
            >
              <path
                fill="#ffffff"
                fill-rule="evenodd"
                d="M4.55,7 C4.7984,7 5,7.23403636 5,7.52247273 L5,13.4775273
          C5,13.7659636 4.7984,14 4.55,14 L2.45,14 C2.2016,14 2,13.7659636
          2,13.4775273 L2,7.52247273 C2,7.23403636 2.2016,7 2.45,7 L4.55,7 Z
          M6.54470232,13.2 C6.24016877,13.1641086 6.01734614,12.8982791
          6,12.5737979 C6.01734614,12.5737979 6.01344187,9.66805666 6,8.14398693
          C6.01344187,7.61903931 6.10849456,6.68623352 6.39801308,6.27384278
          C7.10556287,5.26600749 7.60281698,4.6079584 7.89206808,4.22570082
          C8.18126341,3.8435016 8.52813047,3.4708734 8.53777961,3.18572676
          C8.55077527,2.80206854 8.53655255,2.79471518 8.53777961,2.35555666
          C8.53900667,1.91639814 8.74565444,1.5 9.27139313,1.5 C9.52544997,1.5
          9.7301456,1.55690094 9.91922413,1.80084547 C10.2223633,2.15596568
          10.4343097,2.71884727 10.4343097,3.60971169 C10.4343097,4.50057612
          9.50989975,6.1729303 9.50815961,6.18 C9.50815961,6.18
          13.5457098,6.17908951 13.5464084,6.18 C14.1635544,6.17587601
          14.5,6.72543196 14.5,7.29718426 C14.5,7.83263667 14.1341135,8.27897346
          13.6539433,8.3540827 C13.9452023,8.49286263 14.1544715,8.82364675
          14.1544715,9.20555417 C14.1544715,9.68159617 13.8293011,10.0782687
          13.3983805,10.1458495 C13.6304619,10.2907572 13.7736931,10.5516845
          13.7736931,10.847511 C13.7736931,11.2459343 13.5138356,11.5808619
          13.1594388,11.6612236 C13.3701582,11.7991865 13.5063617,12.0543945
          13.5063617,12.3429843 C13.5063617,12.7952155 13.1715421,13.1656844
          12.7434661,13.2 L6.54470232,13.2 Z"
              ></path></svg
            ><img
              class="_1pbs inlineBlock img"
              src="https://static.xx.fbcdn.net/rsrc.php/v3/yW/r/gWpQpSsEGQ-.png"
              alt=""
              width="16"
              height="16" /></span
          ><span class="_5n2y"
            ><svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              class="_1pbq"
              color="#ffffff"
            >
              <path
                fill="none"
                stroke="#ffffff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.808 8.354l3.135 3.195 7.383-7.2"
              ></path></svg
            ><img
              class="_1pbs inlineBlock img"
              src="https://static.xx.fbcdn.net/rsrc.php/v3/ym/r/lg4KAO_Wcxm.png"
              alt=""
              width="16"
              height="16" /></span></span
        ><span class="_49vh _2pi7">Follow</span>
      </div></button
    ><input type="hidden" autocomplete="off" name="action" value="like" /><input
      type="hidden"
      autocomplete="off"
      name="iframe_referer"
    /><input
      type="hidden"
      autocomplete="off"
      name="r_ts"
      value="1696224711"
    /><input type="hidden" autocomplete="off" name="ref" />
  </div>
</div>
```

And for the liked version (which lets me un-like it):
```
<div>
  <form
    rel="async"
    ajaxify="/plugins/like/disconnect"
    method="post"
    action="/plugins/like/disconnect"
    onsubmit=""
    id="u_0_0_gU"
  >
    <input
      type="hidden"
      name="jazoest"
      value="25402"
      autocomplete="off"
    /><input
      type="hidden"
      name="fb_dtsg"
      value="NAcNmsaNpUFKBqRWGGTR58FxJG_Iiq-sCCBBNqqyKjMwRPB26Icxx-g:16:1696221531"
      autocomplete="off"
    /><input
      type="hidden"
      autocomplete="off"
      name="href"
      value="https://www.facebook.com/MrBeast6000"
    /><input
      type="hidden"
      autocomplete="off"
      name="new_ui"
      value="true"
    /><button
      id="icon-button"
      type="submit"
      class="inlineBlock _2tga _89n_ active _8j9v"
      title="Unfollow"
    >
      <span class="_8f1i"></span>
      <div class="">
        <span class="_3jn- inlineBlock _2v7"
          ><span class="_3jn_"></span
          ><span class="_49vg"
            ><svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              class="_1pbq"
              color="#ffffff"
            >
              <path
                fill="#ffffff"
                fill-rule="evenodd"
                d="M4.55,7 C4.7984,7 5,7.23403636 5,7.52247273 L5,13.4775273
          C5,13.7659636 4.7984,14 4.55,14 L2.45,14 C2.2016,14 2,13.7659636
          2,13.4775273 L2,7.52247273 C2,7.23403636 2.2016,7 2.45,7 L4.55,7 Z
          M6.54470232,13.2 C6.24016877,13.1641086 6.01734614,12.8982791
          6,12.5737979 C6.01734614,12.5737979 6.01344187,9.66805666 6,8.14398693
          C6.01344187,7.61903931 6.10849456,6.68623352 6.39801308,6.27384278
          C7.10556287,5.26600749 7.60281698,4.6079584 7.89206808,4.22570082
          C8.18126341,3.8435016 8.52813047,3.4708734 8.53777961,3.18572676
          C8.55077527,2.80206854 8.53655255,2.79471518 8.53777961,2.35555666
          C8.53900667,1.91639814 8.74565444,1.5 9.27139313,1.5 C9.52544997,1.5
          9.7301456,1.55690094 9.91922413,1.80084547 C10.2223633,2.15596568
          10.4343097,2.71884727 10.4343097,3.60971169 C10.4343097,4.50057612
          9.50989975,6.1729303 9.50815961,6.18 C9.50815961,6.18
          13.5457098,6.17908951 13.5464084,6.18 C14.1635544,6.17587601
          14.5,6.72543196 14.5,7.29718426 C14.5,7.83263667 14.1341135,8.27897346
          13.6539433,8.3540827 C13.9452023,8.49286263 14.1544715,8.82364675
          14.1544715,9.20555417 C14.1544715,9.68159617 13.8293011,10.0782687
          13.3983805,10.1458495 C13.6304619,10.2907572 13.7736931,10.5516845
          13.7736931,10.847511 C13.7736931,11.2459343 13.5138356,11.5808619
          13.1594388,11.6612236 C13.3701582,11.7991865 13.5063617,12.0543945
          13.5063617,12.3429843 C13.5063617,12.7952155 13.1715421,13.1656844
          12.7434661,13.2 L6.54470232,13.2 Z"
              ></path></svg
            ><img
              class="_1pbs inlineBlock img"
              src="https://static.xx.fbcdn.net/rsrc.php/v3/yW/r/gWpQpSsEGQ-.png"
              alt=""
              width="16"
              height="16" /></span
          ><span class="_5n2y"
            ><svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              class="_1pbq"
              color="#ffffff"
            >
              <path
                fill="none"
                stroke="#ffffff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.808 8.354l3.135 3.195 7.383-7.2"
              ></path></svg
            ><img
              class="_1pbs inlineBlock img"
              src="https://static.xx.fbcdn.net/rsrc.php/v3/ym/r/lg4KAO_Wcxm.png"
              alt=""
              width="16"
              height="16" /></span></span
        ><span class="_49vh _2pi7">Follow</span>
      </div></button
    ><input type="hidden" autocomplete="off" name="action" value="like" /><input
      type="hidden"
      autocomplete="off"
      name="iframe_referer"
    /><input
      type="hidden"
      autocomplete="off"
      name="r_ts"
      value="1696227248"
    /><input type="hidden" autocomplete="off" name="ref" />
  </form>
</div>
```

I notice that they've actually got a well-formed `form` here, so probably fb has disabled liking? People seem to claim it's not working on their support forums....
