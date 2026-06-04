import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-driver',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="grid" *ngIf="route() as currentRoute">
      <div class="panel locked" *ngIf="currentRoute.status !== 'activa'; else activeRoute">
        <h1>Ruta no disponible</h1>
        <p>Esta ruta no esta activa para el chofer. Puede estar preparada, finalizada o cancelada.</p>
        <a routerLink="/chofer" class="back">← Volver a rutas</a>
      </div>

      <ng-template #activeRoute>
      <!-- Ruta tomada por otro chofer: bloqueada -->
      <div class="panel locked" *ngIf="isClaimedByOther(currentRoute); else mineOrFree">
        <h1>Ruta tomada por otro chofer</h1>
        <p>Esta ruta ya esta siendo trabajada por alguien más. Elegí otra ruta disponible.</p>
        <a routerLink="/chofer" class="back">← Volver a rutas</a>
      </div>

      <ng-template #mineOrFree>
      <!-- Ruta libre: mostrar resumen + botón Comenzar/Volver -->
      <div class="panel preview" *ngIf="!isMine(currentRoute); else myRoute">
        <div>
          <h1>{{ currentRoute.name }}</h1>
          <p>{{ currentRoute.stops.length }} paradas · {{ currentRoute.route_date }}</p>
          <small>Si comenzás esta ruta no vas a poder tomar otra hasta finalizarla.</small>
        </div>
        <div class="preview-actions">
          <button (click)="claim(currentRoute.id)">Comenzar ruta</button>
          <a routerLink="/chofer" class="back">← Volver sin tomarla</a>
        </div>
      </div>

      <ng-template #myRoute>
      <div class="panel route-head">
        <div>
          <h1>{{ currentRoute.name }}</h1>
          <p>{{ currentRoute.route_date }} - {{ currentRoute.status }}</p>
        </div>
        <a [href]="mapsRouteUrl(currentRoute)" target="_blank">Ver ruta en Maps</a>
      </div>

      <article class="stop" *ngFor="let stop of visibleStops(currentRoute)">
        <div class="stop-number">{{ stop.stop_order }}</div>
        <div class="details">
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
          <small *ngIf="stop.internal_notes" class="note">{{ stop.internal_notes }}</small>
          <div class="row-actions">
            <div class="links">
              <a [href]="mapsUrl(stop)" target="_blank">Maps</a>
              <a [href]="wazeUrl(stop)" target="_blank">Waze</a>
              <a *ngIf="stop.phone" [href]="'tel:' + stop.phone">Llamar</a>
              <a *ngIf="stop.phone" [href]="whatsappUrl(stop)" target="_blank">WA</a>
            </div>
            <div class="buttons">
              <button class="ok" (click)="mark(currentRoute.id, stop.id, 'entregado')">Entregado</button>
              <button class="no" (click)="mark(currentRoute.id, stop.id, 'no_entregado')">No entregado</button>
            </div>
          </div>
        </div>
      </article>
      <div class="panel empty" *ngIf="!visibleStops(currentRoute).length">
        No quedan entregas pendientes en esta ruta.
      </div>

      <div class="finish-bar" *ngIf="canFinish(currentRoute)">
        <button (click)="finish(currentRoute.id)">Finalizar ruta</button>
      </div>
      </ng-template>
      </ng-template>
      </ng-template>
    </section>
  `,
  styles: [`
    h1, p { margin: 0; }
    p, small, span { color: var(--muted); }
    .route-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .stop {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 0.6rem;
      background: var(--panel);
      color: var(--texto);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0.55rem 0.7rem;
      align-items: start;
    }
    .stop-number {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--panel-3);
      color: var(--texto);
      font-weight: 600;
      font-size: 11px;
      border: 1px solid var(--line-strong);
      margin-top: 1px;
    }
    .details { display: grid; gap: 0.2rem; }
    .row-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .row-top strong { font-weight: 600; font-size: 13px; color: var(--texto); }
    .pay { font-size: 11px; color: var(--st-entregado); font-weight: 600; white-space: nowrap; }
    .pay.due { color: var(--naranja); }
    .row-mid { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
    .addr { color: var(--texto-2); font-size: 12px; }
    .meta { color: var(--muted); font-size: 11px; }
    .note { color: var(--muted); font-size: 11px; font-style: italic; }
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
      margin-top: 2px;
    }
    .cust-note span { color: var(--texto); font-weight: 500; line-height: 1.3; }
    .row-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
    .links { display: flex; gap: 4px; }
    .buttons { display: flex; gap: 4px; }
    .buttons button { padding: .35rem .65rem; font-size: 12px; font-weight: 500; border-radius: 6px; }
    .buttons .ok { background: var(--st-entregado); color: #0a0a0a; }
    .buttons .ok:hover { background: #18b358; }
    .buttons .no { background: var(--panel-3); color: var(--texto-2); border: 1px solid var(--line-strong); }
    .buttons .no:hover { background: var(--st-no_entregado); color: #0a0a0a; border-color: var(--st-no_entregado); }
    .empty {
      color: var(--muted);
      font-weight: 500;
      font-size: 13px;
      text-align: center;
    }
    .actions, .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 0.4rem;
    }
    a {
      border-radius: 5px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      color: var(--texto-2);
      padding: .25rem .55rem;
      text-decoration: none;
      font-weight: 500;
      font-size: 11px;
    }
    a:hover { background: var(--line-strong); }
    .preview {
      display: grid; gap: 12px; padding: 18px;
      border-color: var(--st-en_camino);
    }
    .preview h1 { font-size: 18px; font-weight: 700; }
    .preview p { color: var(--texto-2); font-size: 13px; }
    .preview small { color: var(--muted); font-size: 12px; }
    .preview-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .preview-actions button { padding: .65rem 1.2rem; font-size: 13px; }
    .back {
      color: var(--muted) !important;
      background: transparent !important;
      border: 0 !important;
      padding: .5rem 0 !important;
      font-size: 12px !important;
    }
    .back:hover { color: var(--texto) !important; background: transparent !important; }
    .finish-bar {
      position: sticky; bottom: 0;
      padding: 12px;
      background: linear-gradient(180deg, transparent, var(--bg) 40%);
      display: flex; justify-content: center;
    }
    .finish-bar button {
      background: var(--st-entregado); color: #0a0a0a;
      padding: .75rem 1.6rem; font-size: 14px; font-weight: 700;
    }
    .finish-bar button:hover { background: #18b358; }
    @media (max-width: 760px) {
      .route-head { align-items: stretch; flex-direction: column; }
    }
  `]
})
export class DriverComponent implements OnInit {
  route = signal<any>(null);

  constructor(
    private routeInfo: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const routeId = this.routeInfo.snapshot.paramMap.get('routeId') || '';
    this.api.getRoute(routeId).subscribe((route) => this.route.set(route));
  }

  isMine(route: any) {
    const userId = this.auth.user()?.id;
    if (this.auth.isStaff()) return true; // staff puede ver/operar siempre
    return !!userId && route?.driver_id === userId;
  }

  isClaimedByOther(route: any) {
    const userId = this.auth.user()?.id;
    if (this.auth.isStaff()) return false;
    return route?.driver_id && route.driver_id !== userId;
  }

  claim(routeId: number) {
    this.api.claimRoute(routeId).subscribe({
      next: (route) => this.route.set(route),
      error: (e) => alert(e.error?.error || 'No se pudo comenzar la ruta.')
    });
  }

  canFinish(route: any) {
    if (!route || route.status !== 'activa') return false;
    if (!this.isMine(route)) return false;
    const open = (route.stops || []).filter((s: any) => ['pendiente', 'en_camino'].includes(s.status));
    return open.length === 0;
  }

  finish(routeId: number) {
    if (!confirm('¿Finalizar esta ruta?')) return;
    this.api.finishRoute(routeId).subscribe({
      next: () => this.router.navigateByUrl('/chofer'),
      error: (e) => alert(e.error?.error || 'No se pudo finalizar.')
    });
  }

  mark(routeId: number, stopId: number, status: string) {
    this.api.updateStop(routeId, stopId, status).subscribe((route) => this.route.set(route));
  }

  mapsRouteUrl(route: any) {
    const stops = this.visibleStops(route);
    const origin = 'Sarmiento 2790, Mar del Plata, Buenos Aires';
    const destination = stops.length ? this.mapsAddress(stops[stops.length - 1].address) : origin;
    const waypoints = stops.slice(0, -1).map((stop: any) => this.mapsAddress(stop.address)).join('|');
    const params = new URLSearchParams({ api: '1', origin, destination, travelmode: 'driving' });
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  mapsUrl(stop: any) {
    if (stop?.latitude && stop?.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${this.encode(stop.address)}`;
  }
  wazeUrl(stop: any) {
    if (stop?.latitude && stop?.longitude) {
      return `https://waze.com/ul?ll=${stop.latitude},${stop.longitude}&navigate=yes`;
    }
    return `https://waze.com/ul?q=${this.encode(stop.address)}`;
  }

  visibleStops(route: any) {
    return (route?.stops || []).filter((stop: any) => ['pendiente', 'en_camino'].includes(stop.status));
  }

  whatsappUrl(stop: any) {
    const message = `Hola ${stop.customer_name}, somos de Animalia. Tu pedido ya esta en camino. El repartidor se dirige a tu domicilio: ${stop.address}.`;
    return `https://wa.me/${this.cleanPhone(stop.phone)}?text=${encodeURIComponent(message)}`;
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

  encode(value: string) {
    return encodeURIComponent(this.mapsAddress(value));
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
