/* ============================================================
   9. BOOT
   ============================================================ */
/* In a copy downloaded from edit mode the photos are inlined as
   data URIs in the markup, and the photos/ folder is not there.
   Harvest them before the first render, otherwise renderGrid()
   would swap them back for paths that resolve to nothing. Does
   nothing on the live site, where the srcs are ordinary paths. */
function adoptInlinedPhotos(){
  document.querySelectorAll("img[data-src]").forEach(img => {
    const src = img.getAttribute("src") || "";
    if(src.startsWith("data:")) PHOTO_MAP[img.getAttribute("data-src")] = src;
  });
  document.querySelectorAll("[data-photo]").forEach(el => {
    const m = /url\(["']?(data:[^"')]+)["']?\)/.exec(el.style.backgroundImage || "");
    if(m) PHOTO_MAP[el.getAttribute("data-photo")] = m[1];
  });
}

/* The hero is the baked-in bowl photo on a single slide that turns slowly
   (one revolution every 56s, paused on hover — see 09-motion.css). The bowl
   is a circle cut out on a transparent square, so turning it about its
   centre leaves the rim still and only moves the pair resting inside. The
   frame's gradient and placeholder label are cleared so the cut-out sits
   straight on the page. */
function mountHero(){
  const art = document.querySelector(".hero__art");
  if(!art || !SITE_IMAGES.hero) return;

  const slide = document.createElement("div");
  slide.className = "hero__slide";
  slide.setAttribute("aria-hidden", "true");
  slide.style.backgroundImage = `url("${photoSrc(SITE_IMAGES.hero)}")`;
  art.appendChild(slide);

  art.classList.add("has-show");
  art.style.backgroundImage = "none";
}

(async function init(){
  document.getElementById("year").textContent = new Date().getFullYear();

  adoptInlinedPhotos();

  // Drop the hero / story photos in if they've been set above
  if(SITE_IMAGES.hero){
    const el = document.querySelector(".hero__art");
    el.style.backgroundImage = `url("${photoSrc(SITE_IMAGES.hero)}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
  }
  if(SITE_IMAGES.story){
    const el = document.querySelector(".duo__art");
    el.style.backgroundImage = `url("${photoSrc(SITE_IMAGES.story)}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
  }
  mountHero();

  document.getElementById("footerCats").innerHTML = Object.entries(CATEGORIES)
    .map(([k,label]) => `<li><a href="#browse" data-cat="${k}" class="chip-link">${label}</a></li>`).join("");

  // Draw the catalogue first. Nothing here waits on storage, so a slow
  // or unavailable storage layer can never leave the page empty.
  renderChips();
  renderGrid();

  try { await load(); } catch(e) { /* carry on with an empty cart */ }
  renderCart();
  renderPicked();
  renderShapes();
  armSecretToggle();
  if(EDIT_MODE) startEditMode();

  document.querySelectorAll(".chip-link").forEach(a => {
    a.addEventListener("click", () => {
      state.filter = a.dataset.cat;
      renderChips(); renderGrid();
    });
  });
})();
