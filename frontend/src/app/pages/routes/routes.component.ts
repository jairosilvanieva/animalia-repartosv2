import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="rutas">
      <header class="head">
        <div>
          <h1>Rutas</h1>
          <p>Operación en curso. El historial guarda las finalizadas y canceladas.</p>
        </div>
        <button class="ghost" (click)="load()" title="Actualizar">↻</button>
      </header>

      <div class="empty" *ngIf="!routes().length">No hay rutas abiertas. Armá una desde Pedidos.</div>

      <article class="ruta" *ngFor="let r of routes()" [attr.data-status]="r.status">
        <div class="info">
          <div class="row1">
            <strong>{{ r.name }}</strong>
            <span class="pill" [class.activa]="r.status === 'activa'" [class.borrador]="r.status === 'borrador'">
              {{ statusLabel(r.status) }}
            </span>
          </div>
          <div class="row2">
            <span>{{ r.route_date }}</span>
            <span>·</span>
            <span>{{ r.stops_count }} paradas</span>
            <span>·</span>
            <span class="ok">{{ r.delivered_count }} entregadas</span>
            <span>·</span>
            <span class="alert">{{ r.not_delivered_count }} no entregadas</span>
            <span>·</span>
            <span>{{ r.workable_count }} abiertas</span>
          </div>
        </div>
        <div class="acciones">
          <a class="open" [routerLink]="'/ruta/' + r.id">Abrir</a>
          <button class="del" *ngIf="r.status === 'borrador'" (click)="remove(r.id, $event)">Eliminar</button>
        </div>
      </article>
    </section>
  `,
  styles: [`
    h1, p { margin: 0; }
    .rutas { display: grid; gap: 12px; }
    .head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 2px 2px 4px;
    }
    .head h1 { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
    .head p { color: var(--muted); font-size: 12px; margin-top: 2px; }
    .empty {
      background: var(--panel); border: 1px solid var(--line);
      border-radius: 10px; padding: 24px; text-align: center;
      color: var(--muted); font-size: 13px;
    }
    .ruta {
      display: flex; justify-content: space-between; align-items: center; gap: 12px;
      background: var(--panel); border: 1px solid var(--line);
      border-radius: 10px; padding: 12px 14px;
      transition: border-color .15s;
    }
    .ruta:hover { border-color: var(--line-strong); }
    .ruta[data-status="activa"] { border-left: 3px solid var(--st-en_camino); }
    .ruta[data-status="borrador"] { border-left: 3px solid var(--st-pendiente); }
    .info { display: grid; gap: 4px; min-width: 0; }
    .row1 { display: flex; align-items: center; gap: 10px; }
    .row1 strong { font-weight: 600; color: var(--texto); font-size: 14px; }
    .row2 { display: flex; flex-wrap: wrap; gap: 6px; color: var(--muted); font-size: 11px; }
    .row2 .ok { color: var(--st-entregado); }
    .row2 .alert { color: var(--st-no_entregado); }
    .pill {
      display: inline-block; padding: 2px 8px;
      border-radius: 999px; font-size: 10px; font-weight: 600;
      letter-spacing: .04em; text-transform: uppercase;
      border: 1px solid currentColor;
    }
    .pill.activa { color: var(--st-en_camino); background: rgba(56,189,248,.10); }
    .pill.borrador { color: var(--st-pendiente); background: rgba(245,158,11,.10); }
    .acciones { display: flex; gap: 6px; }
    .open {
      background: var(--rojo); color: #fff;
      border: 1px solid var(--rojo);
      padding: .45rem .85rem; font-size: 12px; font-weight: 600;
      border-radius: 6px; text-decoration: none;
    }
    .open:hover { background: var(--rojo-d); }
    .del {
      background: var(--panel-2); color: var(--muted);
      border: 1px solid var(--line);
      padding: .45rem .75rem; font-size: 12px; font-weight: 500;
    }
    .del:hover { color: var(--rojo); border-color: var(--rojo); background: rgba(239,68,68,.06); }
    @media (max-width: 640px) {
      .ruta { flex-direction: column; align-items: stretch; }
      .acciones { justify-content: flex-end; }
    }
  `]
})
export class RoutesComponent implements OnInit {
  routes = signal<any[]>([]);
  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() { this.load(); }

  load() {
    // Traigo borrador + activa (2 requests porque el filtro de status es exacto).
    this.api.listRoutes({ status: 'borrador' }).subscribe((b) => {
      this.api.listRoutes({ status: 'activa' }).subscribe((a) => {
        this.routes.set([...b, ...a]);
      });
    });
  }

  remove(id: number, ev: Event) {
    ev.stopPropagation();
    if (!confirm('¿Eliminar esta ruta en borrador?')) return;
    this.api.deleteRoute(id).subscribe({
      next: () => this.load(),
      error: (e) => alert(e.error?.error || 'No se pudo eliminar.')
    });
  }

  statusLabel(s: string) {
    return s === 'borrador' ? 'Preparada' : s === 'activa' ? 'En camioneta' : s;
  }
}
