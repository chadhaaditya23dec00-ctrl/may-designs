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
  if(!art) return;

  /* The bowl cycles through the round pieces — the same shots that
     carry the round frame in the grid. Falls back to the single
     hero image if none are marked round, so this can never end up
     showing an empty circle. */
  let shots = PRODUCTS.filter(p => p.round && p.img).map(p => p.img);
  if(!shots.length && SITE_IMAGES.hero) shots = [SITE_IMAGES.hero];
  if(!shots.length) return;

  const slides = shots.map((src, i) => {
    const el = document.createElement("div");
    el.className = "hero__slide" + (i === 0 ? " is-on" : "");
    el.setAttribute("aria-hidden", "true");
    el.style.backgroundImage = `url("${photoSrc(src)}")`;
    art.appendChild(el);
    return el;
  });

  art.classList.add("has-show");
  art.style.backgroundImage = "none";

  if(slides.length < 2) return;

  /* Anyone who has asked for reduced motion gets the first shot and
     nothing moving. */
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let i = 0, paused = false;
  art.addEventListener("mouseenter", () => { paused = true;  });
  art.addEventListener("mouseleave", () => { paused = false; });

  setInterval(() => {
    if(paused || document.hidden) return;
    slides[i].classList.remove("is-on");
    i = (i + 1) % slides.length;
    slides[i].classList.add("is-on");
  }, 5000);
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
