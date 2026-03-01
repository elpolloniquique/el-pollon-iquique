# Diagnóstico responsive y guía de verificación – El Pollón Iquique

## A) LOS 10 PROBLEMAS RESPONSIVOS MÁS CRÍTICOS (antes de los cambios)

| # | Problema | Selector / componente | Breakpoint afectado |
|---|----------|------------------------|---------------------|
| 1 | **Scroll horizontal** por contenedores con ancho fijo o `min-width` que superan el viewport | `body`, `.header-inner`, `.max-w-6xl`, `.location-card` (grid 3.2fr 1.1fr), footer con flex | 320–430px |
| 2 | **Header** con texto/links que se comprimen o desbordan | `.header-centro`, `.pedido-link`, `.header-pregunta` | 320–390px |
| 3 | **Modales** con ancho fijo (`max-w-md`, `max-w-2xl`) que en móvil pueden quedar cortados o sin scroll interno visible | `.modal .bg-white`, `#cart-modal .max-w-2xl`, `#options-modal`, `#admin-panel-modal .max-w-5xl` | 320–480px |
| 4 | **Tabla del panel admin** con `min-width: 700px` fuerza scroll horizontal sin contenedor controlado | `.admin-orders-table`, `.admin-orders-scroll-wrap` | < 768px |
| 5 | **Tarjetas de categorías** con `width: 124px` fijo y carrusel que puede desbordar en pantallas muy estrechas | `.category-card`, `#categories-carousel` | 320–360px |
| 6 | **Botones y áreas táctiles** por debajo de 44px de alto | `.pedido-link`, `.categories-scrollbar__arrow`, `.menu-dd-item`, modales botones | < 640px |
| 7 | **Tipografía** en px o sin clamp que se vuelve ilegible en móvil | `.aviso h2`, `.footer-title`, títulos de sección, `.admin-stat-value` | 320–414px |
| 8 | **Imágenes y iframe** sin `max-width: 100%` o altura fija que rompe layout | `.product-image`, `.location-map iframe`, `.combo-img`, logo footer | Todos |
| 9 | **Chatbot** y **carrito flotante** sin posicionamiento seguro (safe-area, no superponer contenido) | `#chatbot-panel`, `.floating-cart` | 320–430px |
| 10 | **Footer / ubicación** con grid o flex que no colapsan a 1 columna y generan overflow | `.footer-grid`, `.location-card`, `.footer-brand` | 320–768px |

---

## B) CAMBIOS REALIZADOS (resumen)

- **CSS:** Bloque global anti-overflow, variables y media queries para 320px–1440px; modales 100% usables en móvil; tabla admin con scroll horizontal contenido; tipografía en rem/clamp; touch targets ≥ 44px; imágenes e iframes responsivos.
- **HTML:** Ajuste de contenedores de modales (clases para scroll), botón cerrar en modales siempre accesible, wrapper de tabla admin para scroll.
- **Sin cambios en JS:** Toda la lógica (carrito, categorías, modales, admin, chatbot) se mantiene igual.

---

## D) MINI GUÍA DE VERIFICACIÓN (móvil y pantallas)

### 1. Sin scroll horizontal (obligatorio)
- [ ] Abre DevTools → toggles device toolbar (móvil).
- [ ] Prueba 320px, 360px, 375px, 390px, 414px, 430px.
- [ ] Haz scroll vertical en toda la página: no debe aparecer barra horizontal ni contenido cortado a los lados.
- [ ] Revisa: header, menú “Nuestro Menú”, categorías, productos, combos, ubicación, footer.

### 2. Header y navegación
- [ ] DELIVERY / RESERVAS / RETIROS visibles y pulsables (≥ 44px de área táctil).
- [ ] Botón “MENÚ ☰” siempre visible y abre dropdown o sidebar según implementación.
- [ ] Logo no se deforma; en 320px el texto del centro puede reducirse pero sin cortarse.

### 3. Categorías y productos
- [ ] Carrusel de categorías con fotos se desplaza horizontalmente sin generar overflow de página.
- [ ] Tarjetas de productos en 1 columna (320–480px) o 2 columnas (≥ 640px) sin salirse del ancho.
- [ ] Imágenes de productos con `object-fit` y sin altura fija que rompa el layout.

### 4. Modales (Delivery, Reservas, Retiro, Personaliza, Carrito, Datos de entrega)
- [ ] Cada modal abre a ancho completo en móvil (con márgenes mínimos).
- [ ] Scroll interno dentro del modal si el contenido es largo; botón “Cerrar” (×) siempre visible sin scroll.
- [ ] Botones “Agregar”, “Realizar pedido”, “Cancelar”, etc., con altura ≥ 44px y bien espaciados.

### 5. Carrito flotante
- [ ] “Ver Carrito” visible y pulsable; no tapa el botón de cerrar de ningún modal.
- [ ] En 320px no se sale por los laterales; respeta safe-area si aplica.

### 6. Asistente virtual (chatbot)
- [ ] Botón de apertura visible y accesible.
- [ ] Panel del chat abre completo en móvil, con scroll interno en mensajes y chips táctiles ≥ 44px.

### 7. Panel de administración
- [ ] Acceso por contraseña; panel abre en pantalla completa en móvil con scroll vertical.
- [ ] Métricas (cards) en 2 columnas en móvil sin desbordar.
- [ ] Tabla de pedidos con scroll **solo dentro** del contenedor (scroll horizontal de tabla), sin scroll horizontal de toda la página.
- [ ] Filtros y botones (Activar sonido, Copiar, Actualizar, Cerrar) siempre visibles y usables.

### 8. Footer y ubicación
- [ ] Footer en una o varias columnas que colapsan; sin scroll horizontal.
- [ ] Mapa (iframe) con `max-width: 100%` y altura mínima razonable; en móvil ubicación en columna (debajo o arriba del mapa).
- [ ] Enlaces e iconos de redes con área táctil suficiente.

### 9. Breakpoints a probar
- [ ] 320px, 360px, 375px, 390px, 414px, 430px (móviles).
- [ ] 768px (tablet).
- [ ] 1024px (desktop).
- [ ] 1440px (desktop grande).

### 10. Funcionalidad (no romper)
- [ ] Flujo completo: elegir categoría → agregar producto → personalizar → carrito → checkout por WhatsApp.
- [ ] Modales Delivery / Reservas / Retiros abren y cierran.
- [ ] Admin: login → ver tabla → filtrar → copiar / actualizar.
- [ ] Chatbot: abrir, enviar mensaje, chips de acciones.

---

Si todos los ítems se cumplen en los breakpoints indicados, la web queda **100% adaptable y usable** en 320px–1440px sin excepciones.
