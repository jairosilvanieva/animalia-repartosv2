import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const locationSchema = z.object({
  route_id: z.coerce.number().optional(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  accuracy: z.coerce.number().optional()
});

router.post('/location', authenticate, asyncHandler(async (req, res) => {
  const input = locationSchema.parse(req.body);
  await pool.execute(
    `INSERT INTO vehicle_locations (route_id, driver_id, latitude, longitude, accuracy)
     VALUES (:routeId, :driverId, :latitude, :longitude, :accuracy)`,
    {
      routeId: input.route_id || null,
      driverId: req.user.id,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy || null
    }
  );
  res.status(201).json({ ok: true });
}));

router.get('/latest', authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT * FROM vehicle_locations ORDER BY recorded_at DESC LIMIT 1`
  );
  res.json(rows[0] || null);
}));

export default router;
