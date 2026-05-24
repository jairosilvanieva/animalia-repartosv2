import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createRoute, getRoute, updateStop } from '../services/routeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const createRouteSchema = z.object({
  name: z.string().optional(),
  route_date: z.string().min(1),
  driver_id: z.coerce.number().optional(),
  order_ids: z.array(z.coerce.number()).min(1)
});

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const input = createRouteSchema.parse(req.body);
  res.status(201).json(await createRoute(input));
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const route = await getRoute(Number(req.params.id));
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada.' });
  return res.json(route);
}));

router.patch('/:routeId/stops/:stopId', authenticate, asyncHandler(async (req, res) => {
  res.json(await updateStop(Number(req.params.routeId), Number(req.params.stopId), req.body));
}));

export default router;
