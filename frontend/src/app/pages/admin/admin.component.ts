import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Order } from '../../core/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid">
      <div class="panel header">
        <div>
          <h1>Pedidos del dia</h1>
          <p>Filtra, selecciona y arma la ruta diaria de la camioneta.</p>
        </div>
        <button (click)="load()">Actualizar</button>
      </div>

      <div class="panel filters">
        <label>Fecha <input type="date" [(ngModel)]="filters.date" /></label>
        <label>Estado
          <select [(ngModel)]="filters.status">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_preparacion">En preparacion</option>
            <option value="listo_para_repartir">Listo para repartir</option>
            <option value="en_camino">En camino</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
            <option value="no_entregado">No entregado</option>
          </select>
        </label>
        <button (click)="load()">Aplicar</button>
      </div>

      <div class="panel route-actions">
        <strong>{{ selected.size }} pedidos seleccionados</strong>
        <button [disabled]="!selected.size" (click)="createRoute()">Armar ruta recomendada</button>
        <a *ngIf="routeId()" [href]="'/chofer/' + routeId()">Abrir vista chofer</a>
      </div>

      <article class="order" *ngFor="let order of orders()">
        <input type="checkbox" [checked]="selected.has(order.id)" (change)="toggle(order.id)" />
        <div>
          <strong>#{{ order.id }} {{ order.customer_name }}</strong>
          <span>{{ order.address }}</span>
          <small>{{ order.store_name || 'Sin local' }} · {{ order.payment_method || 'Sin pago' }} · {{ order.status }}</small>
        </div>
        <div class="right">
          <div class="amount">$ {{ order.amount_to_collect || 0 }}</div>
          <button class="secondary" *ngIf="order.status !== 'listo_para_repartir'" (click)="markReady(order)">Listo</button>
        </div>
      </article>
    </section>
  `,
  styles: [`
    h1, p { margin: 0; }
    p, small, span { color: var(--muted); }
    .header, .filters, .route-actions {
      display: flex;
      gap: 1rem;
      align-items: end;
      justify-content: space-between;
    }
    .filters {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
    }
    .order {
      display: grid;
      grid-template-columns: 24px 1fr auto;
      gap: 0.75rem;
      align-items: center;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0.85rem;
    }
    .order div:nth-child(2) {
      display: grid;
      gap: 0.2rem;
    }
    .amount {
      font-weight: 700;
    }
    .right {
      display: grid;
      gap: 0.45rem;
      justify-items: end;
    }
    a {
      color: var(--brand-dark);
      font-weight: 700;
    }
    @media (max-width: 760px) {
      .header, .route-actions {
        align-items: stretch;
        flex-direction: column;
      }
      .filters {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminComponent implements OnInit {
  orders = signal<Order[]>([]);
  routeId = signal<number | null>(null);
  selected = new Set<number>();
  filters = { date: new Date().toISOString().slice(0, 10), status: '' };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.listOrders(this.filters).subscribe((orders) => this.orders.set(orders));
  }

  toggle(id: number) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }

  createRoute() {
    this.api.createRoute({
      route_date: this.filters.date,
      name: `Reparto ${this.filters.date}`,
      order_ids: Array.from(this.selected)
    }).subscribe((route) => this.routeId.set(route.id));
  }

  markReady(order: Order) {
    this.api.updateOrder(order.id, { status: 'listo_para_repartir' }).subscribe(() => this.load());
  }
}
