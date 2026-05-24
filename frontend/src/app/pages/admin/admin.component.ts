import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Order } from '../../core/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dash">
      <div class="hero">
        <div>
          <span class="eyebrow">Operacion diaria</span>
          <h1>Pedidos del dia</h1>
          <p>Filtra por fecha de reparto, corrige pedidos y arma tandas chicas para la camioneta.</p>
        </div>
        <button (click)="load()">Actualizar</button>
      </div>

      <div class="toolbar">
        <label>Fecha de reparto <input type="date" [(ngModel)]="filters.date" /></label>
        <label>Estado
          <select [(ngModel)]="filters.status">
            <option value="">Activos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_preparacion">En preparacion</option>
            <option value="listo_para_repartir">Listo para repartir</option>
            <option value="en_camino">En camino</option>
            <option value="finalizados">Finalizados</option>
          </select>
        </label>
        <button (click)="load()">Aplicar</button>
      </div>

      <div class="route-bar">
        <div>
          <strong>{{ selected.size }} seleccionados</strong>
          <span>Marca solo los pedidos que salen en esta tanda. Podes armar varias rutas en el dia.</span>
        </div>
        <button [disabled]="!selected.size" (click)="createRoute()">Armar ruta recomendada</button>
        <a *ngIf="route()" [href]="mapsRouteUrl(route())" target="_blank">Ver ruta en Maps</a>
        <a *ngIf="routeId()" [href]="'/chofer/' + routeId()">Abrir vista chofer</a>
        <span class="message" *ngIf="message()">{{ message() }}</span>
      </div>

      <article class="order" *ngFor="let order of orders()" [class.priority]="order.priority">
        <input type="checkbox" [checked]="selected.has(order.id)" (change)="toggle(order.id)" />
        <button class="order-main" type="button" (click)="openEdit(order)">
          <span class="order-title">#{{ order.id }} {{ order.customer_name }}</span>
          <span>{{ order.address }}</span>
          <small>
            Base Sarmiento 2790 - {{ order.payment_method || 'Sin pago' }} -
            {{ paymentLabel(order.payment_status) }} - {{ order.status }}
          </small>
          <small>
            {{ deliveryDateLabel(order) }} - Horario: {{ timeLabel(order) }}
          </small>
        </button>
        <div class="right">
          <div class="amount">$ {{ order.amount_to_collect || 0 }}</div>
          <span class="badge" [class.ready]="order.status === 'listo_para_repartir'">{{ order.status }}</span>
          <button class="secondary" *ngIf="order.status !== 'listo_para_repartir'" (click)="markReady(order)">Listo</button>
        </div>
      </article>

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

            <div class="form-grid">
            <label>Fecha de reparto <input type="date" name="scheduled_delivery_date" [(ngModel)]="editModel.scheduled_delivery_date" /></label>
            <label>Cliente <input name="customer_name" [(ngModel)]="editModel.customer_name" /></label>
            <label>Telefono <input name="phone" [(ngModel)]="editModel.phone" /></label>
            <label>DNI <input name="dni" [(ngModel)]="editModel.dni" /></label>
            <label>Domicilio <input name="address" [(ngModel)]="editModel.address" /></label>
            <label>Entre calles <input name="between_streets" [(ngModel)]="editModel.between_streets" /></label>
            <label>Forma de pago <input name="payment_method" [(ngModel)]="editModel.payment_method" /></label>
            <label>Pago
              <select name="payment_status" [(ngModel)]="editModel.payment_status">
                <option value="cobrado">Cobrado</option>
                <option value="a_cobrar">A cobrar</option>
                <option value="corroborar_pago">Corroborar pago</option>
              </select>
            </label>
            <label>Importe a cobrar <input type="number" name="amount_to_collect" [(ngModel)]="editModel.amount_to_collect" /></label>
            <label>Estado
              <select name="status" [(ngModel)]="editModel.status">
                <option value="pendiente">Pendiente</option>
                <option value="en_preparacion">En preparacion</option>
                <option value="listo_para_repartir">Listo para repartir</option>
                <option value="en_camino">En camino</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
                <option value="no_entregado">No entregado</option>
              </select>
            </label>
            <label>Desde <input type="time" name="time_window_start" [(ngModel)]="editModel.time_window_start" /></label>
            <label>Hasta <input type="time" name="time_window_end" [(ngModel)]="editModel.time_window_end" /></label>
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
    .hero, .toolbar, .route-bar, .order {
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
    .eyebrow {
      color: var(--rojo);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .8px;
      text-transform: uppercase;
    }
    .toolbar {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 12px;
      align-items: end;
      padding: 10px 12px;
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
      grid-template-columns: 24px 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 8px 12px;
      border-left: 5px solid transparent;
    }
    .order.priority { border-left-color: var(--naranja); }
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
    .badge.ready {
      background: #fef3c7;
      color: #92400e;
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
      .order { grid-template-columns: 24px 1fr; }
      .right { grid-column: 2; justify-items: start; }
    }
  `]
})
export class AdminComponent implements OnInit {
  orders = signal<Order[]>([]);
  routeId = signal<number | null>(null);
  route = signal<any>(null);
  message = signal('');
  editing = signal<Order | null>(null);
  selected = new Set<number>();
  filters = { date: new Date().toISOString().slice(0, 10), status: '' };
  editModel: Partial<Order> = {};

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.listOrders(this.filters).subscribe((orders) => {
      this.orders.set(orders);
      const visible = new Set(orders.map((order) => order.id));
      this.selected.forEach((id) => {
        if (!visible.has(id)) this.selected.delete(id);
      });
    });
  }

  toggle(id: number) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
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
      },
      error: (error) => {
        this.message.set(error.error?.error || 'No se pudo armar la ruta.');
      }
    });
  }

  markReady(order: Order) {
    this.api.updateOrder(order.id, { status: 'listo_para_repartir' }).subscribe(() => this.load());
  }

  openEdit(order: Order) {
    this.editing.set(order);
    this.editModel = {
      ...order,
      scheduled_delivery_date: this.dateOnly(order.scheduled_delivery_date) || this.filters.date,
      time_window_start: this.shortTime(order.time_window_start),
      time_window_end: this.shortTime(order.time_window_end)
    };
  }

  closeEdit() {
    this.editing.set(null);
    this.editModel = {};
  }

  saveEdit() {
    const order = this.editing();
    if (!order) return;

    this.api.updateOrder(order.id, {
      ...this.editModel,
      amount_to_collect: Number(this.editModel.amount_to_collect || 0),
      store_id: 2,
      time_condition: ''
    }).subscribe(() => {
      this.closeEdit();
      this.load();
    });
  }

  paymentLabel(status?: string) {
    if (status === 'cobrado') return 'cobrado';
    if (status === 'corroborar_pago') return 'corroborar pago';
    return 'a cobrar';
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

  mapsRouteUrl(route: any) {
    const stops = route?.stops || [];
    const origin = 'Sarmiento 2790, Mar del Plata, Buenos Aires';
    const destination = stops.length ? this.mapsAddress(stops[stops.length - 1].address) : origin;
    const waypoints = stops.slice(0, -1).map((stop: any) => this.mapsAddress(stop.address)).join('|');
    const params = new URLSearchParams({
      api: '1',
      origin,
      destination,
      travelmode: 'driving'
    });
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  private mapsAddress(address: string) {
    return `${address}, Mar del Plata, Buenos Aires`;
  }

  private shortTime(value?: string) {
    return value ? value.slice(0, 5) : '';
  }

  private dateOnly(value?: string) {
    return value ? value.slice(0, 10) : '';
  }

}
