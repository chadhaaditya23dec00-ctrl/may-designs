/* ============================================================
   GET /api/health
   ------------------------------------------------------------
   Proves the serverless side of the deployment is alive before
   any money is involved. Reports whether the Razorpay keys have
   been set in the Vercel dashboard, without ever revealing them.
   ============================================================ */
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "may-designs",
    time: new Date().toISOString(),
    // booleans only — never echo a key back over the wire
    razorpay: {
      keyIdSet: Boolean(process.env.RAZORPAY_KEY_ID),
      keySecretSet: Boolean(process.env.RAZORPAY_KEY_SECRET),
    },
  });
}
