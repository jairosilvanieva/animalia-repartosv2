import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-driver-routes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="grid">
      <div class="panel head">
        <div>
          <span class="eyebrow">Vista chofer</span>
          <h1>Rutas del dia</h1>
          <p>Solo aparecen rutas activas con entregas pendientes para trabajar.</p>
        </div>
        <label>Fecha <input type="date" [(ngModel)]="date" (change)="load()" /></label>
      </div>

      <article class="route" *ngFor="let route of routes()">
        <div>
          <strong>{{ route.name }}</strong>
          <span>{{ route.workable_count }} pendientes - {{ route.stops_count }} pedidos totales</span>
        </div>
        <a [routerLink]="'/chofer/' + route.id">Abrir ruta</a>
      </article>

      <div class="panel empty" *ngIf="!routes().length">
        No hay rutas activas con entregas pendientes para esta fecha.
      </div>
    </section>
  `,
  styles: [`
    h1, p { margin: 0; }
    .head, .route {
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
    .route {
      background: #fff;
      border: 1.5px solid var(--gris-l);
      border-radius: 10px;
      padding: .85rem;
    }
    .route div {
      display: grid;
      gap: .2rem;
    }
    p, span {
      color: var(--gris);
      font-weight: 700;
    }
    a, .locked {
      border-radius: 8px;
      padding: .6rem .75rem;
      font-weight: 900;
      text-decoration: none;
      white-space: nowrap;
    }
    a {
      color: #fff;
      background: var(--rojo);
    }
    .locked {
      color: var(--gris);
      border: 1.5px dashed var(--gris-l);
      background: #f8fafc;
    }
    .empty {
      color: var(--gris);
      font-weight: 800;
    }
    @media (max-width: 720px) {
      .head, .route {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `]
})
export class DriverRoutesComponent implements OnInit {
  date = new Date().toISOString().slice(0, 10);
  routes = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.listRoutes({ route_date: this.date, driver_view: '1' }).subscribe((routes) => this.routes.set(routes));
  }
}
