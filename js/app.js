// --------- Config ----------
const CURRENCY = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});
const BAG_PRICE = 200; // CLP
const WHATSAPP_NUMBER = '56986925310';

const ORDERS_COLLECTION = 'pollon_orders_v1';
const ORDERS_LOCAL_KEY = 'pollon_orders_local_v1';
const FAVORITES_KEY = 'pollon_favorites_v1';
const ADMIN_SOUND_KEY = 'pollon_admin_sound_v1';

// ======================= FIREBASE CONFIGURACIÓN =========================
// IMPORTANTE:
// 1) Entra a https://console.firebase.google.com
// 2) Crea un proyecto Web y activa "Cloud Firestore"
// 3) Crea usuarios de admin en Firebase Auth (email/contraseña)
// 4) Configura Security Rules para proteger lecturas/escrituras
// 5) En Firestore crea una colección llamada: pollon_orders_v1
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

let ordersRef = null;
let db = null;
let auth = null;
let isFirestoreReady = false;
let orders = [];
let hasLoadedOrders = false;

let soundEnabled = false;
let favorites = new Set();

// Admin
let isAdminAuthenticated = false;
let adminFilters = { from: '', to: '', status: 'todos', search: '' };

function normalizeOrder(id, data) {
  const createdAtISO = data.createdAtISO
    || (data.createdAt && typeof data.createdAt.toDate === 'function'
      ? data.createdAt.toDate().toISOString()
      : (typeof data.createdAt === 'string' ? data.createdAt : ''));
  const ticketNumber = data.ticketNumber || formatTicketId(id);
  return { ...data, id, ticketNumber, createdAtISO };
}

