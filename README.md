# MAY DESIGNS

Storefront for handmade earrings and magnets.

```bash
npm run dev     # http://localhost:5173, rebuilds on save
npm run build   # write index.html
npm test        # build, then run the checks
```

No dependencies. Node 18 or newer.

## How it fits together

`dist/` is **generated** — never edit it by hand, and it isn't in git. The next
build overwrites it. Everything is assembled from `src/`:

```
src/
  index.template.html   page markup, with <!--PLACEHOLDERS--> the build fills
  data/products.json    the catalogue — the source of truth
  styles/*.css          concatenated in filename order
  js/*.js               concatenated in filename order
photos/                 product photography
api/*.js                serverless endpoints (Vercel)
build.js                assembles src/ + photos/ into dist/
check.js                guards the things that break silently
dev.js                  local server + rebuild on save
dist/                   build output — index.html + photos. Not committed.
```

Only `dist/` is served in production, so deploying never exposes `src/`, the
build scripts, or anything else in the repo.

The CSS and JS files are numbered because they are concatenated in order and
share one scope. Renaming them changes the order; don't do it casually.

## Why it builds to one file

The output is a single self-contained `index.html` with inline `<style>`,
inline `<script>` and an inline JSON island. That is deliberate, for two
reasons, and both break quietly if you "modernise" it into linked assets:

**The editor downloads the page.** Edit mode works by cloning the whole
document and serialising it to a file. If the CSS and JS were external, that
download would be an unstyled, inert page — and you would only find out after
sending it to someone.

**The shop must render without JavaScript.** The product grid, the filter chips
and the footer links are pre-rendered into the markup at build time, so the
catalogue is visible in iOS file previews, to search crawlers and in link
unfurls. The JS re-renders the same markup on load. If you ever move the
catalogue to a file fetched at runtime, you lose this.

## Editing products

Prices, names, descriptions and sold-out flags live in `src/data/products.json`.
Edit it directly, or use the built-in editor:

- add `?edit` to the address, or tap the footer year five times
- change what you need
- **Download products.json** → replace `src/data/products.json`, rebuild, commit

There is also **Download updated site**, which gives you a standalone
`index.html`. Use that only if you are not working from this repo — an edited
`index.html` on its own gets overwritten by the next build.

### Product fields

| field | meaning |
|---|---|
| `id` | unique string, never reuse one |
| `name` | shown on the card and in the drawer |
| `cat` | must match a key in `categories` |
| `price` | number in rupees; `0` shows "Price on request" |
| `img` | `photos/name.webp`; `""` shows a placeholder tile |
| `img2` | optional second photo, cross-fades on hover |
| `options` | variant buttons; `[]` for none |
| `sold` | `true` to show as sold out |
| `round` | `true` masks the photo into a circle (the bowl shots) |
| `framed` | `true` for photos that keep their own background |

## Things that are the way they are on purpose

Each of these was a real fix. They look like untidiness and they are not.
`npm test` catches most of them; the rest are on you.

1. **Square frames use `padding-top:100%`, not `aspect-ratio`.** iOS Safari
   does not reliably apply `aspect-ratio` inside a `<button>`, and the product
   cards are buttons. Using it makes every card overflow and clip on iPhone.

2. **The grid is pre-rendered and then re-rendered by JS.** See above. Keep the
   pre-render, or keep a build step that regenerates it from `products.json`.

3. **All animation sits inside `@media (prefers-reduced-motion: no-preference)`** —
   the rotating bowl photos, the card stagger, the pop feedback. Keep the guard.

4. **`round` and `framed` are both load-bearing**, read by `frameClass()` and
   the product drawer. Preserve both through any refactor.

5. **The burgundy border on the five magnet photos is baked into the images**,
   not CSS. It matches the printed cards the magnets ship on. Don't replace it
   with a CSS border.

6. **The photos are already compressed** (WebP, ~40–200KB, from 1–13MB
   originals) and the bowl shots are cropped tight so the circular mask lands
   correctly. Don't re-encode or re-crop them.

7. **The editor is the non-technical way in.** If you change how the page is
   assembled, check that `?edit` still works.

## Deployment

Vercel, auto-deploying from `main`. Chosen over Netlify because `api/*.js`
becomes `/api/*` with no routing config, which is what the Razorpay endpoints
want.

- `vercel.json` sets the build command and points the CDN at `dist/`
- pushing to `main` deploys; opening a PR gives you a preview URL
- `GET /api/health` reports whether the Razorpay keys are set, as booleans —
  use it to confirm the serverless side is alive without exposing anything

Secrets go in **Vercel → Settings → Environment Variables**, never in this repo.
`RAZORPAY_KEY_SECRET` must not be committed and must never reach the browser.

## Not done yet

- Payments. `startCheckout()` in `src/js/05-payment.js` is a placeholder; the
  notes there describe the Razorpay server endpoints it needs. The secret key
  must never go in this repo.
- The commission form doesn't submit anywhere yet — see `src/js/09-commission.js`.
- Deployment.
