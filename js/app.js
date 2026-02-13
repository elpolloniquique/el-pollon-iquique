/* =========================================================
   Pollería El Pollón - app.js (ACTUALIZADO PRO)
   - Carousel fade pro
   - Catbar con flechas izq/der en móvil
   - Bolsa: familiares por unidad; otras categorías 1 bolsa por cada 3 unidades
   - Checkout con comentario + salto automático 25 caracteres por línea
   - Ticket WhatsApp + ticket impresión 80mm
   - Firestore listener + timbre SOLO si admin está abierto
   - FIX: ticketNumber estable (no depende de orders.length)
   - FIX: snapshot guarda doc.id
   - FIX: guarda SOLO el pedido nuevo en Firestore (no re-subir todo)
========================================================= */

const CURRENCY = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const BAG_PRICE = 200;
const WHATSAPP_NUMBER = '56986925310';

const ORDERS_PATH = 'pollon_orders_v1';
const ORDERS_KEY  = 'pollon_orders_local_v1';

// ✅ ticket secuencial (estable)
const TICKET_SEQ_KEY = 'pollon_ticket_seq_v1';

let db = null;
let ordersRef = null;
let firestoreReady = false;

// ✅ listener flag global (NO adentro de funciones)
let ordersListenerReady = false;

/* ✅ fallback seguro (evita crash si Firestore llama antes que admin.js) */
function isAdminOpen(){
  return document.getElementById('admin-panel-modal')?.classList.contains('active');
}
window.isAdminOpen = window.isAdminOpen || isAdminOpen;

/* Orders storage */
let orders = [];

// =========================
// Ticket number estable
// =========================
function pad3(n){
  const s = String(n);
  return s.length >= 3 ? s : ('000' + s).slice(-3);
}

function nextTicketNumber(){
  let seq = 0;
  try{
    seq = Number(localStorage.getItem(TICKET_SEQ_KEY) || '0') || 0;
  }catch{
    seq = 0;
  }
  seq += 1;
  try{
    localStorage.setItem(TICKET_SEQ_KEY, String(seq));
  }catch{}
  return pad3(seq);
}

// =========================
// Firestore init + listener
// =========================
function initOrdersBackend(){
  try{
   const firebaseConfig = {
    apiKey: "AIzaSyAWv3zPEUU82YcLSwOxsv-MQZP2ZjcycOg",
    authDomain: "elpollon01-307da.firebaseapp.com",
    databaseURL: "https://elpollon01-307da-default-rtdb.firebaseio.com",
    projectId: "elpollon01-307da",
    storageBucket: "elpollon01-307da.firebasestorage.app",
    messagingSenderId: "1024156951564",
    appId: "1:1024156951564:web:946a9b6003d8dff1053a29"
  };

    const looksPlaceholder = Object.values(firebaseConfig).some(v => String(v).includes("REEMPLAZA"));
    if(looksPlaceholder){
      console.warn('[Firebase] Config placeholder: usando localStorage.');
      firestoreReady = false;
      return;
    }

    // ✅ evita error de doble init
    if(!firebase.apps || !firebase.apps.length){
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();
    ordersRef = db.collection(ORDERS_PATH);
    firestoreReady = true;

    // ✅ Listener tiempo real: lista y panel se actualizan solos; timbre en cada pedido nuevo (siempre)
    ordersRef.orderBy('createdAt', 'asc').onSnapshot((snap)=>{
      try {
        const prevCount = orders.length;

        // ✅ Sincronizar lista local con Firestore (doc.id para poder actualizar estado)
        orders = [];
        snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));

        // ✅ Ordenar por fecha
        orders.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

        // ✅ Pedido nuevo = ya teníamos datos (no es carga inicial) y ahora hay más pedidos → timbre siempre
        const hasNew = prevCount > 0 && orders.length > prevCount;
        ordersListenerReady = true;

        // ✅ Si el panel admin está abierto: actualizar tabla y, si llegó al menos un pedido nuevo, sonar timbre
        if (typeof window.isAdminOpen === 'function' && window.isAdminOpen()) {
          if (typeof window.renderAdmin === 'function') window.renderAdmin();
          if (hasNew && typeof window.onNewOrderArrived === 'function') {
            window.onNewOrderArrived();
          }
        }
      } catch (err) {
        console.warn('[Firebase] Error en listener:', err);
      }
    });

  }catch(err){
    console.warn('[Firebase] Falló init, usando localStorage:', err);
    firestoreReady = false;
  }
}

// =========================
// Storage (local / fallback)
// =========================
function saveOrders(){
  if(firestoreReady && ordersRef && db){
    const batch = db.batch();
    orders.forEach(o=>{
      const docRef = ordersRef.doc(o.id);
      batch.set(docRef, o, { merge:true });
    });
    batch.commit().catch(e=>{
      console.warn('[Firebase] batch commit error, fallback local:', e);
      try{ localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); }catch{}
    });
  }else{
    try{ localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); }catch{}
  }
}

function loadOrders(){
  // ✅ si Firestore está activo, el listener se encarga
  if(firestoreReady) return;
  try{
    const raw = localStorage.getItem(ORDERS_KEY);
    orders = raw ? JSON.parse(raw) : [];
  }catch{
    orders = [];
  }
}

// ✅ guarda SOLO 1 pedido (PRO)
function saveSingleOrder(order){
  if(firestoreReady && ordersRef){
    return ordersRef.doc(order.id).set(order, { merge:true }).catch((e)=>{
      console.warn('[Firebase] set(order) falló, fallback local:', e);
      saveOrders();
    });
  }
  saveOrders();
  return Promise.resolve();
}

