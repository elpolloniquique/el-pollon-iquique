// --------- Config ----------

const CURRENCY = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});
const BAG_PRICE = 200; // CLP
const WHATSAPP_NUMBER = '56986925310';

// ======================= FIREBASE CONFIGURACIÓN =========================
// Realtime Database: los pedidos se guardan en la ruta "pollon_orders_v1".
// Reglas obligatorias en Firebase Console > Realtime Database > Reglas:
//   { "rules": { "pollon_orders_v1": { ".read": true, ".write": true } } }
// Ver FIREBASE-BASE-DATOS.md para desplegar reglas y comprobar que todo funcione.
// -----------------------------------------------------------------------

//esta con este nombre BD02pagina01 correo  usolibletrabajos@gmail.com

// const firebaseConfig = {
//   apiKey: "AIzaSyDc4omnC9sxGUKEYjUVrJUxcG9RMiidkr4",
//   authDomain: "pollonpagina01.firebaseapp.com",
//   databaseURL: "https://pollonpagina01-default-rtdb.firebaseio.com",
//   projectId: "pollonpagina01",
//   storageBucket: "pollonpagina01.firebasestorage.app",
//   messagingSenderId: "211369350355",
//   appId: "1:211369350355:web:11d849533761780a5df026",
//   measurementId: "G-NE5XP5N3VS"
// };




//  const firebaseConfig = {
//   apiKey: "AIzaSyDc4omnC9sxGUKEYjUVrJUxcG9RMiidkr4",
//   authDomain: "pollonpagina01.firebaseapp.com",
//   databaseURL: "https://pollonpagina01-default-rtdb.firebaseio.com",
//   projectId: "pollonpagina01",
//   storageBucket: "pollonpagina01.firebasestorage.app",
//   messagingSenderId: "211369350355",
//   appId: "1:211369350355:web:11d849533761780a5df026",
//   measurementId: "G-NE5XP5N3VS"
// };

const firebaseConfig = {
  apiKey: "AIzaSyAI2CXBbhd9zndV1d8aANY7IgG0pxdAntw",
  authDomain: "bd02pagina01.firebaseapp.com",
  databaseURL: "https://bd02pagina01-default-rtdb.firebaseio.com",
  projectId: "bd02pagina01",
  storageBucket: "bd02pagina01.firebasestorage.app",
  messagingSenderId: "865821622549",
  appId: "1:865821622549:web:7007f506cbebfe88a0a91c"

 };




let ordersRef = null;
let db = null;
let rtdb = null;
const ORDERS_PATH = 'pollon_orders_v1';
let _ordersSnapshotInitialized = false;
let useRealtimeDB = false;

let orders = [];
const ORDERS_KEY = 'pollon_orders_v1';

// Elimina undefined para Firestore
function sanitizeForFirestore(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore).filter(v => v !== undefined);
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) continue;
    out[k] = sanitizeForFirestore(obj[k]);
  }
  return out;
}

function syncOrdersToList(list) {
  const prevCount = orders.length;
  orders = list;
  orders.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  if (_ordersSnapshotInitialized && list.length > prevCount && window.PollonAdmin?.isSoundEnabled?.()) {
    window.PollonAdmin.playOrderAlarm();
  }
  _ordersSnapshotInitialized = true;
  if (document.getElementById('admin-panel-modal')?.classList.contains('active')) {
    renderAdminPanel();
  }
}

// Inicializa Firebase: Realtime DB primero (más simple), luego Firestore
function initOrdersBackend() {
  try {
    if (typeof firebase === 'undefined') {
      loadOrdersFromLocal();
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    // 1) Realtime Database (databaseURL configurado = más fácil de usar)
    if (firebase.database && firebaseConfig.databaseURL) {
      try {
        rtdb = firebase.database();
        const ref = rtdb.ref(ORDERS_PATH);
        ref.on('value', snapshot => {
          const list = [];
          const val = snapshot.val();
          if (val && typeof val === 'object') {
            Object.keys(val).forEach(key => {
              const data = val[key];
              if (data && typeof data === 'object') {
                list.push({ id: key, ...data });
              }
            });
          }
          syncOrdersToList(list);
        });
        useRealtimeDB = true;
        return;
      } catch (rtErr) {
        console.warn('Realtime DB no disponible:', rtErr);
      }
    }

    // 2) Fallback: Firestore
    initFirestore();
  } catch (e) {
    console.warn('Firebase init error:', e);
    loadOrdersFromLocal();
  }
}

function initFirestore() {
  try {
    db = firebase.firestore();
    ordersRef = db.collection(ORDERS_PATH);
    ordersRef.orderBy('createdAt', 'asc').onSnapshot(
      snapshot => {
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...(doc.data() || {}) });
        });
        syncOrdersToList(list);
      },
      err => {
        console.warn('Firestore error:', err);
        ordersRef = null;
        db = null;
        loadOrdersFromLocal();
      }
    );
  } catch (e) {
    console.warn('Firestore no disponible:', e);
    loadOrdersFromLocal();
  }
}


function loadOrdersFromLocal() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    orders = raw ? JSON.parse(raw) : [];
  } catch (_) {
    orders = [];
  }
}

// Agregar pedido (Firestore o Realtime DB). El id debe ser válido para Firebase (sin ., $, #, [, ], /).
function addOrderToBackend(order) {
  if (!order || !order.id) {
    return Promise.reject(new Error('Pedido inválido: falta id'));
  }
  const safe = sanitizeForFirestore(order);

  if (ordersRef && db && !useRealtimeDB) {
    return ordersRef.doc(order.id).set(safe);
  }

  if (rtdb && useRealtimeDB) {
    const ref = rtdb.ref(ORDERS_PATH).child(order.id);
    return ref.set(safe);
  }

  return Promise.reject(new Error('Base de datos no disponible'));
}

// Actualizar pedido (estado, deliveredAt, etc.)
function updateOrderInBackend(order) {
  if (!order || !order.id) {
    return Promise.reject(new Error('Pedido inválido: falta id'));
  }
  const safe = sanitizeForFirestore(order);
  if (ordersRef && db && !useRealtimeDB) {
    return ordersRef.doc(order.id).set(safe, { merge: true });
  }
  if (rtdb && useRealtimeDB) {
    return rtdb.ref(ORDERS_PATH).child(order.id).set(safe);
  }
  return Promise.reject(new Error('Base de datos no disponible'));
}

function saveOrders() {
  if (ordersRef && db && !useRealtimeDB) {
    const batch = db.batch();
    orders.forEach(o => {
      if (!o.id) o.id = 'P' + Date.now();
      batch.set(ordersRef.doc(o.id), sanitizeForFirestore(o), { merge: true });
    });
    batch.commit().catch(err => {
      console.error('Error guardando:', err);
      showToast('Error al guardar. Intenta de nuevo.');
    });
  } else if (rtdb && useRealtimeDB) {
    orders.forEach(o => {
      if (!o.id) o.id = 'P' + Date.now();
      rtdb.ref(ORDERS_PATH).child(o.id).set(sanitizeForFirestore(o));
    });
  } else {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Error localStorage:', e);
    }
  }
}

function loadOrders() {
  if ((ordersRef && db) || (rtdb && useRealtimeDB)) return;
  loadOrdersFromLocal();
}


// ===================== FIN CONFIG FIREBASE / BACKEND ====================

