import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const messageSchema = z.object({
  order_id: z.coerce.number().optional(),
  message: z.string().min(1)
});

router.get('/:routeId', authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT cm.*, u.name AS sender_name
     FROM chat_messages cm
     LEFT JOIN users u ON u.id = cm.sender_id
     WHERE cm.route_id = :routeId
     ORDER BY cm.created_at ASC`,
    { routeId: Number(req.params.routeId) }
  );
  res.json(rows);
}));

router.post('/:routeId', authenticate, asyncHandler(async (req, res) => {
  const input = messageSchema.parse(req.body);
  const [result] = await pool.execute(
    `INSERT INTO chat_messages (route_id, order_id, sender_id, message)
     VALUES (:routeId, :orderId, :senderId, :message)`,
    {
      routeId: Number(req.params.routeId),
      orderId: input.order_id || null,
      senderId: req.user.id,
      message: input.message
    }
  );
  res.status(201).json({ id: result.insertId, ...input });
}));

export default router;