function formatTicketId(id) {
  const clean = (id || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean ? `T-${clean.slice(0, 6)}` : `T-${Date.now().toString(36).toUpperCase()}`;
}

function buildLocalId() {
  return `LOCAL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

function loadOrdersLocal() {
  try {
    const raw = localStorage.getItem(ORDERS_LOCAL_KEY);
    orders = raw ? JSON.parse(raw) : [];
    orders = orders.map(o => ({
      ...o,
      ticketNumber: o.ticketNumber || formatTicketId(o.id)
    }));
    orders.sort((a, b) => getOrderDateISO(a).localeCompare(getOrderDateISO(b)));
  } catch (e) {
    orders = [];
  }
}

function saveOrdersLocal() {
  try {
    localStorage.setItem(ORDERS_LOCAL_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error guardando pedidos en localStorage', e);
  }
}

function subscribeOrdersRealtime() {
  if (!ordersRef) return;
  ordersRef.orderBy('createdAt', 'asc').onSnapshot(snapshot => {
    const list = [];
    snapshot.forEach(doc => {
      list.push(normalizeOrder(doc.id, doc.data() || {}));
    });
    orders = list;
    if (hasLoadedOrders) {
      const hasNew = snapshot.docChanges().some(change => change.type === 'added');
      if (hasNew && soundEnabled) {
        playNotificationSound();
      }
    }
    hasLoadedOrders = true;
    const adminVisible = document.getElementById('admin-panel-modal')?.classList.contains('active');
    if (adminVisible) {
      renderAdminPanel();
    }
  }, err => {
    console.error('Error en listener Firestore. Usando respaldo local.', err);
    isFirestoreReady = false;
    loadOrdersLocal();
  });
}

function initOrdersBackend() {
  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase !== 'undefined') {
      auth = firebase.auth();
      db = firebase.firestore();
      ordersRef = db.collection(ORDERS_COLLECTION);
      isFirestoreReady = true;

      auth.onAuthStateChanged(user => {
        isAdminAuthenticated = !!user;
        if (!user) {
          const panel = document.getElementById('admin-panel-modal');
          if (panel) panel.classList.remove('active');
        }
      });

      subscribeOrdersRealtime();
    }
  } catch (e) {
    console.warn('No se pudo inicializar Firebase/Firestore. Se usará solo almacenamiento local.', e);
    isFirestoreReady = false;
    loadOrdersLocal();
  }
}

async function persistOrder(orderPayload) {
  const nowISO = new Date().toISOString();
  if (isFirestoreReady && ordersRef && db) {
    const docRef = ordersRef.doc();
    const payload = {
      ...orderPayload,
      id: docRef.id,
      ticketNumber: formatTicketId(docRef.id),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtISO: nowISO
    };
    try {
      await docRef.set(payload);
      return payload;
    } catch (err) {
      console.warn('Fallo Firestore, usando respaldo local.', err);
      isFirestoreReady = false;
    }
  }

  const localId = orderPayload.id || buildLocalId();
  const payload = {
    ...orderPayload,
    id: localId,
    ticketNumber: formatTicketId(localId),
    createdAtISO: nowISO
  };
  orders.push(payload);
  saveOrdersLocal();
  return payload;
}

async function updateOrderInStore(id, updates) {
  if (isFirestoreReady && ordersRef) {
    try {
      await ordersRef.doc(id).set(updates, { merge: true });
      return;
    } catch (err) {
      console.warn('No se pudo actualizar en Firestore, usando respaldo local.', err);
      isFirestoreReady = false;
    }
  }
  const idx = orders.findIndex(o => o.id === id);
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...updates };
    saveOrdersLocal();
  }
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.warn('No se pudo reproducir el sonido.', e);
  }
}

// ===================== FIN CONFIG FIREBASE / BACKEND ====================

const products = {
  "ofertas-familiares": [
    {
      name: "Ofertón más chaufa",
      description: "Pollo entero, papas fritas, arroz chaufa, ensalada y bebidas 1.5lt.",
      price: 24500,
      image: "img/oferton mas chaufa.png",
      requiresDrink: true
    },
    {
      name: "Ofertón más fideo",
      description: "Pollo entero, papas fritas, fideos al pesto, ensalada y bebidas 1.5lt.",
      price: 24500,
      image: "img/oferton mas fideo.png",
      requiresDrink: true
    },
    {
      name: "Ofertón más chaufa pura papa",
      description: "Pollo entero, papas, extra papa, chaufa y bebidas 1.5lt.",
      price: 24500,
      image: "img/oferton mas chaufa pura papa.png",
      requiresDrink: true
    },
    {
      name: "Ofertón sin ensalada",
      description: "Pollo entero, papas fritas, arroz chaufa y bebidas 1.5lt.",
      price: 23500,
      image: "img/oferton sin ensalada.png",
      requiresDrink: true
    },
    {
      name: "Ofertón sin bebida",
      description: "Pollo entero, papas fritas, arroz chaufa y ensalada.",
      price: 21500,
      image: "img/oferton familiar.png"
    },
    {
      name: "Combo sin ensalada",
      description: "Pollo entero, papas fritas, ensalada y bebidas 1.5lt.",
      price: 21500,
      image: "img/oferton familiar.png",
      requiresDrink: true
    },
    {
      name: "Combo sin bebida",
      description: "Pollo entero, papas fritas, ensalada.",
      price: 19500,
      image: "img/oferton familiar.png"
    },
    {
      name: "Ofertón más chaufa sin bebida",
      description: "Pollo entero, papas, chaufa y ensalada.",
      price: 22500,
      image: "img/oferton mas chaufa.png"
    }
  ],
  "ofertas-dos": [
    {
      name: "1/2 combo chaufa",
      description: "Medio pollo + papas + chaufa.",
      price: 15600,
      image: "img/medio combo chaufa.png"
    },
    {
      name: "1/2 combo fideo",
      description: "Medio pollo + papas + fideos al pesto.",
      price: 15600,
      image: "img/porcion de fideo.png"
    },
    {
      name: "1/2 combo",
      description: "Medio pollo + papas + ensalada.",
      price: 14000,
      image: "img/medio combo.png"
    }
  ],
  "ofertas-personales": [
    {
      name: "1/4 combo",
      description: "1/4 pollo + papas personales + ensalada.",
      price: 8100,
      image: "img/personal combo.png"
    },
    {
      name: "1/4 combo chaufa",
      description: "1/4 pollo + chaufa + ensalada.",
      price: 9100,
      image: "img/chaufa brasa.png"
    },
    {
      name: "1/4 combo fideo",
      description: "1/4 pollo + fideos + ensalada.",
      price: 9100,
      image: "img/porcion de fideo.png"
    },
    {
      name: "1/4 solo",
      description: "1/4 pollo solo.",
      price: 6000,
      image: "img/pollo solo.png"
    },
    {
      name: "1/4 con papas",
      description: "1/4 pollo + papas.",
      price: 7000,
      image: "img/porcion de papa.png"
    },
    {
      name: "Chaufa solo",
      description: "Chaufa personal.",
      price: 6500,
      image: "img/chaufa brasa.png"
    }
  ],
  "platos-extras": [
    {
      name: "Lomo saltado de carne con chaufa",
      description: "Plato extra con chaufa.",
      price: 12200,
      image: "img/lomo saltado con chaufa.png"
    },
    {
      name: "Lomo saltado de pollo con chaufa",
      description: "Plato extra con chaufa.",
      price: 11200,
      image: "img/lomo saltado con arroz chaufa.png"
    },
    {
      name: "Chaufa de pollo",
      description: "Chaufa con pollo.",
      price: 9500,
      image: "img/chaufa brasa.png"
    },
    {
      name: "Chaufa de carne",
      description: "Chaufa con carne.",
      price: 10500,
      image: "img/chaufa brasa.png"
    },
    {
      name: "Chaufa mixto",
      description: "Chaufa mixto.",
      price: 11500,
      image: "img/chaufa brasa.png"
    },
    {
      name: "Salchipapa clásica",
      description: "Salchipapa.",
      price: 6900,
      image: "img/salchipapa.png"
    },
    {
      name: "Salchipapa con pollo",
      description: "Salchipapa + pollo.",
      price: 7900,
      image: "img/salchipapa.png"
    },
    {
      name: "Salchipapa con carne",
      description: "Salchipapa + carne.",
      price: 8900,
      image: "img/salchipapa.png"
    },
    {
      name: "Salchipapa mixta",
      description: "Salchipapa mixta.",
      price: 9900,
      image: "img/salchipapa.png"
    },
    {
      name: "Salchipapa con vienesas",
      description: "Salchipapa con vienesas.",
      price: 6900,
      image: "img/salchipapa.png"
    }
  ],
  "agregados": [
    {
      name: "1 Pollo entero solo",
      description: "Solo pollo.",
      price: 15000,
      image: "img/pollo solo.png"
    },
    {
      name: "1/2 pollo solo",
      description: "Medio pollo solo.",
      price: 8000,
      image: "img/medio pollo solo.png"
    },
    {
      name: "1/4 pollo solo",
      description: "Cuarto de pollo solo.",
      price: 6000,
      image: "img/pollo solo.png"
    },
    {
      name: "Papas familiares",
      description: "Papas fritas familiares.",
      price: 6000,
      image: "img/porcion de papa.png"
    },
    {
      name: "Papas personales",
      description: "Papas fritas personales.",
      price: 3000,
      image: "img/media porcion papa.png"
    },
    {
      name: "Ensalada familiar",
      description: "Ensalada.",
      price: 3500,
      image: "img/ensalada familiar.png"
    },
    {
      name: "Ensalada personal",
      description: "Ensalada.",
      price: 2000,
      image: "img/ensalada personal.png"
    },
    {
      name: "Arroz chaufa familiar",
      description: "Chaufa familiar.",
      price: 6500,
      image: "img/porcion arroz chaufa.png"
    },
    {
      name: "Fideos al pesto familiar",
      description: "Fideos al pesto familiar.",
      price: 6500,
      image: "img/porcion de fideo.png"
    }
  ],
  "bebidas": [
    {
      name: "Coca Cola 1.5L",
      description: "Bebida 1.5L.",
      price: 3800,
      image: "img/coca cola.png"
    },
    {
      name: "Inca Kola 1.5L",
      description: "Bebida 1.5L.",
      price: 3800,
      image: "img/inca kola.png"
    },
    {
      name: "Coca Cola 350ml",
      description: "Bebida 350ml.",
      price: 1500,
      image: "img/coca cola.png"
    },
    {
      name: "Inca Kola 350ml",
      description: "Bebida 350ml.",
      price: 1500,
      image: "img/inca kola.png"
    },
    {
      name: "Coca Zero 350ml",
      description: "Bebida 350ml.",
      price: 1500,
      image: "img/coca cola cero.png"
    },
    {
      name: "Sprite 350ml",
      description: "Bebida 350ml.",
      price: 1500,
      image: "img/sprite.png"
    },
    {
      name: "Fanta 350ml",
      description: "Bebida 350ml.",
      price: 1500,
      image: "img/fanta.png"
    },
    {
      name: "Agua 500ml",
      description: "Agua.",
      price: 1300,
      image: "img/agua sin gas.png"
    }
  ],
  "descartables": [
    {
      name: "Aluza CT5",
      description: "Envase descartable Aluza CT5.",
      price: 300,
      image: "img/aluza ct5.png"
    },
    {
      name: "Aluza CT7",
      description: "Envase descartable Aluza CT7.",
      price: 400,
      image: "img/aluza ct5.png"
    },
    {
      name: "Aluza CT9",
      description: "Envase descartable Aluza CT9.",
      price: 500,
      image: "img/aluza ct5.png"
    },
    {
      name: "Bolsa ecológica",
      description: "Bolsa ecológica.",
      price: 200,
      image: "img/bolsa ecologica.png"
    },
    {
      name: "Vaso descartable",
      description: "Descartable.",
      price: 50,
      image: "img/vaso.png"
    }
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
let selectedOrderType = 'delivery';

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

function formatOrderType(type) {
  const labels = {
    delivery: 'Delivery',
    retiro: 'Retiro en local',
    reserva: 'Reserva'
  };
  return labels[type] || 'Delivery';
}

function setOrderType(type) {
  const normalized = ['delivery', 'retiro', 'reserva'].includes(type) ? type : 'delivery';
  selectedOrderType = normalized;
  const select = document.getElementById('order-type');
  if (select) select.value = normalized;
  const buttons = {
    delivery: document.getElementById('btn-delivery'),
    reserva: document.getElementById('btn-reservas'),
    retiro: document.getElementById('btn-retiros')
  };
  Object.values(buttons).forEach(btn => btn?.classList.remove('is-selected'));
  if (buttons[normalized]) buttons[normalized].classList.add('is-selected');
}

function formatComment(comment, lineLength = 25) {
  const clean = (comment || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const parts = [];
  for (let i = 0; i < clean.length; i += lineLength) {
    parts.push(clean.slice(i, i + lineLength));
  }
  return parts.join('\n');
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    favorites = new Set(list);
  } catch (e) {
    favorites = new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
  } catch (e) {
    console.warn('No se pudo guardar favoritos.', e);
  }
}

function toggleFavorite(name) {
  if (favorites.has(name)) {
    favorites.delete(name);
  } else {
    favorites.add(name);
  }
  saveFavorites();
}

// ======== TEXTO WHATSAPP (USADO TAMBIÉN PARA IMPRESORA TÉRMICA) ========
function buildWhatsappTextFromOrder(order) {
  const customer = order.customer || {};
  const items = order.items || [];
  const total = order.total || 0;
  const createdAtISO = order.createdAtISO || order.createdAt || new Date().toISOString();
  const fechaBase = new Date(createdAtISO);
  const dd = String(fechaBase.getDate()).padStart(2, "0");
  const mm = String(fechaBase.getMonth() + 1).padStart(2, "0");
  const yyyy = fechaBase.getFullYear();
  const hh = String(fechaBase.getHours()).padStart(2, "0");
  const min = String(fechaBase.getMinutes()).padStart(2, "0");
  const fechaStr = `${dd}-${mm}-${yyyy}`;
  const horaStr = `${hh}:${min}`;
  const ticket = order.ticketNumber || order.id || '';
  const typeLabel = formatOrderType(order.orderType);

  let msg = "";
  msg += `◆ ${typeLabel.toUpperCase()} - POLLERÍA EL POLLÓN ◆\n\n`;
  msg += `Ticket: ${ticket}\n${fechaStr}    ${horaStr}\n`;
  msg += `────────────────────────────────\n`;
  msg += `◆ DATOS DEL CLIENTE\n`;
  msg += `────────────────────────────────\n\n`;

  msg += `◆ Nombre:   ${customer.name || '-'}\n`;
  msg += `◆ Teléfono: ${customer.phone || '-'}\n`;
  msg += `◆ Dirección: ${customer.address || '-'}\n`;
  msg += `◆ Tipo: ${typeLabel}\n`;

  if (customer.comment) {
    const formatted = customer.commentFormatted || formatComment(customer.comment);
    msg += `◆ Comentario:\n${formatted}\n`;
  }
  msg += `\n`;

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

  const bagQtyTotal = items.reduce((s, it) => s + (it.bagQty || 0), 0);
  const bagCostTotal = bagQtyTotal * BAG_PRICE;

  msg += `────────────────────────────────\n`;
  if (bagQtyTotal > 0) {
    msg += `◆ Bolsas ecológicas: ${bagQtyTotal} (${money(bagCostTotal)})\n`;
  }
  msg += `◆ TOTAL A PAGAR: ${money(total)}\n`;
  msg += `────────────────────────────────\n\n`;
  if (order.orderType === 'delivery') {
    msg += `◆ Delivery tiene costo adicional\n`;
    msg += `◆ según la distancia $2.500 a $4.000`;
  } else if (order.orderType === 'retiro') {
    msg += `◆ Retiro coordinado por WhatsApp`;
  } else if (order.orderType === 'reserva') {
    msg += `◆ Reserva sujeta a confirmación`;
  }

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
    const isFav = favorites.has(p.name);

    const card = document.createElement('div');
    card.className = 'product-card bg-white rounded-lg shadow-lg overflow-hidden relative';
    card.innerHTML = `
      <button class="favorite-btn ${isFav ? 'is-favorite' : ''}" data-name="${p.name}" aria-pressed="${isFav}" title="Agregar a favoritos">❤</button>
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
      const isFav = favorites.has(p.name);

      const card = document.createElement('div');
      card.className = 'product-card bg-white rounded-lg shadow-lg overflow-hidden relative';
      card.innerHTML = `
        <button class="favorite-btn ${isFav ? 'is-favorite' : ''}" data-name="${p.name}" aria-pressed="${isFav}" title="Agregar a favoritos">❤</button>
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

function setActiveCategoryButton(category) {
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.category === category);
  });
  document.querySelectorAll('.sidebar-category').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.category === category);
  });
}


// --------- Carrito UI ----------
function updateCartUI() {
  const c = cart.reduce((s, i) => s + i.qty, 0);
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
function computeBagQty(category, qty) {
  if (category === 'ofertas-familiares') {
    return qty;
  }
  if (['ofertas-dos', 'ofertas-personales', 'platos-extras', 'agregados'].includes(category)) {
    return Math.ceil(qty / 3);
  }
  return 0;
}

function renderBagInfo() {
  const badge = document.getElementById('bag-badge');
  const opts = document.getElementById('bag-options');
  const note = document.getElementById('bag-note');
  const bagSection = document.getElementById('bag-section');
  if (!badge || !opts || !note || !bagSection) return;

  const noBag = currentCategory === 'bebidas' || currentCategory === 'descartables';
  if (noBag) {
    bagSection.classList.add('hidden');
    return;
  }
  bagSection.classList.remove('hidden');

  const bagQty = computeBagQty(currentCategory, productQuantity);
  const bagCost = bagQty * BAG_PRICE;

  badge.textContent = bagQty > 0 ? 'Incluida' : 'No aplica';
  badge.className = bagQty > 0
    ? 'text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold'
    : 'text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-semibold';

  if (bagQty > 0) {
    opts.innerHTML = `Se agregará automáticamente <strong>${bagQty}</strong> bolsa(s).`;
    const ruleText = currentCategory === 'ofertas-familiares'
      ? 'Regla: 1 bolsa por unidad.'
      : 'Regla: 1 bolsa cada 3 unidades.';
    note.innerHTML = `${ruleText} Costo total: <strong>${money(bagCost)}</strong>.`;
  } else {
    opts.textContent = 'No se agregan bolsas en esta categoría.';
    note.textContent = '';
  }
}

function computeLiveTotal() {
  if (!currentProduct) return { total: 0, bagQty: 0 };
  const base = currentProduct.price * productQuantity;
  const bagQty = computeBagQty(currentCategory, productQuantity);
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

function getOrderDateISO(order) {
  if (order.createdAtISO) return order.createdAtISO;
  if (order.createdAt && typeof order.createdAt.toDate === 'function') {
    return order.createdAt.toDate().toISOString();
  }
  if (typeof order.createdAt === 'string') return order.createdAt;
  return '';
}

function filteredOrders() {
  return orders.filter(o => {
    const customer = o.customer || {};
    const d = getOrderDateISO(o).substring(0, 10);
    if (adminFilters.from && d < adminFilters.from) return false;
    if (adminFilters.to && d > adminFilters.to) return false;
    if (adminFilters.status !== 'todos' && o.status !== adminFilters.status) return false;
    if (adminFilters.search) {
      const term = adminFilters.search.toLowerCase();
      const inName = (customer.name || '').toLowerCase().includes(term);
      const inPhone = (customer.phone || '').toLowerCase().includes(term);
      const inAddress = (customer.address || '').toLowerCase().includes(term);
      const inComment = (customer.comment || '').toLowerCase().includes(term);
      const inId = (o.id || '').toLowerCase().includes(term);
      const inTicket = (o.ticketNumber || '').toLowerCase().includes(term);
      const inType = (o.orderType || '').toLowerCase().includes(term);
      if (!inName && !inPhone && !inAddress && !inComment && !inId && !inTicket && !inType) return false;
    }
    return true;
  });
}

function computeAdminStats() {
  const today = getTodayString();
  const totalPedidos = orders.length;
  const pedidosHoy = orders.filter(o => getOrderDateISO(o).startsWith(today));
  const ventasHoy = pedidosHoy.reduce((s, o) => s + o.total, 0);
  const pendientes = orders.filter(o => o.status === 'Pendiente').length;
  const entregados = orders.filter(o => o.status === 'Entregado');
  const ventasTotales = orders.reduce((s, o) => s + o.total, 0);
  const ticketPromedio = totalPedidos ? (ventasTotales / totalPedidos) : 0;
  const entregadosConTiempo = entregados.filter(o => o.deliveredAt);
  const promedioMinutos = entregadosConTiempo.length
    ? entregadosConTiempo.reduce((s, o) => {
        const diff = (new Date(o.deliveredAt) - new Date(getOrderDateISO(o))) / 60000;
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
    const dateStr = o.createdAtISO ? new Date(o.createdAtISO).toLocaleString('es-CL') : '';
    const ticket = o.ticketNumber || o.id;
    const customer = o.customer || {};
    return `
      <tr>
        <td class="px-3 py-2 text-xs font-mono text-gray-700">${ticket}</td>
        <td class="px-3 py-2 text-xs text-gray-800">${customer.name || '-'}</td>
        <td class="px-3 py-2 text-xs text-gray-700">${customer.phone || '-'}</td>
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
    const statusInput = document.getElementById('admin-filter-status');
    if (fromInput) fromInput.value = adminFilters.from;
    if (toInput) toInput.value = adminFilters.to;
    if (statusInput) statusInput.value = adminFilters.status;
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.toggle('admin-tab-active', tab.dataset.status === adminFilters.status);
    });
    const soundToggle = document.getElementById('admin-sound-toggle');
    if (soundToggle) soundToggle.checked = soundEnabled;
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
            white-space:pre-wrap;
          }
          @page{
            size: 80mm auto;
            margin: 4mm;
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

function printAdminOrders(list) {
  const rows = list.map(o => {
    const fecha = o.createdAtISO ? new Date(o.createdAtISO).toLocaleString('es-CL') : '';
    const ticket = o.ticketNumber || o.id;
    const customer = o.customer || {};
    return `
      <tr>
        <td>${ticket}</td>
        <td>${customer.name || ''}</td>
        <td>${customer.phone || ''}</td>
        <td>${customer.address || ''}</td>
        <td>${o.total || 0}</td>
        <td>${o.status || ''}</td>
        <td>${fecha}</td>
      </tr>
    `;
  }).join('');

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Pedidos - Pollería El Pollón</title>
        <style>
          body{font-family:Arial, sans-serif; font-size:12px; padding:16px;}
          h1{font-size:16px; margin-bottom:10px;}
          table{width:100%; border-collapse:collapse;}
          th, td{border:1px solid #ddd; padding:6px; text-align:left;}
          th{background:#f3f4f6;}
        </style>
      </head>
      <body>
        <h1>Pedidos filtrados</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha/Hora</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

// --------- Eventos globales ----------
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('favorite-btn')) {
    const name = e.target.dataset.name;
    if (name) {
      toggleFavorite(name);
      const isFav = favorites.has(name);
      e.target.classList.toggle('is-favorite', isFav);
      e.target.setAttribute('aria-pressed', String(isFav));
    }
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

  const qEl = document.getElementById('product-quantity');
  if (qEl) qEl.textContent = '1';
  document.querySelectorAll('.drink-radio').forEach(r => r.checked = false);

  const nameEl = document.getElementById('options-product-name');
  const descEl = document.getElementById('options-product-desc');
  const priceEl = document.getElementById('options-product-price');
  if (nameEl) nameEl.textContent = currentProduct.name;
  if (descEl) descEl.textContent = currentProduct.description || '';
  if (priceEl) priceEl.textContent = money(currentProduct.price);

  setDrinkVisible(!!currentProduct.requiresDrink);
  renderBagInfo();
  computeLiveTotal();

  const om = document.getElementById('options-modal');
  if (om) om.classList.add('active');
}


  // seleccionar bebida
  if (e.target.classList.contains('drink-radio')) {
    selectedDrink = e.target.value;
  }

  // qty +
  if (e.target.id === 'increase-quantity') {
    productQuantity++;
    const qEl = document.getElementById('product-quantity');
    if (qEl) qEl.textContent = productQuantity;
    computeLiveTotal();
    renderBagInfo();
  }
  // qty -
  if (e.target.id === 'decrease-quantity') {
    if (productQuantity > 1) {
      productQuantity--;
      const qEl = document.getElementById('product-quantity');
      if (qEl) qEl.textContent = productQuantity;
      computeLiveTotal();
      renderBagInfo();
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
    if (currentProduct?.requiresDrink && !selectedDrink) {
      showToast('⚠️ Debes seleccionar un sabor de bebida.');
      return;
    }

    const { total, bagQty } = computeLiveTotal();

    cart.push({
      name: currentProduct.name,
      price: currentProduct.price,
      qty: productQuantity,
      drink: currentProduct.requiresDrink ? selectedDrink : null,
      bagQty,
      total
    });

    updateCartUI();
    showToast('¡Producto agregado al carrito!');
    const om = document.getElementById('options-modal');
    if (om) om.classList.remove('active');
    selectedDrink = null;
    productQuantity = 1;
    currentProduct = null;
  }

        // ===== HEADER: ¿Cómo desea hacer su pedido? =====

      // Abrir modal DELIVERY
      if (e.target.id === 'btn-delivery') {
        setOrderType('delivery');
        const m = document.getElementById('modal-delivery');
        if (m) m.classList.add('active');
      }

      // Abrir modal RESERVAS
      if (e.target.id === 'btn-reservas') {
        setOrderType('reserva');
        const m = document.getElementById('modal-reservas');
        if (m) m.classList.add('active');
      }

      // Abrir modal RETIROS
      if (e.target.id === 'btn-retiros') {
        setOrderType('retiro');
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
  if (e.target.id === 'continue-shopping') {
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
    const emailInput = document.getElementById('admin-email');
    const passInput = document.getElementById('admin-password');
    const err = document.getElementById('admin-login-error');
    const email = (emailInput?.value || '').trim();
    const pass = (passInput?.value || '').trim();
    if (!auth) {
      showToast('Firebase Auth no está disponible.');
      return;
    }
    auth.signInWithEmailAndPassword(email, pass)
      .then(() => {
        if (err) err.classList.add('hidden');
        const lm = document.getElementById('admin-login-modal');
        if (lm) lm.classList.remove('active');
        showToast('✅ Acceso concedido al panel de administración.');
        openAdminPanelModal();
      })
      .catch(() => {
        if (err) err.classList.remove('hidden');
      });
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
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.toggle('admin-tab-active', tab.dataset.status === 'todos');
    });
    renderAdminPanel();
  }

  if (e.target.classList.contains('admin-tab')) {
    const status = e.target.dataset.status || 'todos';
    adminFilters.status = status;
    const fs = document.getElementById('admin-filter-status');
    if (fs) fs.value = status;
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.toggle('admin-tab-active', tab.dataset.status === status);
    });
    renderAdminPanel();
  }

  // ADMIN copiar pedidos
  if (e.target.id === 'admin-copy') {
    const list = filteredOrders();
    if (list.length === 0) {
      showToast('No hay pedidos en el rango seleccionado.');
      return;
    }
    let lines = 'ID\tFecha\tNombre\tTeléfono\tDirección\tComentario\tTotal\tEstado\n';
    list.forEach(o => {
      const fecha = o.createdAtISO ? new Date(o.createdAtISO).toLocaleString('es-CL') : '';
      const customer = o.customer || {};
      const dir = (customer.address || '').replace(/\s+/g, ' ');
      const comment = (customer.comment || '').replace(/\s+/g, ' ');
      const ticket = o.ticketNumber || o.id;
      lines += `${ticket}\t${fecha}\t${customer.name || ''}\t${customer.phone || ''}\t${dir}\t${comment}\t${o.total}\t${o.status}\n`;
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

  if (e.target.id === 'admin-print-list') {
    const list = filteredOrders();
    if (list.length === 0) {
      showToast('No hay pedidos en el rango seleccionado.');
      return;
    }
    printAdminOrders(list);
  }

  // ADMIN refresh
  if (e.target.id === 'admin-refresh') {
    if (!isFirestoreReady) {
      loadOrdersLocal();
    }
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
      updateOrderInStore(order.id, { status: order.status, deliveredAt: order.deliveredAt });
      renderAdminPanel();
      showToast(`Estado actualizado a: ${nuevo}`);
    }
  }

  if (e.target.classList.contains('admin-wa')) {
    const id = e.target.dataset.id;
    const order = orders.find(o => o.id === id);
    if (order) {
      const customer = order.customer || {};
      const phoneRaw = (customer.phone || '').replace(/\D/g, '');
      const to = phoneRaw || WHATSAPP_NUMBER;
      const ticket = order.ticketNumber || order.id;
      let msg = `Hola ${customer.name || ''}, te escribimos de Pollería El Pollón respecto a tu pedido ${ticket} (${order.status}).`;
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
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.toggle('admin-tab-active', tab.dataset.status === adminFilters.status);
    });
    renderAdminPanel();
  }
  if (e.target.id === 'admin-filter-search') {
    adminFilters.search = e.target.value || '';
    renderAdminPanel();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'admin-sound-toggle') {
    soundEnabled = !!e.target.checked;
    try {
      localStorage.setItem(ADMIN_SOUND_KEY, soundEnabled ? 'true' : 'false');
    } catch (err) {
      console.warn('No se pudo guardar preferencia de sonido.', err);
    }
  }
  if (e.target.id === 'order-type') {
    setOrderType(e.target.value || 'delivery');
  }
});

