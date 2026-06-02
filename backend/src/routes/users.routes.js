import { Router } from 'express';
import { allowRoles, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  changeOwnPassword,
  createUser,
  getUser,
  listUsers,
  resetPassword,
  updateUser
} from '../services/userService.js';

const router = Router();

// Listar todos los usuarios — solo administrador.
router.get('/', authenticate, allowRoles('administrador'), asyncHandler(async (req, res) => {
  res.json(await listUsers());
}));

// Ver un usuario puntual — solo administrador.
router.get('/:id', authenticate, allowRoles('administrador'), asyncHandler(async (req, res) => {
  const user = await getUser(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json(user);
}));

// Crear usuario nuevo — solo administrador.
router.post('/', authenticate, allowRoles('administrador'), asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  res.status(201).json(user);
}));

// Editar datos / rol / activacion — solo administrador.
router.patch('/:id', authenticate, allowRoles('administrador'), asyncHandler(async (req, res) => {
  const user = await updateUser(Number(req.params.id), req.body, req.user);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json(user);
}));

// Resetear contrasena de cualquier usuario — solo administrador.
router.post('/:id/reset-password', authenticate, allowRoles('administrador'), asyncHandler(async (req, res) => {
  const user = await resetPassword(Number(req.params.id), req.body?.password);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json(user);
}));

// Cambiar la propia contrasena — cualquier usuario autenticado.
router.post('/me/change-password', authenticate, asyncHandler(async (req, res) => {
  const user = await changeOwnPassword(req.user.id, req.body?.current_password, req.body?.new_password);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json({ ok: true });
}));

export default router;
