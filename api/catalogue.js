/* ============================================================
   GET /api/catalogue
   ------------------------------------------------------------
   Serves the live catalogue so prices and sold-out flags can
   change without a rebuild.

   The storefront does NOT depend on this. The catalogue is still
   baked into index.html at build time, so the page renders in
   full with no JavaScript and no network. This endpoint only
   supplies a fresher copy when one exists; every failure path
   here leaves the baked-in catalogue standing.
   ============================================================ */
const URL_    = process.env.SUPABASE_URL;
const SECRET  = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // Not configured yet — say so plainly rather than erroring. The
  // client treats this as "keep the baked-in catalogue".
  if (!URL_ || !SECRET) return res.status(204).end();

  try {
    const r = await fetch(
      `${URL_}/rest/v1/catalogue?id=eq.1&select=data,updated_at`,
      { headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` } }
    );
    if (!r.ok) return res.status(204).end();

    const rows = await r.json();
    const row  = rows?.[0];

    // The seed row is {} until the first publish. Nothing to serve.
    if (!row?.data?.products?.length) return res.status(204).end();

    // 60s at the CDN, served stale for a day while revalidating, so
    // a Supabase outage can't take the shop down.
    res.setHeader("Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).json({
      data: row.data,
      updatedAt: row.updated_at,
    });
  } catch {
    return res.status(204).end();
  }
}
