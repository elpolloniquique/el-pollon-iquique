/* =========================================================
   El Pollón — Portafolio gastronómico (sin compras)
   Galería visual de platos · Redirige a www.el-pollon.cl
========================================================= */

const OFFICIAL_URL = 'https://www.el-pollon.cl/';
const SITE_URL = 'https://elpolloniquique.github.io/el-pollon-iquique/';

const products = {
  "ofertas-familiares": [
    { name: "Oferton mas chaufa", description: "Pollo entero, papas fritas, arroz chaufa, ensalada y bebidas 1.5lt.", image: "img/ofertas familiares.png" },
    { name: "Oferton c/ fideos al pesto + ensalada", description: "Pollo entero, papas fritas, fideos al pesto, ensalada y bebidas 1.5lt.", image: "img/todo el menu.png" },
    { name: "Oferton con fideos al pesto pura papa", description: "Pollo entero, papas fritas, fideos al pesto, extra papa frita y bebida 1.5lt.", image: "" },
    { name: "Oferton mas chaufa pura papa", description: "Pollo entero, papas fritas, extra papa frita, arroz chaufa y bebidas 1.5lt.", image: "img/oferton mas chaufa pura papa.png" },
    { name: "Oferton c/ fideos al pesto", description: "Pollo entero, papas fritas, fideos al pesto y bebidas 1.5lt", image: "img/oferton con fideo.png" },
    { name: "Oferton sin ensalada", description: "Pollo entero, papas fritas, arroz chaufa y bebidas 1.5lt", image: "img/oferton sin ensalada.png" },
    { name: "Oferton pura papa", description: "Pollo entero, papas fritas, 1/2 porcion de papa frita y bebidas 1.5lt", image: "img/oferton pura papa.png" },
    { name: "oferton familiar", description: "Pollo entero, papas fritas, ensalada y bebidas 1.5lt", image: "img/oferton familiar.png" },
    { name: "Oferton solo ensalada", description: "Pollo entero, 2 ensaladas familiar y bebida 1.5lt.", image: "" }
  ],
  "ofertas-dos": [
    { name: "1/2 combo con fideo al pesto", description: "Medio pollo, papas fritas, fideos al pesto", image: "" },
    { name: "1/2 combo chaufa", description: "Medio pollo, papas fritas, arroz chaufa", image: "img/medio combo chaufa.png" },
    { name: "1/2 combo", description: "Medio pollo, papas fritas, ensalada personal", image: "img/medio combo.png" },
    { name: "1/2 combo pura papa", description: "Medio pollo, papas fritas con extra porción", image: "img/medio combo pura papa.png" },
    { name: "1/2 pollo solo ensalada", description: "Medio pollo, ensalada familiar", image: "" }
  ],
  "ofertas-personales": [
    { name: "Chaufa brasa c/ papa + ensalada", description: "1/4 pollo, arroz chaufa, papas fritas personales y ensalada personal", image: "" },
    { name: "1/4 combo", description: "1/4 pollo, papas fritas personales, ensalada personal", image: "img/personal combo.png" },
    { name: "1/4 combo pura papa", description: "1/4 pollo, papas fritas personales con extra porción", image: "img/personal pura papa.png" },
    { name: "Chaufa brasa", description: "1/4 pollo, arroz chaufa", image: "img/chaufa brasa.png" },
    { name: "1/4 de pollo c/ fideos al pesto", description: "1/4 pollo, fideos al pesto", image: "img/personal pesto con pollo.png" },
    { name: "Chaufa brasa c/ ensalada", description: "1/4 pollo, arroz chaufa y ensalada personal", image: "" },
    { name: "Chaufa brasa c/ papa", description: "1/4 pollo, papas fritas personal, arroz chaufa", image: "img/chaufa brasa con papas fritas.png" },
    { name: "1/4 de pollo c/ fideos + papa", description: "1/4 pollo, papas fritas, fideos al pesto", image: "img/personal con papa y fideo 01.png" },
    { name: "1/4 de pollo solo ensalada", description: "1/4 pollo + 1 ensalada familiar", image: "" }
  ],
  "platos-extras": [
    { name: "Lomo saltado de carne c/ chaufa", description: "Salteado jugoso de carne con arroz chaufa, estilo peruano.", image: "img/lomo saltado con arroz chaufa.png" },
    { name: "Saltado de pollo c/ arroz chaufa", description: "Pollo salteado al wok con verduras y arroz chaufa aromático.", image: "" },
    { name: "Lomo saltado de carne con arroz blanco", description: "Clásico lomo saltado servido con arroz blanco esponjoso.", image: "img/lomo saltado de carne con arroz blanco.png" },
    { name: "Lomo saltado de pollo con arroz blanco", description: "Pollo salteado con cebolla y tomate, acompañado de arroz.", image: "img/lomo saltado de pollo con arroz blanco.png" },
    { name: "Tallarin saltado de carne", description: "Fideos salteados con carne, verduras y sazón de la casa.", image: "img/tallarin saltado de carne 01.png" },
    { name: "Tallarin saltado de pollo", description: "Tallarines salteados con pollo tierno y vegetales frescos.", image: "" },
    { name: "Bistec a lo pobre", description: "Bistec con papas fritas, plátano frito, huevo y arroz.", image: "img/bistec a lo pobre.png" },
    { name: "Bistec a lo pobre c/ chaufa", description: "Bistec a lo pobre con arroz chaufa como complemento.", image: "" },
    { name: "Bistec con fideos al pesto", description: "Bistec jugoso con fideos al pesto caseros.", image: "" },
    { name: "Chuleta de cerdo", description: "Chuleta de cerdo a la plancha, dorada y sabrosa.", image: "img/chuleta de cerdo.png" },
    { name: "Chuleta de cerdo c/ chaufa", description: "Chuleta de cerdo con arroz chaufa de la casa.", image: "" },
    { name: "Pechuga a la plancha", description: "Pechuga de pollo a la plancha, ligera y deliciosa.", image: "img/pechuga a la plancha.png" },
    { name: "Combo nuggets", description: "Nuggets crujientes, ideales para compartir.", image: "img/nugget.png" },
    { name: "Salchipapas", description: "Clásicas salchipapas con salsa y papas doradas.", image: "img/salchipapa.png" }
  ],
  "agregados": [
    { name: "1 Pollo entero solo", description: "Pollo a la brasa entero, recién horneado.", image: "img/pollo solo.png" },
    { name: "1/2 Pollo solo", description: "Medio pollo — truto y pechuga según disponibilidad.", image: "img/medio pollo solo.png" },
    { name: "1/4 pollo solo", description: "Cuarto de pollo a la brasa, truto o pechuga.", image: "" },
    { name: "Porcion de papas fritas familiar", description: "Porción grande de papas crujientes y doradas.", image: "img/porcion de papa.png" },
    { name: "1/2 porcion de papas fritas", description: "Media porción de papas fritas crujientes.", image: "img/media porcion papa.png" },
    { name: "Porcion de arroz chaufa", description: "Arroz chaufa con el toque especial de El Pollón.", image: "img/porcion arroz chaufa.png" },
    { name: "Porcion de fideos al pesto", description: "Fideos al pesto con salsa casera.", image: "img/porcion de fideo.png" },
    { name: "Porcion de ensalada familiar", description: "Ensalada surtida fresca — porción familiar.", image: "img/ensalada familiar.png" },
    { name: "Porcion de ensalada personal", description: "Ensalada surtida fresca — porción personal.", image: "img/ensalada personal.png" }
  ],
  "bebidas": [
    { name: "Coca Cola", description: "Bebida 1.5L refrescante (según stock).", image: "img/coca cola.png" },
    { name: "Coca Cola Cero", description: "Bebida 1.5L sin azúcar (según stock).", image: "img/coca cola cero.png" },
    { name: "Inca Kola", description: "Bebida 1.5L con sabor peruano (según stock).", image: "img/inca kola.png" },
    { name: "Fanta", description: "Bebida 1.5L (según stock).", image: "img/fanta.png" },
    { name: "Sprite", description: "Bebida 1.5L (según stock).", image: "img/sprite.png" },
    { name: "Sprite Cero", description: "Bebida 1.5L sin azúcar (según stock).", image: "img/sprite cero.png" },
    { name: "Agua Sin Gas", description: "Agua Benedictino 500 ml (según stock).", image: "img/agua sin gas.png" },
    { name: "Agua Con Gas", description: "Agua con gas Benedictino 500 ml (según stock).", image: "img/agua con gas.png" }
  ],
  "descartables": [
    { name: "Aluza CT5", description: "Envase descartable Aluza CT5.", image: "img/aluza ct5.png" },
    { name: "Aluza CT3", description: "Envase descartable Aluza CT3.", image: "img/aluza ct3.png" },
    { name: "Tenedor descartable", description: "Tenedor y cuchillo plástico descartable.", image: "img/servicio descartable.png" },
    { name: "Bolsa ecológica", description: "Bolsa ecológica reutilizable.", image: "img/bolsa ecologica.png" },
    { name: "Vaso descartable", description: "Vaso de 10 oz (unidad).", image: "img/vaso.png" }
  ]
};

