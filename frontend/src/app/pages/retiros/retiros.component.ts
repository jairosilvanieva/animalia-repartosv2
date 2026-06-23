import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Order } from '../../core/api.service';
import { PAYMENT_METHODS } from '../../shared/payment-methods';
import { orderDisplayNumber } from '../../shared/order-number';

const STORES = [
  { id: 1, label: 'Constitución' },
  { id: 2, label: 'Sarmiento' },
  { id: 3, label: 'Güemes' },
];

@Component({
  selector: 'app-retiros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dash">

      <!-- HEADER -->
      <header class="head">
        <div class="head-left">
          <h1>Retiros en local</h1>
          <span class="counter">{{ orders().length }}</span>
          <span class="live"><span class="live-dot"></span><span class="live-label">en vivo</span></span>
        </div>
        <div class="head-right">
          <button class="ghost" (click)="load()" title="Actualizar">↻</button>
          <button (click)="openNew()">+ Carga manual</button>
        </div>
      </header>

      <!-- FILTROS -->
      <div class="toolbar">
        <div class="field">
          <span class="ico">📅</span>
          <input type="month" [(ngModel)]="filters.month" (change)="load()" />
        </div>
        <div class="field grow">
          <span class="ico">⌕</span>
          <input placeholder="Buscar cliente o teléfono…" [(ngModel)]="filters.search" (keyup.enter)="load()" />
        </div>
        <div class="chips">
          <button class="chip" *ngFor="let s of storeFilters"
            [class.active]="filters.store_id === s.id"
            (click)="setStore(s.id)">{{ s.label }}</button>
        </div>
        <div class="chips">
          <button class="chip" [class.active]="filters.status === 'todos'"   (click)="setStatus('todos')">Todos</button>
          <button class="chip" [class.active]="filters.status === ''"        (click)="setStatus('')">Pendientes</button>
          <button class="chip" [class.active]="filters.status === 'entregado'" (click)="setStatus('entregado')">Retirados</button>
        </div>
      </div>

      <!-- TABLA -->
      <div class="table-wrap">
        <table class="grid-table">
          <thead>
            <tr>
              <th class="col-st"></th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Local</th>
              <th>Tel</th>
              <th>Productos</th>
              <th>Pago</th>
              <th class="num">Total</th>
              <th class="num">A cobrar</th>
              <th>Estado</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading()">
              <td colspan="10" class="empty">Cargando…</td>
            </tr>
            <tr *ngIf="!loading() && !orders().length">
              <td colspan="10" class="empty">No hay retiros para los filtros seleccionados.</td>
            </tr>
            <tr
              *ngFor="let o of orders()"
              [class.retirado]="o.status === 'entregado'"
              (click)="openEdit(o)"
            >
              <td class="col-st">
                <span class="dot" [style.background]="statusColor(o.status)"></span>
              </td>
              <td class="mono small">{{ shortDate(o.scheduled_delivery_date) }}</td>
              <td>
                <div class="cell-strong">{{ o.customer_name }}</div>
                <div class="cell-sub">{{ displayNumber(o) }}</div>
              </td>
              <td>
                <span class="store-tag" [class]="'store-' + o.store_id">{{ o.store_name || '—' }}</span>
              </td>
              <td class="mono small">{{ o.phone || '—' }}</td>
              <td class="prod" [title]="o.products_summary || ''">
                <span *ngIf="(o.items_count || 0) > 1" class="qty">{{ o.items_count }}×</span>
                {{ o.products_summary || '—' }}
              </td>
              <td class="small">{{ o.payment_method || '—' }}</td>
              <td class="num mono">$ {{ (o.total || 0) | number:'1.0-0' }}</td>
              <td class="num mono"
                [class.pay-paid]="o.payment_status === 'cobrado'"
                [class.pay-due]="o.payment_status !== 'cobrado' && o.amount_to_collect">
                {{ o.payment_status === 'cobrado' ? '✓' : '$ ' + ((o.amount_to_collect || 0) | number:'1.0-0') }}
              </td>
              <td>
                <span class="pill" [style.color]="statusColor(o.status)" [style.background]="statusBg(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </td>
              <td class="col-actions" (click)="$event.stopPropagation()">
                <a class="action-btn" [href]="'/imprimir/pedido/' + o.id" target="_blank" title="Imprimir">🖨</a>
                <button
                  *ngIf="o.status !== 'entregado' && o.status !== 'cancelado'"
                  class="action-btn btn-retirado"
                  (click)="markRetirado(o)"
                  title="Marcar como retirado">✓</button>
                <button
                  *ngIf="o.status === 'entregado'"
                  class="action-btn btn-deshacer"
                  (click)="markPendiente(o)"
                  title="Deshacer">↩</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty" *ngIf="!loading() && !orders().length">
          Sin retiros para los filtros seleccionados.
        </div>
      </div>

      <!-- DRAWER -->
      <div class="drawer-bg" *ngIf="editing()" (click)="closeEdit()"></div>
      <aside class="drawer" *ngIf="editing() as order">
        <form (ngSubmit)="saveEdit()">
          <div class="drawer-head">
            <div>
              <span class="eyebrow">{{ isNew ? 'Nuevo retiro' : 'Pedido ' + displayNumber(order) }}</span>
              <h2>{{ isNew ? 'Carga manual' : 'Editar retiro' }}</h2>
            </div>
            <button class="icon" type="button" (click)="closeEdit()">✕</button>
          </div>

          <!-- Estado (solo en edición) -->
          <div class="status-actions" *ngIf="!isNew">
            <button type="button"
              *ngFor="let s of editStatuses"
              [class.active]="editModel.status === s.value"
              (click)="editModel.status = s.value">
              {{ s.label }}
            </button>
          </div>

          <div class="section-title"><span>Local y fecha</span><hr /></div>
          <div class="form-grid">
            <label>Local de retiro *
              <select name="store_id" [(ngModel)]="editModel.store_id">
                <option [ngValue]="null">— Seleccioná —</option>
                <option *ngFor="let s of stores" [ngValue]="s.id">{{ s.label }}</option>
              </select>
            </label>
            <label>Fecha de retiro
              <input type="date" name="scheduled_delivery_date" [(ngModel)]="editModel.scheduled_delivery_date" />
            </label>
          </div>

          <div class="section-title"><span>Cliente</span><hr /></div>
          <div class="form-grid">
            <label>Cliente *
              <input name="customer_name" [(ngModel)]="editModel.customer_name" placeholder="Nombre completo" />
            </label>
            <label>Teléfono
              <input name="phone" [(ngModel)]="editModel.phone" placeholder="Ej: 2235001234" />
            </label>
            <label>DNI
              <input name="dni" [(ngModel)]="editModel.dni" />
            </label>
          </div>

          <div class="contact-actions" *ngIf="editModel.phone && !isNew">
            <a [href]="'tel:' + editModel.phone">Llamar</a>
          </div>

          <div class="section-title"><span>Pedido y pago</span><hr /></div>
          <div class="form-grid">
            <label>Forma de pago
              <select name="payment_method" [(ngModel)]="editModel.payment_method">
                <option value="">Sin definir</option>
                <option *ngFor="let m of paymentMethods" [value]="m">{{ m }}</option>
              </select>
            </label>
            <label>Total del pedido
              <input type="number" name="total" [(ngModel)]="editModel.total" />
            </label>
            <label class="check">
              <input type="checkbox" name="edit_paid" [(ngModel)]="editPaid" />
              Ya está pagado
            </label>
          </div>

          <div class="product-editor">
            <div class="product-editor-head">
              <strong>Productos</strong>
              <button type="button" class="secondary" (click)="addEditItem()">Agregar</button>
            </div>
            <div class="product-row" *ngFor="let item of editItems; let i = index">
              <label>Cant.
                <input type="number" min="1" [name]="'qty_' + i" [(ngModel)]="item.quantity" />
              </label>
              <label>Producto
                <input [name]="'name_' + i" [(ngModel)]="item.product_name" />
              </label>
              <button type="button" class="remove" (click)="removeEditItem(i)" [disabled]="editItems.length === 1">✕</button>
            </div>
          </div>

          <div class="customer-note" *ngIf="editModel.customer_note && !isNew">
            <span class="cn-label">💬 Nota del cliente</span>
            <p>{{ editModel.customer_note }}</p>
          </div>

          <label>Observaciones internas
            <textarea rows="3" name="internal_notes" [(ngModel)]="editModel.internal_notes"></textarea>
          </label>

          <p class="form-error" *ngIf="saveError()">{{ saveError() }}</p>

          <div class="drawer-actions">
            <button type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar cambios' }}</button>
            <a *ngIf="!isNew" class="secondary print-btn" [href]="'/imprimir/pedido/' + order.id" target="_blank">🖨 Imprimir</a>
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

    /* head */
    .head { display: flex; justify-content: space-between; align-items: center; padding: 2px 2px 4px; }
    .head-left { display: flex; align-items: baseline; gap: 10px; }
    .head-right { display: flex; gap: 8px; }
    .counter { color: var(--muted); font-size: 12px; font-weight: 600; background: var(--panel-2); padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); }
    .live { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-size: 10px; letter-spacing: .04em; text-transform: uppercase; font-weight: 600; }
    .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--st-entregado); box-shadow: 0 0 6px var(--st-entregado); animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.85); } }

    /* toolbar */
    .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 8px; }
    .field { display: flex; align-items: center; gap: 6px; background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 0 .55rem; transition: border-color .15s; }
    .field:focus-within { border-color: var(--rojo); }
    .field.grow { flex: 1; min-width: 220px; }
    .field .ico { color: var(--muted); font-size: 13px; }
    .field input { border: 0; background: transparent; padding: .45rem 0; box-shadow: none !important; }
    .chips { display: flex; gap: 4px; flex-wrap: wrap; }
    .chip { padding: .35rem .7rem; font-size: 12px; font-weight: 500; background: var(--panel-2); color: var(--texto-2); border: 1px solid var(--line); border-radius: 999px; cursor: pointer; transition: all .15s; }
    .chip:hover { background: var(--panel-3); color: var(--texto); }
    .chip.active { background: var(--rojo-l); color: var(--rojo); border-color: rgba(239,68,68,.4); }

    /* tabla */
    .table-wrap { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
    .grid-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .grid-table thead th { position: sticky; top: 0; z-index: 1; background: var(--panel-2); text-align: left; font-weight: 600; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); padding: 8px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
    .grid-table tbody td { padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .grid-table tbody tr { cursor: pointer; transition: background .12s; }
    .grid-table tbody tr:hover { background: var(--panel-2); }
    .grid-table tbody tr.retirado td { opacity: .5; }
    .grid-table tbody tr:last-child td { border-bottom: 0; }
    .col-st { width: 18px; padding: 0 !important; text-align: center; }
    .num { text-align: right; }
    .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; }
    .cell-strong { font-weight: 600; }
    .cell-sub { color: var(--muted); font-size: 11px; margin-top: 1px; }
    .prod { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--texto-2); }
    .qty { color: var(--rojo); font-weight: 600; margin-right: 4px; }
    .pay-paid { color: var(--st-entregado); }
    .pay-due { color: var(--naranja); }
    .empty { color: var(--muted); padding: 32px; text-align: center; font-size: 13px; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid currentColor; }

    /* store tag */
    .store-tag { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: var(--panel-2); border: 1px solid var(--line); }
    .store-1 { background: rgba(56,189,248,.08); border-color: rgba(56,189,248,.3); color: #38bdf8; }
    .store-2 { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.3); color: var(--rojo); }
    .store-3 { background: rgba(34,197,94,.08); border-color: rgba(34,197,94,.3); color: #22c55e; }

    /* acciones inline */
    .col-actions { width: 80px; white-space: nowrap; }
    .action-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 6px; font-size: 13px;
      background: var(--panel-2); border: 1px solid var(--line);
      color: var(--texto-2); text-decoration: none; cursor: pointer;
      transition: background .12s, border-color .12s, color .12s;
      padding: 0; margin-right: 3px;
    }
    .action-btn:hover { background: var(--panel-3); color: var(--texto); }
    .btn-retirado:hover { background: rgba(34,197,94,.12); border-color: #22c55e; color: #22c55e; }
    .btn-deshacer:hover { background: var(--rojo-l); border-color: var(--rojo); color: var(--rojo); }

    /* drawer */
    .drawer-bg { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); z-index: 20; }
    .drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 21; width: min(540px, 100vw); background: var(--panel); border-left: 1px solid var(--line); box-shadow: -8px 0 40px rgba(0,0,0,.5); overflow-y: auto; }
    .drawer form { display: grid; gap: 14px; padding: 18px 20px 80px; }
    .drawer-head { display: flex; justify-content: space-between; align-items: start; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .drawer-head .eyebrow { color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
    .drawer-head h2 { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .icon { width: 30px; height: 30px; padding: 0; border-radius: var(--radius-sm); background: var(--panel-2); color: var(--texto-2); border: 1px solid var(--line); font-size: 14px; }
    .icon:hover { background: var(--panel-3); }

    .section-title { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
    .section-title span { color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    .section-title hr { flex: 1; border: 0; border-top: 1px solid var(--line); }

    .status-actions, .contact-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .status-actions button, .contact-actions a { border-radius: var(--radius-sm); border: 1px solid var(--line); background: var(--panel-2); color: var(--texto-2); padding: .4rem .7rem; font-size: 12px; font-weight: 500; text-decoration: none; cursor: pointer; }
    .status-actions button:hover, .contact-actions a:hover { background: var(--panel-3); color: var(--texto); }
    .status-actions button.active { background: var(--rojo); border-color: var(--rojo); color: #fff; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .check { display: flex; align-items: center; gap: 8px; color: var(--texto); font-weight: 500; font-size: 13px; text-transform: none; letter-spacing: 0; }
    .check input { width: auto; accent-color: var(--rojo); }

    .product-editor { display: grid; gap: 8px; padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--line); background: var(--panel-2); }
    .product-editor-head { display: flex; justify-content: space-between; align-items: center; }
    .product-editor strong { font-size: 12px; font-weight: 600; }
    .product-row { display: grid; grid-template-columns: 72px 1fr auto; gap: 6px; align-items: end; }
    .product-row .remove { background: transparent; border: 1px solid var(--line); color: var(--muted); padding: .5rem .6rem; }
    .product-row .remove:hover { color: var(--rojo); border-color: var(--rojo); }

    .customer-note { background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.3); border-radius: 8px; padding: 10px 12px; display: grid; gap: 4px; }
    .customer-note .cn-label { color: var(--naranja); font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
    .customer-note p { color: var(--texto); font-size: 13px; line-height: 1.4; white-space: pre-wrap; }

    .form-error { color: var(--rojo); font-size: 13px; }
    .print-btn { display: inline-flex; align-items: center; justify-content: center; padding: .55rem .85rem; border-radius: var(--radius-sm); background: var(--panel-2); color: var(--texto); border: 1px solid var(--line); text-decoration: none; font-weight: 600; font-size: 12px; }
    .print-btn:hover { background: var(--panel-3); }
    .drawer-actions { display: flex; gap: 8px; position: sticky; bottom: 0; background: linear-gradient(180deg, transparent, var(--panel) 30%); padding: 14px 0 4px; margin-top: 6px; }

    @media (max-width: 760px) {
      .form-grid, .product-row { grid-template-columns: 1fr; }
      .table-wrap { overflow-x: auto; }
      .grid-table { min-width: 700px; }
    }
  `]
})
export class RetirosComponent implements OnInit, OnDestroy {
  readonly stores = STORES;
  readonly storeFilters = [{ id: null, label: 'Todos' }, ...STORES];
  readonly paymentMethods = PAYMENT_METHODS;
  readonly editStatuses = [
    { label: 'Pendiente',        value: 'pendiente' },
    { label: 'Retirado',         value: 'entregado' },
    { label: 'Faltan productos', value: 'faltan_productos' },
    { label: 'Cancelado',        value: 'cancelado' },
  ];

  orders  = signal<Order[]>([]);
  loading = signal(false);
  saving  = signal(false);
  saveError = signal('');
  editing = signal<Order | null>(null);
  isNew   = false;

  filters = {
    month:    new Date().toISOString().slice(0, 7),
    search:   '',
    store_id: null as number | null,
    status:   '',
  };

  editModel: any = {};
  editPaid  = false;
  editItems: Array<{ product_name: string; quantity: number }> = [this.emptyItem()];

  private timer: any;

  constructor(private api: ApiService) {}

  ngOnInit()    { this.load(); this.timer = setInterval(() => this.load(), 30000); }
  ngOnDestroy() { clearInterval(this.timer); }

  load() {
    this.loading.set(true);
    const f: Record<string, string> = { tipo: 'retiro' };
    if (this.filters.month)    f['month']    = this.filters.month;
    if (this.filters.search)   f['search']   = this.filters.search;
    if (this.filters.store_id) f['store_id'] = String(this.filters.store_id);
    if (this.filters.status === 'todos')    f['status'] = 'todos';
    else if (this.filters.status === 'entregado') f['status'] = 'entregado';
    // sin status → activos (pendiente / no_entregado)

    this.api.listOrders(f).subscribe({
      next: (data) => { this.orders.set(data); this.loading.set(false); },
      error: ()     =>   this.loading.set(false),
    });
  }

  setStore(id: number | null) { this.filters.store_id = id; this.load(); }
  setStatus(s: string)        { this.filters.status = s;    this.load(); }

  markRetirado(o: Order) {
    this.api.updateOrder(o.id, { status: 'entregado' }).subscribe(() => this.load());
  }

  markPendiente(o: Order) {
    this.api.updateOrder(o.id, { status: 'pendiente' }).subscribe(() => this.load());
  }

  openEdit(order: Order) {
    this.isNew = false;
    this.editing.set(order);
    this.prepareEdit(order);
    this.api.getOrder(order.id).subscribe((full) => {
      this.editing.set(full);
      this.prepareEdit(full);
    });
  }

  openNew() {
    this.isNew = true;
    this.editModel = {
      status: 'pendiente',
      store_id: null,
      scheduled_delivery_date: new Date().toISOString().slice(0, 10),
      customer_name: '',
      phone: '',
      dni: '',
      payment_method: '',
      total: 0,
      internal_notes: '',
    };
    this.editPaid  = false;
    this.editItems = [this.emptyItem()];
    this.saveError.set('');
    this.editing.set({} as Order);
  }

  closeEdit() {
    this.editing.set(null);
    this.editModel = {};
    this.editPaid  = false;
    this.editItems = [this.emptyItem()];
    this.saveError.set('');
  }

  saveEdit() {
    if (!this.editModel.customer_name?.trim()) { this.saveError.set('El nombre del cliente es obligatorio.'); return; }
    if (!this.editModel.store_id)              { this.saveError.set('Seleccioná el local de retiro.'); return; }
    this.saveError.set('');
    this.saving.set(true);

    const total = Number(this.editModel.total || 0);
    const paymentStatus = this.editPaid ? 'cobrado' : 'a_cobrar';

    if (this.isNew) {
      const payload = {
        tipo: 'retiro',
        cliente: this.editModel.customer_name,
        telefono: this.editModel.phone,
        domicilio: 'Retiro en local',
        fecha_reparto: this.editModel.scheduled_delivery_date,
        store_id: this.editModel.store_id,
        forma_pago: this.editModel.payment_method,
        total,
        pagado: this.editPaid,
        observaciones: this.editModel.internal_notes,
        productos: this.productsPayload(),
      };
      this.api.createManualOrder(payload).subscribe({
        next: () => { this.saving.set(false); this.closeEdit(); this.load(); },
        error: (e) => { this.saving.set(false); this.saveError.set(e?.error?.error || 'Error al guardar.'); },
      });
    } else {
      const order = this.editing();
      if (!order?.id) return;
      this.api.updateOrder(order.id, {
        ...this.editModel,
        total,
        amount_to_collect: this.editPaid ? 0 : total,
        payment_status: paymentStatus,
        items: this.productsPayload(),
      }).subscribe({
        next: () => { this.saving.set(false); this.closeEdit(); this.load(); },
        error: (e) => { this.saving.set(false); this.saveError.set(e?.error?.error || 'Error al guardar.'); },
      });
    }
  }

  addEditItem()          { this.editItems = [...this.editItems, this.emptyItem()]; }
  removeEditItem(i: number) {
    if (this.editItems.length === 1) return;
    this.editItems = this.editItems.filter((_, idx) => idx !== i);
  }

  displayNumber(o: Order) { return orderDisplayNumber(o); }

  statusLabel(s?: string) {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      entregado: 'Retirado',
      cancelado: 'Cancelado',
      faltan_productos: 'Faltan productos'
    };
    return labels[s || ''] || 'Pendiente';
  }

  statusColor(s?: string) {
    const map: Record<string, string> = {
      pendiente: '#f59e0b',
      entregado: '#22c55e',
      cancelado: '#ef4444',
      faltan_productos: '#8b5cf6'
    };
    return map[s || ''] || '#f59e0b';
  }

  statusBg(s?: string) {
    const map: Record<string, string> = {
      pendiente: 'rgba(245,158,11,.10)',
      entregado: 'rgba(34,197,94,.10)',
      cancelado: 'rgba(239,68,68,.10)',
      faltan_productos: 'rgba(139,92,246,.10)'
    };
    return map[s || ''] || 'rgba(245,158,11,.10)';
  }

  shortDate(value?: string) {
    if (!value) return '—';
    const d = value.slice(0, 10).split('-');
    return d.length === 3 ? `${d[2]}/${d[1]}` : value;
  }

  private prepareEdit(order: Order) {
    this.editModel = {
      ...order,
      scheduled_delivery_date: (order.scheduled_delivery_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      total: Number(order.total || order.amount_to_collect || 0),
    };
    this.editPaid  = order.payment_status === 'cobrado';
    this.editItems = (order.items || []).length
      ? order.items!.map((i) => ({ product_name: i.product_name, quantity: Number(i.quantity || 1) }))
      : [this.emptyItem()];
  }

  private productsPayload() {
    return this.editItems
      .map((i) => ({ product_name: String(i.product_name || '').trim(), quantity: Number(i.quantity || 1), unit_price: 0, total: 0 }))
      .filter((i) => i.product_name);
  }

  private emptyItem() { return { product_name: '', quantity: 1 }; }
}
