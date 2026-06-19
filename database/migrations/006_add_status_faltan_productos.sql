-- Nuevo estado para pedidos con productos faltantes.
ALTER TABLE orders
  MODIFY COLUMN status ENUM('pendiente','en_camino','entregado','no_entregado','cancelado','faltan_productos')
  NOT NULL DEFAULT 'pendiente';