const CATEGORY_META = {
  "ofertas-familiares": { title: "👨‍👩‍👧‍👦 Ofertas Familiares" },
  "ofertas-dos":        { title: "👫 Ofertas para Dos" },
  "ofertas-personales": { title: "🧑 Ofertas Personales" },
  "platos-extras":      { title: "🍽️ Platos Extras" },
  "agregados":          { title: "➕ Agregados" },
  "bebidas":            { title: "🥤 Bebidas" },
  "descartables":       { title: "🍴 Descartables" }
};

const CATEGORY_ORDER = [
  "ofertas-familiares", "ofertas-dos", "ofertas-personales",
  "platos-extras", "agregados", "bebidas", "descartables"
];

const DESC_FALLBACK = {
  "ofertas-familiares": "Combo generoso para compartir en familia. Pollo a la brasa con el sabor casero de El Pollón.",
  "ofertas-dos": "Ideal para dos personas. Porciones abundantes con el toque peruano que nos distingue.",
  "ofertas-personales": "Porción personal perfecta para disfrutar solo o en pareja.",
  "platos-extras": "Plato preparado al momento con ingredientes frescos y sazón de la casa.",
  "agregados": "Complemento perfecto para armar tu mesa con todo el sabor de la brasa.",
  "bebidas": "Refrescante acompañamiento para tu experiencia gastronómica.",
  "descartables": "Productos de servicio para tu comodidad."
};

