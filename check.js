#!/usr/bin/env node
/* ============================================================
   CHECKS
   ------------------------------------------------------------
   build.js keeps its own copy of cardHTML/artHTML/frameClass so
   it can pre-render the grid in Node. The browser has the real
   ones in src/js/03-render.js. If the two drift apart, the
   no-JS markup stops matching what the page draws on load and
   nobody notices, because with JS on the page looks fine.

   This runs both against every product and diffs the output.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(root, "src/data/products.json"), "utf8"));

let failures = 0;
const fail = msg => { console.error("FAIL  " + msg); failures++; };
const pass = msg => console.log("OK    " + msg);

/* ---- pull the browser-side renderers out of src/js and run them ---- */
const renderSrc = fs.readFileSync(path.join(root, "src/js/03-render.js"), "utf8");
const sandbox = {
  CATEGORIES: data.categories,
  PRODUCTS: data.products,
  rupees: n => n > 0 ? "₹" + n.toLocaleString("en-IN") : "Price on request",
  state: { filter: "all", query: "", sort: "new", cart: [], viewed: [] },
  document: undefined,
};
// Only the pure markup helpers are needed; the DOM-touching ones are left out.
const pure = renderSrc.match(
  /const PHOTO_MAP[\s\S]*?function cardHTML[\s\S]*?\n}/
);
if (!pure) {
  fail("could not find frameClass/artHTML/cardHTML in src/js/03-render.js");
} else {
  vm.createContext(sandbox);
  vm.runInContext(pure[0], sandbox);

  // build.js's mirror, loaded by executing it with a stubbed writeFileSync
  const buildSrc = fs.readFileSync(path.join(root, "build.js"), "utf8");
  const mirror = buildSrc.match(
    /const rupees[\s\S]*?function cardHTML[\s\S]*?\n}/
  );
  if (!mirror) {
    fail("could not find the mirrored renderers in build.js");
  } else {
    const mctx = { PRODUCTS: data.products, CATEGORIES: data.categories };
    vm.createContext(mctx);
    vm.runInContext(mirror[0], mctx);

    let drift = 0;
    for (const p of data.products) {
      if (sandbox.cardHTML(p) !== mctx.cardHTML(p)) {
        if (drift === 0) {
          console.error(`\n  drift on product "${p.id}":`);
          console.error("    browser: " + JSON.stringify(sandbox.cardHTML(p).slice(0, 160)));
          console.error("    build  : " + JSON.stringify(mctx.cardHTML(p).slice(0, 160)));
        }
        drift++;
      }
    }
    if (drift) fail(`${drift}/${data.products.length} products render differently in build.js and src/js/03-render.js`);
    else pass(`cardHTML matches across build.js and src/js/03-render.js (${data.products.length} products)`);
  }
}

/* ---- the built file must be self-contained ---- */
const outPath = path.join(root, "index.html");
if (!fs.existsSync(outPath)) {
  fail("index.html not built yet — run npm run build");
} else {
  const out = fs.readFileSync(outPath, "utf8");

  if (/<link[^>]+rel=["']?stylesheet/i.test(out.replace(/fonts\.googleapis[^>]*/g, "")))
    fail("index.html links an external stylesheet — the editor download would lose its styling");
  else pass("no external stylesheet links (fonts aside)");

  if (/<script[^>]+\bsrc=/i.test(out))
    fail("index.html loads an external script — the editor download would lose its behaviour");
  else pass("no external script tags");

  /* the pre-rendered grid must hold every product, or the shop
     looks empty where scripts don't run */
  const grid = (out.match(/<div class="grid" id="grid">([\s\S]*?)<\/div>\s*<div class="empty"/) || [,""])[1];
  const missing = data.products.filter(p => !grid.includes(`data-id="${p.id}"`));
  if (missing.length) fail(`pre-rendered grid is missing ${missing.length} product(s): ${missing.map(p => p.id).join(", ")}`);
  else pass(`pre-rendered grid contains all ${data.products.length} products`);

  /* the round/framed flags must survive into the markup */
  const roundCount = (grid.match(/card__frame--round/g) || []).length;
  const framedCount = (grid.match(/card__frame--framed/g) || []).length;
  const wantRound = data.products.filter(p => p.round).length;
  const wantFramed = data.products.filter(p => p.framed).length;
  if (roundCount !== wantRound) fail(`round flag: ${wantRound} products but ${roundCount} in markup`);
  else pass(`round flag preserved (${wantRound} products)`);
  if (framedCount !== wantFramed) fail(`framed flag: ${wantFramed} products but ${framedCount} in markup`);
  else pass(`framed flag preserved (${wantFramed} products)`);

  /* every animation block stays behind the reduced-motion guard */
  const css = (out.match(/<style>([\s\S]*?)<\/style>/) || [,""])[1];
  const guarded = (css.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/g) || []).length;
  if (guarded < 1) fail("the reduced-motion guard is gone from the CSS");
  else pass(`reduced-motion guard present (${guarded} block${guarded > 1 ? "s" : ""})`);

  /* squares must use padding-top, not aspect-ratio (iOS Safari) */
  if (/aspect-ratio\s*:\s*1/.test(css))
    fail("aspect-ratio:1 found — square frames must use padding-top:100% for iOS Safari");
  else pass("square frames still use padding-top, not aspect-ratio");

  /* every referenced photo must exist */
  // only real references — src="..." and url(...) — not the examples in comments
  const refs = [...new Set([
    ...[...out.matchAll(/src="(photos\/[^"]+)"/g)].map(m => m[1]),
    ...[...out.matchAll(/url\(&quot;(photos\/[^&]+)&quot;\)/g)].map(m => m[1]),
    ...[...out.matchAll(/url\("?(photos\/[^")]+)"?\)/g)].map(m => m[1]),
  ])];
  const gone = refs.filter(r => !fs.existsSync(path.join(root, r)));
  if (gone.length) fail(`missing image file(s): ${gone.join(", ")}`);
  else pass(`all ${refs.length} referenced photos exist`);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
