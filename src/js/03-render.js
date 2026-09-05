/* ============================================================
   3. RENDERING
   ============================================================ */
function frameClass(p){
  return (p.framed ? " card__frame--framed" : "") + (p.round ? " card__frame--round" : "");
}

function artHTML(p){
  if(p.img){
    const second = p.img2 ? `<img class="alt" src="${p.img2}" alt="" loading="lazy">` : "";
    return `<img src="${p.img}" alt="${p.name}" loading="lazy">${second}`;
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

function visibleProducts(){
  let list = PRODUCTS.slice();
  if(state.filter !== "all") list = list.filter(p => p.cat === state.filter);
  if(state.query){
    const q = state.query.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.material || "").toLowerCase().includes(q) ||
      CATEGORIES[p.cat].toLowerCase().includes(q)
    );
  }
  if(state.sort === "low")  list.sort((a,b) => a.price - b.price);
  if(state.sort === "high") list.sort((a,b) => b.price - a.price);
  return list;
}

function renderGrid(){
  const list = visibleProducts();
  document.getElementById("grid").innerHTML = list.map(cardHTML).join("");
  document.getElementById("empty").hidden = list.length > 0;
}

function renderChips(){
  const cats = [["all","Everything"], ...Object.entries(CATEGORIES)];
  document.getElementById("chips").innerHTML = cats.map(([k,label]) =>
    `<button class="chip" data-cat="${k}" aria-pressed="${state.filter===k}">${label}</button>`
  ).join("");
}

/* Recommendations: score by how often a category was viewed,
   then show unseen pieces from the strongest categories first. */
function renderPicked(){
  const band = document.getElementById("pickedBand");
  if(state.viewed.length < 2){ band.hidden = true; return; }

  const weight = {};
  state.viewed.forEach((id,i) => {
    const p = find(id);
    if(p) weight[p.cat] = (weight[p.cat] || 0) + (i + 1);
  });

  const picks = PRODUCTS
    .filter(p => !p.sold && !state.viewed.includes(p.id))
    .sort((a,b) => (weight[b.cat] || 0) - (weight[a.cat] || 0))
    .slice(0,4);

  if(!picks.length){ band.hidden = true; return; }
  document.getElementById("pickedGrid").innerHTML = picks.map(cardHTML).join("");
  band.hidden = false;
}

function renderCart(){
  const body = document.getElementById("cartBody");
  const foot = document.getElementById("cartFoot");
  const count = state.cart.reduce((n,l) => n + l.qty, 0);
  document.getElementById("cartCount").textContent = count;

  if(!state.cart.length){
    body.innerHTML = `<div class="empty"><p>Your bag is empty.</p>
      <button class="btn btn--ghost" data-close>Start browsing</button></div>`;
    foot.innerHTML = "";
    return;
  }

  body.innerHTML = state.cart.map(line => {
    const p = find(line.id);
    return `
      <div class="line">
        <div class="line__thumb">${artHTML(p)}</div>
        <div class="line__body">
          <p class="line__name">${p.name}</p>
          <p class="line__meta">${line.option ? line.option + " · " : ""}${rupees(p.price)}</p>
          <div class="qty">
            <button data-step="-1" data-key="${line.key}" aria-label="Reduce quantity">−</button>
            <span>${line.qty}</span>
            <button data-step="1" data-key="${line.key}" aria-label="Increase quantity">+</button>
          </div>
          <button class="link-btn" data-remove="${line.key}" style="margin-left:12px">Remove</button>
        </div>
        <div class="line__price">${rupees(p.price * line.qty)}</div>
      </div>`;
  }).join("");

  const subtotal = state.cart.reduce((sum,l) => sum + find(l.id).price * l.qty, 0);
  const shipping = subtotal >= 1500 ? 0 : 79;

  foot.innerHTML = `
    <div class="totals"><span>Subtotal</span><strong>${rupees(subtotal)}</strong></div>
    <div class="totals"><span>Shipping</span><strong>${shipping ? rupees(shipping) : "Free"}</strong></div>
    <div class="totals" style="font-size:17px;margin:12px 0 16px"><span>Total</span><strong>${rupees(subtotal + shipping)}</strong></div>
    <button class="btn btn--wide" id="checkout">Go to payment</button>
    <p class="fineprint">${shipping ? "Free shipping over ₹1,500" : "Shipping is on us"}</p>`;
}
