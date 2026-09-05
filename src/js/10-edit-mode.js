/* ============================================================
   EDIT MODE
   ------------------------------------------------------------
   Add ?edit to the address to switch it on. Product details are
   changed in a form; headings and paragraphs become editable in
   place. "Download updated site" writes a fresh copy of this
   file with everything baked in — nothing is saved to a server,
   so upload the downloaded file to publish the changes.

   "Download products.json" gives the catalogue back in source
   form. Use that one if you keep the project in git: drop it
   into src/data/ and rebuild, otherwise the next build will
   overwrite the edits.
   ============================================================ */
let EDIT_MODE = new URLSearchParams(location.search).has("edit")
             || location.hash.toLowerCase() === "#edit";

/* Some viewers (the Claude app, an embedded preview) give you no
   address bar to type ?edit into. So tapping the footer year five
   times quickly also turns edit mode on. Customers won't find it
   by accident, and it does nothing on the live site except let
   whoever tapped it download a copy to their own computer. */
function armSecretToggle(){
  const el = document.getElementById("year");
  if(!el) return;
  el.style.cursor = "default";
  let taps = 0, timer = null;
  el.addEventListener("click", () => {
    if(EDIT_MODE) return;
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => taps = 0, 900);
    if(taps >= 5){
      taps = 0;
      EDIT_MODE = true;
      startEditMode();
      toast("Edit mode on");
    }
  });
}

function moneyIn(v){
  const n = Math.round(Number(String(v).replace(/[^\d.]/g, "")) || 0);
  return n < 0 ? 0 : n;
}

function renderEditor(){
  document.getElementById("editorBody").innerHTML = PRODUCTS.map((p, i) => `
    <div class="erow" data-i="${i}">
      <div class="erow__thumb">${p.img ? `<img src="${p.img}" alt="">` : ""}</div>
      <div class="efields">
        <p class="elabel">Name</p>
        <input data-f="name" value="${escapeAttr(p.name)}">
        <div class="epair">
          <div>
            <p class="elabel">Price in rupees (0 hides it)</p>
            <input data-f="price" inputmode="numeric" value="${p.price}">
          </div>
          <div>
            <p class="elabel">Category</p>
            <select data-f="cat">
              ${Object.entries(CATEGORIES).map(([k,l]) =>
                `<option value="${k}"${k===p.cat?" selected":""}>${l}</option>`).join("")}
            </select>
          </div>
        </div>
        <p class="elabel">Description</p>
        <textarea data-f="desc">${escapeText(p.desc || "")}</textarea>
        <div class="epair">
          <div>
            <p class="elabel">Material</p>
            <input data-f="material" value="${escapeAttr(p.material || "")}">
          </div>
          <div>
            <p class="elabel">Size</p>
            <input data-f="size" value="${escapeAttr(p.size || "")}">
          </div>
        </div>
        <p class="elabel">Options, separated by commas</p>
        <input data-f="options" value="${escapeAttr((p.options || []).join(", "))}">
        <label class="echeck"><input type="checkbox" data-f="sold"${p.sold?" checked":""}> Sold out</label>
      </div>
    </div>`).join("");
}

