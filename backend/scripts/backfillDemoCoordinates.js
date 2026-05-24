import { pool } from '../src/config/db.js';

const coordinatesByAddress = {
  'Av. Colon 2500': [-38.0058, -57.5489],
  'Olavarria 3100': [-38.0142, -57.5422],
  'Rawson 1850': [-38.0108, -57.5461],
  'Constitucion 5200': [-37.9679, -57.5512],
  'Roca 1450': [-38.0127, -57.5383],
  'Independencia 3600': [-37.9985, -57.5647],
  'Mario Bravo 1400': [-38.0752, -57.5593],
  'Jara 2800': [-37.9877, -57.5565],
  'Alem 3900': [-38.0245, -57.5348],
  'Av. Luro 6800': [-37.9657, -57.5749]
};

for (const [address, [latitude, longitude]] of Object.entries(coordinatesByAddress)) {
  await pool.execute(
    `UPDATE orders
     SET latitude = :latitude, longitude = :longitude, store_id = 2, time_condition = NULL
     WHERE address = :address`,
    { latitude, longitude, address }
  );
}

console.log('Coordenadas demo actualizadas.');
await pool.end();