/* =========================
   Productos
========================= */
const PRODUCTS = {
  "ofertas-familiares":[
    { name:"Ofertón más chaufa", price:24500, img:"img/oferton mas chaufa.png", desc:"Pollo entero, papas fritas, arroz chaufa, ensalada y bebidas 1.5lt." },
    { name:"Ofertón más fideo", price:24500, img:"img/oferton mas fideo.png", desc:"Pollo entero, papas fritas, fideos al pesto, ensalada y bebidas 1.5lt." },
    { name:"Ofertón más chaufa pura papa", price:24500, img:"img/oferton mas chaufa pura papa.png", desc:"Pollo entero, papas, extra papa, chaufa y bebidas 1.5lt." },
    { name:"Ofertón con fideo", price:23500, img:"img/oferton con fideo.png", desc:"Pollo entero, papas, fideos al pesto, ensalada y bebidas 1.5lt" },
    { name:"Ofertón sin ensalada", price:23500, img:"img/oferton sin ensalada.png", desc:"Pollo entero, papas, chaufa y bebidas 1.5lt" },
    { name:"Ofertón pura papa", price:23500, img:"img/oferton pura papa.png", desc:"Pollo entero, papas + 1/2 porción papa y bebidas" },
    { name:"Ofertón familiar", price:22500, img:"img/oferton familiar.png", desc:"Pollo entero, papas, ensalada y bebidas 1.5lt" },
    { name:"Mega Familiar", price:22500, img:"img/oferton familiar.png", desc:"Pollo entero, papas, ensalada y bebidas 1.5lt" },
  ],
  "ofertas-dos":[
    { name:"1/2 combo chaufa", price:15600, img:"img/medio combo chaufa.png", desc:"Medio pollo + papas + chaufa" },
    { name:"1/2 combo", price:15100, img:"img/medio combo.png", desc:"Medio pollo + papas + ensalada personal" },
    { name:"1/2 combo pura papa", price:15100, img:"img/medio combo pura papa.png", desc:"Medio pollo + más papas" },
  ],
  "ofertas-personales":[
    { name:"1/4 combo", price:8100, img:"img/personal combo.png", desc:"1/4 pollo + papas personales + ensalada" },
    { name:"1/4 combo pura papa", price:8100, img:"img/personal combo pura papa.png", desc:"1/4 pollo + más papas" },
    { name:"Chaufa brasa", price:8200, img:"img/chaufa brasa.png", desc:"1/4 pollo + chaufa" },
    { name:"Fideo al pesto con 1/4", price:8100, img:"img/fideo al pesto con 1-4.png", desc:"1/4 pollo + fideos al pesto" },
    { name:"Chaufa brasa con papas", price:9200, img:"img/chaufa brasa con papas fritas.png", desc:"1/4 pollo + chaufa + papas" },
    { name:"1/4 pollo con fideo y papa", price:9300, img:"img/personal con papa y fideo.png", desc:"1/4 pollo + fideo + papas" },
  ],
  "platos-extras":[
    { name:"Lomo saltado de carne con chaufa", price:12200, img:"img/lomo saltado con arroz chaufa.png", desc:"Plato extra con chaufa" },
    { name:"Lomo saltado de carne con arroz blanco", price:11700, img:"img/lomo saltado de carne con arroz blanco.png", desc:"Plato extra con arroz blanco" },
    { name:"Lomo saltado de pollo con arroz blanco", price:11700, img:"img/lomo saltado de pollo con arroz blanco.png", desc:"Plato extra con arroz blanco" },
    { name:"Tallarín saltado", price:11700, img:"img/tallarin saltado de carne.png", desc:"Tallarín saltado de carne" },
    { name:"Bistec a lo pobre", price:10700, img:"img/bistec a lo pobre.png", desc:"Bistec a lo pobre" },
    { name:"Bistec con fideos al pesto", price:10700, img:"img/bistec con fideos al pesto.png", desc:"Bistec + fideos al pesto" },
    { name:"Chuleta de cerdo", price:10700, img:"img/chuleta de cerdo.png", desc:"Chuleta de cerdo" },
    { name:"Pechuga a la plancha", price:10200, img:"img/pechuga a la plancha.png", desc:"Pechuga a la plancha" },
    { name:"Combo nuggets", price:6700, img:"img/combo nuggets.png", desc:"Combo nuggets" },
    { name:"Salchipapas", price:6700, img:"img/salchipapas.png", desc:"Salchipapas" },
  ],
  "agregados":[
    { name:"1 Pollo entero solo", price:15000, img:"img/1 pollo solo.png", desc:"Solo pollo" },
    { name:"1/2 Pollo solo", price:9900, img:"img/medio pollo solo.png", desc:"Medio pollo" },
    { name:"1/4 pollo solo", price:5800, img:"img/cuarto pollo solo.png", desc:"Cuarto de pollo" },
    { name:"Porción papas familiar", price:9000, img:"img/porcion de papa.png", desc:"Porción de papas familiar" },
    { name:"1/2 porción papas", price:6100, img:"img/1-2 porcion papas.png", desc:"Media porción papas" },
    { name:"Porción arroz chaufa", price:5300, img:"img/porcion arroz chaufa.png", desc:"Porción de arroz chaufa" },
    { name:"Porción fideos al pesto", price:5300, img:"img/porcion de fideo.png", desc:"Porción de fideos al pesto" },
    { name:"Ensalada familiar", price:5400, img:"img/ensalada familiar.png", desc:"Ensalada familiar" },
    { name:"Ensalada personal", price:3700, img:"img/ensalada personal.png", desc:"Ensalada personal" },
  ],
  "bebidas":[
    { name:"Coca Cola 1.5L", price:3800, img:"img/coca cola.png", desc:"Bebida 1.5L" },
    { name:"Coca Cola Cero", price:3800, img:"img/coca cola cero.png", desc:"Bebida 1.5L" },
    { name:"Inca Kola", price:3800, img:"img/inca kola.png", desc:"Bebida 1.5L" },
    { name:"Fanta", price:3800, img:"img/fanta.png", desc:"Bebida 1.5L" },
    { name:"Sprite", price:3800, img:"img/sprite.png", desc:"Bebida 1.5L" },
    { name:"Sprite Cero", price:3800, img:"img/sprite cero.png", desc:"Bebida 1.5L" },
    { name:"Agua sin gas 500ml", price:1200, img:"img/agua sin gas.png", desc:"Agua 500ml" },
    { name:"Agua con gas 500ml", price:1200, img:"img/agua con gas.png", desc:"Agua 500ml" },
  ],
  "descartables":[
    { name:"Aluza CT5", price:300, img:"img/aluza ct5.png", desc:"Envase descartable Aluza CT5" },
    { name:"Aluza CT3", price:400, img:"img/aluza ct3.png", desc:"Envase descartable Aluza CT3" },
    { name:"Tenedor descartable", price:200, img:"img/servicio descartable.png", desc:"Tenedor y cuchillo plástico descartable." },
    { name:"Bolsa ecológica", price:200, img:"img/bolsa ecologica.png", desc:"Bolsa ecológica" },
    { name:"Vaso descartable", price:50, img:"img/vaso.png", desc:"Descartable" },
  ]
};

