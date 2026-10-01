import { pool } from '../src/config/db.js';

const today = new Date().toISOString().slice(0, 10);

const repartos = [
  {
    customer_name: 'Laura Fernández',
    phone: '2235001001',
    address: 'San Martín 1450, Mar del Plata',
    payment_method: 'Efectivo',
    payment_status: 'a_cobrar',
    amount_to_collect: 8500,
    total: 8500,
    products: [{ name: 'Alimento perro adulto 15kg', qty: 1, price: 8500 }],
  },
  {
    customer_name: 'Carlos Rodríguez',
    phone: '2235002002',
    address: 'Rivadavia 2310, Mar del Plata',
    payment_method: 'BBVA + MODO',
    payment_status: 'cobrado',
    amount_to_collect: 0,
    total: 12300,
    products: [
      { name: 'Snack dental mediano x10', qty: 2, price: 3400 },
      { name: 'Antipulgas pipeta gato', qty: 1, price: 5500 },
    ],
  },
  {
    customer_name: 'Marcela Gómez',
    phone: '2235003003',
    address: 'Luro 890, Mar del Plata',
    payment_method: 'Tarjeta 1 pago / Transf.',
    payment_status: 'corroborar_pago',
    amount_to_collect: 0,
    total: 6200,
    priority: true,
    products: [{ name: 'Alimento gato castrado 3kg', qty: 1, price: 6200 }],
  },
  {
    customer_name: 'Sebastián Torres',
    phone: '2235004004',
    address: 'Belgrano 3120, Mar del Plata',
    payment_method: 'Efectivo',
    payment_status: 'a_cobrar',
    amount_to_collect: 15000,
    total: 15000,
    products: [
      { name: 'Cama ortopédica grande', qty: 1, price: 10500 },
      { name: 'Juguete kong mediano', qty: 2, price: 2250 },
    ],
  },
  {
    customer_name: 'Valeria Méndez',
    phone: '2235005005',
    address: 'Colón 4560, Mar del Plata',
    payment_method: 'Cuenta DNI',
    payment_status: 'a_cobrar',
    amount_to_collect: 4800,
    total: 4800,
    products: [{ name: 'Arena sanitaria x20L', qty: 2, price: 2400 }],
  },
];

const retiros = [
  {
    customer_name: 'Diego Suárez',
    phone: '2235006006',
    store_id: 2,
    payment_method: 'Efectivo',
    payment_status: 'a_cobrar',
    amount_to_collect: 5200,
    total: 5200,
    products: [{ name: 'Alimento cachorro razas pequeñas 3kg', qty: 1, price: 5200 }],
  },
  {
    customer_name: 'Ana Ramírez',
    phone: '2235007007',
    store_id: 1,
    payment_method: 'BBVA + MODO',
    payment_status: 'cobrado',
    amount_to_collect: 0,
    total: 9800,
    products: [
      { name: 'Collar antiparasitario perro grande', qty: 1, price: 4900 },
      { name: 'Shampoo medicado 400ml', qty: 1, price: 4900 },
    ],
  },
  {
    customer_name: 'Roberto Acosta',
    phone: '2235008008',
    store_id: 3,
    payment_method: 'Tarjeta 1 pago / Transf.',
    payment_status: 'corroborar_pago',
    amount_to_collect: 0,
    total: 7600,
    products: [{ name: 'Rascador gato con hamaca', qty: 1, price: 7600 }],
  },
  {
    customer_name: 'Florencia Vidal',
    phone: '2235009009',
    store_id: 2,
    payment_method: 'Efectivo',
    payment_status: 'a_cobrar',
    amount_to_collect: 3400,
    total: 3400,
    products: [
      { name: 'Snack premio gato x30', qty: 2, price: 1700 },
    ],
  },
  {
    customer_name: 'Martín Herrera',
    phone: '2235010010',
    store_id: 1,
    payment_method: 'Cuenta DNI',
    payment_status: 'a_cobrar',
    amount_to_collect: 11500,
    total: 11500,
    products: [
      { name: 'Alimento perro senior 7kg', qty: 1, price: 7800 },
      { name: 'Suplemento articular x30 comp', qty: 1, price: 3700 },
    ],
  },
];

async function insertOrder(tipo, data, storeId = null) {
  const [res] = await pool.execute(
    `INSERT INTO orders
      (origin, tipo, order_date, scheduled_delivery_date, customer_name, phone, address,
       payment_method, payment_status, amount_to_collect, total, status, store_id, priority)
     VALUES ('manual', :tipo, NOW(), :date, :name, :phone, :address,
             :payMethod, :payStat, :collect, :total, 'pendiente', :storeId, :priority)`,
    {
      tipo,
      date: today,
      name: data.customer_name,
      phone: data.phone,
      address: tipo === 'retiro' ? 'Retiro en local' : data.address,
      payMethod: data.payment_method,
      payStat: data.payment_status,
      collect: data.amount_to_collect,
      total: data.total,
      storeId: storeId || data.store_id || null,
      priority: data.priority ? 1 : 0,
    }
  );

  const orderId = res.insertId;
  for (const p of data.products) {
    await pool.execute(
      `INSERT INTO order_items (order_id, product_name, quantity, unit_price, total)
       VALUES (:orderId, :name, :qty, :price, :total)`,
      { orderId, name: p.name, qty: p.qty, price: p.price, total: p.price * p.qty }
    );
  }
  return orderId;
}

(async () => {
  try {
    console.log('Insertando pedidos de reparto…');
    for (const r of repartos) {
      const id = await insertOrder('reparto', r);
      console.log(`  ✓ Reparto #${id} — ${r.customer_name}`);
    }

    console.log('Insertando pedidos de retiro…');
    for (const r of retiros) {
      const id = await insertOrder('retiro', r);
      console.log(`  ✓ Retiro  #${id} — ${r.customer_name} (local ${r.store_id})`);
    }

    console.log('Listo.');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
