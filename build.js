#!/usr/bin/env node
/* ============================================================
   BUILD
   ------------------------------------------------------------
   Assembles src/ into a single self-contained index.html.

   The output is deliberately ONE file with inline <style>,
   inline <script> and an inline JSON island. That is not
   laziness: the built-in editor (?edit) works by cloning the
   whole document and serialising it to a download. Linking the
   CSS and JS externally would hand the shopkeeper a download
   that silently loses its styling and behaviour.

   It also pre-renders the product grid, the filter chips and
   the footer category links as static markup, so the shop is
   visible with scripts disabled — iOS file previews, crawlers
   and link unfurls. The JS re-renders the same markup on load.
   ============================================================ */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const listDir = d => fs.readdirSync(path.join(root, d)).filter(f => !f.startsWith(".")).sort();

/* ---------- sources ---------- */
const dataRaw = read("src/data/products.json");
const data = JSON.parse(dataRaw);
const { images: SITE_IMAGES, categories: CATEGORIES, products: PRODUCTS } = data;

const styles = listDir("src/styles")
  .filter(f => f.endsWith(".css"))
  .map(f => read(`src/styles/${f}`))
  .join("\n\n");

const scripts = listDir("src/js")
  .filter(f => f.endsWith(".js"))
  .map(f => read(`src/js/${f}`))
  .join("\n\n");

/* ---------- pre-render ----------
   These three helpers mirror the browser-side functions in
   src/js/03-render.js. They must stay in step; verify.js checks
   that they do by diffing this output against the browser's. */
const rupees = n => n > 0 ? "₹" + n.toLocaleString("en-IN") : "Price on request";

/* the live page always ships plain paths; only a downloaded copy
   carries data URIs, and that swap happens in the browser */
const PHOTO_MAP = Object.create(null);
const photoSrc = u => PHOTO_MAP[u] || u;

const frameClass = p => (p.framed ? " card__frame--framed" : "") + (p.round ? " card__frame--round" : "");

function artHTML(p){
  if(p.img){
    const second = p.img2 ? `<img class="alt" src="${photoSrc(p.img2)}" data-src="${p.img2}" alt="" loading="lazy">` : "";
    return `<img src="${photoSrc(p.img)}" data-src="${p.img}" alt="${p.name}" loading="lazy">${second}`;
  }
  return `<div class="ph ph--${p.cat}"><span>photo</span></div>`;
}

function cardHTML(p){
  return `
    <article>
      <button class="card" data-id="${p.id}" data-sold="${!!p.sold}" aria-label="View ${p.name}">
        <span class="card__frame${frameClass(p)}">
          ${artHTML(p)}
          <span class="card__quick">${p.sold ? "Sold out" : "Quick look"}</span>
        </span>
        <span class="card__name">${p.name}</span>
        <span class="card__price">${rupees(p.price)}</span>
        ${p.sold ? '<span class="card__tag">Back soon</span>' : ""}
      </button>
    </article>`;
}

const gridHTML = PRODUCTS.map(cardHTML).join("");

const chipsHTML = [["all","Everything"], ...Object.entries(CATEGORIES)]
  .map(([k,l]) => `<button class="chip" data-cat="${k}" aria-pressed="${k === "all"}">${l}</button>`)
  .join("");

const footerCatsHTML = Object.entries(CATEGORIES)
  .map(([k,l]) => `<li><a href="#browse" data-cat="${k}" class="chip-link">${l}</a></li>`)
  .join("");

/* ---------- assemble ---------- */
let out = read("src/index.template.html");

const fill = (marker, value) => {
  if(!out.includes(marker)) throw new Error(`template is missing ${marker}`);
  out = out.replace(marker, () => value);
};

fill("<!--STYLES-->", styles);
fill("<!--SCRIPTS-->", scripts);
fill("<!--DATA-->", dataRaw.replace(/\s*$/, ""));
fill("<!--GRID-->", gridHTML);
fill("<!--CHIPS-->", chipsHTML);
fill("<!--FOOTERCATS-->", footerCatsHTML);

out = "<!doctype html>\n" + out;
fs.writeFileSync(path.join(root, "index.html"), out, "utf8");

/* ---------- report ---------- */
const kb = n => (n / 1024).toFixed(1) + "KB";
console.log(`built index.html  ${kb(Buffer.byteLength(out))}`);
console.log(`  ${PRODUCTS.length} products pre-rendered`);
console.log(`  ${listDir("src/styles").length} css + ${listDir("src/js").length} js files inlined`);