const CATEGORY_META = {
  "todo-el-menu":"📋 Todo el Menú",
  "ofertas-familiares":"👨‍👩‍👧‍👦 Ofertas Familiares",
  "ofertas-dos":"👫 Ofertas para Dos",
  "ofertas-personales":"🍗 Ofertas Personales",
  "platos-extras":"🍽️ Platos Extras",
  "agregados":"➕ Agregados",
  "bebidas":"🥤 Bebidas",
  "descartables":"🧾 Descartables",
};
const CATEGORY_ORDER = [
  "ofertas-familiares",
  "ofertas-dos",
  "ofertas-personales",
  "platos-extras",
  "agregados",
  "bebidas",
  "descartables"
];

/* =========================
   Estado Carrito
========================= */
let cart = [];
let currentProduct = null;
let currentCategory = 'todo-el-menu';
let selectedDrink = null;
let productQuantity = 1;
let bagChoice = null; // 'add' | 'none'
let currentRealCategory = null;

/* Helpers */
function money(v){ return CURRENCY.format(v || 0); }

function showToast(msg){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 3000);
}

/* =========================
   ❤ Burst de corazones (animación)
========================= */
function burstHearts(btn){
  if(!btn) return;

  btn.querySelectorAll('.pheart-burst').forEach(n => n.remove());

  const wrap = document.createElement('div');
  wrap.className = 'pheart-burst';
  btn.appendChild(wrap);

  const COUNT = 11;
  const RADIUS = 26;
  const STEP_DELAY = 40;

  const heartSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  for(let i=0;i<COUNT;i++){
    const s = document.createElement('span');
    s.className = 'pheart-float';
    s.innerHTML = heartSvg;

    const angle = (Math.PI * 2) * (i / COUNT);
    const dx = Math.cos(angle) * RADIUS;
    const dy = Math.sin(angle) * RADIUS;

    s.style.setProperty('--dx', `${dx}px`);
    s.style.setProperty('--dy', `${dy}px`);
    s.style.animationDelay = `${i * STEP_DELAY}ms`;

    s.addEventListener('animationend', ()=> s.remove());
    wrap.appendChild(s);
  }

  setTimeout(()=> wrap.remove(), 1600);
}

function openModal(sel){
  const m = document.querySelector(sel);
  if(m) m.classList.add('active');
}
function closeModal(sel){
  const m = document.querySelector(sel);
  if(m) m.classList.remove('active');
}

function scrollToMenu(){
  const el = document.getElementById('ofertas');
  if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}

function safeImg(imgEl){
  imgEl.onerror = () => { imgEl.style.display = 'none'; };
}

/* ✅ Wrap (25 chars) */
function wrapWithCursorMap(text, limit){
  const src = String(text || '').replace(/\r/g, '');

  let out = '';
  const map = new Array(src.length + 1);
  let lineStartOut = 0;
  let lineLen = 0;
  let lastSpaceOutPos = -1;

  for(let i=0; i<src.length; i++){
    const ch = src[i];
    map[i] = out.length;

    if(ch === '\n'){
      out += ch;
      lineStartOut = out.length;
      lineLen = 0;
      lastSpaceOutPos = -1;
      continue;
    }

    out += ch;
    lineLen++;

    if(ch === ' ') lastSpaceOutPos = out.length - 1;

    if(lineLen > limit){
      if(lastSpaceOutPos >= lineStartOut){
        out = out.slice(0, lastSpaceOutPos) + '\n' + out.slice(lastSpaceOutPos + 1);
        lineStartOut = lastSpaceOutPos + 1;
        lineLen = out.length - lineStartOut;
        lastSpaceOutPos = -1;
      } else {
        out = out.slice(0, out.length - 1) + '\n' + ch;
        lineStartOut = out.length - 1;
        lineLen = 1;
        lastSpaceOutPos = -1;
      }
    }
  }

  map[src.length] = out.length;
  return { out, map };
}

function wrapText(text, limit = 25){
  return wrapWithCursorMap(text, limit).out;
}

function enforceWrapLimit(el, limit = 30){
  if(!el) return;

  el.addEventListener('input', ()=>{
    const original = String(el.value || '').replace(/\r/g,'');
    const selStart = el.selectionStart ?? original.length;
    const selEnd = el.selectionEnd ?? original.length;

    const { out, map } = wrapWithCursorMap(original, limit);

    if(out !== original){
      el.value = out;
      const newStart = map[Math.min(selStart, map.length - 1)] ?? out.length;
      const newEnd   = map[Math.min(selEnd, map.length - 1)] ?? out.length;
      el.setSelectionRange(newStart, newEnd);
    }
  });
}

/* =========================
   Render Products
========================= */
const productsContainer = document.getElementById('products-container');
const catSliderEl = document.getElementById('cat-slider');
const categoryTitleEl = document.getElementById('category-title');

function productCard(p, category){
  const card = document.createElement('div');
  card.className = 'pcard';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'pimg';

  const img = document.createElement('img');
  img.src = p.img || '';
  img.alt = p.name;
  safeImg(img);

  const fallback = document.createElement('div');
  fallback.textContent = '🍗';
  fallback.style.display = 'none';
  fallback.style.alignItems = 'center';
  fallback.style.justifyContent = 'center';
  fallback.style.width = '100%';
  fallback.style.height = '100%';

  imgWrap.appendChild(img);
  imgWrap.appendChild(fallback);

  img.addEventListener('load', ()=> { fallback.style.display = 'none'; });
  img.addEventListener('error', ()=> { fallback.style.display = 'flex'; });

  const body = document.createElement('div');
  body.className = 'pbody';

  const title = document.createElement('div');
  title.className = 'ptitle';
  title.textContent = p.name;

  const desc = document.createElement('div');
  desc.className = 'pdesc';
  desc.textContent = p.desc || '';

  const row = document.createElement('div');
  row.className = 'prow';

  const price = document.createElement('div');
  price.className = 'pprice';
  price.textContent = money(p.price);

  const heartBtn = document.createElement('button');
  heartBtn.className = 'pheart';
  heartBtn.type = 'button';
  heartBtn.setAttribute('aria-label', 'Agregar a favoritos');
  heartBtn.dataset.action = 'heart';
  heartBtn.dataset.heartId = `${category}__${p.name}`;
  heartBtn.innerHTML = `<span class="pheart-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>`;

  const btn = document.createElement('button');
  btn.className = 'padd';
  btn.type = 'button';
  btn.textContent = 'Agregar';
  btn.dataset.action = 'add';
  btn.dataset.product = JSON.stringify({ ...p, __category: category });

  row.appendChild(price);
  row.appendChild(heartBtn);
  row.appendChild(btn);

  body.appendChild(title);
  body.appendChild(desc);
  body.appendChild(row);

  card.appendChild(imgWrap);
  card.appendChild(body);

  return card;
}

