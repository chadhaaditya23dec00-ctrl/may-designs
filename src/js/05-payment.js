/* ============================================================
   5. PAYMENT — INTEGRATION POINT
   ------------------------------------------------------------
   Right now this shows a placeholder message. To take real
   payments you need a small server endpoint; the secret key
   must never sit in this file.

   Replace the body of startCheckout() with roughly this:

     const res = await fetch("/api/create-order", {
       method:"POST",
       headers:{"Content-Type":"application/json"},
       body: JSON.stringify({ items: state.cart, amount: total })
     });
     const order = await res.json();
     new Razorpay({
       key: order.keyId,              // publishable key only
       order_id: order.id,
       amount: order.amount,
       name: "MAY DESIGNS",
       handler: r => { ... send r to your verify-payment endpoint ... }
     }).open();

   Your server does two jobs: create the order with your secret
   key, and verify the signature afterwards. Never trust an
   amount that came from the browser — recalculate it server-side
   from the product IDs.
   ============================================================ */
function startCheckout(){
  toast("Payments aren't connected yet — see the notes in the code");
}
