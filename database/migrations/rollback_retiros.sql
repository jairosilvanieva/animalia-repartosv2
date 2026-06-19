-- ROLLBACK: deshace los cambios introducidos por el módulo de retiros
-- ADVERTENCIA: ejecutar solo si NO hay pedidos con tipo='retiro' o status='faltan_productos'
-- Si los hay, eliminarlos o migrarlos antes de correr este script.

-- 1. Quitar 'faltan_productos' del ENUM de status
ALTER TABLE orders
  MODIFY COLUMN status ENUM('pendiente','en_camino','entregado','no_entregado','cancelado')
  NOT NULL DEFAULT 'pendiente';

-- 2. Quitar la columna tipo (y su índice)
DROP INDEX IF EXISTS idx_orders_tipo ON orders;
ALTER TABLE orders DROP COLUMN tipo;