function renderProductsSingle(category){
  productsContainer.innerHTML = '';
  const list = PRODUCTS[category] || [];
  list.forEach(p => productsContainer.appendChild(productCard(p, category)));
}

function renderProductsAll(){
  productsContainer.innerHTML = '';
  CATEGORY_ORDER.forEach(cat=>{
    const head = document.createElement('div');
    head.className = 'cat-header';
    head.id = cat;

    const h = document.createElement('h3');
    h.textContent = CATEGORY_META[cat] || cat;

    const line = document.createElement('div');
    line.className = 'cat-line';

    head.appendChild(h);
    head.appendChild(line);
    productsContainer.appendChild(head);

    (PRODUCTS[cat] || []).forEach(p=>{
      productsContainer.appendChild(productCard(p, cat));
    });
  });
}

/* =========================
   Options modal logic
========================= */
const optName = document.getElementById('opt-product-name');
const optDesc = document.getElementById('opt-product-desc');
const optPrice = document.getElementById('opt-product-price');
const qtyValue = document.getElementById('qty-value');
const liveTotal = document.getElementById('live-total');

const drinkSection = document.getElementById('drink-section');
const bagSection = document.getElementById('bag-section');
const bagOptions = document.getElementById('bag-options');
const bagNote = document.getElementById('bag-note');

function setDrinkVisible(visible){
  drinkSection.classList.toggle('hidden', !visible);
}

/* ✅ Bolsas */
function bagQtyRule(qty){
  const q = Math.max(1, Number(qty) || 1);

  if(currentRealCategory === 'bebidas' || currentRealCategory === 'descartables'){
    return 0;
  }
  if(bagChoice !== 'add') return 0;

  if(currentRealCategory === 'ofertas-familiares'){
    return q; // por unidad
  }

  if(
    currentRealCategory === 'ofertas-dos' ||
    currentRealCategory === 'ofertas-personales' ||
    currentRealCategory === 'platos-extras' ||
    currentRealCategory === 'agregados'
  ){
    return Math.ceil(q / 3);
  }

  return 1;
}

function paintBagOptions(){
  bagOptions.innerHTML = '';
  bagNote.textContent = '';

  if(currentRealCategory === 'bebidas' || currentRealCategory === 'descartables'){
    bagSection.classList.add('hidden');
    bagChoice = 'none';
    return;
  }
  bagSection.classList.remove('hidden');

  const mk = (val, label, disabled=false) => {
    const l = document.createElement('label');
    l.className = 'opt-radio';
    l.innerHTML = `<input type="radio" name="bag" value="${val}" ${disabled ? 'disabled' : ''}> ${label}`;
    if(disabled) l.style.opacity = '0.55';
    return l;
  };

  const bagRequired =
    currentRealCategory === 'ofertas-familiares' ||
    currentRealCategory === 'ofertas-dos' ||
    currentRealCategory === 'ofertas-personales' ||
    currentRealCategory === 'platos-extras';

  if(bagRequired){
    bagOptions.appendChild(mk('add', 'Agregar bolsa'));
  }else{
    bagOptions.appendChild(mk('add', 'Agregar bolsa (opcional)'));
    bagOptions.appendChild(mk('none', 'No, gracias'));
  }

  if(currentRealCategory === 'ofertas-familiares'){
    bagNote.textContent = 'Familiares: bolsa obligatoria y se cobra por unidad (según cantidad).';
  } else if(
    currentRealCategory === 'ofertas-dos' ||
    currentRealCategory === 'ofertas-personales' ||
    currentRealCategory === 'platos-extras'
  ){
    bagNote.textContent = 'En esta categoría: bolsa obligatoria (1 bolsa por cada 3 unidades).';
  } else if(currentRealCategory === 'agregados'){
    bagNote.textContent = 'Agregados: bolsa opcional (si eliges bolsa, se agrega 1 por cada 3 unidades).';
  } else {
    bagNote.textContent = 'Bolsa ecológica según reglas de la categoría.';
  }
}

function computeLiveTotal(){
  if(!currentProduct) return { total:0, bagQty:0, base:0 };

  const base = (currentProduct.price || 0) * productQuantity;
  const bagQty = bagQtyRule(productQuantity);
  const total = base + (bagQty * BAG_PRICE);

  liveTotal.textContent = money(total);
  return { total, bagQty, base };
}

/* =========================
   Ticket (WhatsApp + 80mm)
========================= */
function formatDateTicket(iso){
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  return { date: `${dd}-${mm}-${yyyy}`, time: `${hh}:${min}` };
}

function moneyTicket(v){
  return money(v).replace(/\s/g,'');
}

function buildTicketText80mm(order){
  const W = 42;
  const sep = '='.repeat(W);
  const sep2 = '-'.repeat(W);

  const { date, time } = formatDateTicket(order.createdAt);
  const pedido = pad3(order.ticketNumber || '001');

  const cliente = wrapText(order.customer?.name || '', 25).split('\n');
  const direccion = wrapText(order.customer?.address || '', 25).split('\n');
  const comentario = wrapText(order.customer?.comment || '', 25).split('\n').filter(Boolean);
  const fono = (order.customer?.phone || '').trim();

  let t = '';
  t += `POLLERÍA EL POLLÓN   - DELIVERY\n`;
  t += `Pedido : ${pedido}     ${date}  ${time}\n`;
  t += `${sep}\n\n`;

  t += `Cliente   : ${cliente[0] || ''}\n`;
  for(let i=1;i<cliente.length;i++) t += `           ${cliente[i]}\n`;

  t += `Fono      : ${fono}\n`;

  t += `Dirección : ${direccion[0] || ''}\n`;
  for(let i=1;i<direccion.length;i++) t += `           ${direccion[i]}\n`;

  if(comentario.length){
    t += `\nComentario: ${comentario[0] || ''}\n`;
    for(let i=1;i<comentario.length;i++) t += `           ${comentario[i]}\n`;
  }

  t += `\n${sep}\n`;

  order.items.forEach((it, idx)=>{
    const n = idx + 1;
    const nameLines = wrapText(it.name || '', 30).split('\n');
    const qtyTxt = `x${it.qty || 1}`;

    const left = `${n}) ${nameLines[0] || ''}`;
    const spaces = Math.max(1, W - left.length - qtyTxt.length);
    t += `${left}${' '.repeat(spaces)}${qtyTxt}\n`;

    for(let i=1;i<nameLines.length;i++){
      t += `   ${nameLines[i]}\n`;
    }

    if(it.drink){
      t += `   Bebida   : ${it.drink}\n`;
    }

    if(it.bagQty && it.bagQty > 0){
      t += `   Bolsa    : x${it.bagQty}\n`;
    }

    const sub = moneyTicket(it.subtotal || 0);
    t += `   Subtotal: ${sub}\n`;
    if (idx < order.items.length - 1) t += `${sep2}\n`;
  });

  t += `\n${sep}\n`;
  t += `TOTAL A PAGAR  : ${moneyTicket(order.total || 0)}\n`;
  t += `${sep}\n\n`;

  t += `♦ Delivery tiene costo adicional\n`;
  t += `♦ Según la distancia $2.500 a $4.000\n`;

  return t;
}

