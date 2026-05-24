ALTER TABLE orders
  ADD COLUMN scheduled_delivery_date DATE NULL AFTER order_date;

UPDATE orders
SET scheduled_delivery_date = DATE(order_date)
WHERE scheduled_delivery_date IS NULL;

ALTER TABLE orders
  MODIFY scheduled_delivery_date DATE NOT NULL;