function escapeAttr(v){ return String(v).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"); }
function escapeText(v){ return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

function collectEditor(){
  document.querySelectorAll(".erow").forEach(row => {
    const p = PRODUCTS[Number(row.dataset.i)];
    row.querySelectorAll("[data-f]").forEach(f => {
      const k = f.dataset.f;
      if(k === "sold"){ if(f.checked) p.sold = true; else delete p.sold; }
      else if(k === "price") p.price = moneyIn(f.value);
      else if(k === "options") p.options = f.value.split(",").map(t => t.trim()).filter(Boolean);
      else p[k] = f.value.trim();
    });
  });
}

function applyEdits(){
  collectEditor();
  document.getElementById("site-data").textContent =
    JSON.stringify({images: SITE_IMAGES, categories: CATEGORIES, products: PRODUCTS}, null, 2);
  renderChips(); renderGrid(); renderPicked(); renderCart(); renderEditor();
}

/* Produce a clean copy of the page: strip anything the scripts
   drew at runtime, so the downloaded file matches the original. */
function buildDownload(){
  applyEdits();
  const doc = document.documentElement.cloneNode(true);

  doc.querySelectorAll("#pickedGrid, #cartBody, #cartFoot, #shapes, #chosen, #editorBody, #pdBody, #pdFoot")
     .forEach(el => el.innerHTML = "");
  // bake the full, unfiltered catalogue back in so the file still shows
  // its products if it's ever opened somewhere scripts don't run
  const g = doc.querySelector("#grid");
  if(g) g.innerHTML = PRODUCTS.map(cardHTML).join("");
  const ch = doc.querySelector("#chips");
  if(ch) ch.innerHTML = [["all","Everything"], ...Object.entries(CATEGORIES)]
    .map(([k,l]) => `<button class="chip" data-cat="${k}" aria-pressed="${k==="all"}">${l}</button>`).join("");
  doc.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
  doc.querySelectorAll("[data-open]").forEach(el => el.setAttribute("data-open","false"));
  // keep the baked-in hero/story images so downloaded copies still show them
  const setBg = (sel, path) => {
    const el = doc.querySelector(sel);
    if(!el) return;
    if(path) el.setAttribute("style",
      `background-image:url("${path}");background-size:cover;background-position:center`);
    else el.removeAttribute("style");
  };
  setBg(".hero__art", SITE_IMAGES.hero);
  setBg(".duo__art",  SITE_IMAGES.story);
  doc.querySelectorAll(".editbar").forEach(el => el.remove());
  const ed = doc.querySelector("#editor"); if(ed) ed.setAttribute("aria-hidden","true");
  const body = doc.querySelector("body"); if(body) body.classList.remove("editing");
  const hdr = doc.querySelector("#header"); if(hdr) hdr.removeAttribute("data-stuck");
  const pk  = doc.querySelector("#pickedBand"); if(pk) pk.setAttribute("hidden","");
  const cc  = doc.querySelector("#cartCount"); if(cc) cc.textContent = "0";
  const st  = doc.querySelector("#customStatus");
  if(st) st.textContent = "Painted to order, usually two to three weeks.";

  saveBlob(new Blob(["<!doctype html>\n" + doc.outerHTML], {type:"text/html"}), "index.html");
  toast("Downloaded. Upload this file to publish the changes.");
}

function saveBlob(blob, filename){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* The page is now built from src/data/products.json, so an edited
   index.html on its own would be overwritten by the next build.
   This hands back the catalogue in source form to drop into
   src/data/ so the change survives. */
function downloadData(){
  applyEdits();
  const json = JSON.stringify({images: SITE_IMAGES, categories: CATEGORIES, products: PRODUCTS}, null, 2);
  saveBlob(new Blob([json + "\n"], {type:"application/json"}), "products.json");
  toast("Downloaded. Replace src/data/products.json with this.");
}

function startEditMode(){
  document.body.classList.add("editing");
  document.querySelectorAll("[data-edit]").forEach(el => {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
  });

  const bar = document.createElement("div");
  bar.className = "editbar";
  bar.innerHTML = `
    <strong>Edit mode</strong>
    <span style="opacity:.75">Dashed text can be typed over</span>
    <span class="spacer"></span>
    <button class="ghost" id="openEditor">Products &amp; prices</button>
    <button id="downloadSite">Download updated site</button>
    <button class="ghost" id="downloadData">Download products.json</button>
    <button class="ghost" id="exitEdit">Done</button>`;
  document.body.appendChild(bar);
  renderEditor();
}

document.addEventListener("click", e => {
  if(e.target.id === "openEditor"){
    document.getElementById("editor").dataset.open = "true";
    document.getElementById("editor").setAttribute("aria-hidden","false");
  }
  if(e.target.id === "editorClose"){
    applyEdits();
    document.getElementById("editor").dataset.open = "false";
    document.getElementById("editor").setAttribute("aria-hidden","true");
  }
  if(e.target.id === "downloadSite") buildDownload();
  if(e.target.id === "downloadData") downloadData();
  if(e.target.id === "exitEdit"){
    applyEdits();
    EDIT_MODE = false;
    document.body.classList.remove("editing");
    document.querySelectorAll("[data-edit]").forEach(el => el.removeAttribute("contenteditable"));
    document.querySelector(".editbar")?.remove();
    toast("Edit mode off");
  }
});