function buildTicketHtml80mm(order){
  const raw = buildTicketText80mm(order);

  const esc = raw
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');

  const html = esc
    .replace('POLLERÍA EL POLLÓN', '<b>POLLERÍA EL POLLÓN</b>')
    .replace('TOTAL A PAGAR', '<b>TOTAL A PAGAR</b>');

  return html;
}

function buildWhatsappTextFromOrder(order){
  return buildTicketText80mm(order);
}

/* =========================
   Cart UI
========================= */
const badgeDesktop = document.getElementById('cart-badge-desktop');
const badgeDropdownMobile = document.getElementById('menu-dd-cart-badge');

const floatingCartCount = document.getElementById('floating-cart-count');
const floatingCartTotal = document.getElementById('floating-cart-total');

function cartCount(){
  return cart.reduce((acc,it)=> acc + (it.qty||0), 0);
}
function cartSum(){
  return cart.reduce((acc,it)=> acc + (it.total||0), 0);
}

function updateCartUI(){
  const c = cartCount();
  const t = cartSum();

  if(badgeDesktop) badgeDesktop.textContent = String(c);
  if(badgeDropdownMobile) badgeDropdownMobile.textContent = String(c);

  if(floatingCartCount) floatingCartCount.textContent = String(c);
  if(floatingCartTotal) floatingCartTotal.textContent = money(t);

  const fcBtn = document.getElementById('floating-cart');
  if(fcBtn) fcBtn.classList.toggle('is-empty', c === 0);
}

const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');

function renderCart(){
  cartItemsEl.innerHTML = '';
  if(cart.length === 0){
    cartItemsEl.innerHTML = `<div class="p-4 rounded-2xl bg-gray-50 border text-gray-700 font-bold">Tu carrito está vacío.</div>`;
    cartTotalEl.textContent = money(0);
    updateCartUI();
    return;
  }

  cart.forEach((it, idx)=>{
    const row = document.createElement('div');
    row.className = 'p-3 rounded-2xl bg-white border flex flex-col md:flex-row md:items-center md:justify-between gap-2';

    const left = document.createElement('div');
    left.innerHTML = `
      <div class="font-extrabold">${it.name} <span class="text-gray-500 font-bold">x${it.qty}</span></div>
      ${it.drink ? `<div class="text-sm text-gray-600">🥤 ${it.drink}</div>` : ''}
      ${it.bagQty ? `<div class="text-sm text-gray-600">🛍️ Bolsa: ${it.bagQty} x ${money(BAG_PRICE)}</div>` : ''}
    `;

    const right = document.createElement('div');
    right.className = 'flex items-center gap-2 justify-between md:justify-end';

    const price = document.createElement('div');
    price.className = 'font-extrabold text-red-700';
    price.textContent = money(it.total);

    const del = document.createElement('button');
    del.className = 'btn-secondary';
    del.type = 'button';
    del.textContent = 'Eliminar';
    del.dataset.action = 'remove';
    del.dataset.index = String(idx);

    right.appendChild(price);
    right.appendChild(del);

    row.appendChild(left);
    row.appendChild(right);

    cartItemsEl.appendChild(row);
  });

  cartTotalEl.textContent = money(cartSum());
  updateCartUI();
}

/* =========================
   Chatbot
========================= */
const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotPanel = document.getElementById('chatbot-panel');
const chatbotClose = document.getElementById('chatbot-close');
const chatbotMessages = document.getElementById('chatbot-messages');

