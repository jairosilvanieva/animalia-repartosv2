UPDATE orders
SET status = 'pendiente'
WHERE status IN ('en_preparacion', 'listo_para_repartir');

ALTER TABLE orders
  MODIFY status ENUM('pendiente', 'en_camino', 'entregado', 'no_entregado', 'cancelado') NOT NULL DEFAULT 'pendiente';
