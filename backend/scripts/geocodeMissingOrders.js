import { pool } from '../src/config/db.js';
import { geocodeAddress } from '../src/services/geocodingService.js';

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
    console.log(`SIN RESULTADO #${order.id}: ${order.address}`);
    continue;
  }

  await pool.execute(
    `UPDATE orders SET latitude = :latitude, longitude = :longitude WHERE id = :id`,
    { id: order.id, latitude: result.latitude, longitude: result.longitude }
  );
  updated += 1;
  console.log(`OK #${order.id}: ${order.address} -> ${result.latitude}, ${result.longitude}`);
}

console.log(`Geocodificados: ${updated}/${orders.length}`);
await pool.end();