function addChatMsg(text, who='bot'){
  const d = document.createElement('div');
  d.className = 'cb-msg ' + (who === 'user' ? 'cb-user' : 'cb-bot');
  d.textContent = text;
  chatbotMessages.appendChild(d);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function chatbotWelcome(){
  chatbotMessages.innerHTML = '';
  addChatMsg('¡Hola! Soy tu asistente. Elige una opción para ayudarte 😊', 'bot');
}

function setActiveCatBtn(cat){
  document.querySelectorAll('.cat-card__btn.category-btn').forEach(b=>{
    b.classList.toggle('is-active', b.dataset.cat === cat);
  });
}

function updateCategoryTitle(cat){
  if(!categoryTitleEl) return;

  if(cat === 'todo-el-menu'){
    categoryTitleEl.classList.add('is-hidden');
    categoryTitleEl.textContent = '';
    return;
  }

  categoryTitleEl.classList.remove('is-hidden');
  categoryTitleEl.textContent = CATEGORY_META[cat] || cat;
}

function toggleCatSlider(cat){
  if(!catSliderEl) return;

  // ✅ El slider siempre se mantiene visible (estático)
  catSliderEl.classList.remove('is-hidden');
}

function toggleHeroCarousel(show){
  const heroSection = document.querySelector('.hero');
  if(!heroSection) return;
  
  if(show){
    heroSection.classList.remove('is-hidden');
    // Reiniciar el carrusel cuando se muestra
    startCarousel();
  }else{
    heroSection.classList.add('is-hidden');
    // Detener el carrusel cuando se oculta
    if(carouselTimer) clearInterval(carouselTimer);
  }
}

function setCategory(cat){
  currentCategory = cat;
  setActiveCatBtn(cat);
  updateCategoryTitle(cat);
  toggleCatSlider(cat);

  // ✅ Mostrar el carrusel cuando se selecciona una categoría específica
  if(cat === 'todo-el-menu'){
    toggleHeroCarousel(true);
    renderProductsAll();
  }else{
    toggleHeroCarousel(true);
    renderProductsSingle(cat);
  }
}

function jumpToCategory(cat){
  if(cat === 'todo-el-menu'){
    setCategory('todo-el-menu');
    scrollToMenu();
    return;
  }
  // ✅ Cuando se hace clic en una categoría desde otro lugar, mostrar carrusel
  setCategory(cat);
  scrollToMenu();
}

// ✅ Función para resetear al inicio (mostrar carrusel y todo el menú)
function resetToHome(){
  setCategory('todo-el-menu');
  toggleHeroCarousel(true);
  scrollToMenu();
  // Scroll al top suave
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleChatbotAction(action){
  addChatMsg(action, 'user');

  if(action === 'familiares'){
    addChatMsg('Los combos familiares más pedidos están en “Familiares”. Te llevo ahí ✅', 'bot');
    jumpToCategory('ofertas-familiares');
    scrollToMenu();
  } else if(action === 'masvendidos'){
    addChatMsg('🔥 Platos más vendidos: Ofertón más Chaufa, Ofertón más Fideo, Chaufa Brasa, Lomo Saltado. ¿Te llevo al menú? ✅', 'bot');
    scrollToMenu();
  } else if(action === 'horarios'){
    addChatMsg('📍 Calle Vivar 1086, Iquique.\n🕒 Horario: 12:00 – 23:30', 'bot');
  } else if(action === 'delivery'){
    addChatMsg('🚚 Delivery aprox. $2.500–$4.000 según zona.\nPara pedir: agrega productos → abre carrito → WhatsApp.', 'bot');
    openModal('#modal-delivery');
  } else if(action === 'pedido'){
    addChatMsg('Para hacer pedido: agrega productos → abre carrito → “Realizar pedido por WhatsApp” ✅', 'bot');
  } else if(action === 'pagos'){
    addChatMsg('Métodos de pago: En el local efectivo y tarjeta. En delivery solo efectivo.', 'bot');
  } else if(action === 'redes'){
    addChatMsg('Síguenos en Facebook / Instagram / TikTok (botones en el footer).', 'bot');
  } else {
    addChatMsg('Listo 😊', 'bot');
  }
}

/* =========================
   Dropdowns
========================= */
const menuDdBtn = document.getElementById('menu-dd-btn');
const menuDdPanel = document.getElementById('menu-dd-panel');

function togglePanel(panel){
  if(!panel) return;
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !isHidden);
}
function closePanels(){
  if(menuDdPanel) menuDdPanel.classList.add('hidden');
}

/* =========================
   Carousel fade PRO
========================= */
let carouselIndex = 0;
let carouselTimer = null;

function startCarousel(){
  const container = document.getElementById('carousel-container');
  if(!container) return;

  const imgs = Array.from(container.querySelectorAll('img'))
    .filter(img => img.style.display !== 'none');

  if(!imgs.length) return;

  imgs.forEach(img => img.classList.remove('is-active'));
  carouselIndex = 0;
  imgs[0].classList.add('is-active');

  if(carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(()=>{
    imgs[carouselIndex].classList.remove('is-active');
    carouselIndex = (carouselIndex + 1) % imgs.length;
    imgs[carouselIndex].classList.add('is-active');
  }, 2000);
}

/* =========================
   Global click handler
========================= */
document.addEventListener('click', (e)=>{
  const t = e.target;

  const closeSel = t?.dataset?.close;
  if(closeSel){
    closeModal(closeSel);
    return;
  }

  // ✅ Handler para el logo y nombre - resetear al inicio
  const headerLeft = document.querySelector('.header-left');
  if(headerLeft && headerLeft.contains(t)){
    // Buscar el enlace más cercano dentro del header-left
    const logoLink = t.closest('a[href="#"]');
    if(logoLink && headerLeft.contains(logoLink)){
      e.preventDefault();
      e.stopPropagation();
      resetToHome();
      return;
    }
  }

  if(t?.classList?.contains('category-btn') || t?.closest?.('.category-btn')){
    const btn = t.classList.contains('category-btn') ? t : t.closest('.category-btn');
    const cat = btn?.dataset?.cat;
    if(!cat) return;
    setCategory(cat);
    scrollToMenu();
    return;
  }

  const heartBtn = t?.closest?.('[data-action="heart"]');
  if(heartBtn){
    heartBtn.classList.toggle('is-on');
    burstHearts(heartBtn);
    return;
  }

  if(t?.dataset?.action === 'add'){
    try{
      const p = JSON.parse(t.dataset.product);
      currentProduct = p;
      currentRealCategory = p.__category;
      selectedDrink = null;
      productQuantity = 1;
      bagChoice = null;

      optName.textContent = p.name;
      optDesc.textContent = p.desc || '';
      optPrice.textContent = money(p.price);
      qtyValue.textContent = String(productQuantity);

      setDrinkVisible(currentRealCategory === 'ofertas-familiares');

      document.querySelectorAll('input[name="drink"]').forEach(r=> r.checked = false);

      paintBagOptions();
      document.querySelectorAll('input[name="bag"]').forEach(r=> r.checked = false);

      computeLiveTotal();
      openModal('#options-modal');
    }catch(err){
      console.warn(err);
    }
    return;
  }

  if(t?.dataset?.action === 'remove'){
    const idx = Number(t.dataset.index);
    if(Number.isFinite(idx)){
      cart.splice(idx, 1);
      renderCart();
    }
    return;
  }

  if(t?.classList?.contains('menu-dd-item')){
    const cat = t.dataset.scrollcat;
    closePanels();
    if(!cat) return;

    if(cat === 'todo-el-menu'){
      setCategory('todo-el-menu');
      scrollToMenu();
      return;
    }

    setCategory(cat);
    scrollToMenu();
    return;
  }

  if(t?.classList?.contains('combo-btn')){
    const cat = t.dataset.scrollcat;
    if(cat) { jumpToCategory(cat); scrollToMenu(); }
    return;
  }

  if(menuDdPanel && !menuDdPanel.classList.contains('hidden')){
    const inside = menuDdPanel.contains(t) || menuDdBtn.contains(t);
    if(!inside) menuDdPanel.classList.add('hidden');
  }
});

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    closePanels();
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  }
});

/* =========================
   Specific buttons
========================= */
document.getElementById('btn-delivery')?.addEventListener('click', ()=> openModal('#modal-delivery'));
document.getElementById('btn-reservas')?.addEventListener('click', ()=> openModal('#modal-reservas'));
document.getElementById('btn-retiros')?.addEventListener('click', ()=> openModal('#modal-retiros'));

document.getElementById('open-delivery-from-footer')?.addEventListener('click', ()=> openModal('#modal-delivery'));

document.getElementById('modal-reserva-go')?.addEventListener('click', ()=>{
  window.open('https://pollon543.github.io/reservas-online/', '_blank');
});

document.getElementById('modal-retiro-go')?.addEventListener('click', ()=>{
  const msg = encodeURIComponent('Hola, deseo coordinar un retiro. Mi pedido será para retiro (mínimo $100.000), gracias.');
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
});

