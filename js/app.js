// --------- Config ----------

const CURRENCY = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});
const BAG_PRICE = 200; // CLP
const WHATSAPP_NUMBER = '56986925310';

// ======================= FIREBASE CONFIGURACIÓN =========================
// IMPORTANTE:
// 1) Entra a https://console.firebase.google.com
// 2) Crea un proyecto Web y activa "Cloud Firestore"
// 3) Copia la configuración de tu app web y reemplaza los valores de abajo
// 4) En Firestore crea una colección llamada: pollon_orders_v1
// -----------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAWv3zPEUU82YcLSwOxsv-MQZP2ZjcycOg",
  authDomain: "elpollon01-307da.firebaseapp.com",
  databaseURL: "https://elpollon01-307da-default-rtdb.firebaseio.com",
  projectId: "elpollon01-307da",
  storageBucket: "elpollon01-307da.firebasestorage.app",
  messagingSenderId: "1024156951564",
  appId: "1:1024156951564:web:946a9b6003d8dff1053a29"
};

let ordersRef = null; // referencia a la colección de Firestore
let db = null;        // referencia a Firestore
const ORDERS_PATH = 'pollon_orders_v1'; // nombre de la colección en Firestore

// Base de datos de pedidos (en memoria, sincronizada con Firestore)
let orders = [];
const ORDERS_KEY = 'pollon_orders_v1'; // respaldo local

// Inicializa Firestore y suscripción en tiempo real
function initOrdersBackend() {
  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase !== 'undefined') {
      db = firebase.firestore();
      ordersRef = db.collection(ORDERS_PATH);

      // Suscripción en tiempo real a la colección (ordenada por fecha)
      ordersRef.orderBy('createdAt', 'asc').onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => {
          const data = doc.data() || {};
          list.push({
            id: doc.id,
            ...data
          });
        });
        orders = list;
        // Aseguramos orden por fecha por si acaso
        orders.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        const adminVisible = document.getElementById('admin-panel-modal')?.classList.contains('active');
        if (adminVisible) {
          renderAdminPanel();
        }
      });
    }
  } catch (e) {
    console.warn('No se pudo inicializar Firebase/Firestore. Se usará solo almacenamiento local.', e);
  }
}

// Guarda el array completo de pedidos (Firestore + respaldo local)
function saveOrders() {
  if (ordersRef && db) {
    const batch = db.batch();
    orders.forEach(o => {
      if (!o.id) {
        o.id = 'P' + Date.now();
      }
      const docRef = ordersRef.doc(o.id);
      batch.set(docRef, o, { merge: true });
    });
    batch.commit().catch(err => {
      console.error('Error guardando pedidos en Firestore', err);
    });
  } else {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Error guardando pedidos en localStorage', e);
    }
  }
}

// Cargar pedidos (si no hay Firestore, usamos respaldo local)
function loadOrders() {
  if (ordersRef && db) {
    return;
  } else {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      orders = raw ? JSON.parse(raw) : [];
    } catch (e) {
      orders = [];
    }
  }
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

// ======== TEXTO WHATSAPP (USADO TAMBIÉN PARA IMPRESORA TÉRMICA) ========
   // ======== TEXTO WHATSAPP (USADO TAMBIÉN PARA IMPRESORA TÉRMICA) ========
