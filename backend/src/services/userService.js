import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const VALID_ROLES = ['administrador', 'local', 'chofer'];

function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

export async function listUsers() {
  const [rows] = await pool.execute(
    `SELECT id, name, email, role, store_id, active, created_at
       FROM users
       ORDER BY active DESC, name ASC`
  );
  return rows;
}

export async function getUser(id) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, role, store_id, active, created_at
       FROM users WHERE id = :id`,
    { id }
  );
  return rows[0] || null;
}

export async function createUser({ name, email, password, role, store_id = null }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');
  const cleanRole = String(role || '').trim();

  if (!cleanName) throwError('Nombre requerido.', 400);
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) throwError('Email invalido.', 400);
  if (cleanPassword.length < 6) throwError('La clave debe tener al menos 6 caracteres.', 400);
  if (!VALID_ROLES.includes(cleanRole)) throwError(`Rol invalido. Validos: ${VALID_ROLES.join(', ')}`, 400);

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = :email', { email: cleanEmail });
  if (existing.length) throwError('Ya existe un usuario con ese email.', 409);

  const hash = await bcrypt.hash(cleanPassword, 10);
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password_hash, role, store_id, active)
       VALUES (:name, :email, :hash, :role, :storeId, TRUE)`,
    { name: cleanName, email: cleanEmail, hash, role: cleanRole, storeId: store_id }
  );

  return getUser(result.insertId);
}

export async function updateUser(id, payload, currentUser) {
  const target = await getUser(id);
  if (!target) return null;

  const updates = {};
  if (payload.name != null) updates.name = String(payload.name).trim();
  if (payload.email != null) {
    const email = String(payload.email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throwError('Email invalido.', 400);
    if (email !== target.email) {
      const [dup] = await pool.execute('SELECT id FROM users WHERE email = :email AND id <> :id', { email, id });
      if (dup.length) throwError('Ya existe otro usuario con ese email.', 409);
    }
    updates.email = email;
  }
  if (payload.role != null) {
    if (!VALID_ROLES.includes(payload.role)) throwError('Rol invalido.', 400);
    // Evitar que un admin se quite a si mismo el rol de administrador.
    if (currentUser?.id === id && target.role === 'administrador' && payload.role !== 'administrador') {
      throwError('No podes quitarte tu propio rol de administrador.', 400);
    }
    updates.role = payload.role;
  }
  if (payload.store_id !== undefined) updates.store_id = payload.store_id;
  if (payload.active !== undefined) {
    // Evitar que un admin se desactive a si mismo.
    if (currentUser?.id === id && !payload.active) {
      throwError('No podes desactivar tu propio usuario.', 400);
    }
    updates.active = !!payload.active;
  }

  const fields = Object.keys(updates);
  if (!fields.length) return target;

  const setSql = fields.map((f) => `${f} = :${f}`).join(', ');
  await pool.execute(`UPDATE users SET ${setSql} WHERE id = :id`, { ...updates, id });
  return getUser(id);
}

export async function resetPassword(id, newPassword) {
  const target = await getUser(id);
  if (!target) return null;
  if (!newPassword || String(newPassword).length < 6) {
    throwError('La clave debe tener al menos 6 caracteres.', 400);
  }
  const hash = await bcrypt.hash(String(newPassword), 10);
  await pool.execute('UPDATE users SET password_hash = :hash WHERE id = :id', { hash, id });
  return getUser(id);
}

// Permite que un usuario cambie su propia clave verificando la actual.
export async function changeOwnPassword(userId, currentPassword, newPassword) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = :id', { id: userId });
  const user = rows[0];
  if (!user) return null;
  const ok = await bcrypt.compare(String(currentPassword || ''), user.password_hash);
  if (!ok) throwError('La clave actual no coincide.', 400);
  if (!newPassword || String(newPassword).length < 6) {
    throwError('La nueva clave debe tener al menos 6 caracteres.', 400);
  }
  const hash = await bcrypt.hash(String(newPassword), 10);
  await pool.execute('UPDATE users SET password_hash = :hash WHERE id = :id', { hash, id: userId });
  return getUser(userId);
}

function throwError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
