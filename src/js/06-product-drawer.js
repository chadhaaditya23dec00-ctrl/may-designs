/* ============================================================
   6. PRODUCT DRAWER
   ============================================================ */
let pdCurrent = null, pdOption = null;

function openProduct(id){
  const p = find(id);
  if(!p) return;
  pdCurrent = p;
  pdOption = p.options.length ? p.options[0] : null;

  state.viewed = [id, ...state.viewed.filter(v => v !== id)].slice(0,12);
  save();

  document.getElementById("pdTitle").textContent = CATEGORIES[p.cat];
  document.getElementById("pdBody").innerHTML = `
    <div class="pd__art${p.framed ? ' pd__art--framed' : ''}${p.round ? ' pd__art--round' : ''}">${p.img ? `<img src="${p.img}" alt="${p.name}">` : artHTML(p)}</div>
    ${p.img2 ? `<div class="pd__art">
      <img src="${p.img2}" alt="${p.name}, second view">
    </div>` : ""}
    <h3 class="display pd__name">${p.name}</h3>
    <p class="pd__price">${rupees(p.price)}</p>
    <p class="pd__desc">${p.desc}</p>
    ${p.options.length ? `
      <p class="pd__label">Choose one</p>
      <div class="opts" id="opts">
        ${p.options.map((o,i) => `<button class="opt" data-opt="${o}" aria-pressed="${i===0}">${o}</button>`).join("")}
      </div>` : ""}
    <ul class="spec">
      <li><span>Material</span><span>${p.material}</span></li>
      ${p.size ? `<li><span>Size</span><span>${p.size}</span></li>` : ""}
      <li><span>Ships</span><span>Within 3 working days</span></li>
    </ul>`;

  document.getElementById("pdFoot").innerHTML = p.sold
    ? `<button class="btn btn--wide" disabled>Sold out</button>
       <p class="fineprint">Usually restocked within a fortnight</p>`
    : `<button class="btn btn--wide" id="addBtn">Add to bag · ${rupees(p.price)}</button>`;

  openDrawer("pdDrawer");
  renderPicked();
}