// enviar pedido (checkout)
      // enviar pedido (checkout)
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('customer-name').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const comment = document.getElementById('customer-comment').value.trim();
    const typeSelect = document.getElementById('order-type');
    const orderType = (typeSelect?.value || selectedOrderType || 'delivery');
    selectedOrderType = orderType;

    let total = 0;
    let bagsQtyTotal = 0;
    const itemsForOrder = [];

    cart.forEach((it) => {
      total += it.total;
      bagsQtyTotal += it.bagQty || 0;
      itemsForOrder.push({
        name: it.name,
        qty: it.qty,
        drink: it.drink,
        bagQty: it.bagQty,
        total: it.total
      });
    });

    const orderPayload = {
      orderType,
      customer: {
        name,
        address,
        phone,
        comment,
        commentFormatted: formatComment(comment)
      },
      items: itemsForOrder,
      bags: {
        qty: bagsQtyTotal,
        cost: bagsQtyTotal * BAG_PRICE
      },
      total,
      status: 'Pendiente',
      deliveredAt: null
    };

    try {
      const savedOrder = await persistOrder(orderPayload);
      const rawMsg = buildWhatsappTextFromOrder(savedOrder);
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
      setOrderType(selectedOrderType);
      showToast('✅ ¡Pedido enviado a WhatsApp y registrado!');
    } catch (err) {
      console.error('Error guardando pedido', err);
      showToast('❌ No se pudo guardar el pedido. Intenta nuevamente.');
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

    if (cat === 'todo-el-menu') {
      renderProductsAll();
    } else {
      renderProductsSingle(cat);
    }
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

    if (cat === 'todo-el-menu') {
      renderProductsAll();
    } else {
      renderProductsSingle(cat);
    }
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
loadFavorites();
try {
  soundEnabled = localStorage.getItem(ADMIN_SOUND_KEY) === 'true';
} catch (err) {
  soundEnabled = false;
}
const soundToggle = document.getElementById('admin-sound-toggle');
if (soundToggle) soundToggle.checked = soundEnabled;
setOrderType(selectedOrderType);
// renderProducts('ofertas-familiares');
renderProductsAll();
currentCategory = 'todo-el-menu';
buildSidebarGallery();


updateCartUI();
if (chatbotMessagesEl) {
  chatbotWelcome();
}


