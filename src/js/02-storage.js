/* ============================================================
   2. STORAGE
   Uses the artifact storage API when previewing inside Claude,
   and falls back to localStorage once you host this yourself.
   Nothing to change here.
   ============================================================ */
const Store = (() => {
  const hasArtifactStore = typeof window.storage !== "undefined" && window.storage;
  const memory = {};
  return {
    async get(key){
      try{
        if(hasArtifactStore){ const r = await window.storage.get(key); return r ? r.value : null; }
        return window.localStorage.getItem(key);
      }catch(e){ return memory[key] ?? null; }
    },
    async set(key,value){
      try{
        if(hasArtifactStore){ await window.storage.set(key,value); return; }
        window.localStorage.setItem(key,value);
      }catch(e){ memory[key] = value; }
    }
  };
})();

const state = { cart:[], viewed:[], filter:"all", query:"", sort:"new" };

const rupees = n => n > 0 ? "₹" + n.toLocaleString("en-IN") : "Price on request";
const find   = id => PRODUCTS.find(p => p.id === id);

async function save(){
  await Store.set("md_cart", JSON.stringify(state.cart));
  await Store.set("md_viewed", JSON.stringify(state.viewed));
}
async function load(){
  try{ state.cart   = JSON.parse(await Store.get("md_cart")   || "[]"); }catch(e){ state.cart = []; }
  try{ state.viewed = JSON.parse(await Store.get("md_viewed") || "[]"); }catch(e){ state.viewed = []; }
}
