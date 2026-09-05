/* ============================================================
   7. DRAWER PLUMBING
   ============================================================ */
let lastFocus = null;

function openDrawer(id){
  lastFocus = document.activeElement;
  document.querySelectorAll(".drawer").forEach(d => {
    d.dataset.open = "false";
    d.setAttribute("aria-hidden","true");
  });
  const d = document.getElementById(id);
  d.dataset.open = "true";
  d.setAttribute("aria-hidden","false");
  document.getElementById("scrim").dataset.open = "true";
  document.body.style.overflow = "hidden";
  d.querySelector("[data-close]")?.focus();
}
function closeDrawers(){
  document.querySelectorAll(".drawer").forEach(d => {
    d.dataset.open = "false";
    d.setAttribute("aria-hidden","true");
  });
  document.getElementById("scrim").dataset.open = "false";
  document.body.style.overflow = "";
  lastFocus?.focus();
}

let toastTimer;
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.dataset.show = "true";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.dataset.show = "false", 2600);
}
