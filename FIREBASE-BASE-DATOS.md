# Base de datos Firebase – Pollería El Pollón

## Cómo funciona

- Los pedidos que envían los clientes (checkout) se guardan en **Firebase Realtime Database**.
- La ruta usada es: `pollon_orders_v1`.
- Cada pedido se guarda con id único: `P` + timestamp (ej: `P1734567890123`).

## Reglas obligatorias (Realtime Database)

Para que los pedidos se guarden y se lean bien, en la consola de Firebase debes tener estas reglas:

1. Entra a [Firebase Console](https://console.firebase.google.com/).
2. Elige el proyecto **elpollon01-307da** (o el que uses en `firebaseConfig` de `js/app.js`).
3. Ve a **Realtime Database** → pestaña **Reglas**.
4. Usa exactamente estas reglas (o copia el contenido de `database.rules.json`):

```json
{
  "rules": {
    "pollon_orders_v1": {
      ".read": true,
      ".write": true
    }
  }
}
```

5. Pulsa **Publicar**.

## Comprobar que todo va bien

1. **Guardar pedido:** Haz un pedido de prueba desde la web (agregar al carrito → Realizar pedido → completar datos → Enviar). Debe abrirse WhatsApp y mostrarse el toast “Pedido enviado y guardado en la base de datos”.
2. **Ver en Firebase:** En Realtime Database → pestaña **Datos**, bajo `pollon_orders_v1` debe aparecer un nodo con id tipo `P1234567890` y dentro: `createdAt`, `customer`, `items`, `total`, `status`, etc.
3. **Panel admin:** Entra al panel de administración (🔐 ingresar). Debe listarse el pedido de prueba y poder cambiar estado (Pendiente → En preparación → Entregado).

## Si los pedidos no se guardan

- Revisa la consola del navegador (F12 → Consola): errores de “permission denied” suelen ser por reglas mal publicadas o proyecto equivocado.
- Confirma que en `js/app.js` el `firebaseConfig` tiene el mismo `projectId` y `databaseURL` que tu proyecto en Firebase.
- Asegúrate de haber pulsado **Publicar** en la pestaña Reglas de Realtime Database.

## Archivo de reglas

El archivo `database.rules.json` de este repositorio tiene las reglas listas para copiar/pegar en la consola o para desplegar con Firebase CLI si lo usas.
