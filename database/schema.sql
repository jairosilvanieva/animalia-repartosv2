CREATE TABLE stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(180) NOT NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO stores (name, address) VALUES
('Animalia Constitucion', 'Constitucion, Mar del Plata, Buenos Aires'),
('Animalia Sarmiento y Garay', 'Sarmiento y Garay, Mar del Plata, Buenos Aires'),
('Animalia Guemes y Roca', 'Guemes y Roca, Mar del Plata, Buenos Aires');

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('administrador', 'local', 'chofer') NOT NULL,
  store_id INT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origin ENUM('manual', 'woocommerce') NOT NULL,
  woocommerce_order_id BIGINT NULL,
  order_number VARCHAR(80) NULL,
  order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  customer_name VARCHAR(160) NOT NULL,
  phone VARCHAR(80) NULL,
  dni VARCHAR(40) NULL,
  address VARCHAR(220) NOT NULL,
  between_streets VARCHAR(180) NULL,
  city VARCHAR(120) DEFAULT 'Mar del Plata',
  postal_code VARCHAR(20) NULL,
  customer_note TEXT NULL,
  internal_notes TEXT NULL,
  payment_method VARCHAR(120) NULL,
  payment_status ENUM('cobrado', 'a_cobrar', 'corroborar_pago') NOT NULL DEFAULT 'a_cobrar',
  amount_to_collect DECIMAL(12, 2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discounts DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  delivery_mode VARCHAR(120) NULL,
  time_condition VARCHAR(120) NULL,
  priority BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('pendiente', 'en_preparacion', 'listo_para_repartir', 'en_camino', 'entregado', 'cancelado', 'no_entregado') NOT NULL DEFAULT 'pendiente',
  woocommerce_status VARCHAR(80) NULL,
  store_id INT NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orders_woocommerce_order_id (woocommerce_order_id),
  INDEX idx_orders_date_status (order_date, status),
  INDEX idx_orders_store (store_id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_name VARCHAR(220) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE delivery_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  route_date DATE NOT NULL,
  driver_id INT NULL,
  status ENUM('borrador', 'activa', 'finalizada', 'cancelada') NOT NULL DEFAULT 'borrador',
  start_address VARCHAR(180) NOT NULL DEFAULT 'Sarmiento y Garay, Mar del Plata, Buenos Aires',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

CREATE TABLE route_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  order_id INT NOT NULL,
  stop_order INT NOT NULL,
  status ENUM('pendiente', 'en_camino', 'entregado', 'no_entregado', 'problema') NOT NULL DEFAULT 'pendiente',
  problem_note TEXT NULL,
  delivered_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_route_order (route_id, order_id),
  FOREIGN KEY (route_id) REFERENCES delivery_routes(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE vehicle_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NULL,
  driver_id INT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy DECIMAL(10, 2) NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES delivery_routes(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NULL,
  order_id INT NULL,
  sender_id INT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES delivery_routes(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
