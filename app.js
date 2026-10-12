/* PokéSamling starter.
   Configure SUPABASE_URL and SUPABASE_ANON_KEY below after creating your Supabase project.
   Cardmarket last-sold data is intentionally not fabricated: connect an approved data source
   to a secure backend/Edge Function when access is available. */
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabaseConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let cards = [];
let currentUser = null;
let selectedImage = null;
let authMode = "login";

const $ = (id) => document.getElementById(id);
const moneyDKK = (value) => new Intl.NumberFormat("da-DK", {style:"currency", currency:"DKK"}).format(value || 0);
const moneyEUR = (value) => new Intl.NumberFormat("da-DK", {style:"currency", currency:"EUR"}).format(value || 0);

function showStatus(message, type="info") {
  const el = $("statusMessage");
  el.textContent = message;
  el.style.background = type === "error" ? "#fff0f0" : "";
  el.style.color = type === "error" ? "#a52835" : "";
}
function showAuthState() {
  $("authButton").textContent = currentUser ? "Log ud" : "Log ind";
}
function renderCards() {
  const q = $("searchInput").value.trim().toLowerCase();
  const sort = $("sortSelect").value;
  let shown = cards.filter(c => [c.name,c.set_name,c.card_number,c.language].filter(Boolean).join(" ").toLowerCase().includes(q));
  if (sort === "name") shown.sort((a,b)=>a.name.localeCompare(b.name));
  if (sort === "value-desc") shown.sort((a,b)=>(Number(b.price_eur)||0)-(Number(a.price_eur)||0));
  if (sort === "value-asc") shown.sort((a,b)=>(Number(a.price_eur)||0)-(Number(b.price_eur)||0));
  if (sort === "newest") shown.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  $("cardCount").textContent = cards.length;
  // EUR->DKK conversion is a display estimate only. Set a current rate before relying on it.
  const EUR_TO_DKK_ESTIMATE = 7.46;
  const total = cards.reduce((sum,c)=>sum + (Number(c.price_eur)||0)*EUR_TO_DKK_ESTIMATE,0);
  $("totalValue").textContent = moneyDKK(total);
  const updated = cards.map(c=>c.price_updated_at).filter(Boolean).sort().pop();
  $("lastUpdated").textContent = updated ? new Date(updated).toLocaleDateString("da-DK") : "—";
  $("valueNote").textContent = cards.some(c=>c.price_source==="manual") ? "Indeholder manuelt indtastede priser" : "Priser kræver en tilsluttet datakilde";
  const grid = $("collectionGrid");
  grid.innerHTML = "";
  shown.forEach(card => {
    const article = document.createElement("article");
    article.className = "pokemon-card";
    const art = document.createElement("div"); art.className = "art";
    if (card.image_url) {
      const img = document.createElement("img"); img.src=card.image_url; img.alt=card.name; img.loading="lazy"; art.appendChild(img);
    } else {
      const ph = document.createElement("div"); ph.className="card-placeholder"; ph.textContent="✦"; art.appendChild(ph);
    }
    const meta = document.createElement("div"); meta.className="card-meta";
    const title = document.createElement("h3"); title.textContent=card.name;
    const sub = document.createElement("p"); sub.className="card-subtitle"; sub.textContent=[card.set_name,card.card_number,card.language].filter(Boolean).join(" · ") || "Oplysninger mangler";
    const row = document.createElement("div"); row.className="card-price-row";
    const priceWrap = document.createElement("div"); const price=document.createElement("div");price.className="card-price";
    price.textContent=card.price_eur!==null && card.price_eur!==undefined ? moneyDKK(Number(card.price_eur)*7.46) : "Ikke prissat";
    const source=document.createElement("small");source.className="price-source";source.textContent=card.price_source==="cardmarket_last_sold"?"Cardmarket · seneste salg":card.price_source==="manual"?"Manuel pris":"Pris ikke verificeret";
    priceWrap.append(price,source); row.append(priceWrap);
    const actions=document.createElement("div");actions.className="card-actions";
    const edit=document.createElement("button");edit.textContent="Redigér";edit.addEventListener("click",()=>editCard(card));
    const del=document.createElement("button");del.className="delete-card";del.textContent="Fjern";del.addEventListener("click",()=>deleteCard(card));
    actions.append(edit,del); meta.append(title,sub,row,actions); article.append(art,meta);grid.append(article);
  });
  $("emptyState").hidden = cards.length > 0;
  grid.hidden = cards.length === 0;
  if (cards.length && shown.length===0) {
    $("emptyState").hidden=false; $("emptyState").querySelector("h3").textContent="Ingen kort matcher din søgning";
    $("emptyState").querySelector("p").textContent="Prøv et andet kortnavn, sæt eller kortnummer.";
    $("emptyAddButton").hidden=true;
  } else {
    $("emptyState").querySelector("h3").textContent="Dit album venter på det første kort";
    $("emptyState").querySelector("p").textContent="Tilføj et billede eller skriv navnet på et Pokémon-kort for at komme i gang.";
    $("emptyAddButton").hidden=false;
  }
}
async function loadCards() {
  if (!db) {
    cards = JSON.parse(localStorage.getItem("pokesamling-demo") || "[]");
    showStatus("Demo-tilstand: Kort gemmes kun i denne browser. Tilslut Supabase for sikker lagring på tværs af enheder.");
    renderCards(); return;
  }
  if (!currentUser) { cards=[];renderCards();showStatus("Log ind for at se din private samling.");return; }
  const {data,error}=await db.from("pokemon_cards").select("*").order("created_at",{ascending:false});
  if(error){showStatus("Kunne ikke hente kort: "+error.message,"error");return;}
  cards=data||[];renderCards();showStatus("Din samling er hentet fra Supabase.");
}
function openCardDialog(card=null) {
  $("cardForm").reset(); $("formError").textContent=""; selectedImage=null;
  $("imagePreviewWrap").hidden=true;
  $("cardForm").dataset.editId=card?.id||"";
  $("cardName").value=card?.name||"";
  $("cardNumber").value=card?.card_number||"";
  $("cardSet").value=card?.set_name||"";
  $("cardLanguage").value=card?.language||"English";
  $("cardPrice").value=card?.price_source==="manual" ? (card.price_eur??"") : "";
  $("cardCondition").value=card?.condition||"Near Mint";
  $("cardDialog").showModal();
}
function editCard(card) { openCardDialog(card); }
async function uploadImage(file, cardId) {
  if (!file) return null;
  if (!db) return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=`${currentUser.id}/${cardId}-${Date.now()}.${ext}`;
  const {error}=await db.storage.from("pokemon-card-images").upload(path,file,{upsert:true,contentType:file.type});
  if(error) throw error;
  const {data}=db.storage.from("pokemon-card-images").getPublicUrl(path);
  return data.publicUrl;
}
async function saveCard(event) {
  event.preventDefault();
  const name=$("cardName").value.trim();
  if(!name){$("formError").textContent="Skriv kortets navn.";return;}
  const id=$("cardForm").dataset.editId || crypto.randomUUID();
  const rawPrice=$("cardPrice").value;
  const payload={
    id, name, card_number:$("cardNumber").value.trim()||null,
    set_name:$("cardSet").value.trim()||null, language:$("cardLanguage").value,
    condition:$("cardCondition").value,
    price_eur:rawPrice!==""?Number(rawPrice):null,
    price_source:rawPrice!==""?"manual":null,
    price_updated_at:rawPrice!==""?new Date().toISOString():null
  };
  try {
    if(selectedImage) payload.image_url=await uploadImage(selectedImage,id);
    else {
      const old=cards.find(c=>c.id===id);
      if(old?.image_url) payload.image_url=old.image_url;
    }
    if(db) {
      if(!currentUser){$("formError").textContent="Log ind før du gemmer kort online.";return;}
      payload.user_id=currentUser.id;
      const {error}=await db.from("pokemon_cards").upsert(payload);
      if(error) throw error;
    } else {
      const oldIndex=cards.findIndex(c=>c.id===id);
      if(oldIndex>=0) cards[oldIndex]={...cards[oldIndex],...payload};
      else cards.unshift({...payload,created_at:new Date().toISOString()});
      localStorage.setItem("pokesamling-demo",JSON.stringify(cards));
    }
    $("cardDialog").close(); await loadCards();
  } catch(err) { $("formError").textContent="Kortet kunne ikke gemmes: "+(err.message||"Ukendt fejl"); }
}
async function deleteCard(card) {
  if(!confirm(`Vil du fjerne ${card.name} fra samlingen?`)) return;
  if(db) {
    const {error}=await db.from("pokemon_cards").delete().eq("id",card.id);
    if(error){showStatus("Kortet kunne ikke fjernes: "+error.message,"error");return;}
  } else {
    cards=cards.filter(c=>c.id!==card.id);localStorage.setItem("pokesamling-demo",JSON.stringify(cards));
  }
  await loadCards();
}
async function handleAuth(event) {
  event.preventDefault();
  if(!db){$("authMessage").textContent="Tilføj Supabase URL og anon/publishable key i app.js først.";return;}
  const email=$("authEmail").value.trim(),password=$("authPassword").value;
  const result=authMode==="login" ? await db.auth.signInWithPassword({email,password}) : await db.auth.signUp({email,password});
  if(result.error){$("authMessage").textContent=result.error.message;return;}
  if(authMode==="signup"&&!result.data.session){$("authMessage").textContent="Tjek din e-mail for at bekræfte kontoen.";return;}
  currentUser=result.data.user;showAuthState();$("authDialog").close();await loadCards();
}
function setAuthMode(mode) {
  authMode=mode;
  $("authTitle").textContent=mode==="login"?"Log ind":"Opret konto";
  $("authSubmit").textContent=mode==="login"?"Log ind":"Opret konto";
  $("toggleAuthMode").textContent=mode==="login"?"Ny her? Opret en konto":"Har du allerede en konto? Log ind";
}
$("addButton").addEventListener("click",()=>openCardDialog());
$("emptyAddButton").addEventListener("click",()=>openCardDialog());
$("closeDialog").addEventListener("click",()=>$("cardDialog").close());
$("cancelDialog").addEventListener("click",()=>$("cardDialog").close());
$("cardForm").addEventListener("submit",saveCard);
$("searchInput").addEventListener("input",renderCards);
$("sortSelect").addEventListener("change",renderCards);
$("cardImage").addEventListener("change",event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>8*1024*1024){$("formError").textContent="Billedet må højst være 8 MB.";event.target.value="";return;}
  selectedImage=file;$("imagePreview").src=URL.createObjectURL(file);$("imagePreviewWrap").hidden=false;
});
$("removeImage").addEventListener("click",()=>{selectedImage=null;$("cardImage").value="";$("imagePreviewWrap").hidden=true;});
$("authButton").addEventListener("click",async()=>{
  if(currentUser&&db){await db.auth.signOut();currentUser=null;showAuthState();await loadCards();}
  else {setAuthMode("login");$("authMessage").textContent="";$("authDialog").showModal();}
});
$("closeAuth").addEventListener("click",()=>$("authDialog").close());
$("toggleAuthMode").addEventListener("click",()=>setAuthMode(authMode==="login"?"signup":"login"));
$("authForm").addEventListener("submit",handleAuth);

(async function init(){
  if(db){
    const {data}=await db.auth.getSession();currentUser=data.session?.user||null;
    db.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;showAuthState();loadCards();});
  }
  showAuthState();
  await loadCards();
})();