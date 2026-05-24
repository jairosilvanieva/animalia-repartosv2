ALTER TABLE orders
  ADD COLUMN time_window_start TIME NULL AFTER time_condition,
  ADD COLUMN time_window_end TIME NULL AFTER time_window_start;
