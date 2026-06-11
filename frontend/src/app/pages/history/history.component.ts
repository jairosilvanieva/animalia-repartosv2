import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Order } from '../../core/api.service';
import { orderDisplayNumber } from '../../shared/order-number';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="history">
      <div class="panel head">
        <div>
          <span class="eyebrow">Historial</span>
          <h1>Pedidos y rutas</h1>
          <p>Consulta el trabajo de una fecha sin mezclarlo con la operatoria del dia.</p>
        </div>
        <label>Fecha <input type="date" [(ngModel)]="date" (change)="load()" /></label>
      </div>

      <div class="summary">
        <div><strong>{{ orders().length }}</strong><span>Pedidos</span></div>
        <div><strong>{{ routes().length }}</strong><span>Rutas</span></div>
        <div><strong>{{ countByStatus('entregado') }}</strong><span>Entregados</span></div>
        <div><strong>{{ countByStatus('no_entregado') }}</strong><span>No entregados</span></div>
        <div><strong>{{ countByStatus('cancelado') }}</strong><span>Cancelados</span></div>
      </div>

      <div class="columns">
        <section class="panel list">
          <h2>Rutas</h2>
          <article class="row" *ngFor="let route of routes()">
            <div>
              <strong>{{ route.name }}</strong>
              <span>{{ statusLabel(route.status) }} - {{ route.stops_count || 0 }} paradas</span>
              <small>
                {{ route.delivered_count || 0 }} entregadas -
                {{ route.not_delivered_count || 0 }} no entregadas -
                {{ route.open_count || 0 }} abiertas
              </small>
            </div>
            <a [routerLink]="'/ruta/' + route.id">Ver</a>
          </article>
          <p class="empty" *ngIf="!routes().length">No hay rutas para esta fecha.</p>
        </section>

        <section class="panel list">
          <h2>Pedidos</h2>
          <article class="row order" *ngFor="let order of orders()" [ngClass]="'status-' + order.status">
            <div>
              <strong>{{ displayNumber(order) }} {{ order.customer_name }}</strong>
              <span>{{ order.address }}</span>
              <small>{{ order.products_summary || 'Sin productos cargados' }}</small>
              <small>{{ statusLabel(order.status) }} - Total $ {{ orderTotal(order) | number:'1.2-2' }}</small>
              <small *ngIf="order.payment_status === 'cobrado'">Pagado - no cobrar</small>
              <small *ngIf="order.payment_status !== 'cobrado'">No pagado - cobrar $ {{ order.amount_to_collect | number:'1.2-2' }}</small>
            </div>
          </article>
          <p class="empty" *ngIf="!orders().length">No hay pedidos para esta fecha.</p>
        </section>
      </div>
    </section>
  `,
  styles: [`
    h1, h2, p { margin: 0; }
    .history {
      display: grid;
      gap: 12px;
    }
    .panel, .summary {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      box-shadow: none;
    }
    .panel { color: var(--texto); }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
    }
    .head h1 { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
    .eyebrow {
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1px;
      overflow: hidden;
    }
    .summary div {
      display: grid;
      gap: 2px;
      padding: 12px;
      background: var(--panel);
    }
    .summary div { background: var(--panel); }
    .summary strong {
      color: var(--texto);
      font-size: 22px;
      font-weight: 700;
    }
    .summary span, p, small, .row span {
      color: var(--muted);
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .columns {
      display: grid;
      grid-template-columns: .85fr 1.15fr;
      gap: 12px;
      align-items: start;
    }
    .list {
      display: grid;
      gap: 8px;
      padding: 14px;
    }
    .list h2 { font-size: 14px; font-weight: 600; color: var(--texto); }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: var(--panel-2);
      color: var(--texto);
    }
    .row:hover { background: var(--panel-3); }
    .row div {
      display: grid;
      gap: 2px;
    }
    .row a {
      border-radius: 8px;
      background: var(--rojo);
      color: #fff;
      padding: 8px 10px;
      text-decoration: none;
      font-weight: 900;
    }
    .order.status-entregado { border-left: 3px solid var(--st-entregado); }
    .order.status-no_entregado { border-left: 3px solid var(--st-no_entregado); }
    .order.status-cancelado { border-left: 3px solid var(--st-cancelado); }
    .order.status-en_camino { border-left: 3px solid var(--st-en_camino); }
    .order.status-pendiente { border-left: 3px solid var(--st-pendiente); }
    .empty {
      padding: 10px;
      text-align: center;
    }
    @media (max-width: 820px) {
      .head { align-items: stretch; flex-direction: column; }
      .summary { grid-template-columns: 1fr 1fr; }
      .columns { grid-template-columns: 1fr; }
      .row { align-items: stretch; flex-direction: column; }
    }
  `]
})
export class HistoryComponent implements OnInit {
  date = new Date().toISOString().slice(0, 10);
  orders = signal<Order[]>([]);
  routes = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.listOrders({ date: this.date, status: 'todos' }).subscribe((orders) => this.orders.set(orders));
    // Solo mostrar rutas cerradas en historial.
    this.api.listRoutes({ route_date: this.date, status: 'finalizada' }).subscribe((fin) => {
      this.api.listRoutes({ route_date: this.date, status: 'cancelada' }).subscribe((can) => {
        this.routes.set([...fin, ...can]);
      });
    });
  }

  displayNumber(order: Order) {
    return orderDisplayNumber(order as any);
  }

  countByStatus(status: string) {
    return this.orders().filter((order) => order.status === status).length;
  }

  orderTotal(order: Order) {
    return Number(order.total || order.amount_to_collect || 0);
  }

  statusLabel(status?: string) {
    const labels: Record<string, string> = {
      borrador: 'Preparada',
      activa: 'Activa',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada',
      pendiente: 'Pendiente',
      en_camino: 'En camino',
      entregado: 'Entregado',
      no_entregado: 'No entregado',
      cancelado: 'Cancelado'
    };
    return labels[status || ''] || status || 'Sin estado';
  }
}
