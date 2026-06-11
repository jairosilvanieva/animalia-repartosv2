import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Order } from '../../core/api.service';
import { PAYMENT_METHODS } from '../../shared/payment-methods';
import { buildAnimaliaMessage, buildWhatsappUrl } from '../../shared/whatsapp';
import { addressForMapsQuery } from '../../shared/address';
import { orderDisplayNumber } from '../../shared/order-number';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dash">
      <header class="head">
        <div class="head-left">
          <h1>Pedidos</h1>
          <span class="counter">{{ orders().length }}</span>
          <span class="live" title="Refrescando cada 10 segundos">
            <span class="live-dot"></span>
            <span class="live-label">en vivo</span>
          </span>
        </div>
        <div class="head-right">
          <button class="ghost" (click)="load()" title="Actualizar ahora">↻</button>
        </div>
      </header>

      <div class="toolbar">
        <div class="field">
          <span class="ico">📅</span>
          <input type="date" [(ngModel)]="filters.date" (change)="load()" />
        </div>
        <div class="field grow">
          <span class="ico">⌕</span>
          <input
            name="search"
            placeholder="Buscar cliente, teléfono o domicilio…"
            [(ngModel)]="filters.search"
            (keyup.enter)="load()"
          />
        </div>
        <div class="chips">
          <button
            type="button"
            class="chip"
            *ngFor="let option of quickFilters"
            [class.active]="filters.status === option.value"
            (click)="setStatus(option.value)"
          >{{ option.label }}</button>
        </div>
      </div>

      <div class="route-bar" *ngIf="selected.size || message()">
        <div>
          <strong>{{ selected.size }} seleccionados</strong>
          <span>Marcá solo los pedidos que salen en esta tanda.</span>
        </div>
        <div class="route-actions">
          <select *ngIf="openRoutes().length" [(ngModel)]="addToRouteId" class="route-pick">
            <option [ngValue]="null">+ Agregar a ruta…</option>
            <option *ngFor="let r of openRoutes()" [ngValue]="r.id">
              #{{ r.id }} · {{ r.name }} · {{ r.status === 'activa' ? 'En camioneta' : 'Preparada' }}
            </option>
          </select>
          <button [disabled]="!selected.size || addToRouteId === null" class="secondary" *ngIf="openRoutes().length" (click)="addToExisting()">Agregar</button>
          <button [disabled]="!selected.size" (click)="createRoute()">Armar ruta →</button>
        </div>
        <span class="message" *ngIf="message()">{{ message() }}</span>
      </div>

      <div class="table-wrap">
        <table class="grid-table">
          <thead>
            <tr>
              <th class="col-check"></th>
              <th class="col-st"></th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Domicilio</th>
              <th class="map-col"></th>
              <th class="map-col"></th>
              <th>Tel</th>
              <th>Productos</th>
              <th>Hora</th>
              <th>Pago</th>
              <th class="num">Valor</th>
              <th class="num">A cobrar</th>
              <th>Estado</th>
              <th class="fact-col">Fact.</th>
              <th>Origen</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let order of orders()"
              [class.priority]="order.priority"
              [class.selected]="selected.has(order.id)"
              [class.in-route]="isInRoute(order)"
              [class.in-borrador]="order.current_route_status === 'borrador'"
              [class.in-activa]="order.current_route_status === 'activa'"
              (click)="openEdit(order)"
            >
              <td class="col-check" (click)="$event.stopPropagation()">
                <input type="checkbox" [checked]="selected.has(order.id)" [disabled]="isInRoute(order)" (change)="toggle(order.id)" [title]="routeTooltip(order)" />
              </td>
              <td class="col-st">
                <span class="dot" [style.background]="statusColor(order.status)" [title]="statusLabel(order.status)"></span>
              </td>
              <td class="mono">{{ shortDate(order.scheduled_delivery_date) }}</td>
              <td>
                <div class="cell-strong">{{ order.customer_name }}</div>
                <div class="cell-sub">{{ displayNumber(order) }} <span *ngIf="order.dni">· DNI {{ order.dni }}</span></div>
              </td>
              <td>
                <div>{{ order.address }}</div>
                <div class="cell-sub" *ngIf="order.between_streets">e/ {{ order.between_streets }}</div>
              </td>
              <td class="map-col" (click)="$event.stopPropagation()">
                <a class="map-btn" [href]="mapsUrl(order)" target="_blank" rel="noopener" title="Abrir en Google Maps">📍</a>
              </td>
              <td class="map-col" (click)="$event.stopPropagation()">
                <a class="map-btn" [href]="'/imprimir/pedido/' + order.id" target="_blank" rel="noopener" title="Imprimir recibo">🖨</a>
              </td>
              <td class="mono small">{{ order.phone || '—' }}</td>
              <td class="prod" [title]="order.products_summary || ''">
                <span *ngIf="(order.items_count || 0) > 1" class="qty">{{ order.items_count }}×</span>
                {{ order.products_summary || '—' }}
              </td>
              <td class="mono small">{{ shortTimeRange(order) }}</td>
              <td class="small">{{ order.payment_method || '—' }}</td>
              <td class="num mono">$ {{ orderTotal(order) | number:'1.0-0' }}</td>
              <td class="num mono" [class.pay-paid]="order.payment_status === 'cobrado'" [class.pay-due]="order.payment_status !== 'cobrado' && order.amount_to_collect">
                {{ order.payment_status === 'cobrado' ? '✓' : '$ ' + (order.amount_to_collect | number:'1.0-0') }}
              </td>
              <td>
                <span class="pill" [style.color]="statusColor(order.status)" [style.background]="statusBg(order.status)">
                  {{ statusLabel(order.status) }}
                </span>
              </td>
              <td class="fact-col" (click)="$event.stopPropagation()">
                <input type="checkbox" class="fact-cb" [checked]="!!order.facturado" (change)="toggleFacturado(order)" [title]="order.facturado ? 'Pasado al sistema (click para desmarcar)' : 'Marcar como pasado al sistema'" />
              </td>
              <td class="small muted">{{ order.priority ? '★ ' : '' }}{{ originLabel(order) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty" *ngIf="!orders().length">
          Sin pedidos para los filtros seleccionados.
        </div>
      </div>

      <div class="drawer-bg" *ngIf="editing()" (click)="closeEdit()"></div>
      <aside class="drawer" *ngIf="editing() as order">
        <form (ngSubmit)="saveEdit()">
          <div class="drawer-head">
            <div>
              <span class="eyebrow">Pedido {{ displayNumber(order) }}</span>
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
            <label>Total del pedido <input type="number" name="total" [(ngModel)]="editModel.total" /></label>
            <label class="check">
              <input type="checkbox" name="edit_paid" [(ngModel)]="editPaid" />
              Pagado
            </label>
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

          <div class="customer-note" *ngIf="editModel.customer_note">
            <span class="cn-label">💬 Nota del cliente (desde la web)</span>
            <p>{{ editModel.customer_note }}</p>
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
            <a class="secondary print-btn" [href]="'/imprimir/pedido/' + order.id" target="_blank" rel="noopener" title="Abrir vista de impresión térmica">🖨 Imprimir</a>
            <button class="secondary" type="button" (click)="closeEdit()">Cancelar</button>
          </div>
        </form>
      </aside>
    </section>
  `,
  styles: [`
    h1, h2, p { margin: 0; }
    .dash { display: grid; gap: 12px; }
    .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
    .small { font-size: 12px; }
    .muted { color: var(--muted); }

    /* head */
    .head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 2px 2px 4px;
    }
    .head-left { display: flex; align-items: baseline; gap: 10px; }
    .head h1 { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
    .counter {
      color: var(--muted); font-size: 12px; font-weight: 600;
      background: var(--panel-2); padding: 2px 8px; border-radius: 999px;
      border: 1px solid var(--line);
    }
    .head-right button.ghost { padding: .35rem .55rem; font-size: 14px; }
    .live {
      display: inline-flex; align-items: center; gap: 4px;
      color: var(--muted); font-size: 10px;
      letter-spacing: .04em; text-transform: uppercase;
      font-weight: 600;
    }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--st-entregado);
      box-shadow: 0 0 6px var(--st-entregado);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .4; transform: scale(.85); }
    }

    /* toolbar */
    .toolbar {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
      background: var(--panel); border: 1px solid var(--line);
      border-radius: var(--radius); padding: 8px;
    }
    .field {
      display: flex; align-items: center; gap: 6px;
      background: var(--panel-2); border: 1px solid var(--line);
      border-radius: var(--radius-sm); padding: 0 .55rem;
      transition: border-color .15s, box-shadow .15s;
    }
    .field:focus-within { border-color: var(--rojo); box-shadow: 0 0 0 3px rgba(239,68,68,.12); }
    .field.grow { flex: 1; min-width: 220px; }
    .field .ico { color: var(--muted); font-size: 13px; }
    .field input {
      border: 0; background: transparent; padding: .45rem 0;
      box-shadow: none !important;
    }
    .field input:focus { box-shadow: none; }

    .chips { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
    .map-col { width: 36px; text-align: center; padding-left: 0 !important; padding-right: 0 !important; }
    .fact-col { width: 44px; text-align: center; padding-left: 0 !important; padding-right: 0 !important; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; }
    .fact-cb { width: 18px; height: 18px; accent-color: var(--st-entregado); cursor: pointer; }
    .map-btn {
      display: inline-grid; place-items: center;
      width: 26px; height: 26px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--texto-2);
      text-decoration: none;
      font-size: 13px;
      transition: background .15s, border-color .15s, color .15s;
    }
    .map-btn:hover { background: var(--rojo-l); border-color: var(--rojo); color: var(--rojo); }
    .chip {
      padding: .35rem .7rem; font-size: 12px; font-weight: 500;
      background: var(--panel-2); color: var(--texto-2);
      border: 1px solid var(--line); border-radius: 999px;
    }
    .chip:hover { background: var(--panel-3); color: var(--texto); }
    .chip.active {
      background: var(--rojo-l); color: var(--rojo);
      border-color: rgba(239,68,68,.4);
    }

    /* route bar (selección) */
    .route-bar {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px;
      background: linear-gradient(180deg, rgba(239,68,68,.08), rgba(239,68,68,.02));
      border: 1px solid rgba(239,68,68,.25);
      border-radius: var(--radius);
    }
    .route-bar > div { display: grid; gap: 1px; flex: 1; }
    .route-bar strong { font-size: 13px; }
    .route-bar span { font-size: 12px; color: var(--muted); }
    .message { color: var(--rojo); font-size: 12px; font-weight: 600; }
    .route-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .route-pick {
      background: var(--panel-2); border: 1px solid var(--line);
      color: var(--texto); padding: .45rem .55rem; font-size: 12px;
      border-radius: 6px; width: auto; min-width: 220px;
    }

    /* tabla */
    .table-wrap {
      background: var(--panel); border: 1px solid var(--line);
      border-radius: var(--radius); overflow: hidden;
    }
    .grid-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .grid-table thead th {
      position: sticky; top: 0; z-index: 1;
      background: var(--panel-2);
      text-align: left;
      font-weight: 600; font-size: 11px;
      letter-spacing: .04em; text-transform: uppercase;
      color: var(--muted);
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
      white-space: nowrap;
    }
    .grid-table tbody td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
      max-width: 280px;
    }
    .grid-table tbody tr {
      cursor: pointer;
      transition: background .12s;
    }
    .grid-table tbody tr:hover { background: var(--panel-2); }
    .grid-table tbody tr.selected { background: rgba(239,68,68,.06); }
    .grid-table tbody tr.in-route { opacity: .6; }
    .grid-table tbody tr.in-route:hover { opacity: .9; }
    .grid-table tbody tr.in-borrador { background: rgba(245,158,11,.04); }
    .grid-table tbody tr.in-borrador:hover { background: rgba(245,158,11,.08); }
    .grid-table tbody tr.in-borrador td:first-child { box-shadow: inset 3px 0 0 var(--st-pendiente); }
    .grid-table tbody tr.in-activa { background: rgba(56,189,248,.04); }
    .grid-table tbody tr.in-activa:hover { background: rgba(56,189,248,.08); }
    .grid-table tbody tr.in-activa td:first-child { box-shadow: inset 3px 0 0 var(--st-en_camino); }
    .grid-table tbody tr.priority td:first-child {
      box-shadow: inset 3px 0 0 var(--naranja);
    }
    .grid-table tbody tr:last-child td { border-bottom: 0; }

    .col-check { width: 32px; padding-left: 14px !important; }
    .col-st { width: 18px; padding: 0 !important; text-align: center; }
    .num { text-align: right; }
    .col-check input { width: auto; }

    .dot {
      display: inline-block; width: 7px; height: 7px;
      border-radius: 50%;
    }
    .cell-strong { font-weight: 600; color: var(--texto); }
    .cell-sub { color: var(--muted); font-size: 11px; margin-top: 1px; }
    .prod {
      max-width: 320px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: var(--texto-2);
    }
    .qty { color: var(--rojo); font-weight: 600; margin-right: 4px; }
    .pay-paid { color: var(--st-entregado); }
    .pay-due { color: var(--naranja); }

    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .01em;
      border: 1px solid currentColor;
    }

    .empty {
      color: var(--muted);
      padding: 32px;
      text-align: center;
      font-size: 13px;
    }

    /* drawer */
    .drawer-bg {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.55);
      backdrop-filter: blur(2px);
      z-index: 20;
    }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      z-index: 21;
      width: min(540px, 100vw);
      background: var(--panel);
      border-left: 1px solid var(--line);
      box-shadow: -8px 0 40px rgba(0,0,0,.5);
      overflow-y: auto;
    }
    .drawer form { display: grid; gap: 14px; padding: 18px 20px 80px; }
    .drawer-head {
      display: flex; justify-content: space-between; align-items: start;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line);
    }
    .drawer-head .eyebrow {
      color: var(--muted); font-size: 11px; font-weight: 600;
      letter-spacing: .05em; text-transform: uppercase;
    }
    .drawer-head h2 { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .icon {
      width: 30px; height: 30px; padding: 0;
      border-radius: var(--radius-sm);
      background: var(--panel-2); color: var(--texto-2);
      border: 1px solid var(--line); font-size: 14px;
    }
    .icon:hover { background: var(--panel-3); color: var(--texto); }

    .section-title {
      display: flex; align-items: center; gap: 10px;
      margin-top: 6px;
    }
    .section-title span {
      color: var(--muted);
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .08em;
    }
    .section-title hr {
      flex: 1; border: 0; border-top: 1px solid var(--line);
    }

    .status-actions, .contact-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .status-actions button, .contact-actions a {
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: var(--panel-2); color: var(--texto-2);
      padding: .4rem .7rem; font-size: 12px; font-weight: 500;
      text-decoration: none; cursor: pointer;
    }
    .status-actions button:hover, .contact-actions a:hover {
      background: var(--panel-3); color: var(--texto);
    }
    .status-actions button.active {
      background: var(--rojo); border-color: var(--rojo); color: #fff;
    }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .product-editor {
      display: grid; gap: 8px; padding: 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: var(--panel-2);
    }
    .product-editor-head {
      display: flex; justify-content: space-between; align-items: center;
    }
    .product-editor strong { font-size: 12px; font-weight: 600; }
    .product-row { display: grid; grid-template-columns: 72px 1fr auto; gap: 6px; align-items: end; }
    .product-row .remove {
      background: transparent; border: 1px solid var(--line);
      color: var(--muted); padding: .5rem .6rem;
    }
    .product-row .remove:hover { color: var(--rojo); border-color: var(--rojo); }

    .customer-note {
      background: rgba(245,158,11,.08);
      border: 1px solid rgba(245,158,11,.3);
      border-radius: 8px;
      padding: 10px 12px;
      display: grid;
      gap: 4px;
    }
    .customer-note .cn-label {
      color: var(--naranja);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .customer-note p {
      color: var(--texto);
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
      white-space: pre-wrap;
    }

    .check {
      display: flex; align-items: center; gap: 8px;
      color: var(--texto); font-weight: 500; font-size: 13px;
      text-transform: none; letter-spacing: 0;
    }
    .check input { width: auto; accent-color: var(--rojo); }

    .print-btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: .55rem .85rem;
      border-radius: var(--radius-sm);
      background: var(--panel-2);
      color: var(--texto);
      border: 1px solid var(--line);
      text-decoration: none;
      font-weight: 600;
      font-size: 12px;
    }
    .print-btn:hover { background: var(--panel-3); border-color: var(--line-strong); }
    .drawer-actions {
      display: flex; gap: 8px;
      position: sticky; bottom: 0;
      background: linear-gradient(180deg, transparent, var(--panel) 30%);
      padding: 14px 0 4px;
      margin-top: 6px;
    }

    @media (max-width: 900px) {
      .grid-table { font-size: 12px; }
      .grid-table thead th, .grid-table tbody td { padding: 7px 8px; }
    }
    @media (max-width: 760px) {
      .form-grid, .product-row { grid-template-columns: 1fr; }
      .table-wrap { overflow-x: auto; }
      .grid-table { min-width: 980px; }
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  orders = signal<Order[]>([]);
  openRoutes = signal<any[]>([]);
  addToRouteId: number | null = null;
  routeId = signal<number | null>(null);
  route = signal<any>(null);
  message = signal('');
  editing = signal<Order | null>(null);
  selected = new Set<number>();
  filters = { date: new Date().toISOString().slice(0, 10), status: 'todos', search: '' };
  editModel: Partial<Order> = {};
  editPaid = false;
  editItems: Array<{ product_name: string; quantity: number }> = [this.emptyItem()];
  paymentMethods = PAYMENT_METHODS;
  quickFilters = [
    { label: 'Todos', value: 'todos' },
    { label: 'Activos', value: '' },
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
    this.refreshTimer = window.setInterval(() => this.load(false), 10000);
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
    // Refresco las rutas abiertas para el dropdown.
    this.api.listRoutes({ status: 'borrador' }).subscribe((b) => {
      this.api.listRoutes({ status: 'activa' }).subscribe((a) => {
        this.openRoutes.set([...b, ...a]);
      });
    });
  }

  addToExisting() {
    if (!this.addToRouteId || !this.selected.size) return;
    const routeId = this.addToRouteId;
    this.message.set('');
    this.api.addStopsToRoute(routeId, Array.from(this.selected)).subscribe({
      next: () => {
        this.message.set('');
        this.selected.clear();
        this.addToRouteId = null;
        this.router.navigateByUrl(`/ruta/${routeId}`);
      },
      error: (e) => this.message.set(e.error?.error || 'No se pudo agregar a la ruta.')
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
    this.editPaid = false;
    this.editItems = [this.emptyItem()];
  }

  saveEdit() {
    const order = this.editing();
    if (!order) return;
    const total = Number(this.editModel.total || 0);

    this.api.updateOrder(order.id, {
      ...this.editModel,
      total,
      amount_to_collect: this.editPaid ? 0 : total,
      payment_status: this.editPaid ? 'cobrado' : 'a_cobrar',
      items: this.productsPayload(),
      store_id: 2,
      time_condition: ''
    }).subscribe(() => {
      this.closeEdit();
      this.load();
    });
  }

  whatsappUrl(order: Partial<Order>) {
    const msg = buildAnimaliaMessage({ stopOrder: order.current_route_stop_order });
    return buildWhatsappUrl(order.phone, msg);
  }

  productSummary(order: Order) {
    if (!order.products_summary) return '';
    const summary = order.products_summary.length > 90
      ? `${order.products_summary.slice(0, 90)}...`
      : order.products_summary;
    const count = Number(order.items_count || 0);
    return count > 1 ? `${count} productos: ${summary}` : summary;
  }

  orderTotal(order: Order) {
    return Number(order.total || order.amount_to_collect || 0);
  }

  paymentLabel(order: Partial<Order>) {
    if (order.payment_status === 'cobrado') return 'Pagado - no cobrar';
    return `No pagado - cobrar $ ${Number(order.amount_to_collect || 0).toFixed(2)}`;
  }

  paymentClass(order: Partial<Order>) {
    return order.payment_status === 'cobrado' ? 'paid' : 'collect';
  }

  statusColor(status?: string) {
    const map: Record<string, string> = {
      pendiente: '#f59e0b',
      en_camino: '#38bdf8',
      entregado: '#22c55e',
      no_entregado: '#eab308',
      cancelado: '#ef4444'
    };
    return map[status || ''] || '#8a8f99';
  }

  statusBg(status?: string) {
    const map: Record<string, string> = {
      pendiente: 'rgba(245,158,11,.10)',
      en_camino: 'rgba(56,189,248,.10)',
      entregado: 'rgba(34,197,94,.10)',
      no_entregado: 'rgba(234,179,8,.10)',
      cancelado: 'rgba(239,68,68,.10)'
    };
    return map[status || ''] || 'rgba(138,143,153,.10)';
  }

  isInRoute(order: Order) {
    return !!order.current_route_id;
  }

  routeTooltip(order: Order) {
    if (!order.current_route_id) return '';
    const label = order.current_route_status === 'activa' ? 'En camioneta' : 'Preparada';
    return `Ya está en ruta #${order.current_route_id} (${label})`;
  }

  mapsUrl(order: Order) {
    const query = addressForMapsQuery(order.address, order.city || 'Mar del Plata');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  displayNumber(order: Order) {
    return orderDisplayNumber(order as any);
  }

  toggleFacturado(order: Order) {
    const newVal = !order.facturado;
    // Update optimistically
    (order as any).facturado = newVal;
    this.api.updateOrder(order.id, { facturado: newVal }).subscribe({
      next: () => { /* mantener el optimista */ },
      error: () => {
        // Revertir si falla
        (order as any).facturado = !newVal;
        this.message.set('No se pudo actualizar Facturado.');
      }
    });
  }

  originLabel(order: Order) {
    return (order as unknown as { origin?: string }).origin || '—';
  }

  shortDate(value?: string) {
    if (!value) return '—';
    const d = value.slice(0, 10).split('-');
    return d.length === 3 ? `${d[2]}/${d[1]}` : value;
  }

  shortTimeRange(order: Order) {
    const s = this.shortTime(order.time_window_start);
    const e = this.shortTime(order.time_window_end);
    if (s && e) return `${s}–${e}`;
    if (s) return `≥${s}`;
    if (e) return `≤${e}`;
    return '—';
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
      total: this.orderTotal(order),
      time_window_start: this.shortTime(order.time_window_start),
      time_window_end: this.shortTime(order.time_window_end)
    };
    this.editPaid = order.payment_status === 'cobrado';
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
