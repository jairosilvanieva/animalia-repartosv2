import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Order } from '../../core/api.service';
import { PAYMENT_METHODS } from '../../shared/payment-methods';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dash">
      <div class="hero">
        <div>
          <span class="eyebrow">Operacion diaria</span>
          <h1>Pedidos ordenados por cercania al local</h1>
          <p>Primero ves los mas cercanos a Sarmiento 2790. La lista se actualiza sola.</p>
        </div>
        <button (click)="load()">Actualizar</button>
      </div>

      <div class="toolbar">
        <label>Fecha de reparto <input type="date" [(ngModel)]="filters.date" /></label>
        <label>Buscar
          <input
            name="search"
            placeholder="Cliente, telefono o domicilio"
            [(ngModel)]="filters.search"
            (keyup.enter)="load()"
          />
        </label>
        <label>Estado
          <select [(ngModel)]="filters.status">
            <option value="">Activos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_camino">En camino</option>
            <option value="no_entregado">No entregado</option>
            <option value="finalizados">Finalizados</option>
          </select>
        </label>
        <button (click)="load()">Aplicar</button>
      </div>

      <div class="quick-filters">
        <button
          type="button"
          *ngFor="let option of quickFilters"
          [class.active]="filters.status === option.value"
          (click)="setStatus(option.value)"
        >
          {{ option.label }}
        </button>
        <span>{{ orders().length }} pedidos visibles</span>
      </div>

      <div class="route-bar">
        <div>
          <strong>{{ selected.size }} seleccionados</strong>
          <span>Marca solo los pedidos que salen en esta tanda. Podes armar varias rutas en el dia.</span>
        </div>
        <button [disabled]="!selected.size" (click)="createRoute()">Armar ruta recomendada</button>
        <span class="message" *ngIf="message()">{{ message() }}</span>
      </div>

      <article class="order" *ngFor="let order of orders()" [class.priority]="order.priority" [ngClass]="'status-' + order.status">
        <span class="status-dot" [class]="'status-dot dot-' + order.status"></span>
        <input type="checkbox" [checked]="selected.has(order.id)" (change)="toggle(order.id)" />
        <button class="order-main" type="button" (click)="openEdit(order)">
          <span class="order-title">#{{ order.id }} {{ order.customer_name }}</span>
          <span>{{ order.address }}</span>
          <small class="product-line" *ngIf="productSummary(order)">{{ productSummary(order) }}</small>
          <small>
            Base Sarmiento 2790 - {{ order.payment_method || 'Sin pago' }} -
            {{ statusLabel(order.status) }}
          </small>
          <small>
            {{ deliveryDateLabel(order) }} - Horario: {{ timeLabel(order) }}
          </small>
        </button>
        <div class="right">
          <div class="amount">$ {{ order.amount_to_collect || 0 }}</div>
          <span class="badge">{{ statusLabel(order.status) }}</span>
        </div>
      </article>

      <div class="empty" *ngIf="!orders().length">
        No hay pedidos para los filtros seleccionados.
      </div>

      <div class="drawer-bg" *ngIf="editing()" (click)="closeEdit()"></div>
      <aside class="drawer" *ngIf="editing() as order">
        <form (ngSubmit)="saveEdit()">
          <div class="drawer-head">
            <div>
              <span class="eyebrow">Pedido #{{ order.id }}</span>
              <h2>Editar pedido</h2>
            </div>
            <button class="icon" type="button" (click)="closeEdit()">X</button>
          </div>

          <div class="status-actions">
            <button type="button" *ngFor="let status of editStatuses" [class.active]="editModel.status === status.value" (click)="editModel.status = status.value">
              {{ status.label }}
            </button>
          </div>

          <div class="section-title"><span>Entrega</span><hr /></div>
          <div class="form-grid">
            <label>Fecha de reparto <input type="date" name="scheduled_delivery_date" [(ngModel)]="editModel.scheduled_delivery_date" /></label>
            <label>Domicilio <input name="address" [(ngModel)]="editModel.address" /></label>
            <label>Entre calles <input name="between_streets" [(ngModel)]="editModel.between_streets" /></label>
            <label>Desde <input type="time" name="time_window_start" [(ngModel)]="editModel.time_window_start" /></label>
            <label>Hasta <input type="time" name="time_window_end" [(ngModel)]="editModel.time_window_end" /></label>
          </div>

          <div class="section-title"><span>Cliente</span><hr /></div>
          <div class="form-grid">
            <label>Cliente <input name="customer_name" [(ngModel)]="editModel.customer_name" /></label>
            <label>Telefono <input name="phone" [(ngModel)]="editModel.phone" /></label>
            <label>DNI <input name="dni" [(ngModel)]="editModel.dni" /></label>
          </div>

          <div class="contact-actions" *ngIf="editModel.phone">
            <a [href]="'tel:' + editModel.phone">Llamar</a>
            <a [href]="whatsappUrl(editModel)" target="_blank">WhatsApp</a>
          </div>

          <div class="section-title"><span>Pedido y pago</span><hr /></div>
          <div class="form-grid">
            <label>Forma de pago
              <select name="payment_method" [(ngModel)]="editModel.payment_method">
                <option value="">Sin definir</option>
                <option *ngFor="let method of paymentMethods" [value]="method">{{ method }}</option>
              </select>
            </label>
            <label>Importe a cobrar <input type="number" name="amount_to_collect" [(ngModel)]="editModel.amount_to_collect" /></label>
          </div>

          <div class="product-editor">
            <div class="product-editor-head">
              <strong>Productos</strong>
              <button type="button" class="secondary" (click)="addEditItem()">Agregar producto</button>
            </div>
            <div class="product-row" *ngFor="let item of editItems; let i = index">
              <label>Cantidad
                <input type="number" min="1" step="1" [name]="'edit_item_qty_' + i" [(ngModel)]="item.quantity" />
              </label>
              <label>Producto
                <input [name]="'edit_item_name_' + i" [(ngModel)]="item.product_name" />
              </label>
              <button type="button" class="remove" (click)="removeEditItem(i)" [disabled]="editItems.length === 1">Eliminar</button>
            </div>
          </div>

          <label>Observaciones internas
            <textarea rows="4" name="internal_notes" [(ngModel)]="editModel.internal_notes"></textarea>
          </label>

          <label class="check">
            <input type="checkbox" name="priority" [(ngModel)]="editModel.priority" />
            Pedido prioritario
          </label>

          <div class="drawer-actions">
            <button type="submit">Guardar cambios</button>
            <button class="secondary" type="button" (click)="closeEdit()">Cancelar</button>
          </div>
        </form>
      </aside>
    </section>
  `,
  styles: [`
    h1, h2, p { margin: 0; }
    .dash { display: grid; gap: 9px; }
    .hero, .toolbar, .quick-filters, .route-bar, .order, .empty {
      background: #fff;
      border: 1.5px solid var(--gris-l);
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(154, 15, 8, .06);
    }
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 13px 16px;
    }
    .hero h1 {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: .2px;
    }
    .hero p, small, .route-bar span { color: var(--gris); font-weight: 600; }
    .product-line {
      color: var(--texto);
      font-weight: 800;
    }
    .eyebrow {
      color: var(--rojo);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .8px;
      text-transform: uppercase;
    }
    .toolbar {
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr auto;
      gap: 12px;
      align-items: end;
      padding: 10px 12px;
    }
    .quick-filters {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 12px;
    }
    .quick-filters button {
      padding: 8px 10px;
      border-radius: 8px;
      background: #f8fafc;
      color: var(--texto);
      border: 1.5px solid var(--gris-l);
      font-size: 13px;
    }
    .quick-filters button.active {
      background: var(--rojo);
      color: #fff;
      border-color: var(--rojo);
    }
    .quick-filters span {
      margin-left: auto;
      color: var(--gris);
      font-size: 13px;
      font-weight: 900;
    }
    .route-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
    }
    .route-bar div { display: grid; gap: 2px; }
    .order {
      display: grid;
      grid-template-columns: 10px 24px 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 8px 12px;
      border-left: 5px solid transparent;
    }
    .order.priority { border-left-color: var(--naranja); }
    .order.status-pendiente { background: #fffaf0; }
    .order.status-en_camino { background: #eff6ff; }
    .order.status-entregado { background: #f0fdf4; }
    .order.status-no_entregado { background: #fefce8; }
    .order.status-cancelado { background: #fef2f2; }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: block;
    }
    .dot-pendiente { background: var(--naranja); }
    .dot-en_camino { background: #38bdf8; }
    .dot-entregado { background: #22c55e; }
    .dot-no_entregado { background: #eab308; }
    .dot-cancelado { background: var(--rojo); }
    .order-main {
      display: grid;
      gap: 1px;
      text-align: left;
      padding: 0;
      background: transparent;
      color: var(--texto);
    }
    .order-main:hover .order-title { color: var(--rojo); }
    .order-title { font-weight: 900; font-size: 14px; }
    .right {
      display: grid;
      gap: 6px;
      justify-items: end;
    }
    .amount {
      font-size: 14px;
      color: var(--rojo);
      font-weight: 900;
    }
    .badge {
      border-radius: 6px;
      padding: 2px 6px;
      background: #f3f4f6;
      color: #374151;
      font-size: 10px;
      font-weight: 800;
    }
    a {
      color: var(--rojo);
      font-weight: 900;
      text-decoration: none;
    }
    .message {
      color: var(--rojo-d);
      font-weight: 800;
    }
    .empty {
      color: var(--gris);
      font-weight: 900;
      padding: 18px;
      text-align: center;
    }
    .drawer-bg {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, .45);
      z-index: 20;
    }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 21;
      width: min(520px, 100vw);
      background: #fff;
      box-shadow: -8px 0 30px rgba(0, 0, 0, .18);
      overflow-y: auto;
    }
    .drawer form {
      display: grid;
      gap: 14px;
      padding: 16px;
    }
    .drawer-head {
      display: flex;
      justify-content: space-between;
      align-items: start;
      padding-bottom: 10px;
      border-bottom: 1.5px solid var(--gris-l);
    }
    .drawer-head h2 {
      font-size: 22px;
      font-weight: 900;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }
    .section-title span {
      background: var(--rojo);
      color: #fff;
      border-radius: 5px;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .section-title hr {
      flex: 1;
      border: 0;
      border-top: 2px solid var(--gris-l);
    }
    .status-actions, .contact-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .status-actions button, .contact-actions a {
      border-radius: 8px;
      border: 1.5px solid var(--gris-l);
      background: #f8fafc;
      color: var(--texto);
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 900;
      text-decoration: none;
    }
    .status-actions button.active {
      background: var(--rojo);
      border-color: var(--rojo);
      color: #fff;
    }
    .product-editor {
      display: grid;
      gap: 8px;
      padding: 10px;
      border-radius: 10px;
      border: 1.5px solid var(--gris-l);
      background: #f8fafc;
    }
    .product-editor-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .product-editor strong {
      font-size: 13px;
      font-weight: 900;
    }
    .product-row {
      display: grid;
      grid-template-columns: 84px 1fr auto;
      gap: 8px;
      align-items: end;
    }
    .product-row .remove {
      background: #fff;
      border: 1.5px solid var(--gris-l);
      color: var(--rojo);
      padding: 10px 12px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--texto);
      font-weight: 800;
    }
    .check input {
      width: auto;
      accent-color: var(--rojo);
    }
    .drawer-actions {
      display: flex;
      gap: 10px;
      position: sticky;
      bottom: 0;
      background: #fff;
      padding-top: 10px;
      border-top: 1.5px solid var(--gris-l);
    }
    .icon {
      width: 34px;
      height: 34px;
      padding: 0;
      border-radius: 50%;
    }
    @media (max-width: 760px) {
      .hero, .route-bar { align-items: stretch; flex-direction: column; }
      .toolbar, .form-grid { grid-template-columns: 1fr; }
      .product-row { grid-template-columns: 1fr; }
      .quick-filters span { margin-left: 0; width: 100%; }
      .order { grid-template-columns: 10px 24px 1fr; }
      .right { grid-column: 3; justify-items: start; }
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  orders = signal<Order[]>([]);
  routeId = signal<number | null>(null);
  route = signal<any>(null);
  message = signal('');
  editing = signal<Order | null>(null);
  selected = new Set<number>();
  filters = { date: new Date().toISOString().slice(0, 10), status: '', search: '' };
  editModel: Partial<Order> = {};
  editItems: Array<{ product_name: string; quantity: number }> = [this.emptyItem()];
  paymentMethods = PAYMENT_METHODS;
  quickFilters = [
    { label: 'Todos activos', value: '' },
    { label: 'Pendientes', value: 'pendiente' },
    { label: 'En camino', value: 'en_camino' },
    { label: 'No entregados', value: 'no_entregado' },
    { label: 'Finalizados', value: 'finalizados' }
  ];
  editStatuses = [
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'En camino', value: 'en_camino' },
    { label: 'Entregado', value: 'entregado' },
    { label: 'No entregado', value: 'no_entregado' },
    { label: 'Cancelado', value: 'cancelado' }
  ];
  private refreshTimer?: number;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.load();
    this.refreshTimer = window.setInterval(() => this.load(false), 30000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer);
  }

  load(clearRoute = true) {
    this.api.listOrders(this.filters).subscribe((orders) => {
      this.orders.set(orders);
      const visible = new Set(orders.map((order) => order.id));
      this.selected.forEach((id) => {
        if (!visible.has(id)) this.selected.delete(id);
      });
      if (clearRoute) {
        this.routeId.set(null);
        this.route.set(null);
      }
    });
  }

  toggle(id: number) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }

  setStatus(status: string) {
    this.filters.status = status;
    this.load();
  }

  createRoute() {
    this.message.set('');
    this.api.createRoute({
      route_date: this.filters.date,
      name: `Reparto ${this.filters.date}`,
      order_ids: Array.from(this.selected)
    }).subscribe({
      next: (route) => {
        this.routeId.set(route.id);
        this.route.set(route);
        this.message.set('');
        this.router.navigateByUrl(`/ruta/${route.id}`);
      },
      error: (error) => {
        this.message.set(error.error?.error || 'No se pudo armar la ruta.');
      }
    });
  }

  openEdit(order: Order) {
    this.editing.set(order);
    this.prepareEdit(order);
    this.api.getOrder(order.id).subscribe((fullOrder) => {
      this.editing.set(fullOrder);
      this.prepareEdit(fullOrder);
    });
  }

  closeEdit() {
    this.editing.set(null);
    this.editModel = {};
    this.editItems = [this.emptyItem()];
  }

  saveEdit() {
    const order = this.editing();
    if (!order) return;

    this.api.updateOrder(order.id, {
      ...this.editModel,
      amount_to_collect: Number(this.editModel.amount_to_collect || 0),
      items: this.productsPayload(),
      store_id: 2,
      time_condition: ''
    }).subscribe(() => {
      this.closeEdit();
      this.load();
    });
  }

  whatsappUrl(order: Partial<Order>) {
    const message = `Hola ${order.customer_name || ''}, somos de Animalia. Te escribimos por tu pedido.`;
    return `https://wa.me/${this.cleanPhone(order.phone || '')}?text=${encodeURIComponent(message)}`;
  }

  productSummary(order: Order) {
    if (!order.products_summary) return '';
    const summary = order.products_summary.length > 90
      ? `${order.products_summary.slice(0, 90)}...`
      : order.products_summary;
    const count = Number(order.items_count || 0);
    return count > 1 ? `${count} productos: ${summary}` : summary;
  }

  statusLabel(status?: string) {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      en_camino: 'En camino',
      entregado: 'Entregado',
      no_entregado: 'No entregado',
      cancelado: 'Cancelado'
    };
    return labels[status || ''] || status || 'Sin estado';
  }

  timeLabel(order: Order) {
    const start = this.shortTime(order.time_window_start);
    const end = this.shortTime(order.time_window_end);
    if (start && end) return `${start} a ${end}`;
    if (start) return `desde ${start}`;
    if (end) return `hasta ${end}`;
    return 'Sin rango horario';
  }

  deliveryDateLabel(order: Order) {
    const value = this.dateOnly(order.scheduled_delivery_date);
    return value ? `Reparto: ${value}` : `Reparto: ${this.filters.date}`;
  }

  private prepareEdit(order: Order) {
    this.editModel = {
      ...order,
      scheduled_delivery_date: this.dateOnly(order.scheduled_delivery_date) || this.filters.date,
      time_window_start: this.shortTime(order.time_window_start),
      time_window_end: this.shortTime(order.time_window_end)
    };
    this.editItems = (order.items || []).length
      ? (order.items || []).map((item) => ({
        product_name: item.product_name,
        quantity: Number(item.quantity || 1)
      }))
      : [this.emptyItem()];
  }

  private productsPayload() {
    return this.editItems
      .map((item) => ({
        product_name: String(item.product_name || '').trim(),
        quantity: Number(item.quantity || 1),
        unit_price: 0,
        total: 0
      }))
      .filter((item) => item.product_name);
  }

  addEditItem() {
    this.editItems = [...this.editItems, this.emptyItem()];
  }

  removeEditItem(index: number) {
    if (this.editItems.length === 1) return;
    this.editItems = this.editItems.filter((_, itemIndex) => itemIndex !== index);
  }

  private emptyItem() {
    return { product_name: '', quantity: 1 };
  }

  private cleanPhone(value: string) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('54')) return digits;
    if (digits.startsWith('0')) return `54${digits.slice(1)}`;
    return `54${digits}`;
  }

  private shortTime(value?: string) {
    return value ? value.slice(0, 5) : '';
  }

  private dateOnly(value?: string) {
    return value ? value.slice(0, 10) : '';
  }

}
