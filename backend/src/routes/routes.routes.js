import { Router } from 'express';
import { z } from 'zod';
import { allowRoles, authenticate } from '../middleware/auth.js';
import { addStopsToRoute, claimRoute, createRoute, deleteRoute, finishRoute, getRoute, listRoutes, removeStop, reorderStops, startRoute, updateStop } from '../services/routeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const createRouteSchema = z.object({
  name: z.string().optional(),
  route_date: z.string().min(1),
  driver_id: z.coerce.number().optional(),
  order_ids: z.array(z.coerce.number()).min(1)
});

const STAFF = ['administrador', 'local'];
const ALL = ['administrador', 'local', 'chofer'];

router.post('/', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const input = createRouteSchema.parse(req.body);
  res.status(201).json(await createRoute(input));
}));

// Listado: lo pueden ver todos, pero filtramos por rol del usuario.
router.get('/', authenticate, allowRoles(...ALL), asyncHandler(async (req, res) => {
  res.json(await listRoutes({
    route_date: req.query.route_date,
    status: req.query.status,
    driver_view: req.query.driver_view,
    current_user: req.user
  }));
}));

router.get('/:id', authenticate, allowRoles(...ALL), asyncHandler(async (req, res) => {
  const route = await getRoute(Number(req.params.id));
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada.' });
  return res.json(route);
}));

router.post('/:id/start', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const route = await startRoute(Number(req.params.id));
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada.' });
  return res.json(route);
}));

router.post('/:id/finish', authenticate, allowRoles(...ALL), asyncHandler(async (req, res) => {
  const route = await finishRoute(Number(req.params.id), req.user);
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada.' });
  return res.json(route);
}));

// Chofer toma una ruta activa para empezar a trabajarla.
router.post('/:id/claim', authenticate, allowRoles('chofer'), asyncHandler(async (req, res) => {
  const route = await claimRoute(Number(req.params.id), req.user);
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada.' });
  return res.json(route);
}));

router.patch('/:routeId/stops/:stopId', authenticate, allowRoles(...ALL), asyncHandler(async (req, res) => {
  res.json(await updateStop(Number(req.params.routeId), Number(req.params.stopId), req.body, req.user));
}));

router.post('/:id/stops', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const orderIds = z.array(z.coerce.number()).min(1).parse(req.body?.order_ids);
  const route = await addStopsToRoute(Number(req.params.id), orderIds);
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada.' });
  return res.json(route);
}));

router.patch('/:id/reorder', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const stopIds = z.array(z.coerce.number()).min(1).parse(req.body?.stop_ids);
  const route = await reorderStops(Number(req.params.id), stopIds);
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada.' });
  return res.json(route);
}));

router.delete('/:id', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const ok = await deleteRoute(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Ruta no encontrada o no eliminable.' });
  return res.status(204).end();
}));

// Sacar una parada (pedido) de una ruta en borrador.
router.delete('/:routeId/stops/:stopId', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const route = await removeStop(Number(req.params.routeId), Number(req.params.stopId));
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada.' });
  return res.json(route);
}));

export default router;
