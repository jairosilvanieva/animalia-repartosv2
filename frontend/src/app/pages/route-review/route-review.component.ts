import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

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
          <button type="button" *ngIf="currentRoute.status !== 'finalizada'" (click)="notifyAll(currentRoute)">Avisar a todos</button>
          <button *ngIf="currentRoute.status === 'borrador'" (click)="start(currentRoute.id)">Ruta cargada a camioneta</button>
          <button type="button" *ngIf="currentRoute.status === 'activa'" [disabled]="!canFinish(currentRoute)" (click)="finish(currentRoute.id)">Finalizar ruta</button>
          <a *ngIf="currentRoute.status === 'activa'" [routerLink]="'/chofer/' + currentRoute.id">Vista chofer</a>
          <span class="driver-wait" *ngIf="currentRoute.status === 'borrador'">Vista chofer bloqueada</span>
          <span class="driver-wait" *ngIf="currentRoute.status === 'finalizada'">Ruta finalizada</span>
        </div>
        <p class="message" *ngIf="message()">{{ message() }}</p>
      </div>

      <article class="stop" *ngFor="let stop of currentRoute.stops">
        <div class="stop-order">{{ stop.stop_order }}</div>
        <div class="stop-body">
          <strong>{{ stop.customer_name }}</strong>
          <span>{{ stop.address }}</span>
          <small>{{ timeLabel(stop) }} - Total $ {{ stopTotal(stop) | number:'1.2-2' }} - {{ stop.payment_method || 'Sin forma de pago' }}</small>
          <small *ngIf="stop.payment_status === 'cobrado'">Pagado - no cobrar</small>
          <small *ngIf="stop.payment_status !== 'cobrado'">No pagado - cobrar $ {{ stop.amount_to_collect | number:'1.2-2' }}</small>
        </div>
        <a *ngIf="stop.phone && currentRoute.status !== 'finalizada'" [href]="whatsappUrl(stop)" target="_blank">Avisar WhatsApp</a>
      </article>
    </section>
  `,
  styles: [`
    h1, p { margin: 0; }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .eyebrow {
      color: var(--rojo);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .8px;
      text-transform: uppercase;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
    }
    .stop {
      display: grid;
      grid-template-columns: 36px 1fr auto;
      gap: .75rem;
      align-items: center;
      background: #fff;
      border: 1.5px solid var(--gris-l);
      border-radius: 10px;
      padding: .75rem;
    }
    .stop-order {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      background: var(--rojo);
      font-weight: 900;
    }
    .stop-body {
      display: grid;
      gap: .15rem;
    }
    small, p, span { color: var(--gris); font-weight: 700; }
    .driver-wait {
      border-radius: 8px;
      border: 1.5px dashed var(--gris-l);
      color: var(--gris);
      padding: 0.6rem 0.75rem;
      font-weight: 900;
    }
    a {
      border-radius: 8px;
      background: #f3f4f6;
      border: 1.5px solid var(--gris-l);
      color: var(--texto);
      padding: 0.6rem 0.75rem;
      text-decoration: none;
      font-weight: 900;
    }
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

  notifyAll(route: any) {
    (route?.stops || [])
      .filter((stop: any) => stop.phone)
      .forEach((stop: any, index: number) => {
        window.setTimeout(() => window.open(this.whatsappUrl(stop), '_blank'), index * 350);
      });
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
