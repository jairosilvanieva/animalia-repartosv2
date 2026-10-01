import { pool } from '../src/config/db.js';

// Pedidos "a corroborar" que quedaron con amount_to_collect = 0 (bug previo): se les pone el total.
const [result] = await pool.execute(
  `UPDATE orders
   SET amount_to_collect = total
   WHERE payment_status = 'corroborar_pago'
     AND amount_to_collect = 0
     AND total > 0
     AND status NOT IN ('entregado', 'cancelado', 'no_entregado')`
);

console.log(`Pedidos corregidos: ${result.affectedRows}`);
await pool.end();
