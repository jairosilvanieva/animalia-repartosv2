import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { buildAnimaliaMessage, buildWhatsappUrl } from '../../shared/whatsapp';
import { addressForMapsQuery } from '../../shared/address';

@Component({
  selector: 'app-route-review',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="grid" *ngIf="route() as currentRoute">
      <div class="panel head">
        <div>
          <span class="eyebrow">Ruta armada</span>
          <h1>{{ currentRoute.name }}</h1>
          <p>{{ currentRoute.stops.length }} pedidos seleccionados - {{ statusLabel(currentRoute.status) }}</p>
          <small *ngIf="currentRoute.status === 'borrador'">Podes dejar esta tanda preparada mientras otra ruta esta en curso. El chofer la ve recien cuando la cargas a camioneta.</small>
          <small *ngIf="currentRoute.status === 'activa'">Esta ruta ya esta cargada en camioneta.</small>
          <small *ngIf="currentRoute.status === 'finalizada'">Esta ruta ya fue finalizada.</small>
        </div>
        <div class="actions">
          <a [href]="mapsRouteUrl(currentRoute)" target="_blank">Ver ruta en Maps</a>
          <a [href]="'/imprimir/ruta/' + currentRoute.id" target="_blank" rel="noopener" title="Vista de impresión térmica">🖨 Imprimir</a>
          <button *ngIf="currentRoute.status === 'borrador'" (click)="start(currentRoute.id)">Ruta cargada a camioneta</button>
          <button type="button" *ngIf="currentRoute.status === 'activa'" [disabled]="!canFinish(currentRoute)" (click)="finish(currentRoute.id)">Finalizar ruta</button>
          <a *ngIf="currentRoute.status === 'activa'" [routerLink]="'/chofer/' + currentRoute.id">Vista chofer</a>
          <span class="driver-wait" *ngIf="currentRoute.status === 'borrador'">Vista chofer bloqueada</span>
          <span class="driver-wait" *ngIf="currentRoute.status === 'finalizada'">Ruta finalizada</span>
        </div>
        <p class="message" *ngIf="message()">{{ message() }}</p>
      </div>

      <article class="stop" *ngFor="let stop of currentRoute.stops; let i = index" [class]="'stop-' + stop.status">
        <div class="reorder" *ngIf="canReorder(currentRoute)">
          <button type="button" class="rb" [disabled]="i === 0" (click)="moveStop(currentRoute, i, -1); $event.stopPropagation()" title="Subir">▲</button>
          <button type="button" class="rb" [disabled]="i === currentRoute.stops.length - 1" (click)="moveStop(currentRoute, i, 1); $event.stopPropagation()" title="Bajar">▼</button>
        </div>
        <div class="stop-order">{{ stop.stop_order }}</div>
        <div class="stop-body">
          <div class="row-top">
            <strong>{{ stop.customer_name }}</strong>
            <span class="pay" [class.due]="stop.payment_status !== 'cobrado'">
              {{ stop.payment_status === 'cobrado' ? '✓ pagado' : 'cobrar $ ' + (stop.amount_to_collect | number:'1.0-0') }}
            </span>
          </div>
          <div class="row-mid">
            <span class="addr">{{ stop.address }}</span>
            <span class="meta">{{ timeLabel(stop) }} · {{ stop.payment_method || 'Sin pago' }} · $ {{ stopTotal(stop) | number:'1.0-0' }}</span>
          </div>
          <div *ngIf="stop.customer_note" class="cust-note">
            💬 <span>{{ stop.customer_note }}</span>
          </div>
          <div class="links">
            <a [href]="mapsUrl(stop)" target="_blank">Maps</a>
            <a [href]="wazeUrl(stop)" target="_blank">Waze</a>
            <a *ngIf="stop.phone" [href]="'tel:' + stop.phone">Llamar</a>
            <a *ngIf="stop.phone && currentRoute.status !== 'finalizada'" class="wa-link" [href]="whatsappUrl(stop)" target="_blank">WA</a>
            <button *ngIf="currentRoute.status === 'borrador'" type="button" class="del-link" (click)="removeStop(currentRoute, stop.id)" title="Sacar de la ruta">✕ Sacar</button>
          </div>
        </div>
      </article>

      <!-- Bloque oculto: solo aparece al imprimir -->
      <div class="print-block">
        <h2>{{ currentRoute.name }}</h2>
        <p class="print-meta">{{ currentRoute.route_date }} · {{ currentRoute.stops.length }} paradas</p>
        <ol class="print-list">
          <li *ngFor="let stop of currentRoute.stops">
            <span class="print-addr">{{ stop.address }}</span>
            <span class="print-extra" *ngIf="stop.between_streets"> (e/ {{ stop.between_streets }})</span>
          </li>
        </ol>
      </div>
    </section>
  `,
  styles: [`
    /* Oculto el bloque de impresion en pantalla */
    .print-block { display: none; }

    @media print {
      /* Ocultar TODO en la pagina */
      :host { display: block; }
      :host * { visibility: hidden; }

      /* Solo mostrar el bloque de impresion */
      .print-block, .print-block * { visibility: visible; }
      .print-block {
        display: block !important;
        position: absolute;
        top: 0; left: 0; right: 0;
        background: white !important;
        color: black !important;
        padding: 20px;
        font-family: Arial, sans-serif;
      }
      .print-block h2 {
        font-size: 18pt;
        font-weight: bold;
        margin: 0 0 4px;
        color: black !important;
      }
      .print-meta {
        font-size: 10pt;
        color: #555 !important;
        margin: 0 0 16px;
      }
      .print-list {
        font-size: 13pt;
        line-height: 1.6;
        padding-left: 28px;
        margin: 0;
      }
      .print-list li {
        margin-bottom: 8px;
        page-break-inside: avoid;
        color: black !important;
      }
      .print-addr { font-weight: 600; }
      .print-extra { color: #555 !important; font-size: 11pt; font-weight: normal; }
    }

    h1, p { margin: 0; }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .eyebrow {
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .head {
      flex-wrap: wrap;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: .4rem;
      align-items: center;
    }
    .actions a, .actions button {
      padding: .45rem .8rem;
      font-size: 12px;
      white-space: nowrap;
    }
    .actions a {
      background: var(--panel-2);
      color: var(--texto);
      border: 1px solid var(--line);
    }
    .actions a:hover { background: var(--panel-3); border-color: var(--line-strong); }
    .head h1 { font-size: 18px; font-weight: 700; letter-spacing: -.01em; }
    .head > div:first-child { display: grid; gap: 2px; }
    .head p { font-size: 12px; color: var(--muted); }
    .head small { font-size: 11px; color: var(--muted); }
    @media (max-width: 600px) {
      .head { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
      .actions a, .actions button { flex: 1; min-width: 0; text-align: center; }
    }
    .stop {
      display: grid;
      grid-template-columns: auto 26px 1fr;
      gap: .6rem;
      align-items: start;
      background: var(--panel);
      color: var(--texto);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: .55rem .7rem;
    }
    .stop.stop-entregado { opacity: .5; }
    .stop.stop-no_entregado { border-color: var(--st-no_entregado); }
    .stop-order {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--texto);
      background: var(--panel-3);
      border: 1px solid var(--line-strong);
      font-weight: 600;
      font-size: 11px;
      margin-top: 1px;
    }
    .stop-body { display: grid; gap: .2rem; min-width: 0; }
    .row-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .row-top strong { font-weight: 600; font-size: 13px; color: var(--texto); }
    .pay { font-size: 11px; color: var(--st-entregado); font-weight: 600; white-space: nowrap; }
    .pay.due { color: var(--naranja); }
    .row-mid { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
    .addr { color: var(--texto-2); font-size: 12px; }
    .meta { color: var(--muted); font-size: 11px; }
    small, p, span.message { color: var(--muted); font-weight: 500; font-size: 12px; }
    .cust-note {
      background: rgba(245,158,11,.10);
      border: 1px solid rgba(245,158,11,.35);
      border-radius: 6px;
      padding: 5px 8px;
      color: var(--naranja);
      font-size: 12px;
      font-weight: 600;
      display: flex;
      gap: 4px;
      align-items: flex-start;
      margin-top: 4px;
    }
    .cust-note span { color: var(--texto); font-weight: 500; line-height: 1.3; }
    .reorder { display: grid; gap: 2px; margin-top: 0; }
    .rb {
      width: 22px; height: 18px;
      background: var(--panel-2); color: var(--texto-2);
      border: 1px solid var(--line); border-radius: 4px;
      padding: 0; font-size: 9px; line-height: 1;
      cursor: pointer;
    }
    .rb:hover:not(:disabled) { background: var(--panel-3); color: var(--texto); }
    .rb:disabled { opacity: .35; cursor: not-allowed; }
    /* Chips de acciones por parada (Maps, Waze, Llamar, WA) */
    .links {
      display: flex; gap: 4px; flex-wrap: wrap;
      margin-top: 4px;
    }
    .links a {
      background: var(--panel-2);
      border: 1px solid var(--line);
      color: var(--texto-2);
      padding: .25rem .55rem;
      font-size: 11px;
      font-weight: 500;
      border-radius: 5px;
      text-decoration: none;
    }
    .links a:hover { background: var(--panel-3); color: var(--texto); border-color: var(--line-strong); }
    .links a.wa-link {
      background: var(--st-entregado);
      color: #0a0a0a;
      border-color: var(--st-entregado);
      font-weight: 600;
    }
    .links a.wa-link:hover { background: #18b358; color: #0a0a0a; }
    .links button.del-link {
      background: var(--panel-2);
      border: 1px solid var(--line);
      color: var(--st-cancelado);
      padding: .25rem .55rem;
      font-size: 11px;
      font-weight: 500;
      border-radius: 5px;
      cursor: pointer;
    }
    .links button.del-link:hover {
      background: rgba(239,68,68,.10);
      border-color: var(--st-cancelado);
    }
    .driver-wait {
      border-radius: 6px;
      border: 1px dashed var(--line-strong);
      color: var(--muted);
      padding: 0.5rem 0.75rem;
      font-weight: 500;
      font-size: 13px;
    }
    a {
      border-radius: 6px;
      background: var(--panel-3);
      border: 1px solid var(--line);
      color: var(--texto);
      padding: 0.5rem 0.7rem;
      text-decoration: none;
      font-weight: 500;
      font-size: 12px;
    }
    a:hover { background: var(--line-strong); border-color: var(--line-strong); }
    @media (max-width: 760px) {
      .head { align-items: stretch; flex-direction: column; }
      .stop { grid-template-columns: 36px 1fr; }
      .stop a { grid-column: 2; }
    }
  `]
})
export class RouteReviewComponent implements OnInit {
  route = signal<any>(null);
  message = signal('');

  constructor(private routeInfo: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const routeId = this.routeInfo.snapshot.paramMap.get('routeId') || '';
    this.api.getRoute(routeId).subscribe((route) => this.route.set(route));
  }

  print() {
    window.print();
  }

  removeStop(route: any, stopId: number) {
    if (!confirm('¿Sacar este pedido de la ruta? El pedido vuelve al panel y puede ir en otra ruta.')) return;
    this.api.removeStopFromRoute(route.id, stopId).subscribe({
      next: (updated) => this.route.set(updated),
      error: (e) => this.message.set(e.error?.error || 'No se pudo sacar el pedido.')
    });
  }

  canReorder(route: any) {
    return route?.status === 'borrador' || route?.status === 'activa';
  }

  moveStop(route: any, index: number, direction: -1 | 1) {
    const stops = [...(route?.stops || [])];
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    [stops[index], stops[target]] = [stops[target], stops[index]];
    // Optimista: re-numero local y disparo al backend.
    stops.forEach((s: any, i: number) => (s.stop_order = i + 1));
    this.route.set({ ...route, stops });
    this.api.reorderRouteStops(route.id, stops.map((s: any) => s.id)).subscribe({
      next: (updated) => this.route.set(updated),
      error: (e) => {
        this.message.set(e.error?.error || 'No se pudo reordenar.');
        // Recargo para revertir el estado optimista.
        this.api.getRoute(String(route.id)).subscribe((r) => this.route.set(r));
      }
    });
  }

  start(routeId: number) {
    this.api.startRoute(routeId).subscribe((route) => this.route.set(route));
  }

  finish(routeId: number) {
    this.message.set('');
    this.api.finishRoute(routeId).subscribe({
      next: (route) => this.route.set(route),
      error: (error) => this.message.set(error.error?.error || 'No se pudo finalizar la ruta.')
    });
  }

  statusLabel(status: string) {
    if (status === 'activa') return 'Activa en camioneta';
    if (status === 'finalizada') return 'Finalizada';
    if (status === 'cancelada') return 'Cancelada';
    return 'Preparada';
  }

  canFinish(route: any) {
    return route?.status === 'activa'
      && (route?.stops || []).length > 0
      && !(route?.stops || []).some((stop: any) => ['pendiente', 'en_camino'].includes(stop.status));
  }

  mapsRouteUrl(route: any) {
    const stops = route?.stops || [];
    const origin = 'Sarmiento 2790, Mar del Plata, Buenos Aires';
    const destination = stops.length ? this.mapsAddress(stops[stops.length - 1].address) : origin;
    const waypoints = stops.slice(0, -1).map((stop: any) => this.mapsAddress(stop.address)).join('|');
    const params = new URLSearchParams({ api: '1', origin, destination, travelmode: 'driving' });
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  whatsappUrl(stop: any) {
    const msg = buildAnimaliaMessage({ stopOrder: stop?.stop_order });
    return buildWhatsappUrl(stop?.phone, msg);
  }

  mapsUrl(stop: any) {
    if (stop?.latitude && stop?.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`;
    }
    const query = addressForMapsQuery(stop?.address, stop?.city);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  wazeUrl(stop: any) {
    if (stop?.latitude && stop?.longitude) {
      return `https://waze.com/ul?ll=${stop.latitude},${stop.longitude}&navigate=yes`;
    }
    const query = addressForMapsQuery(stop?.address, stop?.city);
    return `https://waze.com/ul?q=${encodeURIComponent(query)}`;
  }

  timeLabel(stop: any) {
    const start = stop.time_window_start ? String(stop.time_window_start).slice(0, 5) : '';
    const end = stop.time_window_end ? String(stop.time_window_end).slice(0, 5) : '';
    if (start && end) return `Horario: ${start} a ${end}`;
    return 'Sin rango horario';
  }

  stopTotal(stop: any) {
    return Number(stop.total || stop.amount_to_collect || 0);
  }

  cleanPhone(value: string) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('54')) return digits;
    if (digits.startsWith('0')) return `54${digits.slice(1)}`;
    return `54${digits}`;
  }

  private mapsAddress(address: string) {
    return `${address}, Mar del Plata, Buenos Aires`;
  }
}
