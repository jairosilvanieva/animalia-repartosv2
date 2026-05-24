import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const [users] = await pool.execute('SELECT * FROM users WHERE email = :email AND active = TRUE', { email: input.email });
  const user = users[0];

  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    return res.status(401).json({ error: 'Credenciales invalidas.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, store_id: user.store_id },
    env.jwtSecret,
    { expiresIn: '12h' }
  );

  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

export default router;
