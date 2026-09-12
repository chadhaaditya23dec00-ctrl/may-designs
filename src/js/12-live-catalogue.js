/* ============================================================
   12. LIVE CATALOGUE  +  PUBLISH
   ------------------------------------------------------------
   Prices and sold-out flags need to change without a git push.
   This layer adds that on top of the baked-in catalogue instead
   of replacing it, which keeps everything the README insists on:

     - the grid is still pre-rendered into the markup, so the shop
       renders with no JavaScript and no network
     - a file:// copy from edit mode still works — the fetch is
       skipped there entirely
     - every failure here is silent and leaves the baked-in
       catalogue on screen

   So the built page is the floor, never the ceiling. If Supabase
   is down, unconfigured, or slow, the shop still sells.
   ============================================================ */

const LIVE_OK = location.protocol === "http:" || location.protocol === "https:";

async function loadLiveCatalogue(){
  if(!LIVE_OK) return false;
  try {
    const r = await fetch("/api/catalogue", { cache: "no-store" });
    if(r.status !== 200) return false;           // 204 = nothing published yet
    const { data } = await r.json();
    if(!data?.products?.length) return false;

    /* Mutate in place. PRODUCTS is a const bound reference that
       every other module closed over at load; reassigning it
       would leave the rest of the page pointing at the old array. */
    PRODUCTS.length = 0;
    data.products.forEach(p => PRODUCTS.push(p));

    if(data.images){
      SITE_IMAGES.hero  = data.images.hero  ?? SITE_IMAGES.hero;
      SITE_IMAGES.story = data.images.story ?? SITE_IMAGES.story;
    }

    /* Drop anything from the cart that no longer exists or has
       since sold out, so nobody reaches checkout holding a piece
       you can't ship. */
    const sellable = new Set(PRODUCTS.filter(p => !p.sold).map(p => p.id));
    const before = state.cart.length;
    state.cart = state.cart.filter(line => sellable.has(line.id));
    if(state.cart.length !== before){
      save();
      toast("Something in your bag just sold out — it's been removed");
    }

    renderChips(); renderGrid(); renderPicked(); renderCart();
    if(typeof EDIT_MODE !== "undefined" && EDIT_MODE) renderEditor();
    return true;
  } catch { return false; }
}

/* ============================================================
   PUBLISH — the save button the editor never had
   ------------------------------------------------------------
   The existing editor downloads products.json for you to commit.
   That stays, and is still the right move for copy changes you
   want in git. This is for the fast ones: a price, a sold-out
   toggle, a piece added or pulled.
   ============================================================ */

const ADMIN_KEY = "md_admin_token";

function adminToken(){
  let t = sessionStorage.getItem(ADMIN_KEY);
  if(!t){
    t = prompt("Admin token") || "";
    // sessionStorage, not localStorage: the token dies with the tab
    // rather than sitting on the device indefinitely.
    if(t) sessionStorage.setItem(ADMIN_KEY, t);
  }
  return t;
}

async function publishCatalogue(btn){
  collectEditor();
  const token = adminToken();
  if(!token) return;

  const label = btn.textContent;
  btn.disabled = true; btn.textContent = "Publishing…";
  try {
    const r = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        images: SITE_IMAGES, categories: CATEGORIES, products: PRODUCTS,
      }),
    });
    const out = await r.json().catch(() => ({}));

    if(r.status === 401){
      sessionStorage.removeItem(ADMIN_KEY);
      toast("Token rejected — try again");
    } else if(r.status === 503){
      toast("Supabase isn't configured in Vercel yet");
    } else if(!r.ok){
      toast(`Not published: ${out.error || r.status}${out.id ? ` (${out.id})` : ""}`);
    } else {
      applyEdits();
      toast(`Published — ${out.count} products live`);
    }
  } catch {
    toast("Couldn't reach the server");
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

/* ============================================================
   ADD / REMOVE PRODUCTS
   ============================================================ */

function newProductId(){
  let n = 1;
  const taken = new Set(PRODUCTS.map(p => p.id));
  while(taken.has("n" + n)) n++;
  return "n" + n;
}

function addProduct(){
  PRODUCTS.unshift({
    id: newProductId(),
    name: "New piece",
    cat: Object.keys(CATEGORIES)[0],
    price: 0,
    img: "", options: [], desc: "", material: "", size: "",
  });
  applyEdits();
  document.getElementById("editorBody")?.scrollTo({ top: 0, behavior: "smooth" });
}

function removeProduct(i){
  const p = PRODUCTS[i];
  if(!p) return;
  if(!confirm(`Remove "${p.name}"? This can't be undone from here.`)) return;
  PRODUCTS.splice(i, 1);
  applyEdits();
}

/* Wrap renderEditor rather than editing 10-edit-mode.js, so the
   original stays exactly as written and this stays removable. */
const _renderEditorBase = renderEditor;
renderEditor = function(){
  _renderEditorBase();
  document.querySelectorAll(".erow").forEach(row => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ghost erow__remove";
    b.textContent = "Remove";
    b.addEventListener("click", () => removeProduct(Number(row.dataset.i)));
    row.querySelector(".efields")?.appendChild(b);
  });
};

/* ============================================================
   WIRE-UP
   ============================================================ */

function mountAdminBar(){
  const bar = document.querySelector(".editbar");
  if(!bar || bar.querySelector("#publishBtn")) return;

  const add = document.createElement("button");
  add.type = "button"; add.className = "ghost"; add.id = "addBtn";
  add.textContent = "Add product";
  add.addEventListener("click", addProduct);

  const pub = document.createElement("button");
  pub.type = "button"; pub.className = "solid"; pub.id = "publishBtn";
  pub.textContent = "Publish";
  pub.addEventListener("click", () => publishCatalogue(pub));

  bar.prepend(add, pub);
}

(function initLive(){
  // Let boot finish its first paint before touching the DOM again.
  const start = () => {
    loadLiveCatalogue();
    if(typeof EDIT_MODE !== "undefined" && EDIT_MODE){
      // startEditMode() builds .editbar; wait for it.
      const t = setInterval(() => {
        if(document.querySelector(".editbar")){ clearInterval(t); mountAdminBar(); }
      }, 60);
      setTimeout(() => clearInterval(t), 5000);
    }
  };
  if(document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
