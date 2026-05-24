import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-driver',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid" *ngIf="route() as currentRoute">
      <div class="panel route-head">
        <div>
          <h1>{{ currentRoute.name }}</h1>
          <p>{{ currentRoute.route_date }} - {{ currentRoute.status }}</p>
        </div>
        <div class="head-actions">
          <a [href]="mapsRouteUrl(currentRoute)" target="_blank">Ver ruta en Maps</a>
          <button (click)="start(currentRoute.id)">Poner en camino</button>
        </div>
      </div>

      <article class="stop" *ngFor="let stop of currentRoute.stops">
        <div class="stop-number">{{ stop.stop_order }}</div>
        <div class="details">
          <strong>{{ stop.customer_name }}</strong>
          <span>{{ stop.address }}</span>
          <small>{{ timeLabel(stop) }}</small>
          <small>$ {{ stop.amount_to_collect || 0 }} - {{ stop.payment_method || 'Sin forma de pago' }}</small>
          <small>{{ stop.internal_notes || '' }}</small>
          <div class="actions">
            <a [href]="'https://www.google.com/maps/search/?api=1&query=' + encode(stop.address)" target="_blank">Maps</a>
            <a [href]="'https://waze.com/ul?q=' + encode(stop.address)" target="_blank">Waze</a>
            <a *ngIf="stop.phone" [href]="'tel:' + stop.phone">Llamar</a>
            <a *ngIf="stop.phone" [href]="whatsappUrl(stop)" target="_blank">WhatsApp</a>
          </div>
          <div class="buttons">
            <button (click)="mark(currentRoute.id, stop.id, 'entregado')">Entregado</button>
            <button class="danger" (click)="mark(currentRoute.id, stop.id, 'no_entregado')">No entregado</button>
            <button class="secondary" (click)="mark(currentRoute.id, stop.id, 'problema', 'Revisar con administracion')">Avisar problema</button>
          </div>
        </div>
      </article>
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
    .head-actions {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
    }
    .stop {
      display: grid;
      grid-template-columns: 42px 1fr;
      gap: 0.8rem;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0.85rem;
    }
    .stop-number {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--brand);
      color: white;
      font-weight: 800;
    }
    .details {
      display: grid;
      gap: 0.3rem;
    }
    .actions, .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 0.4rem;
    }
    a {
      border-radius: 8px;
      background: #f3f4f6;
      border: 1.5px solid var(--gris-l);
      color: var(--texto);
      padding: 0.55rem 0.7rem;
      text-decoration: none;
      font-weight: 800;
    }
    @media (max-width: 760px) {
      .route-head { align-items: stretch; flex-direction: column; }
    }
  `]
})
export class DriverComponent implements OnInit {
  route = signal<any>(null);

  constructor(private routeInfo: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const routeId = this.routeInfo.snapshot.paramMap.get('routeId') || '';
    this.api.getRoute(routeId).subscribe((route) => this.route.set(route));
  }

  start(routeId: number) {
    this.api.startRoute(routeId).subscribe((route) => this.route.set(route));
  }

  mark(routeId: number, stopId: number, status: string, note?: string) {
    this.api.updateStop(routeId, stopId, status, note).subscribe((route) => this.route.set(route));
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
