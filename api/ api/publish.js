/* ============================================================
   POST /api/publish
   ------------------------------------------------------------
   The admin panel's save button. Validates a whole catalogue
   and writes it as one row.

   Auth is a shared secret in ADMIN_TOKEN (Vercel env var),
   sent as `Authorization: Bearer <token>`. That is deliberately
   modest: one owner, no user accounts to manage, nothing to
   misconfigure tonight. It is also the weakest link here — the
   token is the only thing between the internet and your prices,
   so make it long and random, and move to Supabase magic-link
   auth when the rush is over.
   ============================================================ */
const URL_   = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN  = process.env.ADMIN_TOKEN;

/* Constant-time compare. A plain === leaks the token a character
   at a time to anyone willing to measure the response. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Whitelist the shape. Anything not listed is dropped, so a
   compromised or buggy admin panel can't inject arbitrary keys
   that later get rendered into the page. */
function cleanProduct(p, categories) {
  const id = String(p.id ?? "").trim();
  if (!/^[a-z0-9_-]{1,32}$/i.test(id)) return null;

  const cat = String(p.cat ?? "").trim();
  if (!Object.prototype.hasOwnProperty.call(categories, cat)) return null;

  const price = Number(p.price);
  if (!Number.isFinite(price) || price < 0 || price > 1000000) return null;

  const str = (v, max) => String(v ?? "").slice(0, max);
  const photo = v => {
    const s = String(v ?? "").trim();
    return /^photos\/[a-z0-9._-]{1,80}$/i.test(s) ? s : "";
  };

  const out = {
    id,
    cat,
    price: Math.round(price),
    name:     str(p.name, 120),
    desc:     str(p.desc, 2000),
    material: str(p.material, 300),
    size:     str(p.size, 120),
    img:  photo(p.img),
    img2: photo(p.img2),
    options: Array.isArray(p.options)
      ? p.options.slice(0, 12).map(o => str(o, 60)).filter(Boolean)
      : [],
  };
  if (p.sold)   out.sold   = true;
  if (p.round)  out.round  = true;
  if (p.framed) out.framed = true;
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!URL_ || !SECRET || !TOKEN) {
    return res.status(503).json({ error: "not_configured" });
  }

  const sent = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(sent, TOKEN)) {
    return res.status(401).json({ error: "unauthorised" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const categories = body.categories;
  if (!categories || typeof categories !== "object") {
    return res.status(400).json({ error: "categories_missing" });
  }
  if (!Array.isArray(body.products)) {
    return res.status(400).json({ error: "products_missing" });
  }

  const products = [];
  const seen = new Set();
  for (const raw of body.products.slice(0, 500)) {
    const p = cleanProduct(raw, categories);
    if (!p) return res.status(400).json({ error: "bad_product", id: raw?.id ?? null });
    if (seen.has(p.id)) return res.status(400).json({ error: "duplicate_id", id: p.id });
    seen.add(p.id);
    products.push(p);
  }

  /* Refuse to publish an empty shop. Almost always a bug in the
     panel or a half-loaded page, never something you meant. */
  if (!products.length) return res.status(400).json({ error: "empty_catalogue" });

  const data = {
    images: {
      hero:  String(body.images?.hero  ?? ""),
      story: String(body.images?.story ?? ""),
    },
    categories,
    products,
  };

  try {
    const r = await fetch(`${URL_}/rest/v1/catalogue?id=eq.1`, {
      method: "PATCH",
      headers: {
        apikey: SECRET,
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) {
      return res.status(502).json({ error: "store_write_failed", status: r.status });
    }
    return res.status(200).json({ ok: true, count: products.length });
  } catch {
    return res.status(502).json({ error: "store_unreachable" });
  }
}
