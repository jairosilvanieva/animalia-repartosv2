import { pool } from '../src/config/db.js';

const tablesToClean = [
  'chat_messages',
  'vehicle_locations',
  'route_stops',
  'delivery_routes',
  'order_items',
  'orders'
];

const [tableRows] = await pool.query('SHOW TABLES');
const existingTables = new Set(tableRows.map((row) => Object.values(row)[0]));
const cleanableTables = tablesToClean.filter((table) => existingTables.has(table));

await pool.query('SET FOREIGN_KEY_CHECKS = 0');

for (const table of cleanableTables) {
  await pool.query(`TRUNCATE TABLE ${table}`);
  console.log(`Tabla limpiada: ${table}`);
}

await pool.query('SET FOREIGN_KEY_CHECKS = 1');

console.log('Base lista para pruebas: pedidos, rutas y mensajes quedaron en cero.');
await pool.end();
