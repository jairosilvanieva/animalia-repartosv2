import { pool } from '../src/config/db.js';
import { geocodeAddress } from '../src/services/geocodingService.js';

console.log('Geocodificacion manual opcional: este script no afecta la carga diaria de pedidos.');

const [orders] = await pool.execute(
  `SELECT id, address
   FROM orders
   WHERE (latitude IS NULL OR longitude IS NULL)
     AND status NOT IN ('entregado', 'cancelado', 'no_entregado')
   ORDER BY id ASC
   LIMIT 100`
);

let updated = 0;
for (const order of orders) {
  const result = await geocodeAddress(order.address);
  if (!result) {
    console.warn(`SIN RESULTADO #${order.id}: ${order.address}. El pedido queda operativo sin coordenadas.`);
    continue;
  }

  await pool.execute(
    `UPDATE orders SET latitude = :latitude, longitude = :longitude WHERE id = :id`,
    { id: order.id, latitude: result.latitude, longitude: result.longitude }
  );
  updated += 1;
  console.log(`OK #${order.id}: ${order.address} -> ${result.latitude}, ${result.longitude} (${result.label || 'sin etiqueta'})`);
}

console.log(`Geocodificados: ${updated}/${orders.length}`);
await pool.end();
