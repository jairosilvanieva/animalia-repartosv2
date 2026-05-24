# Animalia Repartos MVP

App interna para reemplazar la planilla de repartos, recibir pedidos de WooCommerce y armar tandas de reparto desde Animalia Sarmiento 2790.

## Arquitectura

- `frontend/`: Angular standalone, vistas para administracion, carga manual y chofer.
- `backend/`: Node.js + Express, API REST, autenticacion simple por JWT y acceso a MySQL.
- `database/schema.sql`: modelo inicial de base de datos.

## Modelo operativo del MVP

1. Administracion carga pedidos manuales desde la app o los recibe desde WooCommerce.
2. WooCommerce envia pedidos a `POST /api/orders/from-woocommerce`.
3. Administracion filtra por fecha de reparto, selecciona una tanda de pedidos y crea una ruta.
4. El chofer usa la vista mobile para seguir la ruta, llamar/escribir al cliente y marcar estados.
5. El chofer actualiza cada parada desde la vista mobile.

## Integracion de mapas recomendada

Para el MVP en Mar del Plata recomiendo **OpenRouteService + OpenStreetMap/Leaflet**:

- Costo: OpenRouteService tiene un plan standard gratuito con limites diarios para direcciones, matriz, optimizacion y geocodificacion. Es suficiente para un MVP de una camioneta si se cachean coordenadas y no se recalcula cada minuto. Fuente: [OpenRouteService plans](https://staging.openrouteservice.org/plans/).
- Facilidad: una API key, endpoints HTTP simples y buena compatibilidad con Leaflet.
- Precision: para Mar del Plata suele ser razonable porque usa datos OpenStreetMap. Para domicilios dificiles conviene guardar lat/lng corregidos manualmente.
- Riesgo: la geocodificacion puede ser menos precisa que Google en direcciones argentinas informales o incompletas.

Alternativa premium: **Google Maps Platform**. Tiene mejor geocodificacion y UX conocida para abrir paradas en Maps/Waze, pero exige billing y las rutas/matrices se cobran por request o elemento. Fuente: [Google Routes API billing](https://developers.google.com/maps/documentation/routes/usage-and-billing).

Mapbox es una tercera opcion fuerte para mapas y direcciones, con free tier amplio para requests de Directions y map loads, pero para este caso aporta menos que ORS en MVP si la prioridad es costo bajo. Fuente: [Mapbox pricing](https://www.mapbox.com/pricing).

Decision propuesta:

- MVP: OpenRouteService para geocoding/routing/optimization + Leaflet en frontend.
- Produccion si hay problemas de direcciones: Google Geocoding para convertir domicilios y ORS/Google para rutas segun costo real.

## Estructura de carpetas

```text
animalia-repartos/
  backend/
    src/
      config/
      middleware/
      routes/
      services/
  database/
    schema.sql
  frontend/
    src/app/
      core/
      pages/
        admin/
        driver/
        manual-order/
```

## Primer setup

1. Crear la base:

```sql
CREATE DATABASE animalia_repartos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Ejecutar `database/schema.sql` en MySQL.

3. Instalar dependencias:

```bash
npm run install:all
```

4. Copiar variables:

```bash
copy backend\.env.example backend\.env
```

5. Crear el usuario administrador inicial:

```bash
npm --prefix backend run seed:admin
```

Por defecto crea `admin@animalia.local` con clave `admin123`.

6. Levantar backend:

```bash
npm run dev:backend
```

7. Levantar frontend:

```bash
npm run dev:frontend
```

## Endpoints REST principales

- `POST /api/auth/login`
- `GET /api/orders`
- `POST /api/orders/manual`
- `POST /api/orders/from-woocommerce`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id`
- `POST /api/routes`
- `GET /api/routes/:id`
- `PATCH /api/routes/:routeId/stops/:stopId`
- `GET /api/chat/:routeId`
- `POST /api/chat/:routeId`

## Flujo WooCommerce

El snippet actual puede seguir mandando a Slack y sumar un `wp_remote_post` hacia:

```text
POST https://tu-dominio.com/api/orders/from-woocommerce
Authorization: Bearer API_KEY_INTERNA
Content-Type: application/json
```

El backend usa `woocommerce_order_id` con indice unico para evitar duplicados.
Hay un ejemplo adaptable en `docs/woocommerce-snippet.php`.

## Flujo de ruta

La ruta se crea con pedidos listos o pendientes seleccionados. El backend excluye cancelados, entregados y no listos. El algoritmo inicial:

1. Pone primero los pedidos prioritarios.
2. Dentro de cada grupo, ordena por cercania desde Sarmiento 2790 cuando el pedido tiene lat/lng.
3. Si faltan coordenadas, usa el rango horario como respaldo.

Cuando se configure `ORS_API_KEY`, el servicio queda preparado para reemplazar el heuristico local por optimizacion externa.

## Geocodificacion

La app puede convertir direcciones en coordenadas usando OpenRouteService. El endpoint oficial de geocodificacion publica resuelve texto de direccion a coordenadas y permite enfocar la busqueda cerca de Mar del Plata.

1. Crear una API key en OpenRouteService.
2. Ponerla en `backend/.env`:

```env
ORS_API_KEY=tu_api_key
```

3. Reiniciar el backend.

Desde ese momento, los pedidos nuevos se geocodifican al cargarse. Para completar pedidos ya existentes:

```bash
npm --prefix backend run geocode:missing
```
