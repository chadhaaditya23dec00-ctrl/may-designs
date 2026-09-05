/* ============================================================
   1. CATALOGUE
   ------------------------------------------------------------
   The source of truth is src/data/products.json. The build
   inlines it into the <script id="site-data"> block just above,
   so the catalogue is read from the document, not fetched — the
   shop still works from a file:// copy with no server.

   Don't hand-edit it unless you want to: open the page with
   ?edit on the end of the address to get a proper editor, then
   use "Download products.json" to bring changes back into src/.
   ============================================================ */
const SITE_DATA   = JSON.parse(document.getElementById("site-data").textContent);
const SITE_IMAGES = SITE_DATA.images;
const CATEGORIES  = SITE_DATA.categories;
const PRODUCTS    = SITE_DATA.products;

/* Field reference for the JSON block above:
     id       unique string, never reuse one
     img      "photos/name.webp"; "" shows a coloured placeholder tile
     img2     optional second photo, cross-fades on hover
     cat      must match a key in categories
     price    number in rupees; 0 shows "Price on request"
     options  variant buttons (sizes, colours). [] for none
     sold     true to show as sold out
     framed   true for square photos that keep their own background
     round    true to mask the photo into a circle (the bowl shots)
*/
