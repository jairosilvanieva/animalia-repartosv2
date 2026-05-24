import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Order } from '../../core/api.service';

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
              <strong>#{{ order.id }} {{ order.customer_name }}</strong>
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
      background: #fff;
      border: 1.5px solid var(--gris-l);
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(154, 15, 8, .06);
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
    }
    .head h1 {
      font-size: 26px;
      font-weight: 900;
    }
    .eyebrow {
      color: var(--rojo);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .8px;
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
      background: #fff;
    }
    .summary strong {
      color: var(--rojo);
      font-size: 24px;
      font-weight: 900;
    }
    .summary span, p, small, .row span {
      color: var(--gris);
      font-weight: 700;
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
    .list h2 {
      font-size: 18px;
      font-weight: 900;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border: 1.5px solid var(--gris-l);
      border-radius: 10px;
      padding: 10px;
      background: #fff;
    }
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
    .order.status-entregado { background: #f0fdf4; }
    .order.status-no_entregado { background: #fefce8; }
    .order.status-cancelado { background: #fef2f2; }
    .order.status-en_camino { background: #eff6ff; }
    .order.status-pendiente { background: #fffaf0; }
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
    this.api.listRoutes({ route_date: this.date }).subscribe((routes) => this.routes.set(routes));
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