const products = {
  "ofertas-familiares": [
    { name: "Oferton mas chaufa", description: "Pollo entero, papas fritas, arroz chaufa, ensalada y bebidas 1.5lt.", price: 24500, image: "img/oferton mas chaufa.png" },
    { name: "Oferton mas fideo", description: "Pollo entero, papas fritas, fideos al pesto, ensalada y bebidas 1.5lt.", price: 24500, image: "img/oferton mas fideo.png" },
    { name: "Oferton mas chaufa pura papa", description: "Pollo entero, papas fritas, extra papa frita, arroz chaufa y bebidas 1.5lt.", price: 24500, image: "img/oferton mas chaufa pura papa.png" },
    { name: "Oferton con fideo", description: "Pollo entero, papas fritas, fideos al pesto y bebidas 1.5lt", price: 23500, image:"img/oferton con fideo.png" },
    { name: "Oferton sin ensalada", description: "Pollo entero, papas fritas, arroz chaufa y bebidas 1.5lt", price: 23500, image: "img/oferton sin ensalada.png" },
    { name: "Oferton pura papa", description: "Pollo entero, papas fritas, 1/2 porcion de papa frita y bebidas 1.5lt", price: 23500, image: "img/oferton pura papa.png" },
    { name: "oferton familiar", description: "Pollo entero, papas fritas, ensalada y bebidas 1.5lt", price: 22500, image: "img/oferton familiar.png" },
    { name: "Mega Familiar", description: "Pollo entero, papas fritas, ensalada y bebidas 1.5lt", price: 22500, image:"img/oferton familiar.png" }
  ],
  "ofertas-dos": [
    { name: "1/2 combo chaufa", description: "Medio pollo, papas fritas, arroz chaufa", price: 15600, image: "img/medio combo chaufa.png" },
    { name: "1/2 combo", description: "Medio pollo, papas fritas, ensalada personal", price: 15100, image: "img/medio combo.png" },
    { name: "1/2 combo pura papa", description: "Medio pollo, papas fritas mas cantidad,", price: 15100, image: "img/medio combo pura papa.png" }
  ],
  "ofertas-personales": [
    { name: "1/4 combo", description: "1/4 pollo, papas fritas personales, ensalada personal", price: 8100, image: "img/personal combo.png" },
    { name: "1/4 combo pura papa", description: "1/4 pollo, papas fritas personales mas cantidad.", price: 8100, image: "img/personal pura papa.png" },
    { name: "Chaufa brasa", description: "1/4 pollo, arroz chaufa", price: 8200, image: "img/chaufa brasa.png" },
    { name: "Fideo al pesto con 1/4 de pollo", description: "1/4 pollo, fideos al pesto", price: 8100, image: "img/personal pesto con pollo.png" },
    { name: "Chaufa brasa con papas fritas", description: "1/4 pollo, papas fritas personal, arroz chaufa", price: 9200, image: "img/chaufa brasa con papas fritas.png" },
    { name: "1/4 de pollo con fideo y papa", description: "1/4 pollo, papas fritas, fideos al pesto", price: 9300, image: "img/personal con papa y fideo 01.png" }
  ],
  "platos-extras": [
    { name: "Lomo saltado de carnecon chaufa", description: "", price: 12200, image: "img/lomo saltado con arroz chaufa.png" },
    { name: "Lomo saltado de carne con arroz blanco ", description: "", price: 11700, image: "img/lomo saltado de carne con arroz blanco.png" },
    { name: "Lomo saltado de pollo con arroz blanco", description: "", price: 11700, image: "img/lomo saltado de pollo con arroz blanco.png" },
    { name: "Tallarin saltado", description: "", price: 11700, image: "img/tallarin saltado de carne 01.png" },
    { name: "Bistec a lo pobre", description: "", price: 10700, image: "img/bistec a lo pobre.png" },
    { name: "Bistec con fideos al pesto", description: "", price: 10700, image: "" },
    { name: "Chuleta de cerdo", description: "", price: 10700, image: "img/chuleta de cerdo.png" },
    { name: "Pechuga a la plancha", description: "", price: 10200, image: "img/pechuga a la plancha.png" },
    { name: "Combo nuggets", description: "", price: 6700, image: "img/nugget.png" },
    { name: "Salchipapas", description: "", price: 6700, image: "img/salchipapa.png" }
  ],
  "agregados": [
    { name: "1 Pollo entero solo", description: "1 pollo entero", price: 15000, image: "img/pollo solo.png" },
    { name: "1/2 Pollo solo", description: " 1/2 pollo  -  parte truto y pechuga", price: 9900, image: "img/medio pollo solo.png" },
    { name: "1/4 pollo solo", description: "1/4 de polo -- truto o pechuga ---segun el stock", price: 5800, image: "" },
    { name: "Porcion de papas fritas familiar", description: "Porción grande de papas crujientes", price: 9000, image: "img/porcion de papa.png" },
    { name: "1/2 porcion de papas fritas", description: "Media Porción  de papas crujientes", price: 6100, image: "img/media porcion papa.png" },
    { name: "Porcion de arroz chaufa", description: "1 Porción de arroz chaufa", price: 5300, image: "img/porcion arroz chaufa.png" },
    { name: "Porcion de fideos al pesto", description: "1 Porción de fideos al pesto", price: 5300, image: "img/porcion de fideo.png" },
    { name: "Porcion de ensalada familiar", description: "Ensalada surtida - familiar ", price: 5400, image: "img/ensalada familiar.png" },
    { name: "Porcion de ensalada personal", description: "Ensalada surtida - personal", price: 3700, image: "img/ensalada personal.png" }
  ],
    
  "bebidas": [
    { name: "Coca Cola", description: "Bebida 1.5L (según stock).", price: 3800, image: "img/coca cola.png" },
    { name: "Coca Cola Cero", description: "Bebida 1.5L (según stock).", price: 3800, image: "img/coca cola cero.png" },
    { name: "Inca Kola", description: "Bebida 1.5L (según stock).", price: 3800, image: "img/inca kola.png" },
    { name: "Fanta", description: "Bebida 1.5L (según stock).", price: 3800, image: "img/fanta.png" },
    { name: "Sprite", description: "Bebida 1.5L (según stock).", price: 3800, image: "img/sprite.png" },
    { name: "Sprite Cero", description: "Bebida 1.5L (según stock).", price: 3800, image: "img/sprite cero.png" },
    { name: "Agua Sin Gas", description: "Benedictino de 500 ml. (según stock).", price: 1200, image: "img/agua sin gas.png" },
    { name: "Agua Con Gas", description: "Benedictino de 500 ml. (según stock).", price: 1200, image: "img/agua con gas.png" }
  ],

  "descartables": [
    { name: "Aluza CT5", description: "Envase descartable Aluza CT5.", price: 300, image: "img/aluza ct5.png" },
    { name: "Aluza CT3", description: "Envase descartable Aluza CT3.", price: 400, image: "img/aluza ct3.png" },
    { name: "Tenedor descartable", description: "Tenedor y cuchillo plástico descartable.", price: 200, image: "img/servicio descartable.png" },
    { name: "Bolsa ecológica", description: "Bolsa ecológica (unidad).", price: 200, image: "img/bolsa ecologica.png" },
    { name: "Vaso descartable", description: "vaso de 10 oz (unidad).", price: 50, image: "img/vaso.png" }
  ]

};
const CATEGORY_META = {
  "ofertas-familiares": { title: "👨‍👩‍👧‍👦 Ofertas Familiares" },
  "ofertas-dos":        { title: "👫 Ofertas para Dos" },
  "ofertas-personales": { title: "🧑 Ofertas Personales" },
  "platos-extras":      { title: "🍽️ Platos Extras" },
  "agregados":          { title: "➕ Agregados" },
  "bebidas":           { title: "🥤 Bebidas" },
  "descartables":      { title: "🍴 Descartables" }

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




// --------- Estado ----------
let cart = [];
let currentProduct = null;
let currentCategory = "ofertas-familiares";
let selectedDrink = null;
let productQuantity = 1;
let bagChoice = null;

// Admin
let isAdminAuthenticated = false;
let adminFilters = { from: '', to: '', status: 'todos', search: '' };

// --------- Util ----------
function money(v) {
  return CURRENCY.format(v);
}
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ======== WRAP TEXTO PARA TICKET 80mm (máx 35 caracteres por línea) ========
const TICKET_LINE_LENGTH = 35;
function wrapText(text, maxLen) {
  const len = maxLen != null ? maxLen : TICKET_LINE_LENGTH;
  const str = String(text || '').trim();
  if (!str) return '';
  const lines = [];
  let remaining = str;
  while (remaining.length > 0) {
    if (remaining.length <= len) {
      lines.push(remaining);
      break;
    }
    let chunk = remaining.slice(0, len);
    const lastSpace = chunk.lastIndexOf(' ');
    if (lastSpace > 0) {
      chunk = chunk.slice(0, lastSpace);
      remaining = remaining.slice(lastSpace + 1).trim();
    } else {
      remaining = remaining.slice(len);
    }
    lines.push(chunk);
  }
  return lines.join('\n');
}

// ======== TEXTO WHATSAPP (USADO TAMBIÉN PARA IMPRESORA TÉRMICA) ========
function buildWhatsappTextFromOrder(order) {
  if (!order) return '';
  const customer = order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const total = order.total != null ? order.total : 0;

  // Formato de fecha y hora en base a createdAt
  const fechaBase = order.createdAt ? new Date(order.createdAt) : new Date();
  const dd = String(fechaBase.getDate()).padStart(2, "0");
  const mm = String(fechaBase.getMonth() + 1).padStart(2, "0");
  const yyyy = fechaBase.getFullYear();
  const hh = String(fechaBase.getHours()).padStart(2, "0");
  const min = String(fechaBase.getMinutes()).padStart(2, "0");

  const fechaStr = `${dd}-${mm}-${yyyy}`;
  const horaStr = `${hh}:${min}`;

  // Número de ticket (ej: 001, 002, 010, etc.)
  const ticket = (order.ticketNumber || "1").toString().padStart(3, "0");

  let msg = "";

  // CABECERA
  msg += `◆ DELIVERY - POLLERÍA EL POLLÓN ◆\n\n`;
  msg += `${ticket}    ${fechaStr}    ${horaStr}\n`;
  msg += `────────────────────────────────\n`;
  msg += `◆ DATOS DEL CLIENTE\n`;
  msg += `────────────────────────────────\n\n`;

  // DATOS CLIENTE (seguro si customer viene vacío desde BD). Dirección y comentarios con wrap 35 chars para ticket 80mm.
  msg += `◆ Nombre:   ${customer.name || '-'}\n`;
  msg += `◆ Teléfono: ${customer.phone || '-'}\n`;
  const addrWrapped = wrapText(customer.address, TICKET_LINE_LENGTH);
  msg += `◆ Dirección:\n${addrWrapped ? addrWrapped.split('\n').map(l => '   ' + l).join('\n') : '   -'}\n\n`;
  const commentsRaw = (customer.comments || '').trim();
  if (commentsRaw) {
    const commentsWrapped = wrapText(commentsRaw, TICKET_LINE_LENGTH);
    msg += `◆ Comentarios:\n${commentsWrapped.split('\n').map(l => '   ' + l).join('\n')}\n\n`;
  }

  // DETALLE PEDIDO
  msg += `────────────────────────────────\n`;
  msg += `◆ DETALLE DEL PEDIDO\n`;
  msg += `────────────────────────────────\n\n`;

  items.forEach((it, i) => {
    if (!it || typeof it !== 'object') return;
    const name = it.name || 'Producto';
    const qty = it.qty != null ? it.qty : 1;
    const totalItem = it.total != null ? it.total : 0;
    msg += `${i + 1}. ${name} × ${qty}\n`;
    msg += `— Subtotal: ${money(totalItem)}\n`;
    if (it.drink) {
      msg += `— Bebida: ${it.drink}\n`;
    }
    if ((it.bagQty || 0) > 0) {
      msg += `— Bolsa: x ${it.bagQty} (+ ${money(BAG_PRICE)} /u)\n`;
    }
    msg += `\n`;
  });

  // TOTAL
  msg += `────────────────────────────────\n`;
  msg += `◆ TOTAL A PAGAR: ${money(total)}\n`;
  msg += `────────────────────────────────\n\n`;

  // NOTA DELIVERY
  msg += `◆ Delivery tiene costo adicional\n`;
  msg += `◆ segun la distancia $2.500 a $4.000`;

  return msg;
}



// --------- Render products ----------
document.querySelectorAll('.sidebar-category').forEach(btn => {
  btn.addEventListener('click', () => {
    renderProductsSingle(btn.dataset.category);
    closeSidebarMenu();
    document.querySelector('#products-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});


// Render normal: UNA categoría
function renderProductsSingle(category) {
  currentCategory = category;

  const container = document.getElementById('products-container');
  if (!container) return;

  container.innerHTML = '';

  (products[category] || []).forEach(p => {
    // 🔥 Guardamos la categoría real dentro del producto:
    const payload = { ...p, __category: category };

    const card = document.createElement('div');
    card.className = 'product-card bg-white rounded-lg shadow-lg overflow-hidden';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}" class="product-image"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
      <div class="h-48 bg-gradient-to-br from-orange-400 to-red-500 hidden items-center justify-center text-6xl">🍗</div>
      <div class="p-4">
        <h3 class="font-bold text-lg mb-2 text-red-900">${p.name}</h3>
        <p class="text-gray-600 text-sm mb-3">${p.description || ''}</p>
        <div class="flex justify-between items-center gap-2">
          <span class="text-2xl font-bold text-red-700">${money(p.price)}</span>
          <div class="product-card-actions flex items-center gap-2 flex-1 justify-end">
            <span class="product-like-wrap">
              <button type="button" class="product-like-btn" aria-label="Me gusta" title="Me gusta">
                <svg class="heart-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            </span>
            <button class="add-to-cart px-4 py-2 rounded-lg font-bold text-white hover:opacity-90"
                    style="background-color:#dc2626"
                    data-product='${JSON.stringify(payload)}'>Agregar</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  setActiveCategoryButton(category);
}

function setActiveCategoryButton(category) {
  document.querySelectorAll('.category-btn.catbtn').forEach(btn => {
    btn.classList.toggle('is-active', (btn.dataset.category || '') === category);
  });
}

// Render “TODO EL MENÚ”: todas las categorías con encabezados
function renderProductsAll() {
  currentCategory = "todo-el-menu";

  const container = document.getElementById('products-container');
  if (!container) return;

  container.innerHTML = '';

  CATEGORY_ORDER.forEach(catKey => {
    const list = products[catKey] || [];
    if (!list.length) return;

    // Encabezado: nombre de categoría al canto izquierdo + línea roja hasta el final
    const header = document.createElement('div');
    header.className = 'col-span-full mt-4 mb-2 category-header';
    header.innerHTML = `
      <div class="category-header-inner">
        <h3 class="category-header-title">${CATEGORY_META[catKey]?.title || catKey}</h3>
        <span class="category-line"></span>
      </div>
    `;
    container.appendChild(header);

    list.forEach(p => {
      const payload = { ...p, __category: catKey };

      const card = document.createElement('div');
      card.className = 'product-card bg-white rounded-lg shadow-lg overflow-hidden';
      card.innerHTML = `
        <img src="${p.image}" alt="${p.name}" class="product-image"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="h-48 bg-gradient-to-br from-orange-400 to-red-500 hidden items-center justify-center text-6xl">🍗</div>
        <div class="p-4">
          <h3 class="font-bold text-lg mb-2 text-red-900">${p.name}</h3>
          <p class="text-gray-600 text-sm mb-3">${p.description || ''}</p>
          <div class="flex justify-between items-center gap-2">
            <span class="text-2xl font-bold text-red-700">${money(p.price)}</span>
            <div class="product-card-actions flex items-center gap-2 flex-1 justify-end">
              <span class="product-like-wrap">
                <button type="button" class="product-like-btn" aria-label="Me gusta" title="Me gusta">
                  <svg class="heart-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              </span>
              <button class="add-to-cart px-4 py-2 rounded-lg font-bold text-white hover:opacity-90"
                      style="background-color:#dc2626"
                      data-product='${JSON.stringify(payload)}'>Agregar</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  });

  setActiveCategoryButton("todo-el-menu");
}


// --------- Carrito UI ----------
function updateCartUI() {
  const c = cart.length;
  const total = cart.reduce((s, i) => s + i.total, 0);
  const fc = document.getElementById('floating-cart-count');
  const fb = document.getElementById('floating-cart-badge');
  const ft = document.getElementById('floating-cart-total');
  const mb = document.getElementById('cart-badge-mobile');
  const db = document.getElementById('cart-badge-desktop');
  if (fc) fc.textContent = c;
  if (fb) {
    fb.textContent = c;
    fb.classList.add('cart-badge');
    setTimeout(() => fb.classList.remove('cart-badge'), 500);
  }
  if (ft) ft.textContent = money(total);
  if (mb) mb.textContent = c;
  if (db) db.textContent = c;

  const ddBadge = document.getElementById('menu-dd-cart-badge');
  if (ddBadge) ddBadge.textContent = c;

}
function renderCart() {
  const wrap = document.getElementById('cart-items');
  const t = document.getElementById('cart-total');
  if (!wrap || !t) return;
  if (cart.length === 0) {
    wrap.innerHTML = '<p class="text-center text-gray-500 py-8">Tu carrito está vacío</p>';
    t.textContent = money(0);
    return;
  }
  let total = 0;
  wrap.innerHTML = cart.map((it, i) => {
    total += it.total;
    const bagLine = it.bagQty > 0 ? `♻️ Bolsa Ecológica: x ${it.bagQty} (+ ${money(BAG_PRICE)} c/u)` : '';
    const drinkLine = it.drink ? `🥤 Bebida: ${it.drink}` : '';
    return `
      <div class="flex justify-between items-center mb-4 pb-4 border-b">
        <div class="flex-1">
          <h4 class="font-bold text-gray-800">${it.name} × ${it.qty}</h4>
          <p class="text-sm text-gray-600">${drinkLine}</p>
          <p class="text-sm text-green-600">${bagLine}</p>
        </div>
        <div class="text-right">
          <p class="font-bold text-lg text-red-700">${money(it.total)}</p>
          <button class="remove-item text-red-600 text-sm hover:underline" data-index="${i}">Eliminar</button>
        </div>
      </div>`;
  }).join('');
  t.textContent = money(total);
}

// --------- Modal helpers ----------
function setDrinkVisible(visible) {
  const s = document.getElementById('drink-section');
  if (s) s.classList.toggle('hidden', !visible);
}
function paintBagOptions() {
  const badge = document.getElementById('bag-badge');
  const opts = document.getElementById('bag-options');
  const note = document.getElementById('bag-note');
  if (!badge || !opts || !note) return;

    // ✅ En Bebidas y Descartables NO se usa bolsa
  const bagSection = document.getElementById('bag-section');
  if (currentCategory === 'bebidas' || currentCategory === 'descartables') {
    bagChoice = 'none';
    if (bagSection) bagSection.classList.add('hidden');
    return;
  } else {
    if (bagSection) bagSection.classList.remove('hidden');
  }


  opts.innerHTML = '';
  note.textContent = '';
  bagChoice = null;

  const isFamiliares = currentCategory === 'ofertas-familiares';
  const isOtherMandatory = ['ofertas-dos', 'ofertas-personales', 'platos-extras'].includes(currentCategory);
  const isAgregados = currentCategory === 'agregados';

  if (isFamiliares || isOtherMandatory) {
    badge.textContent = 'Obligatorio';
    badge.className = 'text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold';
    opts.innerHTML = `
      <label class="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg hover:border-red-500 cursor-pointer bag-option">
        <input type="radio" name="bag" value="add" class="bag-radio">
        <span class="font-semibold text-gray-800">Agregar bolsa (+ ${money(BAG_PRICE)})</span>
      </label>
    `;
    note.innerHTML = isFamiliares
      ? `* Esta categoría requiere agregar bolsa. Costo por bolsa: <strong>${money(BAG_PRICE)}</strong>. Se agregará <strong>1 bolsa por cada unidad</strong>.`
      : `* Esta categoría requiere agregar bolsa. Costo por bolsa: <strong>${money(BAG_PRICE)}</strong>. Se agregará <strong>1 bolsa por pedido</strong>.`;
  } else if (isAgregados) {
    badge.textContent = 'Opcional';
    badge.className = 'text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-semibold';
    opts.innerHTML = `
      <label class="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg hover:border-red-500 cursor-pointer bag-option">
        <input type="radio" name="bag" value="add" class="bag-radio">
        <span class="font-semibold text-gray-800">Agregar bolsa (+ ${money(BAG_PRICE)})</span>
      </label>
      <label class="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg hover:border-red-500 cursor-pointer bag-option">
        <input type="radio" name="bag" value="none" class="bag-radio">
        <span class="font-semibold text-gray-800">Sin bolsa</span>
      </label>
    `;
    note.textContent = `* La bolsa es opcional en esta categoría.`;
  }
}
function computeLiveTotal() {
  if (!currentProduct) return { total: 0, bagQty: 0 };
  const base = currentProduct.price * productQuantity;
  let bagQty = 0;
    // ✅ En bebidas y descartables no se suma bolsa
  if (currentCategory === 'bebidas' || currentCategory === 'descartables') {
    const total = base;
    const lt = document.getElementById('live-total');
    if (lt) lt.textContent = money(total);
    return { total, bagQty: 0 };
  }

  if (currentCategory === 'ofertas-familiares') {
    bagQty = (bagChoice === 'add') ? productQuantity : 0;
  } else if (['ofertas-dos', 'ofertas-personales', 'platos-extras'].includes(currentCategory)) {
    bagQty = (bagChoice === 'add') ? 1 : 0;
  } else if (currentCategory === 'agregados') {
    bagQty = (bagChoice === 'add') ? 1 : 0;
  }
  const total = base + (bagQty * BAG_PRICE);
  const lt = document.getElementById('live-total');
  if (lt) lt.textContent = money(total);
  return { total, bagQty };
}

// --------- ADMIN helpers ----------
function getTodayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function filteredOrders() {
  const list = orders.filter(o => {
    const d = o.createdAt ? o.createdAt.substring(0, 10) : '';
    if (adminFilters.from && d < adminFilters.from) return false;
    if (adminFilters.to && d > adminFilters.to) return false;
    if (adminFilters.status !== 'todos' && o.status !== adminFilters.status) return false;
    if (adminFilters.search) {
      const term = adminFilters.search.toLowerCase();
      const inName = (o.customer?.name || '').toLowerCase().includes(term);
      const inPhone = (o.customer?.phone || '').toLowerCase().includes(term);
      if (!inName && !inPhone) return false;
    }
    return true;
  });
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function computeAdminStats() {
  const today = getTodayString();
  const totalPedidos = orders.length;
  const pedidosHoy = orders.filter(o => o.createdAt && o.createdAt.startsWith(today));
  const ventasHoy = pedidosHoy.reduce((s, o) => s + o.total, 0);
  const pendientes = orders.filter(o => o.status === 'Pendiente').length;
  const entregados = orders.filter(o => o.status === 'Entregado');
  const ventasTotales = orders.reduce((s, o) => s + o.total, 0);
  const ticketPromedio = totalPedidos ? (ventasTotales / totalPedidos) : 0;
  const entregadosConTiempo = entregados.filter(o => o.deliveredAt);
  const promedioMinutos = entregadosConTiempo.length
    ? entregadosConTiempo.reduce((s, o) => {
        const diff = (new Date(o.deliveredAt) - new Date(o.createdAt)) / 60000;
        return s + Math.max(diff, 0);
      }, 0) / entregadosConTiempo.length
    : 0;
  const porcentajeEntregados = totalPedidos ? (entregados.length / totalPedidos * 100) : 0;

  const elTotal = document.getElementById('admin-stat-total');
  const elHoy = document.getElementById('admin-stat-hoy');
  const elVentas = document.getElementById('admin-stat-ventas-hoy');
  const elPend = document.getElementById('admin-stat-pendientes');
  const elPctEnt = document.getElementById('admin-stat-entregados-pct');
  const elTicket = document.getElementById('admin-stat-ticket-promedio');
  const elTiempo = document.getElementById('admin-stat-tiempo-prom');

  if (elTotal) elTotal.textContent = totalPedidos;
  if (elHoy) elHoy.textContent = pedidosHoy.length;
  if (elVentas) elVentas.textContent = money(ventasHoy);
  if (elPend) elPend.textContent = pendientes;
  if (elPctEnt) elPctEnt.textContent = `${porcentajeEntregados.toFixed(0)}%`;
  if (elTicket) elTicket.textContent = money(ticketPromedio);
  if (elTiempo) elTiempo.textContent = `${promedioMinutos.toFixed(1)} min`;
}

function statusBadgeClass(status) {
  if (status === 'Pendiente') return 'admin-badge admin-badge-pendiente';
  if (status === 'En preparación') return 'admin-badge admin-badge-preparacion';
  if (status === 'Entregado') return 'admin-badge admin-badge-entregado';
  if (status === 'Cancelado') return 'admin-badge admin-badge-cancelado';
  return 'admin-badge';
}

function nextStatus(current) {
  const order = ['Pendiente', 'En preparación', 'Entregado', 'Cancelado'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

function renderAdminPanel() {
  computeAdminStats();
  const tbody = document.getElementById('admin-orders-body');
  const countEl = document.getElementById('admin-filter-count');
  if (!tbody) return;
  const list = filteredOrders();
  if (countEl) countEl.textContent = list.length;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-3 py-4 text-center text-gray-500 text-sm">No hay pedidos con los filtros actuales.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(o => {
    const cust = o.customer || {};
    const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString('es-CL') : '';
    return `
      <tr>
        <td class="px-3 py-2 text-xs font-mono text-gray-700">${o.id || '-'}</td>
        <td class="px-3 py-2 text-xs text-gray-800">${cust.name || '-'}</td>
        <td class="px-3 py-2 text-xs text-gray-700">${cust.phone || '-'}</td>
        <td class="px-3 py-2 text-xs font-semibold text-gray-900">${money(o.total)}</td>
        <td class="px-3 py-2 text-xs">
          <span class="${statusBadgeClass(o.status)}">${o.status}</span>
        </td>
        <td class="px-3 py-2 text-xs text-gray-600">${dateStr}</td>
        <td class="px-3 py-2 text-xs">
          <div class="flex flex-wrap gap-1">
            <button class="px-2 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 admin-view"
                    data-id="${o.id}">Ver</button>
            <button class="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 admin-status"
                    data-id="${o.id}">Estado</button>
            <button class="px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 admin-wa"
                    data-id="${o.id}">WhatsApp</button>
            <button class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 admin-print"
                    data-id="${o.id}">🖨️ Imprimir</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAdminPanelModal() {
  const modal = document.getElementById('admin-panel-modal');
  if (modal) {
    const today = getTodayString();
    if (!adminFilters.from && !adminFilters.to) {
      adminFilters.from = today;
      adminFilters.to = today;
    }
    const fromInput = document.getElementById('admin-filter-from');
    const toInput = document.getElementById('admin-filter-to');
    if (fromInput) fromInput.value = adminFilters.from;
    if (toInput) toInput.value = adminFilters.to;
    updateAdminStatusFilterButtons();
    renderAdminPanel();
    modal.classList.add('active');
  }
}

function updateAdminStatusFilterButtons() {
  document.querySelectorAll('.admin-filter-status-btn').forEach(btn => {
    const status = btn.dataset.status || '';
    btn.classList.toggle('active', adminFilters.status === status);
  });
}
function closeAdminPanelModal() {
  const modal = document.getElementById('admin-panel-modal');
  if (modal) modal.classList.remove('active');
}

// ======== IMPRESIÓN TÉRMICA: MISMO TEXTO QUE WHATSAPP ========
function printOrderTicket(order) {
  const contenido = buildWhatsappTextFromOrder(order);

  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Ticket ${order.id}</title>
        <style>
          body{
            font-family:monospace;
            font-size:12px;
            padding:10px;
            white-space:pre;
          }
          @page{
            margin:0;
          }
          @media print{
            body{margin:0;padding:4px;}
          }
        </style>
      </head>
      <body>${contenido}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

// --------- Corazón like (burst de corazoncitos) ----------
function playHeartBurst(wrapEl) {
  if (!wrapEl || !wrapEl.classList.contains('product-like-wrap')) return;
  var count = 7;
  var radius = 38;
  var heartSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  for (var i = 0; i < count; i++) {
    var angle = -90 + (i / (count - 1 || 1)) * 100 - 50;
    var rad = (angle * Math.PI) / 180;
    var bx = Math.sin(rad) * radius;
    var by = -Math.cos(rad) * radius;
    var el = document.createElement('span');
    el.className = 'heart-burst-item';
    el.style.setProperty('--bx', bx + 'px');
    el.style.setProperty('--by', by + 'px');
    el.innerHTML = heartSvg;
    wrapEl.appendChild(el);
    setTimeout(function (node) {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 600, el);
  }
}

// --------- Eventos globales ----------
document.addEventListener('click', (e) => {
  // corazón like (burst)
  var likeBtn = e.target.closest('.product-like-btn');
  if (likeBtn) {
    var wrap = likeBtn.closest('.product-like-wrap');
    if (wrap) playHeartBurst(wrap);
    return;
  }

  // cambiar categoría
  if (e.target.classList.contains('category-btn') || (e.target.closest && e.target.closest('.category-btn'))) {
  const btn = e.target.closest('.category-btn');
  const cat = btn.dataset.category;

  if (cat === 'todo-el-menu') {
    renderProductsAll();
  } else {
    renderProductsSingle(cat);
  }
}


  // abrir modal opciones
  if (e.target.classList.contains('add-to-cart')) {
  const parsed = JSON.parse(e.target.dataset.product);

  // ✅ clave: si viene desde "Todo el menú", toma su categoría real
  currentCategory = parsed.__category || currentCategory;

  currentProduct = parsed;

  selectedDrink = null;
  productQuantity = 1;
  bagChoice = null;

  const qEl = document.getElementById('product-quantity');
  if (qEl) qEl.textContent = '1';
  document.querySelectorAll('.drink-radio').forEach(r => r.checked = false);

  setDrinkVisible(currentCategory === 'ofertas-familiares');
  paintBagOptions();
  computeLiveTotal();

  const om = document.getElementById('options-modal');
  if (om) om.classList.add('active');
}


  // seleccionar bebida
  if (e.target.classList.contains('drink-radio')) {
    selectedDrink = e.target.value;
  }

  // seleccionar bolsa
  if (e.target.classList.contains('bag-radio')) {
    bagChoice = e.target.value;
    computeLiveTotal();
  }

  // qty +
  if (e.target.id === 'increase-quantity') {
    productQuantity++;
    const qEl = document.getElementById('product-quantity');
    if (qEl) qEl.textContent = productQuantity;
    computeLiveTotal();
  }
  // qty -
  if (e.target.id === 'decrease-quantity') {
    if (productQuantity > 1) {
      productQuantity--;
      const qEl = document.getElementById('product-quantity');
      if (qEl) qEl.textContent = productQuantity;
      computeLiveTotal();
    }
  }

  // cancelar opciones
  if (e.target.id === 'cancel-options') {
    const om = document.getElementById('options-modal');
    if (om) om.classList.remove('active');
    currentProduct = null;
  }

  // confirmar agregar
  if (e.target.id === 'confirm-add') {
    if (currentCategory === 'ofertas-familiares' && !selectedDrink) {
      showToast('⚠️ Debes seleccionar un sabor de bebida.');
      return;
    }
    
    // ✅ En bebidas y descartables NO se pide bolsa
 const noBagCategories = ['bebidas', 'descartables'];

  if (!noBagCategories.includes(currentCategory)) {
    const mustBag = currentCategory !== 'agregados';
    if (mustBag && bagChoice !== 'add') {
      showToast('⚠️ Debes agregar la bolsa (obligatorio).');
      return;
    }
    if (currentCategory === 'agregados' && !bagChoice) { bagChoice = 'none'; }
  } else {
     bagChoice = 'none';
  }

    
    

    const { total, bagQty } = computeLiveTotal();

    cart.push({
      name: currentProduct.name,
      price: currentProduct.price,
      qty: productQuantity,
      drink: currentCategory === 'ofertas-familiares' ? selectedDrink : null,
      bagQty,
      total
    });

    updateCartUI();
    showToast('¡Producto agregado al carrito!');
    const om = document.getElementById('options-modal');
    if (om) om.classList.remove('active');
    selectedDrink = null;
    productQuantity = 1;
    bagChoice = null;
    currentProduct = null;
  }

        // ===== HEADER: ¿Cómo desea hacer su pedido? =====

      // Abrir modal DELIVERY
      if (e.target.id === 'btn-delivery') {
        const m = document.getElementById('modal-delivery');
        if (m) m.classList.add('active');
      }

      // Abrir modal RESERVAS
      if (e.target.id === 'btn-reservas') {
        const m = document.getElementById('modal-reservas');
        if (m) m.classList.add('active');
      }

      // Abrir modal RETIROS
      if (e.target.id === 'btn-retiros') {
        const m = document.getElementById('modal-retiros');
        if (m) m.classList.add('active');
      }

      // Cerrar modales con la X
      if (e.target.id === 'modal-delivery-close') {
        const m = document.getElementById('modal-delivery');
        if (m) m.classList.remove('active');
      }
      if (e.target.id === 'modal-reservas-close') {
        const m = document.getElementById('modal-reservas');
        if (m) m.classList.remove('active');
      }
      if (e.target.id === 'modal-retiros-close') {
        const m = document.getElementById('modal-retiros');
        if (m) m.classList.remove('active');
      }

      // Botón "Realizar mi reserva" -> otra página web
      if (e.target.id === 'modal-reserva-go') {
        // ⛔ IMPORTANTE: cambia esta URL por la página real de reservas
        const urlReservas = 'https://pollon543.github.io/reservas-online-pollon-de-iquique/';
        window.open(urlReservas, '_blank', 'noopener,noreferrer');
      }

      // Botón "Solicitar con retiro" -> WhatsApp con mensaje predefinido
      if (e.target.id === 'modal-retiro-go') {
        const msg = 'Solicito realizar mi pedido con retiro y confirmo que el monto mínimo de mi compra será igual o mayor a $100.000.';
        const url = 'https://wa.me/51900979202?text=' + encodeURIComponent(msg);
        window.open(url, '_blank', 'noopener,noreferrer');
      }




  // abrir carrito
  if (e.target.id === 'floating-cart' || (e.target.closest && e.target.closest('#floating-cart'))) {
    renderCart();
    const cm = document.getElementById('cart-modal');
    if (cm) cm.classList.add('active');
  }
  if (e.target.id === 'close-cart') {
    const cm = document.getElementById('cart-modal');
    if (cm) cm.classList.remove('active');
  }

  // eliminar item
  if (e.target.classList.contains('remove-item')) {
    const idx = parseInt(e.target.dataset.index);
    cart.splice(idx, 1);
    updateCartUI();
    renderCart();
    showToast('Producto eliminado del carrito');
  }

  // checkout
  if (e.target.id === 'checkout-btn') {
    if (cart.length === 0) {
      showToast('Tu carrito está vacío');
      return;
    }
    const cm = document.getElementById('cart-modal');
    const chm = document.getElementById('checkout-modal');
    if (cm) cm.classList.remove('active');
    if (chm) chm.classList.add('active');
  }
  if (e.target.id === 'cancel-checkout') {
    const chm = document.getElementById('checkout-modal');
    if (chm) chm.classList.remove('active');
  }

  // ADMIN open btn
  if (e.target.id === 'admin-open-btn' || (e.target.closest && e.target.closest('#admin-open-btn'))) {
    if (!isAdminAuthenticated) {
      const lm = document.getElementById('admin-login-modal');
      if (lm) lm.classList.add('active');
      const err = document.getElementById('admin-login-error');
      if (err) err.classList.add('hidden');
    } else {
      openAdminPanelModal();
    }
  }

  // ADMIN login
  if (e.target.id === 'admin-login-cancel') {
    const lm = document.getElementById('admin-login-modal');
    if (lm) lm.classList.remove('active');
  }
  if (e.target.id === 'admin-login-submit') {
    const passInput = document.getElementById('admin-password');
    const err = document.getElementById('admin-login-error');
    const val = (passInput.value || '').trim();
    if (val === 'HUILLCA123') {
      isAdminAuthenticated = true;
      if (err) err.classList.add('hidden');
      const lm = document.getElementById('admin-login-modal');
      if (lm) lm.classList.remove('active');
      showToast('✅ Acceso concedido al panel de administración.');
      openAdminPanelModal();
    } else {
      if (err) err.classList.remove('hidden');
    }
  }

  // ADMIN close panel
  if (e.target.id === 'admin-close') {
    closeAdminPanelModal();
  }

  // ADMIN botones de filtro por estado (Pendiente, Entregado, etc.)
  if (e.target.classList.contains('admin-filter-status-btn')) {
    adminFilters.status = e.target.dataset.status || 'todos';
    const fs = document.getElementById('admin-filter-status');
    if (fs) fs.value = adminFilters.status;
    updateAdminStatusFilterButtons();
    renderAdminPanel();
  }

  // ADMIN limpiar filtros
  if (e.target.id === 'admin-filter-clear') {
    const ff = document.getElementById('admin-filter-from');
    const ft = document.getElementById('admin-filter-to');
    const fs = document.getElementById('admin-filter-status');
    const fsearch = document.getElementById('admin-filter-search');
    if (ff) ff.value = '';
    if (ft) ft.value = '';
    if (fs) fs.value = 'todos';
    if (fsearch) fsearch.value = '';
    adminFilters = { from: '', to: '', status: 'todos', search: '' };
    updateAdminStatusFilterButtons();
    renderAdminPanel();
  }

  // ADMIN copiar pedidos
  if (e.target.id === 'admin-copy') {
    const list = filteredOrders();
    if (list.length === 0) {
      showToast('No hay pedidos en el rango seleccionado.');
      return;
    }
    let lines = 'ID\tFecha\tNombre\tTeléfono\tDirección\tTotal\tEstado\n';
    list.forEach(o => {
      const fecha = o.createdAt ? new Date(o.createdAt).toLocaleString('es-CL') : '';
      const c = o.customer || {};
      const dir = (c.address || '').replace(/\s+/g, ' ');
      lines += `${o.id}\t${fecha}\t${c.name || ''}\t${c.phone || ''}\t${dir}\t${o.total}\t${o.status}\n`;
    });
    const copiar = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(lines);
        } else {
          throw new Error('no-clipboard');
        }
        showToast('Pedidos copiados. Puedes pegarlos en Excel.');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = lines;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Pedidos copiados. Puedes pegarlos en Excel.');
      }
    };
    copiar();
  }

  // ADMIN refresh
  if (e.target.id === 'admin-refresh') {
    loadOrders();
    renderAdminPanel();
    showToast('Panel actualizado (datos en tiempo real).');
  }

  // ADMIN tabla acciones
  if (e.target.classList.contains('admin-view')) {
    const id = e.target.dataset.id;
    const order = orders.find(o => o.id === id);
    if (order) {
      const txt = buildWhatsappTextFromOrder(order);
      alert(txt);
    }
  }

  if (e.target.classList.contains('admin-status')) {
    const id = e.target.dataset.id;
    const order = orders.find(o => o.id === id);
    if (order) {
      const anterior = order.status;
      const nuevo = nextStatus(anterior);
      order.status = nuevo;
      if (nuevo === 'Entregado' && !order.deliveredAt) {
        order.deliveredAt = new Date().toISOString();
      }
      if ((ordersRef && db) || (rtdb && useRealtimeDB)) {
        updateOrderInBackend(order).then(() => {
          renderAdminPanel();
          showToast(`Estado actualizado a: ${nuevo}`);
        }).catch(err => {
          console.error(err);
          order.status = anterior;
          if (nuevo === 'Entregado') order.deliveredAt = null;
          renderAdminPanel();
          showToast('Error al actualizar. Intenta de nuevo.');
        });
      } else {
        saveOrders();
        renderAdminPanel();
        showToast(`Estado actualizado a: ${nuevo}`);
      }
    }
  }

  if (e.target.classList.contains('admin-wa')) {
    const id = e.target.dataset.id;
    const order = orders.find(o => o.id === id);
    if (order) {
      const cust = order.customer || {};
      const phoneRaw = (cust.phone || '').replace(/\D/g, '');
      const to = phoneRaw || WHATSAPP_NUMBER;
      let msg = `Hola ${cust.name || ''}, te escribimos de Pollería El Pollón respecto a tu pedido ${order.id} (${order.status}).`;
      const url = `https://wa.me/${to}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  if (e.target.classList.contains('admin-print')) {
    const id = e.target.dataset.id;
    const order = orders.find(o => o.id === id);
    if (order) {
      printOrderTicket(order);
    }
  }

});

// ADMIN filtros (input)
document.addEventListener('input', (e) => {
  if (e.target.id === 'admin-filter-from') {
    adminFilters.from = e.target.value || '';
    renderAdminPanel();
  }
  if (e.target.id === 'admin-filter-to') {
    adminFilters.to = e.target.value || '';
    renderAdminPanel();
  }
  if (e.target.id === 'admin-filter-status') {
    adminFilters.status = e.target.value || 'todos';
    updateAdminStatusFilterButtons();
    renderAdminPanel();
  }
  if (e.target.id === 'admin-filter-search') {
    adminFilters.search = e.target.value || '';
    renderAdminPanel();
  }
});

// enviar pedido (checkout)
      // enviar pedido (checkout)
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('customer-name').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const commentsEl = document.getElementById('customer-comments');
    const comments = commentsEl ? commentsEl.value.trim() : '';
    const phone = document.getElementById('customer-phone').value.trim();

    let total = 0;
    const itemsForOrder = [];

    cart.forEach((it) => {
      total += it.total;
      itemsForOrder.push({
        name: it.name,
        qty: it.qty,
        drink: it.drink,
        bagQty: it.bagQty,
        total: it.total
      });
    });

    // Número de ticket correlativo (001, 002, ...). Si la BD no ha cargado aún, se usa al menos 1.
    const ticketNumber = String(Math.max(1, orders.length + 1)).padStart(3, "0");

    const order = {
      id: 'P' + Date.now(),
      createdAt: new Date().toISOString(),
      ticketNumber,
      customer: { name, address, phone, ...(comments ? { comments } : {}) },
      items: itemsForOrder,
      total,
      status: 'Pendiente',
      deliveredAt: null
    };

    if ((ordersRef && db) || (rtdb && useRealtimeDB)) {
      addOrderToBackend(order)
        .then(() => {
          orders.push(order);
          const rawMsg = buildWhatsappTextFromOrder(order);
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(rawMsg)}`, '_blank', 'noopener,noreferrer');
          cart = [];
          updateCartUI();
          document.getElementById('checkout-modal')?.classList.remove('active');
          e.target.reset();
          showToast('✅ ¡Pedido enviado a WhatsApp y guardado en la base de datos!');
          if (document.getElementById('admin-panel-modal')?.classList.contains('active')) {
            renderAdminPanel();
          }
        })
        .catch(err => {
          console.error('Error guardando en base de datos:', err);
          orders.push(order);
          try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch (_) {}
          const rawMsg = buildWhatsappTextFromOrder(order);
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(rawMsg)}`, '_blank', 'noopener,noreferrer');
          cart = [];
          updateCartUI();
          document.getElementById('checkout-modal')?.classList.remove('active');
          e.target.reset();
          if (document.getElementById('admin-panel-modal')?.classList.contains('active')) {
            renderAdminPanel();
          }
          showToast('⚠️ Pedido enviado a WhatsApp. Guardado localmente (revisa reglas de Firebase).');
        });
    } else {
      orders.push(order);
      saveOrders();
      const rawMsg = buildWhatsappTextFromOrder(order);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(rawMsg)}`, '_blank', 'noopener,noreferrer');
      cart = [];
      updateCartUI();
      document.getElementById('checkout-modal')?.classList.remove('active');
      e.target.reset();
      if (document.getElementById('admin-panel-modal')?.classList.contains('active')) {
        renderAdminPanel();
      }
      showToast('✅ ¡Pedido enviado a WhatsApp y registrado!');
    }
  });
}

// Sidebar
const hamburgerBtn = document.getElementById('hamburger-btn');
const closeSidebar = document.getElementById('close-sidebar');
const sidebarMenu = document.getElementById('sidebar-menu');
const sidebarOverlay = document.getElementById('sidebar-overlay');
// ✅ Botón MENÚ solo PC/Tablet abre el mismo sidebar
const menuOpenDesktop = document.getElementById('menu-open-desktop');
  if (menuOpenDesktop) menuOpenDesktop.addEventListener('click', openSidebar);


function openSidebar() {
  if (sidebarMenu) sidebarMenu.style.transform = 'translateX(0)';
  if (sidebarOverlay) sidebarOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeSidebarMenu() {
  if (sidebarMenu) sidebarMenu.style.transform = 'translateX(-100%)';
  if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
  document.body.style.overflow = 'auto';
}
if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
if (closeSidebar) closeSidebar.addEventListener('click', closeSidebarMenu);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarMenu);

document.querySelectorAll('.sidebar-category').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.category;
    if (cat === 'todo-el-menu') renderProductsAll();
    else renderProductsSingle(cat);

    closeSidebarMenu();
    document.querySelector('#products-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});



// View cart buttons

const viewCartMobile = document.getElementById('view-cart-mobile');
const viewCartDesktop = document.getElementById('view-cart-desktop');
if (viewCartMobile) {
  viewCartMobile.addEventListener('click', () => {
    renderCart();
    const cm = document.getElementById('cart-modal');
    if (cm) cm.classList.add('active');
    closeSidebarMenu();
  });
}
if (viewCartDesktop) {
  viewCartDesktop.addEventListener('click', () => {
    renderCart();
    const cm = document.getElementById('cart-modal');
    if (cm) cm.classList.add('active');
  });
}

// Carrusel infinito: 1 segundo por slide, bucle sin salto visible (clon de la 1ª imagen al final)
const totalSlides = 10;
const totalSlidesInDom = totalSlides + 1; // 11: 10 originales + clon de la primera
let currentSlide = 0;
let isResetting = false;
const carouselContainer = document.getElementById('carousel-container');
const carouselIndicators = document.getElementById('carousel-indicators');
const CAROUSEL_INTERVAL_MS = 1000;

function updateCarousel(useTransition = true) {
  if (!carouselContainer) return;
  if (!useTransition) {
    carouselContainer.style.transition = 'none';
  }
  carouselContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
  if (!useTransition) {
    carouselContainer.offsetHeight; // reflow
    carouselContainer.style.transition = '';
  }
  const activeIndex = currentSlide === totalSlides ? 0 : currentSlide;
  if (carouselIndicators) {
    const dots = carouselIndicators.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
      const isActive = i === activeIndex;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', isActive);
    });
  }
}

function goNext() {
  if (isResetting) return;
  currentSlide++;
  if (currentSlide === totalSlides) {
    updateCarousel(true);
    isResetting = true;
    return;
  }
  if (currentSlide >= totalSlidesInDom) {
    currentSlide = 0;
    updateCarousel(false);
    return;
  }
  updateCarousel(true);
}

function onCarouselTransitionEnd() {
  if (!isResetting || currentSlide !== totalSlides) return;
  isResetting = false;
  currentSlide = 0;
  updateCarousel(false);
}

if (carouselContainer) {
  carouselContainer.addEventListener('transitionend', onCarouselTransitionEnd);
}

let carouselInterval = setInterval(goNext, CAROUSEL_INTERVAL_MS);

if (carouselIndicators) {
  carouselIndicators.querySelectorAll('.carousel-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.getAttribute('data-index'), 10);
      if (Number.isNaN(index) || index < 0 || index >= totalSlides) return;
      currentSlide = index;
      updateCarousel(true);
      clearInterval(carouselInterval);
      carouselInterval = setInterval(goNext, CAROUSEL_INTERVAL_MS);
    });
  });
}

updateCarousel(true);

// --------- CATEGORÍAS: scrollbar solo cuando hay overflow, flechas y arrastre con mouse ----------
(function initCategoriesScrollbar() {
  const wrap = document.getElementById('categories-scroll-wrap');
  const scrollbarEl = wrap && wrap.nextElementSibling ? wrap.nextElementSibling : null;
  const thumb = document.getElementById('categories-scrollbar-thumb');
  const track = scrollbarEl && scrollbarEl.querySelector('.categories-scrollbar__track');
  const prevBtn = document.getElementById('categories-scroll-prev');
  const nextBtn = document.getElementById('categories-scroll-next');

  function needsScroll() {
    return wrap && wrap.scrollWidth > wrap.clientWidth;
  }

  function toggleScrollbarVisibility() {
    if (!scrollbarEl) return;
    if (needsScroll()) {
      scrollbarEl.classList.remove('categories-scrollbar--hidden');
    } else {
      scrollbarEl.classList.add('categories-scrollbar--hidden');
    }
  }

  function updateThumb() {
    if (!wrap || !thumb || !track) return;
    const scrollWidth = wrap.scrollWidth;
    const clientWidth = wrap.clientWidth;
    const scrollLeft = wrap.scrollLeft;
    const trackRect = track.getBoundingClientRect();
    const trackWidth = trackRect.width;
    if (scrollWidth <= clientWidth) {
      thumb.style.width = '100%';
      thumb.style.left = '0';
      return;
    }
    const ratio = clientWidth / scrollWidth;
    const thumbWidthPx = Math.max(32, trackWidth * ratio);
    const maxScroll = scrollWidth - clientWidth;
    const thumbLeft = maxScroll <= 0 ? 0 : (scrollLeft / maxScroll) * (trackWidth - thumbWidthPx);
    thumb.style.width = thumbWidthPx + 'px';
    thumb.style.left = thumbLeft + 'px';
  }

  if (wrap && thumb) {
    wrap.addEventListener('scroll', updateThumb);
    function onResizeOrLoad() {
      toggleScrollbarVisibility();
      updateThumb();
    }
    window.addEventListener('resize', onResizeOrLoad);
    window.addEventListener('load', onResizeOrLoad);
    toggleScrollbarVisibility();
    updateThumb();
  }

  const scrollStep = 180;
  if (prevBtn && wrap) {
    prevBtn.addEventListener('click', () => {
      wrap.scrollBy({ left: -scrollStep, behavior: 'smooth' });
    });
  }
  if (nextBtn && wrap) {
    nextBtn.addEventListener('click', () => {
      wrap.scrollBy({ left: scrollStep, behavior: 'smooth' });
    });
  }

  if (wrap) {
    let dragStartX = null;
    let dragScrollLeft = 0;
    let isDragging = false;

    wrap.addEventListener('mousedown', function (e) {
      isDragging = false;
      dragStartX = e.pageX;
      dragScrollLeft = wrap.scrollLeft;
    });

    wrap.addEventListener('mousemove', function (e) {
      if (dragStartX === null) return;
      const dx = e.pageX - dragStartX;
      if (!isDragging && Math.abs(dx) > 5) isDragging = true;
      if (isDragging) {
        wrap.scrollLeft = dragScrollLeft - dx;
      }
    });

    function endDrag() {
      dragStartX = null;
    }

    wrap.addEventListener('mouseup', endDrag);
    wrap.addEventListener('mouseleave', endDrag);

    wrap.addEventListener('click', function (e) {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
      }
    }, true);
  }
})();

// ===== Flecha para deslizar categorías (móvil) =====
const catbarScroll = document.getElementById('catbar-scroll');
const catbarNext = document.getElementById('catbar-next');

if (catbarNext && catbarScroll) {
  catbarNext.addEventListener('click', () => {
    catbarScroll.scrollBy({ left: 260, behavior: 'smooth' });
  });
}

function buildSidebarGallery() {
  const gallery = document.getElementById('sidebar-gallery');
  if (!gallery) return;

  const items = CATEGORY_ORDER.map(catKey => {
    const list = products[catKey] || [];
    const firstWithImage = list.find(p => p.image && p.image.trim().length > 0);
    return { catKey, img: firstWithImage?.image || '' };
  });

  gallery.innerHTML = items.map(it => {
    if (!it.img) {
      return `
        <button class="sidebar-gallery-item h-20 rounded-lg border border-gray-200 flex items-center justify-center text-2xl"
                data-cat="${it.catKey}">
          🍗
        </button>
      `;
    }
    return `
      <button class="sidebar-gallery-item rounded-lg overflow-hidden border border-gray-200 hover:shadow transition"
              data-cat="${it.catKey}">
        <img src="${it.img}" class="w-full h-20 object-cover" alt="">
      </button>
    `;
  }).join('');

  // Click en miniaturas => ir a categoría
  gallery.querySelectorAll('.sidebar-gallery-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      renderProductsSingle(cat);      // muestra la categoría
      closeSidebarMenu();             // cierra sidebar
      document.querySelector('#products-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}


// ===== DROPDOWN MENÚ (tipo "Más") =====
const menuDdBtn = document.getElementById('menu-dd-btn');
const menuDdPanel = document.getElementById('menu-dd-panel');

function openMenuDd(){
  if (!menuDdPanel || !menuDdBtn) return;
  menuDdPanel.classList.remove('hidden');
  menuDdBtn.setAttribute('aria-expanded', 'true');
}

function closeMenuDd(){
  if (!menuDdPanel || !menuDdBtn) return;
  menuDdPanel.classList.add('hidden');
  menuDdBtn.setAttribute('aria-expanded', 'false');
}

if (menuDdBtn && menuDdPanel){
  menuDdBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !menuDdPanel.classList.contains('hidden');
    if (isOpen) closeMenuDd();
    else openMenuDd();
  });

  // Click en una categoría => render + cerrar + scroll
  menuDdPanel.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-dd-item');
    if (!item) return;

    const cat = item.dataset.category;
    if (!cat) return;

    renderProductsSingle(cat);     // o renderProductsAll si quieres otra lógica
    closeMenuDd();                 // ✅ cerrar instantáneo

    requestAnimationFrame(() => {
      document.getElementById('products-container')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Cerrar al hacer click afuera
  document.addEventListener('click', () => closeMenuDd());

  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenuDd();
  });
}


// ===== DROPDOWN MENÚ (CELULAR) =====
const menuDdBtnMobile = document.getElementById('menu-dd-btn-mobile');
const menuDdPanelMobile = document.getElementById('menu-dd-panel-mobile');
const menuDdCartMobile = document.getElementById('menu-dd-cart-mobile');
const menuDdCartBadge = document.getElementById('menu-dd-cart-badge');

function openMenuDdMobile(){
  if (!menuDdPanelMobile || !menuDdBtnMobile) return;
  menuDdPanelMobile.classList.remove('hidden');
  menuDdBtnMobile.setAttribute('aria-expanded', 'true');
}
function closeMenuDdMobile(){
  if (!menuDdPanelMobile || !menuDdBtnMobile) return;
  menuDdPanelMobile.classList.add('hidden');
  menuDdBtnMobile.setAttribute('aria-expanded', 'false');
}

if (menuDdBtnMobile && menuDdPanelMobile){
  // abrir/cerrar
  menuDdBtnMobile.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !menuDdPanelMobile.classList.contains('hidden');
    if (isOpen) closeMenuDdMobile();
    else openMenuDdMobile();
  });

  // click afuera cierra
  document.addEventListener('click', () => closeMenuDdMobile());

  // ESC cierra
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenuDdMobile();
  });

  // click en categorías
  menuDdPanelMobile.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-dd-item');
    if (!item) return;

    const cat = item.dataset.category;
    if (!cat) return;

    renderProductsSingle(cat);
    closeMenuDdMobile();

    requestAnimationFrame(() => {
      document.getElementById('products-container')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // click en "Ver Mi Pedido"
  if (menuDdCartMobile){
    menuDdCartMobile.addEventListener('click', (e) => {
      e.stopPropagation();

      // abrir modal carrito (tu lógica actual)
      renderCart();
      const cm = document.getElementById('cart-modal');
      if (cm) cm.classList.add('active');

      closeMenuDdMobile();
    });
  }
}



// --------- Inicio ---------
initOrdersBackend();   // inicializa Firebase + Firestore + suscripción en tiempo real
loadOrders();          // respaldo local en caso de que falle Firestore
// renderProducts('ofertas-familiares');
renderProductsAll();
currentCategory = 'todo-el-menu';
buildSidebarGallery();


updateCartUI();

