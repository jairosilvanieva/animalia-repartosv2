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
      <div class="panel">
        <h1>{{ currentRoute.name }}</h1>
        <p>{{ currentRoute.route_date }} · {{ currentRoute.status }}</p>
        <button class="secondary" (click)="shareLocation(currentRoute.id)">Enviar ubicacion</button>
      </div>

      <article class="stop" *ngFor="let stop of currentRoute.stops">
        <div class="stop-number">{{ stop.stop_order }}</div>
        <div class="details">
          <strong>{{ stop.customer_name }}</strong>
          <span>{{ stop.address }}</span>
          <small>{{ stop.time_condition || 'Sin condicion horaria' }}</small>
          <small>$ {{ stop.amount_to_collect || 0 }} · {{ stop.payment_method || 'Sin forma de pago' }}</small>
          <small>{{ stop.internal_notes || '' }}</small>
          <div class="actions">
            <a [href]="'https://www.google.com/maps/search/?api=1&query=' + encode(stop.address)" target="_blank">Maps</a>
            <a [href]="'https://waze.com/ul?q=' + encode(stop.address)" target="_blank">Waze</a>
            <a *ngIf="stop.phone" [href]="'tel:' + stop.phone">Llamar</a>
            <a *ngIf="stop.phone" [href]="'https://wa.me/' + cleanPhone(stop.phone)" target="_blank">WhatsApp</a>
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
      border-radius: 6px;
      background: #e7eef5;
      color: var(--text);
      padding: 0.55rem 0.7rem;
      text-decoration: none;
      font-weight: 700;
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

  mark(routeId: number, stopId: number, status: string, note?: string) {
    this.api.updateStop(routeId, stopId, status, note).subscribe((route) => this.route.set(route));
  }

  shareLocation(routeId: number) {
    navigator.geolocation?.getCurrentPosition((position) => {
      this.api.sendLocation({
        route_id: routeId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }).subscribe();
    });
  }

  encode(value: string) {
    return encodeURIComponent(`${value}, Mar del Plata, Buenos Aires`);
  }

  cleanPhone(value: string) {
    return value.replace(/\D/g, '');
  }
}
