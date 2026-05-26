# Deploy paso a paso - Animalia Repartos

Esta guia es para publicar la app en un servidor y luego conectar WooCommerce.

## 1. Lo que ya queda preparado en el codigo

- El frontend local usa `http://localhost:3000/api`.
- El frontend de produccion usa `https://api-repartos.animalia.com.ar/api`.
- El backend toma su configuracion desde `backend/.env`.
- El snippet de WooCommerce esta separado del snippet actual de Slack.

## 2. Antes de contratar o configurar servidor

Definir estos nombres:

- Frontend: `https://repartos.animalia.com.ar`
- Backend/API: `https://api-repartos.animalia.com.ar`

## 3. Servidor recomendado para el MVP

Para este proyecto conviene un VPS chico con:

- Node.js 20 o superior.
- MySQL 8 o compatible.
- Nginx.
- SSL/HTTPS.
- PM2 para dejar el backend prendido.

## 4. Variables del backend en produccion

En el servidor, el archivo `backend/.env` deberia tener este formato:

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://repartos.animalia.com.ar
JWT_SECRET=CAMBIAR_POR_UN_TEXTO_LARGO_Y_PRIVADO
INTERNAL_API_KEY=CAMBIAR_POR_UNA_CLAVE_LARGA_PARA_WOOCOMMERCE

DB_HOST=localhost
DB_PORT=3306
DB_USER=animalia_repartos_user
DB_PASSWORD=CAMBIAR_PASSWORD_DB
DB_NAME=animalia_repartos

ORS_API_KEY=CAMBIAR_API_KEY_OPENROUTESERVICE
```

## 5. Build del frontend

Desde la carpeta del proyecto:

```powershell
npm --prefix frontend run build:prod
```

La salida queda en:

```text
frontend/dist/animalia-repartos
```

## 6. Backend en produccion

En el servidor:

```bash
cd backend
npm install --omit=dev
node src/server.js
```

Cuando eso funcione, dejarlo con PM2:

```bash
pm2 start src/server.js --name animalia-repartos-api
pm2 save
```

## 7. Base de datos

Crear la base:

```sql
CREATE DATABASE animalia_repartos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Importar el esquema:

```bash
mysql -u animalia_repartos_user -p animalia_repartos < database/schema.sql
```

Ejecutar migraciones si existen:

```bash
mysql -u animalia_repartos_user -p animalia_repartos < database/migrations/001_add_coordinates.sql
mysql -u animalia_repartos_user -p animalia_repartos < database/migrations/002_add_scheduled_delivery_date.sql
mysql -u animalia_repartos_user -p animalia_repartos < database/migrations/003_simplify_order_statuses.sql
```

Crear usuario administrador:

```bash
npm --prefix backend run seed:admin
```

## 8. WooCommerce

No tocar el snippet actual de Slack.

Agregar aparte el snippet:

```text
docs/woocommerce-snippet.php
```

Reemplazar:

- `ANIMALIA_REPARTOS_API_URL` por `https://api-repartos.animalia.com.ar`
- `ANIMALIA_REPARTOS_API_KEY` por el mismo valor de `INTERNAL_API_KEY`

Los pedidos web entran como `No pagado` por seguridad. Luego el local marca `Pagado` manualmente si corresponde.

## 9. Orden seguro de prueba

1. Probar frontend publicado.
2. Probar login.
3. Cargar pedido manual.
4. Armar ruta.
5. Probar vista chofer.
6. Probar endpoint WooCommerce con un pedido de prueba.
7. Recién despues activar el snippet en WooCommerce real.