document.getElementById('menu-dd-btn')?.addEventListener('click', (e)=>{
  e.stopPropagation();
  togglePanel(menuDdPanel);
});

document.getElementById('menu-dd-view-cart')?.addEventListener('click', ()=>{
  closePanels();
  openModal('#cart-modal');
  renderCart();
});

document.getElementById('view-cart-desktop')?.addEventListener('click', ()=>{
  openModal('#cart-modal');
  renderCart();
});

document.getElementById('floating-cart')?.addEventListener('click', ()=>{
  openModal('#cart-modal');
  renderCart();
});

document.getElementById('close-cart')?.addEventListener('click', ()=> closeModal('#cart-modal'));
document.getElementById('close-cart-2')?.addEventListener('click', ()=> closeModal('#cart-modal'));

/* Options modal quantity */
document.getElementById('qty-minus')?.addEventListener('click', ()=>{
  productQuantity = Math.max(1, productQuantity - 1);
  qtyValue.textContent = String(productQuantity);
  computeLiveTotal();
});
document.getElementById('qty-plus')?.addEventListener('click', ()=>{
  productQuantity = Math.min(50, productQuantity + 1);
  qtyValue.textContent = String(productQuantity);
  computeLiveTotal();
});

/* Options modal cancel */
function closeOptions(){ closeModal('#options-modal'); }
document.getElementById('cancel-options')?.addEventListener('click', closeOptions);
document.getElementById('cancel-options-2')?.addEventListener('click', closeOptions);

/* Drink selection */
document.querySelectorAll('input[name="drink"]').forEach(r=>{
  r.addEventListener('change', ()=>{ selectedDrink = r.value; });
});

/* Bag choice selection */
document.addEventListener('change', (e)=>{
  const t = e.target;
  if(t && t.name === 'bag'){
    bagChoice = t.value;
    computeLiveTotal();
  }
});

/* Confirm add */
document.getElementById('confirm-add')?.addEventListener('click', ()=>{
  if(!currentProduct) return;

  if(currentRealCategory === 'ofertas-familiares' && !selectedDrink){
    showToast('En familiares debes elegir una bebida.');
    return;
  }

  const bagRequired =
    currentRealCategory === 'ofertas-familiares' ||
    currentRealCategory === 'ofertas-dos' ||
    currentRealCategory === 'ofertas-personales' ||
    currentRealCategory === 'platos-extras';

  if(bagRequired && bagChoice !== 'add'){
    showToast('En esta categoría la bolsa es obligatoria.');
    return;
  }

  if(currentRealCategory === 'bebidas' || currentRealCategory === 'descartables'){
    bagChoice = 'none';
  }

  const { total, bagQty, base } = computeLiveTotal();
  const bagTotal = (bagQty || 0) * BAG_PRICE;

  const item = {
    name: currentProduct.name,
    price: currentProduct.price,
    qty: productQuantity,
    drink: (currentRealCategory === 'ofertas-familiares') ? selectedDrink : null,
    bagQty: bagQty || 0,
    subtotal: base + bagTotal,
    total: total
  };

  cart.push(item);
  updateCartUI();
  showToast('Agregado al carrito ✅');
  closeOptions();
});

/* Checkout */
document.getElementById('checkout-btn')?.addEventListener('click', ()=>{
  if(cart.length === 0){
    showToast('Tu carrito está vacío.');
    return;
  }
  closeModal('#cart-modal');
  openModal('#checkout-modal');
});

function closeCheckout(){ closeModal('#checkout-modal'); }
document.getElementById('cancel-checkout')?.addEventListener('click', closeCheckout);
document.getElementById('cancel-checkout-2')?.addEventListener('click', closeCheckout);

document.getElementById('checkout-form')?.addEventListener('submit', async (e)=>{
  e.preventDefault();

  if(cart.length === 0){
    showToast('Tu carrito está vacío.');
    closeCheckout();
    return;
  }

  const name = wrapText(document.getElementById('cust-name')?.value ?? '', 25);
  const address = wrapText(document.getElementById('cust-address')?.value ?? '', 25);
  const phone = (document.getElementById('cust-phone')?.value ?? '').trim();
  const comment = wrapText(document.getElementById('cust-comment')?.value ?? '', 25);

  const ticketNumber = nextTicketNumber(); // ✅ FIX: ya no depende de orders.length

  const order = {
    id: 'P' + Date.now(),
    createdAt: new Date().toISOString(),
    ticketNumber,
    customer: { name, address, phone, comment },
    items: cart.map(it=>({
      name: it.name,
      qty: it.qty,
      subtotal: it.subtotal,
      drink: it.drink,
      bagQty: it.bagQty
    })),
    total: cartSum(),
    status: 'Pendiente'
  };

  // ✅ mantenemos array local para admin/local
  orders.push(order);

  // ✅ FIX PRO: guardar solo este pedido en Firestore
  await saveSingleOrder(order);

  const text = buildWhatsappTextFromOrder(order);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');

  cart = [];
  updateCartUI();
  renderCart();

  closeCheckout();
  showToast('Pedido generado ✅ (abre WhatsApp)');
});

/* Chatbot */
chatbotToggle?.addEventListener('click', ()=>{
  chatbotPanel.classList.toggle('hidden');
  if(!chatbotPanel.classList.contains('hidden')) chatbotWelcome();
});
chatbotClose?.addEventListener('click', ()=> chatbotPanel.classList.add('hidden'));
document.querySelectorAll('.chip').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    handleChatbotAction(btn.dataset.chat);
  });
});

/* Year */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ✅ Enforce wrap */
enforceWrapLimit(document.getElementById('cust-name'), 25);
enforceWrapLimit(document.getElementById('cust-address'), 25);
enforceWrapLimit(document.getElementById('cust-comment'), 25);

/* Init */
function init(){
  initOrdersBackend();
  loadOrders();
  // ✅ Asegurar que el carrusel se muestre al inicio
  toggleHeroCarousel(true);
  setCategory('todo-el-menu');
  updateCartUI();
  renderCart();
  chatbotWelcome();
  startCarousel();
}
init();

/* Expose for admin.js */
window.__POLLON__ = {
  money,
  orders: () => orders,
  setOrders: (arr)=>{ orders = arr; saveOrders(); },
  saveOrders,
  loadOrders,
  buildWhatsappTextFromOrder,
  buildTicketText80mm,
  buildTicketHtml80mm,
  WHATSAPP_NUMBER
};

