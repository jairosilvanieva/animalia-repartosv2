import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

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

      <article class="route" *ngFor="let route of routes()" [class.mine]="isMine(route)">
        <div>
          <strong>{{ route.name }}</strong>
          <span>{{ route.workable_count }} pendientes · {{ route.stops_count }} pedidos · {{ route.route_date }}</span>
          <span class="badge mine" *ngIf="isMine(route)">⚡ En curso (tu ruta)</span>
          <span class="badge libre" *ngIf="!route.driver_id">Disponible</span>
        </div>
        <a [routerLink]="'/chofer/' + route.id">{{ isMine(route) ? 'Continuar →' : 'Ver / Comenzar →' }}</a>
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
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .route {
      background: var(--panel);
      color: var(--texto);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: .85rem 1rem;
      transition: border-color .15s;
    }
    .route:hover { border-color: var(--line-strong); }
    .route.mine { border-color: var(--st-en_camino); background: rgba(56,189,248,.04); }
    .badge {
      display: inline-block; padding: 1px 8px;
      border-radius: 999px; font-size: 10px; font-weight: 600;
      letter-spacing: .04em; text-transform: uppercase;
      width: fit-content;
    }
    .badge.mine { color: var(--st-en_camino); background: rgba(56,189,248,.10); border: 1px solid var(--st-en_camino); }
    .badge.libre { color: var(--muted); background: var(--panel-2); border: 1px solid var(--line); }
    .route div { display: grid; gap: .15rem; }
    .route strong { font-weight: 600; }
    p, span { color: var(--muted); font-weight: 500; font-size: 13px; }
    a, .locked {
      border-radius: 6px;
      padding: .5rem .8rem;
      font-weight: 500;
      font-size: 13px;
      text-decoration: none;
      white-space: nowrap;
    }
    a {
      color: #fff;
      background: var(--rojo);
    }
    .locked {
      color: var(--muted);
      border: 1px dashed var(--line-strong);
      background: var(--panel-2);
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

  constructor(private api: ApiService, private auth: AuthService) {}

  isMine(route: any) {
    return this.auth.user()?.id && route.driver_id === this.auth.user().id;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.listRoutes({ route_date: this.date, driver_view: '1' }).subscribe((routes) => this.routes.set(routes));
  }
}