function buildWhatsappTextFromOrder(order) {
  const { customer, items, total } = order;

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

  // DATOS CLIENTE
  msg += `◆ Nombre:   ${customer.name}\n`;
  msg += `◆ Teléfono: ${customer.phone}\n`;
  msg += `◆ Dirección: ${customer.address}\n\n`;

  // DETALLE PEDIDO
  msg += `────────────────────────────────\n`;
  msg += `◆ DETALLE DEL PEDIDO\n`;
  msg += `────────────────────────────────\n\n`;

  items.forEach((it, i) => {
    msg += `${i + 1}. ${it.name} × ${it.qty}\n`;
    msg += `— Subtotal: ${money(it.total)}\n`;
    if (it.drink) {
      msg += `— Bebida: ${it.drink}\n`;
    }
    if (it.bagQty > 0) {
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
        <div class="flex justify-between items-center">
          <span class="text-2xl font-bold text-red-700">${money(p.price)}</span>
          <button class="add-to-cart px-4 py-2 rounded-lg font-bold text-white hover:opacity-90"
                  style="background-color:#dc2626"
                  data-product='${JSON.stringify(payload)}'>Agregar</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  setActiveCategoryButton(category);
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

    // Encabezado por categoría (como tu foto)
    const header = document.createElement('div');
    header.className = 'col-span-full mt-4 mb-2';
    header.innerHTML = `
      <h3 class="text-1.8xl font-bold text-gray-900 flex items-center gap-2">
        ${CATEGORY_META[catKey]?.title || catKey}
      </h3>
      <div class="h-[3px] w-70 bg-red-300 rounded-full mt-1"></div>
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
          <div class="flex justify-between items-center">
            <span class="text-2xl font-bold text-red-700">${money(p.price)}</span>
            <button class="add-to-cart px-4 py-2 rounded-lg font-bold text-white hover:opacity-90"
                    style="background-color:#dc2626"
                    data-product='${JSON.stringify(payload)}'>Agregar</button>
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
  return orders.filter(o => {
    const d = o.createdAt ? o.createdAt.substring(0, 10) : '';
    if (adminFilters.from && d < adminFilters.from) return false;
    if (adminFilters.to && d > adminFilters.to) return false;
    if (adminFilters.status !== 'todos' && o.status !== adminFilters.status) return false;
    if (adminFilters.search) {
      const term = adminFilters.search.toLowerCase();
      const inName = (o.customer.name || '').toLowerCase().includes(term);
      const inPhone = (o.customer.phone || '').toLowerCase().includes(term);
      if (!inName && !inPhone) return false;
    }
    return true;
  });
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
    const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString('es-CL') : '';
    return `
      <tr>
        <td class="px-3 py-2 text-xs font-mono text-gray-700">${o.id}</td>
        <td class="px-3 py-2 text-xs text-gray-800">${o.customer.name || '-'}</td>
        <td class="px-3 py-2 text-xs text-gray-700">${o.customer.phone || '-'}</td>
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
    renderAdminPanel();
    modal.classList.add('active');
  }
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

// --------- Eventos globales ----------
document.addEventListener('click', (e) => {
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
      const dir = (o.customer.address || '').replace(/\s+/g, ' ');
      lines += `${o.id}\t${fecha}\t${o.customer.name || ''}\t${o.customer.phone || ''}\t${dir}\t${o.total}\t${o.status}\n`;
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
      const nuevo = nextStatus(order.status);
      order.status = nuevo;
      if (nuevo === 'Entregado' && !order.deliveredAt) {
        order.deliveredAt = new Date().toISOString();
      }
      saveOrders();
      renderAdminPanel();
      showToast(`Estado actualizado a: ${nuevo}`);
    }
  }

  if (e.target.classList.contains('admin-wa')) {
    const id = e.target.dataset.id;
    const order = orders.find(o => o.id === id);
    if (order) {
      const phoneRaw = (order.customer.phone || '').replace(/\D/g, '');
      const to = phoneRaw || WHATSAPP_NUMBER;
      let msg = `Hola ${order.customer.name || ''}, te escribimos de Pollería El Pollón respecto a tu pedido ${order.id} (${order.status}).`;
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

  // CHATBOT toggle
  if (e.target.id === 'chatbot-toggle' || (e.target.closest && e.target.closest('#chatbot-toggle'))) {
    const panel = document.getElementById('chatbot-panel');
    if (panel) panel.classList.toggle('hidden');
  }
  if (e.target.id === 'chatbot-close') {
    const panel = document.getElementById('chatbot-panel');
    if (panel) panel.classList.add('hidden');
  }

  // CHATBOT chips
  if (e.target.classList.contains('chatbot-chip')) {
    const action = e.target.dataset.action;
    handleChatbotAction(action);
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

    // 🔢 NUEVO: número correlativo de ticket (001, 002, 003, ...)
    const ticketNumber = String(orders.length + 1).padStart(3, "0");

    const order = {
      id: 'P' + Date.now(),
      createdAt: new Date().toISOString(),
      ticketNumber, // 👈 guardamos el número de ticket
      customer: { name, address, phone },
      items: itemsForOrder,
      total,
      status: 'Pendiente',
      deliveredAt: null
    };



//-------------------

    orders.push(order);
    saveOrders();
//----------------------
    const rawMsg = buildWhatsappTextFromOrder(order);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(rawMsg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    const adminPanelVisible = document.getElementById('admin-panel-modal')?.classList.contains('active');
    if (adminPanelVisible) {
      renderAdminPanel();
    }

    cart = [];
    updateCartUI();
    const chm = document.getElementById('checkout-modal');
    if (chm) chm.classList.remove('active');
    e.target.reset();
    showToast('✅ ¡Pedido enviado a WhatsApp y registrado en Firestore!');
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

// Carrusel auto
let currentSlide = 0;
const totalSlides = 10;
const carouselContainer = document.getElementById('carousel-container');
function updateCarousel() {
  if (carouselContainer) carouselContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
}
setInterval(() => {
  currentSlide = (currentSlide + 1) % totalSlides;
  updateCarousel();
}, 2000);
updateCarousel();

// --------- CHATBOT LÓGICA ----------
const chatbotMessagesEl = document.getElementById('chatbot-messages');

function appendChatbotMessage(text, from = 'bot') {
  if (!chatbotMessagesEl) return;
  const div = document.createElement('div');
  div.className = 'chatbot-msg ' + (from === 'bot' ? 'chatbot-msg-bot' : 'chatbot-msg-user');
  div.innerHTML = text;
  chatbotMessagesEl.appendChild(div);
  chatbotMessagesEl.scrollTop = chatbotMessagesEl.scrollHeight;
}

function chatbotWelcome() {
  appendChatbotMessage(`
    👋 ¡Bienvenido a <strong>Pollería El Pollón</strong> en Iquique!<br><br>
    Soy tu asistente virtual tipo <strong>WhatsApp</strong> 💬.<br><br>
    Te puedo ayudar con:<br>
    • Ver combos familiares, para dos y personales 🍗<br>
    • Ubicación, horarios y delivery 🚚<br>
    • Método de pago y redes sociales 💳📲<br>
    • Dejar tu pedido listo para WhatsApp ✅<br><br>
    Elige una opción de abajo y te llevo directo donde necesitas.
  `, 'bot');
}

function handleChatbotAction(action) {
  if (action === 'familiares') {
    appendChatbotMessage('Quiero ver los combos familiares más pedidos.', 'user');
    appendChatbotMessage(`
      Excelente elección 🙌<br><br>
      Nuestros <strong>Combos Familiares</strong> son los más vendidos del local:<br><br>
      ⭐ <strong>Ofertón más chaufa</strong>: pollo entero + papas + chaufa + ensalada + bebida 1.5L.<br>
      ⭐ <strong>Ofertón pura papa</strong>: ideal para los que aman las papas fritas 🤤<br>
      ⭐ <strong>Mega Familiar</strong>: pensado para grupos grandes.<br><br>
      👉 Te llevo directo a la sección de <strong>Ofertas Familiares</strong> para que agregues tu combo al carrito.
    `, 'bot');
    const sectionBtn = document.querySelector('.category-btn[data-category="ofertas-familiares"]');
    if (sectionBtn) sectionBtn.click();
    document.querySelector('#products-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (action === 'horarios') {
    appendChatbotMessage('Quiero saber los horarios y la dirección.', 'user');
    appendChatbotMessage(`
      Perfecto 🕐<br><br>
      📍 <strong>Dirección:</strong><br>
      Calle Vivar 1086, Iquique, Chile.<br><br>
      🕐 <strong>Horario de atención:</strong><br>
      Lunes a Domingo de <strong>11:30 a 23:00 hrs</strong>.<br><br>
      Puedes venir al local, retirar para llevar o pedir delivery.
    `, 'bot');
  }

  if (action === 'delivery') {
    appendChatbotMessage('Quiero información del delivery.', 'user');
    appendChatbotMessage(`
      Te explico el delivery 🚚<br><br>
      • Repartimos dentro de Iquique 🏙️<br>
      • Costo de envío según la zona:<br>
      &nbsp;&nbsp;👉 Entre <strong>$2.500 y $4.000</strong> aprox.<br><br>
      El valor exacto se confirma por WhatsApp según tu dirección.<br><br>
      Sugerencia: arma tu pedido en la carta y al final lo enviamos directo a WhatsApp ✅
    `, 'bot');
  }

  if (action === 'pedido') {
    appendChatbotMessage('Quiero dejar mi pedido listo por WhatsApp.', 'user');
    appendChatbotMessage(`
      Vamos a dejar tu pedido listo 😋<br><br>
      1️⃣ Agrega tus combos y platos al carrito.<br>
      2️⃣ Presiona <strong>"Realizar Pedido por WhatsApp"</strong>.<br>
      3️⃣ Completa tus datos y confirma.<br><br>
      También puedes escribirnos directo aquí 👇<br><br>
      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, quiero hacer un pedido en Pollería El Pollón. ¿Me pueden ayudar con las opciones de combos familiares?')}"
         target="_blank"
         class="inline-block bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-semibold">
        💬 Abrir WhatsApp
      </a>
    `, 'bot');
  }

  if (action === 'pagos') {
    appendChatbotMessage('Quiero saber los métodos de pago.', 'user');
    appendChatbotMessage(`
      💳 <strong>Método de pago actual</strong><br><br>
      • Aceptamos <strong>solo efectivo</strong> en este momento.<br>
      • El pago se realiza <strong>contra entrega</strong> en el local o al recibir tu pedido a domicilio.<br><br>
      Cualquier cambio futuro en métodos de pago lo informaremos por nuestras redes sociales.
    `, 'bot');
  }

  if (action === 'redes') {
    appendChatbotMessage('Quiero ver las redes sociales.', 'user');
    appendChatbotMessage(`
      📲 <strong>Nuestras redes sociales</strong><br><br>
      • WhatsApp: <a href="https://wa.me/56968788613" target="_blank" class="text-green-600 font-semibold">+56 9 6878 8613</a><br>
      • Facebook: <span class="font-semibold">Pollería El Pollón (Iquique)</span><br>
      • Instagram y TikTok: contenido de promociones, combos y novedades 🔥<br><br>
      Al final de la página tienes los botones directos a todas las redes.
    `, 'bot');   
  }
}


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
if (chatbotMessagesEl) {
  chatbotWelcome();
}