let currentCategory = "todo-el-menu";

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function productDescription(p, catKey) {
  const d = (p.description || '').trim();
  if (d) return d;
  return DESC_FALLBACK[catKey] || "Preparación casera con ingredientes frescos, servida con la calidad de El Pollón.";
}

function buildPortfolioCard(p, catKey) {
  const desc = escHtml(productDescription(p, catKey));
  const name = escHtml(p.name);
  const img = (p.image || '').trim();
  const altText = escHtml(`${p.name} — Pollería El Pollón Iquique`);
  const imgBlock = img
    ? `<img src="${escHtml(img)}" alt="${altText}" class="portfolio-card__img" loading="lazy" decoding="async" itemprop="image"
           onerror="this.style.display='none';this.nextElementSibling.classList.add('is-visible');">`
    : '';
  return `
    <article class="portfolio-card" itemscope itemtype="https://schema.org/MenuItem">
      <div class="portfolio-card__media">
        ${imgBlock}
        <div class="portfolio-card__fallback${img ? '' : ' is-visible'}" aria-hidden="true">🍗</div>
      </div>
      <div class="portfolio-card__body">
        <h3 class="portfolio-card__title" itemprop="name">${name}</h3>
        <p class="portfolio-card__desc" itemprop="description">${desc}</p>
      </div>
    </article>`;
}

function setActiveCategoryButton(category) {
  document.querySelectorAll('.category-btn.catbtn').forEach(btn => {
    btn.classList.toggle('is-active', (btn.dataset.category || '') === category);
  });
}

function renderProductsSingle(category) {
  currentCategory = category;
  const container = document.getElementById('products-container');
  if (!container) return;
  container.innerHTML = '';
  (products[category] || []).forEach(p => {
    const wrap = document.createElement('div');
    wrap.className = 'portfolio-card-wrap';
    wrap.innerHTML = buildPortfolioCard(p, category);
    container.appendChild(wrap);
  });
  setActiveCategoryButton(category);
}

