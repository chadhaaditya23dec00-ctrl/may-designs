/* ============================================================
   4. CART ACTIONS
   ============================================================ */
/* replay a CSS animation by removing the class, forcing a reflow, re-adding */
function replay(el, cls){
  if(!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function addToCart(id, option){
  const key = id + "|" + (option || "");
  const line = state.cart.find(l => l.key === key);
  if(line) line.qty++;
  else state.cart.push({key, id, option: option || "", qty:1});
  save(); renderCart();
  replay(document.getElementById("cartCount"), "bump");
  replay(document.getElementById("cartOpen"), "is-pop");
  toast("Added to your bag");
}
function step(key, delta){
  const line = state.cart.find(l => l.key === key);
  if(!line) return;
  line.qty += delta;
  if(line.qty < 1) state.cart = state.cart.filter(l => l.key !== key);
  save(); renderCart();
}
function removeLine(key){
  state.cart = state.cart.filter(l => l.key !== key);
  save(); renderCart();
}
