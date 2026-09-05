/* ============================================================
   CUSTOM COMMISSIONS
   ------------------------------------------------------------
   The two frame shapes on offer. The four cameo pairs in the
   shop all share the same scalloped oval, so they're one option
   here; add another entry if you start using a different frame.
   ============================================================ */
const SHAPES = [
  {id:"rect", label:"Gold rectangle", note:"As pictured",
   svg:`<svg width="34" height="42" viewBox="0 0 34 42" aria-hidden="true">
          <rect x="2.5" y="2.5" width="29" height="37" rx="2"
                fill="none" stroke="currentColor" stroke-width="3"/>
        </svg>`},
  {id:"oval", label:"Silver oval", note:"As the cameo pairs",
   svg:`<svg width="34" height="42" viewBox="0 0 34 42" aria-hidden="true">
          <ellipse cx="17" cy="21" rx="13" ry="17.5"
                   fill="none" stroke="currentColor" stroke-width="3"/>
          <ellipse cx="17" cy="21" rx="16" ry="20.5"
                   fill="none" stroke="currentColor" stroke-width="1"
                   stroke-dasharray="2 3"/>
        </svg>`}
];

let customShape = SHAPES[0].id;
let customFile  = null;
let customPreviewUrl = null;

function renderShapes(){
  document.getElementById("shapes").innerHTML = SHAPES.map(sh => `
    <button class="shape" data-shape="${sh.id}" aria-pressed="${customShape === sh.id}">
      ${sh.svg}<span>${sh.label}</span><small>${sh.note}</small>
    </button>`).join("");
}

function showChosen(){
  const box = document.getElementById("chosen");
  if(!customFile){ box.innerHTML = ""; return; }
  if(customPreviewUrl) URL.revokeObjectURL(customPreviewUrl);
  customPreviewUrl = URL.createObjectURL(customFile);
  const mb = (customFile.size / 1024 / 1024).toFixed(1);
  box.innerHTML = `
    <div class="chosen">
      <img src="${customPreviewUrl}" alt="The photo you chose">
      <div class="chosen__meta">
        <p class="chosen__name">${customFile.name}</p>
        <p class="chosen__size">${mb} MB</p>
      </div>
      <button class="link-btn" id="clearPhoto">Remove</button>
    </div>`;
}

function pickFile(file){
  if(!file) return;
  if(!file.type.startsWith("image/")){
    setStatus("That file isn't an image. Try a JPG, PNG or HEIC."); return;
  }
  if(file.size > 25 * 1024 * 1024){
    setStatus("That photo is over 25 MB. Send a smaller version."); return;
  }
  customFile = file;
  showChosen();
  setStatus("Painted to order, usually two to three weeks.");
}

function setStatus(msg){ document.getElementById("customStatus").textContent = msg; }

/* ---- SENDING THE REQUEST — INTEGRATION POINT -------------------
   A photograph cannot be emailed from a page like this on its own;
   the file has to be uploaded somewhere first. Two ways to finish it:

   1. Simplest, no server. Point the button at WhatsApp with the
      shape and notes pre-filled, and ask for the photo in the chat:
         const text = `Custom pair - ${shapeLabel}. ${note}`;
         window.open(`https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(text)}`);

   2. Proper form. Use a form service that accepts file uploads
      (Formspree, Basin, Getform) and POST a FormData:
         const fd = new FormData();
         fd.append("photo", customFile);
         fd.append("shape", customShape);
         fd.append("note", document.getElementById("customNote").value);
         await fetch("https://formspree.io/f/YOUR_ID", {method:"POST", body:fd});
------------------------------------------------------------------ */
function sendCustomRequest(){
  if(!customFile){ setStatus("Choose a photo first."); return; }
  setStatus("Requests aren't connected yet - see the notes in the code.");
}

document.addEventListener("click", e => {
  const sh = e.target.closest(".shape");
  if(sh){
    replay(sh, "is-pop");
    customShape = sh.dataset.shape;
    document.querySelectorAll("#shapes .shape").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.shape === customShape)));
    return;
  }
  if(e.target.id === "clearPhoto"){
    e.preventDefault();
    customFile = null;
    if(customPreviewUrl){ URL.revokeObjectURL(customPreviewUrl); customPreviewUrl = null; }
    document.getElementById("customFile").value = "";
    showChosen();
    return;
  }
  if(e.target.id === "customSend"){ sendCustomRequest(); }
});

document.getElementById("customFile").addEventListener("change", e => pickFile(e.target.files[0]));

const drop = document.getElementById("drop");
["dragenter","dragover"].forEach(ev =>
  drop.addEventListener(ev, e => { e.preventDefault(); drop.dataset.over = "true"; }));
["dragleave","drop"].forEach(ev =>
  drop.addEventListener(ev, e => { e.preventDefault(); drop.dataset.over = "false"; }));
drop.addEventListener("drop", e => pickFile(e.dataTransfer.files[0]));
