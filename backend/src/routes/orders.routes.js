import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authenticateInternalApi } from '../middleware/auth.js';
import { createManualOrder, createWooCommerceOrder, getOrder, listOrders, updateOrder } from '../services/orderService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const manualOrderSchema = z.object({
  cliente: z.string().min(1),
  fecha_reparto: z.string().optional(),
  telefono: z.string().optional(),
  domicilio: z.string().min(1),
  entre_calles: z.string().optional(),
  productos: z.union([z.string(), z.array(z.any())]).optional(),
  forma_pago: z.string().optional(),
  importe_a_cobrar: z.coerce.number().optional(),
  rango_horario_desde: z.string().optional(),
  rango_horario_hasta: z.string().optional(),
  observaciones: z.string().optional(),
  estado: z.string().optional()
});

const wooOrderSchema = z.object({
  order_id: z.coerce.number(),
  order_number: z.string().optional(),
  fecha: z.string().optional(),
  fecha_reparto: z.string().optional(),
  nombre_cliente: z.string().min(1),
  telefono: z.string().optional(),
  dni: z.string().optional(),
  productos: z.array(z.any()).default([]),
  metodo_pago: z.string().optional(),
  subtotal: z.coerce.number().optional(),
  descuentos: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  modalidad_envio: z.string().optional(),
  direccion_envio: z.string().min(1),
  ciudad: z.string().optional(),
  codigo_postal: z.string().optional(),
  nota: z.string().optional(),
  estado_woocommerce: z.string().optional(),
  requiere_corroborrar_pago: z.boolean().default(false),
  origen: z.literal('woocommerce')
});

router.get('/', authenticate, asyncHandler(async (req, res) => {
  res.json(await listOrders(req.query));
}));

router.post('/manual', authenticate, asyncHandler(async (req, res) => {
  const input = manualOrderSchema.parse(req.body);
  res.status(201).json(await createManualOrder(input));
}));

router.post('/from-woocommerce', authenticateInternalApi, asyncHandler(async (req, res) => {
  const input = wooOrderSchema.parse(req.body);
  const order = await createWooCommerceOrder(input);
  res.status(201).json(order);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const order = await getOrder(Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  return res.json(order);
}));

router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const order = await updateOrder(Number(req.params.id), req.body);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  return res.json(order);
}));

export default router;