// ===== CATEGORÍAS SLIDER (8 dots + flechas abajo + swipe) =====
(() => {
  const track = document.getElementById("cat-track");
  const btnPrev = document.getElementById("cat-prev");
  const btnNext = document.getElementById("cat-next");
  const dotsWrap = document.getElementById("cat-dots");
  const scrollBar = document.getElementById("cat-scrollbar");
  const scrollThumb = document.getElementById("cat-scrollbar-thumb");

  // ✅ Si no existe el contenedor principal, no inicializar
  if (!track) return;

  function getGap(){
    const style = getComputedStyle(track);
    return parseFloat(style.columnGap || style.gap || "10") || 10;
  }

  function getStep(){
    const first = track.querySelector(".cat-card");
    if(!first) return 240;
    return first.getBoundingClientRect().width + getGap();
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function buildDots(){
    if (!dotsWrap) return;
    const cards = track.querySelectorAll(".cat-card");
    dotsWrap.innerHTML = "";
    cards.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = "cat-dot" + (i === 0 ? " is-active" : "");
      dot.addEventListener("click", () => {
        track.scrollTo({ left: i * getStep(), behavior: "smooth" });
      });
      dotsWrap.appendChild(dot);
    });
  }

  function setActiveDot(index){
    if (!dotsWrap) return;
    const dots = dotsWrap.querySelectorAll(".cat-dot");
    dots.forEach(d => d.classList.remove("is-active"));
    if(dots[index]) dots[index].classList.add("is-active");
  }

  function updateScrollIndicator(){
    if(!scrollBar || !scrollThumb) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    if(maxScroll <= 1){
      scrollBar.style.display = 'none';
      return;
    }
    scrollBar.style.display = '';

    const barW = scrollBar.clientWidth || 1;
    const ratio = track.clientWidth / track.scrollWidth;
    const thumbW = Math.max(55, Math.floor(barW * ratio)); // mínimo “profesional” tipo imagen
    const maxLeft = Math.max(0, barW - thumbW);
    const left = maxLeft * (track.scrollLeft / maxScroll);

    scrollThumb.style.width = `${thumbW}px`;
    scrollThumb.style.transform = `translateX(${left}px)`;
  }

  function updateUI(){
    const step = getStep();
    const cards = track.querySelectorAll(".cat-card");
    const maxIndex = Math.max(0, cards.length - 1);

    const idx = clamp(Math.round(track.scrollLeft / step), 0, maxIndex);
    setActiveDot(idx);

    if (btnPrev) {
      btnPrev.disabled = track.scrollLeft <= 2;
    }
    if (btnNext) {
      btnNext.disabled = track.scrollLeft >= (track.scrollWidth - track.clientWidth - 2);
    }

    updateScrollIndicator();
  }

  function scrollByCard(dir){
    track.scrollBy({ left: dir * getStep(), behavior: "smooth" });
  }

  // ✅ Flechas solo si existen en el DOM
  if (btnPrev) btnPrev.addEventListener("click", () => scrollByCard(-1));
  if (btnNext) btnNext.addEventListener("click", () => scrollByCard(1));

  track.addEventListener("scroll", () => requestAnimationFrame(updateUI));

  /* Arrastre con mouse o dedo desde cualquier parte (imagen, texto, card). Umbral para no bloquear clic en categoría. */
  const DRAG_THRESHOLD = 8; // ✅ Umbral más bajo para detectar más temprano
  const VERTICAL_THRESHOLD = 6; // ✅ Umbral específico para movimiento vertical
  let isDown = false;
  let dragMode = false;
  let startX = 0;
  let startY = 0;
  let startScroll = 0;
  let capturedPointerId = null;
  let didDrag = false;
  let isVerticalScroll = false; // ✅ Nueva variable para detectar scroll vertical

  track.addEventListener("pointerdown", (e) => {
    isDown = true;
    dragMode = false;
    isVerticalScroll = false;
    startX = e.clientX;
    startY = e.clientY;
    startScroll = track.scrollLeft;
    capturedPointerId = null;
    didDrag = false;
    track.classList.remove("cat-track--grabbing");
  });

  track.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    
    // ✅ Si ya detectamos scroll vertical, no interferir
    if (isVerticalScroll) {
      return;
    }
    
    if (!dragMode) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      
      // ✅ Detectar movimiento vertical PRIMERO (más temprano)
      if (dy > VERTICAL_THRESHOLD && dy > dx) {
        // ✅ Movimiento principalmente vertical - liberar control inmediatamente
        isVerticalScroll = true;
        isDown = false;
        dragMode = false;
        // ✅ Liberar cualquier captura de pointer
        if (capturedPointerId != null) {
          try { track.releasePointerCapture(capturedPointerId); } catch (_) {}
          capturedPointerId = null;
        }
        track.classList.remove("cat-track--grabbing");
        return; // ✅ Salir y permitir scroll vertical nativo
      }
      
      // ✅ Si el movimiento supera el umbral horizontal, activar drag horizontal
      if (dx > DRAG_THRESHOLD && dx >= dy) {
        dragMode = true;
        didDrag = true;
        capturedPointerId = e.pointerId;
        track.setPointerCapture(e.pointerId);
        track.classList.add("cat-track--grabbing");
        startX = e.clientX;
        startScroll = track.scrollLeft;
      }
    }
    if (dragMode) {
      e.preventDefault();
      const dx = e.clientX - startX;
      track.scrollLeft = startScroll - dx;
    }
  }, { passive: false });

  track.addEventListener("pointerup", (e) => {
    if (dragMode && capturedPointerId != null) {
      try { track.releasePointerCapture(capturedPointerId); } catch (_) {}
      capturedPointerId = null;
    }
    isDown = false;
    dragMode = false;
    isVerticalScroll = false;
    track.classList.remove("cat-track--grabbing");
    updateUI();
  });

  track.addEventListener("pointercancel", (e) => {
    if (dragMode && capturedPointerId != null) {
      try { track.releasePointerCapture(capturedPointerId); } catch (_) {}
      capturedPointerId = null;
    }
    isDown = false;
    dragMode = false;
    isVerticalScroll = false;
    track.classList.remove("cat-track--grabbing");
    updateUI();
  });

  /* Evitar que al soltar después de arrastrar se dispare el clic del botón de categoría */
  track.addEventListener("click", (e) => {
    if (didDrag || isVerticalScroll) {
      e.preventDefault();
      e.stopPropagation();
      didDrag = false;
      isVerticalScroll = false;
    }
  }, true);

  buildDots();
  updateUI();

  window.addEventListener("resize", () => {
    buildDots();
    updateUI();
  });
})();
