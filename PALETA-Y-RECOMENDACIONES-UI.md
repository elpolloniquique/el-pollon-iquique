# Paleta y recomendaciones UI/UX — El Pollón

## Paleta HEX profesional

| Uso | Color | HEX | Variable CSS |
|-----|--------|-----|--------------|
| **Blanco** | Fondo header, tarjetas, espacios limpios | `#FFFFFF` | `--color-white` |
| **Negro elegante** | Textos nav, títulos, cuerpo | `#222222` | `--color-black` |
| **Gris oscuro** | Subtítulos, texto secundario | `#333333` | `--color-gray-dark` |
| **Gris medio** | Labels, texto muted | `#5C5C5C` | `--color-gray-mid` |
| **Rojo moderno** | CTAs, hover nav, títulos clave | `#D62828` | `--color-red` |
| **Rojo suave** | Hover botones, acentos | `#E63946` | `--color-red-soft` |
| **Anaranjado** | Botón principal header, etiquetas, íconos | `#F77F00` | `--color-orange` |
| **Anaranjado suave** | Promociones, detalles | `#FCBF49` | `--color-orange-soft` |
| **Gris muy claro** | Secciones alternadas | `#F5F5F5` | `--color-gray-bg` |
| **Gris claro** | Bordes, separadores | `#E8E8E8` | `--color-gray-border` |
| **Footer** | Fondo footer | `#1A1A1A` | `--color-footer` |

---

## Dónde usar cada color

### Rojo (`#D62828` / `#E63946`)
- Botones principales: "Agregar", "Enviar Mi Pedido", "Realizar Pedido por WhatsApp"
- Títulos importantes: "Nuestro Menú", títulos de modales
- Hover del menú (DELIVERY, RESERVAS, RETIROS)
- Categoría activa en el menú
- Precios en tarjetas de producto
- Barra de aviso / CTA superior
- Focus en inputs del formulario de entrega

### Anaranjado (`#F77F00` / `#FCBF49`)
- Botón "Ver Mi Pedido" en el header (principal del header)
- Botón flotante del chatbot
- Etiquetas de promoción ("Oferta")
- Flecha de categorías (hover)
- Enlaces hover en el footer
- Badge del carrito (número)

### Blanco (`#FFFFFF`)
- Fondo del header
- Fondo de tarjetas de producto y modales
- Fondos de secciones principales
- Texto sobre rojo/naranja/oscuro

### Negro / Gris oscuro (`#222222` / `#333333`)
- Texto del menú de navegación
- Título y subtítulo del header
- Textos principales de la página
- Footer: títulos y texto (junto con blanco)

### Gris muy claro (`#F5F5F5`)
- Fondo de secciones alternadas (por ejemplo la sección del menú)
- Hover suave en botones secundarios

### Footer (`#1A1A1A`)
- Fondo del footer
- Panel del chatbot
- Textos en blanco; detalles/links en naranja o rojo al hover

---

## Recomendaciones de mejora visual

1. **Sombras**: Usar siempre sombras suaves (`0 2px 12px rgba(34,34,34,0.06)`). Evitar sombras muy oscuras o grandes.
2. **Bordes**: Radio de 8px a 12px (`--radius-sm`, `--radius-md`, `--radius-lg`) en botones, tarjetas y modales.
3. **Tipografía**: Inter (ya enlazada). Alternativas: Poppins o Montserrat para un toque más marcado.
4. **Espaciado**: Mantener márgenes y paddings generosos para un aspecto minimalista y respirable.
5. **Contraste**: En móvil, asegurar que texto negro sobre blanco y botones rojos/naranjas sigan siendo legibles.
6. **Jerarquía**: Un solo CTA principal por bloque (naranja en header; rojo en contenido).
7. **Consistencia**: No mezclar más de un rojo o un naranja; usar solo las variantes de la paleta.

---

## Estructura visual aplicada

- **Header**: Blanco `#FFFFFF`, logo visible, menú en `#222222`, hover en `#D62828`, botón principal en `#F77F00`.
- **Hero**: Fondo blanco; detalles y CTA en rojo/anaranjado según contexto.
- **Secciones**: Alternancia blanco / gris muy claro `#F5F5F5` para ritmo visual.
- **Botones**: CTAs principales en rojo; botón destacado del header en naranja; secundarios con borde gris.
- **Footer**: Fondo `#1A1A1A`, textos en blanco, enlaces y detalles en naranja/rojo al hover.

---

## Estilo restaurante moderno 2026

- Diseño **minimalista**: pocos elementos por pantalla, mucho espacio en blanco.
- **Paleta contenida**: 4–5 colores principales bien definidos (blanco, negro/gris, rojo, naranja).
- **Tipografía clara**: Inter para cuerpo y títulos; pesos 400–800 según jerarquía.
- **Componentes redondeados**: 8–12px en todo lo interactivo.
- **Microinteracciones**: Transiciones de 0,25s en hovers y cambios de estado.
- **Mobile first**: Botones y áreas táctiles mínimas de 44px; contraste y tamaño de fuente adecuados.
