/* ============================================================
   8. EVENTS
   ============================================================ */
document.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if(card){
    replay(card.querySelector(".card__frame"), "is-pop");
    openProduct(card.dataset.id);
    return;
  }

  const chip = e.target.closest(".chip");
  if(chip){
    state.filter = chip.dataset.cat;
    renderChips(); renderGrid();
    const again = document.querySelector(`.chip[data-cat="${state.filter}"]`);
    replay(again, "is-pop");
    return;
  }

  const opt = e.target.closest(".opt");
  if(opt){
    replay(opt, "is-pop");
    pdOption = opt.dataset.opt;
    document.querySelectorAll("#opts .opt").forEach(b =>
      b.setAttribute("aria-pressed", String(b === opt)));
    return;
  }

  if(e.target.id === "addBtn" && pdCurrent){ replay(e.target, "is-pop"); addToCart(pdCurrent.id, pdOption); return; }
  if(e.target.id === "checkout"){ startCheckout(); return; }
  if(e.target.id === "cartOpen"){ renderCart(); openDrawer("cartDrawer"); return; }

  const stepBtn = e.target.closest("[data-step]");
  if(stepBtn){ step(stepBtn.dataset.key, Number(stepBtn.dataset.step)); return; }

  const rm = e.target.closest("[data-remove]");
  if(rm){ removeLine(rm.dataset.remove); return; }

  if(e.target.closest("[data-close]") || e.target.id === "scrim"){ closeDrawers(); return; }

  if(e.target.id === "resetFilters"){
    state.filter = "all"; state.query = ""; 
    document.getElementById("search").value = "";
    renderChips(); renderGrid();
    return;
  }

  if(e.target.id === "clearHistory"){
    state.viewed = [];
    save(); renderPicked();
    toast("History cleared");
    return;
  }
});

document.addEventListener("keydown", e => {
  if(e.key === "Escape") closeDrawers();
});

document.getElementById("search").addEventListener("input", e => {
  state.query = e.target.value.trim();
  renderGrid();
});
document.getElementById("sort").addEventListener("change", e => {
  state.sort = e.target.value;
  renderGrid();
});

window.addEventListener("scroll", () => {
  document.getElementById("header").dataset.stuck = window.scrollY > 8;
}, {passive:true});
