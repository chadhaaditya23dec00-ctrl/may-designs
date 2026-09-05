/* ============================================================
   9. BOOT
   ============================================================ */
(async function init(){
  document.getElementById("year").textContent = new Date().getFullYear();

  // Drop the hero / story photos in if they've been set above
  if(SITE_IMAGES.hero){
    const el = document.querySelector(".hero__art");
    el.style.backgroundImage = `url("${SITE_IMAGES.hero}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
  }
  if(SITE_IMAGES.story){
    const el = document.querySelector(".duo__art");
    el.style.backgroundImage = `url("${SITE_IMAGES.story}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
  }

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