function renderProductsAll() {
  currentCategory = "todo-el-menu";
  const container = document.getElementById('products-container');
  if (!container) return;
  container.innerHTML = '';

  CATEGORY_ORDER.forEach(catKey => {
    const list = products[catKey] || [];
    if (!list.length) return;

    const header = document.createElement('div');
    header.className = 'col-span-full mt-4 mb-2 category-header';
    header.innerHTML = `
      <div class="category-header-inner">
        <h3 class="category-header-title">${CATEGORY_META[catKey]?.title || catKey}</h3>
        <span class="category-line"></span>
      </div>`;
    container.appendChild(header);

    list.forEach(p => {
      const wrap = document.createElement('div');
      wrap.className = 'portfolio-card-wrap';
      wrap.innerHTML = buildPortfolioCard(p, catKey);
      container.appendChild(wrap);
    });
  });
  setActiveCategoryButton("todo-el-menu");
}

function scrollToMenu() {
  document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setCategory(cat) {
  if (cat === 'todo-el-menu') renderProductsAll();
  else renderProductsSingle(cat);
}

// --------- Sidebar ---------
const sidebarMenu = document.getElementById('sidebar-menu');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const closeSidebar = document.getElementById('close-sidebar');

function openSidebar() {
  if (sidebarMenu) sidebarMenu.style.transform = 'translateX(0)';
  if (sidebarOverlay) sidebarOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSidebarMenu() {
  if (sidebarMenu) sidebarMenu.style.transform = 'translateX(-100%)';
  if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

if (closeSidebar) closeSidebar.addEventListener('click', closeSidebarMenu);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarMenu);

document.querySelectorAll('.sidebar-category').forEach(btn => {
  btn.addEventListener('click', () => {
    setCategory(btn.dataset.category);
    closeSidebarMenu();
    scrollToMenu();
  });
});

// --------- Modales informativos ---------
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

document.getElementById('btn-delivery')?.addEventListener('click', () => openModal('modal-delivery'));
document.getElementById('btn-reservas')?.addEventListener('click', () => openModal('modal-reservas'));
document.getElementById('btn-retiros')?.addEventListener('click', () => openModal('modal-retiros'));

['modal-delivery-close', 'modal-reservas-close', 'modal-retiros-close'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', () => {
    const modalId = id.replace('-close', '');
    closeModal(modalId);
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('active');
  });
});

document.getElementById('modal-reserva-go')?.addEventListener('click', () => {
  window.open(OFFICIAL_URL, '_blank', 'noopener,noreferrer');
});
document.getElementById('modal-retiro-go')?.addEventListener('click', () => {
  window.open(OFFICIAL_URL, '_blank', 'noopener,noreferrer');
});

// --------- Eventos globales ---------
document.addEventListener('click', e => {
  const catBtn = e.target.closest('.category-btn');
  if (catBtn) {
    setCategory(catBtn.dataset.category);
    return;
  }

  const ddItem = e.target.closest('.menu-dd-item');
  if (ddItem?.dataset.category) {
    setCategory(ddItem.dataset.category);
    closeMenuDdMobile();
    scrollToMenu();
    return;
  }

  const deskBtn = e.target.closest('.desktop-menu-link-btn, .desktop-menu-card');
  if (deskBtn?.dataset.category) {
    setCategory(deskBtn.dataset.category);
    closeDesktopMenu();
    scrollToMenu();
  }
});

// --------- Dropdown móvil ---------
const menuDdBtnMobile = document.getElementById('menu-dd-btn-mobile');
const menuDdPanelMobile = document.getElementById('menu-dd-panel-mobile');

function openMenuDdMobile() {
  menuDdPanelMobile?.classList.remove('hidden');
  menuDdBtnMobile?.setAttribute('aria-expanded', 'true');
}
function closeMenuDdMobile() {
  menuDdPanelMobile?.classList.add('hidden');
  menuDdBtnMobile?.setAttribute('aria-expanded', 'false');
}

if (menuDdBtnMobile && menuDdPanelMobile) {
  menuDdBtnMobile.addEventListener('click', e => {
    e.stopPropagation();
    const open = !menuDdPanelMobile.classList.contains('hidden');
    open ? closeMenuDdMobile() : openMenuDdMobile();
  });
  document.addEventListener('click', () => closeMenuDdMobile());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenuDdMobile(); });
}

// --------- Desktop menu overlay ---------
const desktopMenuOverlay = document.getElementById('desktop-menu-overlay');
const menuCloseDesktop = document.getElementById('menu-close-desktop');

