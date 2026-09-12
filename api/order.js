/* ============================================================
   POST /api/order
   ------------------------------------------------------------
   Takes a cart and a delivery address, and writes an order.

   The one rule this file exists to enforce: the browser sends
   product IDs and quantities, never prices. Every rupee is
   recomputed here from the server's own catalogue. A customer
   who edits the page and sends ₹1 gets charged the real price.
   ============================================================ */
import FALLBACK from "../src/data/products.json" with { type: "json" };

const URL_   = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;

const FREE_SHIPPING_OVER = 1500;
const SHIPPING_FLAT      = 79;

/* The live catalogue if one has been published, otherwise the copy
   built into the deployment. Either way it comes from the server. */
async function priceList(){
  if(URL_ && SECRET){
    try {
      const r = await fetch(
        `${URL_}/rest/v1/catalogue?id=eq.1&select=data`,
        { headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` } }
      );
      if(r.ok){
        const rows = await r.json();
        const live = rows?.[0]?.data?.products;
        if(live?.length) return live;
      }
    } catch { /* fall through */ }
  }
  return FALLBACK.products;
}

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

function validateCustomer(b){
  const out = {
    customer_name: clean(b.name, 120),
    phone:         clean(b.phone, 20).replace(/[^\d+]/g, ""),
    email:         clean(b.email, 160),
    address:       clean(b.address, 500),
    city:          clean(b.city, 120),
    pincode:       clean(b.pincode, 10).replace(/\D/g, ""),
    notes:         clean(b.notes, 500),
  };
  if(out.customer_name.length < 2)      return { error: "name_required" };
  if(!/^(\+91)?[6-9]\d{9}$/.test(out.phone)) return { error: "phone_invalid" };
  if(out.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email))
    return { error: "email_invalid" };
  if(out.address.length < 10)           return { error: "address_required" };
  if(!out.city)                         return { error: "city_required" };
  if(!/^\d{6}$/.test(out.pincode))      return { error: "pincode_invalid" };
  return { value: out };
}

async function notify(order){
  if(!TG_TOKEN || !TG_CHAT) return;
  const lines = order.items.map(i => `• ${i.qty}× ${i.name}${i.option ? ` (${i.option})` : ""} — ₹${i.line_total}`);
  const text =
    `🧾 New order ${order.reference}\n₹${order.total}\n\n` +
    `${lines.join("\n")}\n\n` +
    `${order.customer_name}\n${order.phone}\n` +
    `${order.address}, ${order.city} ${order.pincode}` +
    (order.notes ? `\n\nNote: ${order.notes}` : "");
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text }),
    });
  } catch { /* an order that saved but didn't ping is still an order */ }
}

export default async function handler(req, res){
  if(req.method !== "POST"){
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if(!URL_ || !SECRET) return res.status(503).json({ error: "not_configured" });

  const body = req.body && typeof req.body === "object" ? req.body : {};

  const who = validateCustomer(body);
  if(who.error) return res.status(400).json({ error: who.error });

  if(!Array.isArray(body.items) || !body.items.length)
    return res.status(400).json({ error: "cart_empty" });
  if(body.items.length > 50)
    return res.status(400).json({ error: "cart_too_large" });

  const catalogue = await priceList();
  const byId = new Map(catalogue.map(p => [p.id, p]));

  const items = [];
  let subtotal = 0;
  for(const raw of body.items){
    const p = byId.get(String(raw.id ?? ""));
    if(!p)      return res.status(400).json({ error: "unknown_product", id: raw?.id ?? null });
    if(p.sold)  return res.status(409).json({ error: "sold_out", id: p.id, name: p.name });
    if(!p.price) return res.status(409).json({ error: "not_for_sale", id: p.id, name: p.name });

    const qty = Math.floor(Number(raw.qty));
    if(!Number.isFinite(qty) || qty < 1 || qty > 20)
      return res.status(400).json({ error: "bad_quantity", id: p.id });

    const line_total = p.price * qty;       // server price, always
    subtotal += line_total;
    items.push({
      id: p.id, name: p.name, option: clean(raw.option, 60),
      qty, unit_price: p.price, line_total,
    });
  }

  const shipping = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  const total    = subtotal + shipping;

  const row = { ...who.value, items, subtotal, shipping, total, method: "upi" };

  try {
    const r = await fetch(`${URL_}/rest/v1/orders`, {
      method: "POST",
      headers: {
        apikey: SECRET,
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });
    if(!r.ok) return res.status(502).json({ error: "order_write_failed", status: r.status });

    const saved = (await r.json())[0];
    notify(saved);   // deliberately not awaited — the customer shouldn't wait on Telegram

    return res.status(200).json({
      reference: saved.reference,
      total:     saved.total,
      subtotal:  saved.subtotal,
      shipping:  saved.shipping,
      upi: {
        vpa:  process.env.UPI_VPA  || "",
        name: process.env.UPI_NAME || "MAY DESIGNS",
      },
    });
  } catch {
    return res.status(502).json({ error: "store_unreachable" });
  }
}
