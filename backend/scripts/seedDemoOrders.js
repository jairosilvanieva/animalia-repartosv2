import { createManualOrder } from '../src/services/orderService.js';
import { pool } from '../src/config/db.js';

const today = new Date().toISOString().slice(0, 10);

const orders = [
  ['Laura Gimenez', '2235123401', 'Av. Colon 2500', 'Cordoba y Santiago del Estero', 'Alimento perro adulto 15kg', 'Efectivo', 28500, '09:00', '11:00', -38.0058, -57.5489],
  ['Martin Suarez', '2235123402', 'Olavarria 3100', 'Matheu y Quintana', 'Piedras sanitarias x 2', 'Transferencia', 12600, '10:30', '13:00', -38.0142, -57.5422],
  ['Sofia Rivas', '2235123403', 'Rawson 1850', 'Las Heras y Sarmiento', 'Balanceado gato 7.5kg', 'Mercado Pago', 22100, '12:00', '15:00', -38.0108, -57.5461],
  ['Diego Torres', '2235123404', 'Constitucion 5200', 'Chaco y Misiones', 'Antiparasitario + snack', 'Efectivo', 9400, '15:00', '18:00', -37.9679, -57.5512],
  ['Carolina Mendez', '2235123405', 'Roca 1450', 'Guemes y Olavarria', 'Cucha mediana', 'Tarjeta', 34900, '17:00', '20:00', -38.0127, -57.5383],
  ['Nicolas Vega', '2235123406', 'Independencia 3600', 'Alvarado y Castelli', 'Alimento cachorro 20kg', 'Efectivo', 41200, '09:00', '12:00', -37.9985, -57.5647],
  ['Paula Herrera', '2235123407', 'Mario Bravo 1400', 'Acha y Cerrito', 'Comedero + collar', 'Transferencia', 15800, '14:00', '17:00', -38.0752, -57.5593],
  ['Andres Molina', '2235123408', 'Jara 2800', 'San Lorenzo y Avellaneda', 'Alimento senior 15kg', 'Mercado Pago', 29800, '11:00', '14:00', -37.9877, -57.5565],
  ['Valeria Castro', '2235123409', 'Alem 3900', 'Saavedra y Almafuerte', 'Shampoo + pipetas', 'Efectivo', 18300, '16:00', '19:00', -38.0245, -57.5348],
  ['Fernando Paz', '2235123410', 'Av. Luro 6800', 'Francia y Tierra del Fuego', 'Arena aglomerante x 3', 'Transferencia', 19700, '13:00', '16:00', -37.9657, -57.5749]
];

for (const [cliente, telefono, domicilio, entreCalles, productos, formaPago, importe, desde, hasta, latitude, longitude] of orders) {
  const order = await createManualOrder({
    cliente,
    telefono,
    domicilio,
    entre_calles: entreCalles,
    productos,
    forma_pago: formaPago,
    importe_a_cobrar: importe,
    condicion_horaria: '',
    rango_horario_desde: desde,
    rango_horario_hasta: hasta,
    fecha_reparto: today,
    observaciones: 'Pedido demo para probar tandas y ruta.',
    estado: 'listo_para_repartir'
  });

  await pool.execute(
    'UPDATE orders SET latitude = :latitude, longitude = :longitude WHERE id = :id',
    { latitude, longitude, id: order.id }
  );
}

console.log(`Pedidos demo cargados para ${today}: ${orders.length}`);
await pool.end();