function openDesktopMenu() {
  desktopMenuOverlay?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeDesktopMenu() {
  desktopMenuOverlay?.classList.add('hidden');
  document.body.style.overflow = '';
}

menuCloseDesktop?.addEventListener('click', closeDesktopMenu);
desktopMenuOverlay?.addEventListener('click', e => {
  if (e.target === desktopMenuOverlay) closeDesktopMenu();
});

// --------- Carrusel ---------
const totalSlides = 5;
const totalSlidesInDom = totalSlides + 1;
let currentSlide = 0;
let isResetting = false;
const carouselContainer = document.getElementById('carousel-container');
const carouselIndicators = document.getElementById('carousel-indicators');
const CAROUSEL_INTERVAL_MS = 4000;

function updateCarousel(useTransition = true) {
  if (!carouselContainer) return;
  if (!useTransition) carouselContainer.style.transition = 'none';
  carouselContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
  if (!useTransition) {
    carouselContainer.offsetHeight;
    carouselContainer.style.transition = '';
  }
  const activeIndex = currentSlide === totalSlides ? 0 : currentSlide;
  carouselIndicators?.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    const active = i === activeIndex;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-selected', active);
  });
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
  let carouselInterval = setInterval(goNext, CAROUSEL_INTERVAL_MS);
  carouselIndicators?.querySelectorAll('.carousel-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.getAttribute('data-index'), 10);
      if (Number.isNaN(index) || index < 0 || index >= totalSlides) return;
      currentSlide = index;
      updateCarousel(true);
      clearInterval(carouselInterval);
      carouselInterval = setInterval(goNext, CAROUSEL_INTERVAL_MS);
    });
  });
  updateCarousel(true);
}

// --------- Scrollbar categorías ---------
(function initCategoriesScrollbar() {
  const wrap = document.getElementById('categories-scroll-wrap');
  const scrollbarEl = wrap?.nextElementSibling;
  const thumb = document.getElementById('categories-scrollbar-thumb');
  const track = scrollbarEl?.querySelector('.categories-scrollbar__track');
  const prevBtn = document.getElementById('categories-scroll-prev');
  const nextBtn = document.getElementById('categories-scroll-next');
  if (!wrap) return;

  function needsScroll() { return wrap.scrollWidth > wrap.clientWidth; }
  function toggleScrollbarVisibility() {
    scrollbarEl?.classList.toggle('categories-scrollbar--hidden', !needsScroll());
  }
  function updateThumb() {
    if (!thumb || !track) return;
    const sw = wrap.scrollWidth, cw = wrap.clientWidth;
    if (sw <= cw) { thumb.style.width = '100%'; thumb.style.left = '0'; return; }
    const ratio = cw / sw;
    const w = Math.max(ratio * 100, 12);
    const maxLeft = 100 - w;
    const left = (wrap.scrollLeft / (sw - cw)) * maxLeft;
    thumb.style.width = w + '%';
    thumb.style.left = left + '%';
  }
  function scrollByStep(dir) {
    wrap.scrollBy({ left: dir * 240, behavior: 'smooth' });
  }

  wrap.addEventListener('scroll', updateThumb);
  window.addEventListener('resize', () => { toggleScrollbarVisibility(); updateThumb(); });
  window.addEventListener('load', () => { toggleScrollbarVisibility(); updateThumb(); });
  prevBtn?.addEventListener('click', () => scrollByStep(-1));
  nextBtn?.addEventListener('click', () => scrollByStep(1));
  toggleScrollbarVisibility();
  updateThumb();
})();

function buildSidebarGallery() {
  const gallery = document.getElementById('sidebar-gallery');
  if (!gallery) return;
  gallery.innerHTML = CATEGORY_ORDER.map(catKey => {
    const list = products[catKey] || [];
    const img = (list.find(p => p.image?.trim())?.image) || '';
    if (!img) {
      return `<button class="sidebar-gallery-item h-20 rounded-lg border border-gray-200 flex items-center justify-center text-2xl" data-cat="${catKey}">🍗</button>`;
    }
    return `<button class="sidebar-gallery-item rounded-lg overflow-hidden border border-gray-200 hover:shadow transition" data-cat="${catKey}">
      <img src="${escHtml(img)}" class="w-full h-20 object-cover" alt="" loading="lazy">
    </button>`;
  }).join('');

  gallery.querySelectorAll('.sidebar-gallery-item').forEach(btn => {
    btn.addEventListener('click', () => {
      setCategory(btn.dataset.cat);
      closeSidebarMenu();
      scrollToMenu();
    });
  });
}

// --------- Inicio ---------
renderProductsAll();
buildSidebarGallery();
