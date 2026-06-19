-- Distinguir pedidos de reparto (envio a domicilio) vs retiro en local.
-- Todos los pedidos existentes quedan como 'reparto'.
ALTER TABLE orders
  ADD COLUMN tipo ENUM('reparto', 'retiro') NOT NULL DEFAULT 'reparto' AFTER origin;

CREATE INDEX idx_orders_tipo ON orders(tipo);
