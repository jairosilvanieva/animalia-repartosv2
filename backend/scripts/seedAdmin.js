import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const email = process.argv[2] || 'admin@animalia.local';
const password = process.argv[3] || 'admin123';
const hash = await bcrypt.hash(password, 10);

await pool.execute(
  `INSERT INTO users (name, email, password_hash, role)
   VALUES ('Administrador', :email, :hash, 'administrador')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), active = TRUE`,
  { email, hash }
);

console.log(`Usuario administrador listo: ${email}`);
await pool.end();
