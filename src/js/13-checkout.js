/* ============================================================
   13. CHECKOUT
   ------------------------------------------------------------
   Cart → address form → order saved → pay by UPI.

   The browser never sends a price. It sends product IDs and
   quantities; api/order.js works out what that costs. The totals
   shown here are for the customer's benefit and carry no weight.
   ============================================================ */

const CHECKOUT_KEY = "md_checkout_details";

/* Remember the address so a returning customer isn't retyping it.
   Kept on their own device only — it never leaves the browser
   except as part of an order they chose to place. */
function savedDetails(){
  try { return JSON.parse(localStorage.getItem(CHECKOUT_KEY)) || {}; }
  catch { return {}; }
}
function rememberDetails(d){
  try { localStorage.setItem(CHECKOUT_KEY, JSON.stringify(d)); } catch {}
}

function cartTotals(){
  const subtotal = state.cart.reduce((sum,l) => sum + find(l.id).price * l.qty, 0);
  const shipping = subtotal >= 1500 ? 0 : 79;
  return { subtotal, shipping, total: subtotal + shipping };
}

/* ---------- the form ---------- */

function showCheckoutForm(){
  if(!state.cart.length) return;
  const d = savedDetails();
  const { subtotal, shipping, total } = cartTotals();
  const body = document.getElementById("cartBody");
  const foot = document.getElementById("cartFoot");
  document.getElementById("cartTitle").textContent = "Delivery details";

  const field = (id, label, value, attrs = "") => `
    <label class="co__label" for="co_${id}">${label}</label>
    <input class="field co__input" id="co_${id}" value="${(value || "").replace(/"/g,"&quot;")}" ${attrs}>`;

  body.innerHTML = `
    <div class="co">
      ${field("name", "Full name", d.name, 'autocomplete="name" maxlength="120"')}
      ${field("phone", "Phone (UPI number if possible)", d.phone, 'type="tel" autocomplete="tel" maxlength="14" inputmode="numeric"')}
      ${field("email", "Email (optional)", d.email, 'type="email" autocomplete="email" maxlength="160"')}
      <label class="co__label" for="co_address">Address</label>
      <textarea class="field co__input" id="co_address" rows="3" autocomplete="street-address" maxlength="500">${d.address || ""}</textarea>
      <div class="co__row">
        <div>${field("city", "City", d.city, 'autocomplete="address-level2" maxlength="120"')}</div>
        <div>${field("pincode", "PIN code", d.pincode, 'inputmode="numeric" autocomplete="postal-code" maxlength="6"')}</div>
      </div>
      <label class="co__label" for="co_notes">Anything we should know? (optional)</label>
      <textarea class="field co__input" id="co_notes" rows="2" maxlength="500"></textarea>
      <p class="co__err" id="co_err" hidden></p>
    </div>`;

  foot.innerHTML = `
    <div class="totals"><span>Subtotal</span><strong>${rupees(subtotal)}</strong></div>
    <div class="totals"><span>Shipping</span><strong>${shipping ? rupees(shipping) : "Free"}</strong></div>
    <div class="totals" style="font-size:17px;margin:12px 0 16px"><span>Total</span><strong>${rupees(total)}</strong></div>
    <button class="btn btn--wide" id="placeOrder">Place order</button>
    <button class="btn btn--ghost btn--wide" id="backToCart" style="margin-top:8px">Back to bag</button>`;

  document.getElementById("placeOrder").addEventListener("click", placeOrder);
  document.getElementById("backToCart").addEventListener("click", () => {
    document.getElementById("cartTitle").textContent = "Your bag";
    renderCart();
  });
}

const ERRORS = {
  name_required:    "Please enter your name",
  phone_invalid:    "That doesn't look like an Indian mobile number",
  email_invalid:    "That email doesn't look right",
  address_required: "Please enter your full address",
  city_required:    "Please enter your city",
  pincode_invalid:  "PIN code should be 6 digits",
  cart_empty:       "Your bag is empty",
  not_configured:   "Orders aren't switched on yet — please message us",
};

async function placeOrder(){
  const btn = document.getElementById("placeOrder");
  const err = document.getElementById("co_err");
  const val = id => document.getElementById("co_" + id).value.trim();

  const details = {
    name: val("name"), phone: val("phone"), email: val("email"),
    address: val("address"), city: val("city"), pincode: val("pincode"),
  };

  err.hidden = true;
  btn.disabled = true; btn.textContent = "Placing your order…";

  try {
    const r = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...details,
        notes: val("notes"),
        /* IDs and quantities only — no prices leave this browser */
        items: state.cart.map(l => ({ id: l.id, qty: l.qty, option: l.option })),
      }),
    });
    const out = await r.json().catch(() => ({}));

    if(!r.ok){
      if(out.error === "sold_out"){
        err.textContent = `${out.name} just sold out — please remove it from your bag`;
      } else {
        err.textContent = ERRORS[out.error] || "Something went wrong. Please try again.";
      }
      err.hidden = false;
      return;
    }

    rememberDetails(details);
    state.cart = [];
    save();
    showPayment(out);
  } catch {
    err.textContent = "Couldn't reach the server. Check your connection and try again.";
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Place order";
  }
}

/* ---------- pay ---------- */

function showPayment(order){
  const body = document.getElementById("cartBody");
  const foot = document.getElementById("cartFoot");
  document.getElementById("cartTitle").textContent = "Almost done";

  const vpa = order.upi?.vpa;
  const link = vpa
    ? `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(order.upi.name)}` +
      `&am=${order.total}&tn=${encodeURIComponent(order.reference)}&cu=INR`
    : "";

  /* A phone can't scan a QR on its own screen, so mobile gets a button
     that opens GPay or PhonePe with everything filled in, and desktop
     gets the details to type in by hand. */
  const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  body.innerHTML = `
    <div class="pay">
      <p class="pay__ref">Order <strong>${order.reference}</strong></p>
      <p class="pay__amt">${rupees(order.total)}</p>
      ${vpa ? `
        ${isPhone ? `
          <a class="btn btn--wide" href="${link}">Pay with UPI</a>
          <p class="fineprint">Opens GPay, PhonePe or Paytm with the amount and reference already filled in.</p>
        ` : `
          <p class="pay__line">Send to <strong>${vpa}</strong></p>
          <p class="pay__line">Amount <strong>${rupees(order.total)}</strong></p>
          <p class="pay__line">Reference <strong>${order.reference}</strong></p>
          <p class="fineprint">Open any UPI app on your phone and pay to the ID above. Please include the reference so we can match your payment.</p>
        `}
      ` : `
        <p class="fineprint">We'll message you shortly with payment details.</p>
      `}
      <p class="fineprint" style="margin-top:18px">
        We'll confirm as soon as the payment lands, usually within a few hours.
        Your order is saved either way — nothing is lost if you close this.
      </p>
    </div>`;

  foot.innerHTML = `<button class="btn btn--ghost btn--wide" data-close>Done</button>`;
  renderCart.badgeOnly?.();
  document.getElementById("cartCount").textContent = "0";
}

/* Replaces the placeholder in 05-payment.js */
startCheckout = showCheckoutForm;
