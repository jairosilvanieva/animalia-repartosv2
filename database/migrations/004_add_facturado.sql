-- Tracking de pedidos ya facturados para evitar que se facturen dos veces.
ALTER TABLE orders
  ADD COLUMN facturado BOOLEAN NOT NULL DEFAULT FALSE;
