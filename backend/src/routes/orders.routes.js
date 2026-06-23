import { Router } from 'express';
import { z } from 'zod';
import { allowRoles, authenticate, authenticateInternalApi } from '../middleware/auth.js';
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
  total: z.coerce.number().optional(),
  importe_a_cobrar: z.coerce.number().optional(),
  pagado: z.boolean().default(false),
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
  direccion_envio: z.string().default('Retiro en local'),
  ciudad: z.string().optional(),
  codigo_postal: z.string().optional(),
  nota: z.string().optional(),
  estado_woocommerce: z.string().optional(),
  requiere_corroborrar_pago: z.boolean().default(false),
  pagado: z.boolean().default(false),
  tipo: z.enum(['reparto', 'retiro']).default('reparto'),
  origen: z.literal('woocommerce')
});

const STAFF = ['administrador', 'local'];

router.get('/', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  res.json(await listOrders(req.query));
}));

router.post('/manual', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const input = manualOrderSchema.parse(req.body);
  // Si el usuario tiene store_id (operador de local), lo usamos aunque el payload traiga otro.
  if (req.user?.store_id) input.store_id = req.user.store_id;
  res.status(201).json(await createManualOrder(input));
}));

router.post('/from-woocommerce', authenticateInternalApi, asyncHandler(async (req, res) => {
  const input = wooOrderSchema.parse(req.body);

  const modalidad = String(input.modalidad_envio || '').toLowerCase();
  const esRetiro = input.tipo === 'retiro' || modalidad.includes('retiro') || modalidad.includes('sucursal');

  if (!esRetiro) {
    // Solo para repartos: bloquear envíos fuera de MDP (CPs no empiezan con 76).
    const cp = String(input.codigo_postal || '').replace(/^B?/i, '').trim();
    if (cp && !/^76\d{2}$/.test(cp)) {
      return res.status(200).json({ skipped: true, reason: 'fuera_mdp', message: `Pedido omitido: CP ${cp} fuera de Mar del Plata.` });
    }
  }

  // Normalizar tipo según modalidad en caso de que el snippet no lo mande explícito.
  if (esRetiro) input.tipo = 'retiro';

  const order = await createWooCommerceOrder(input);
  res.status(201).json(order);
}));

router.get('/:id', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const order = await getOrder(Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  return res.json(order);
}));

router.patch('/:id', authenticate, allowRoles(...STAFF), asyncHandler(async (req, res) => {
  const order = await updateOrder(Number(req.params.id), req.body);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  return res.json(order);
}));

export default router;
