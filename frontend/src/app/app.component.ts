import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf],
  template: `
    <header class="topbar">
      <div>
        <strong>ANIMALIA</strong>
        <span>Repartos - Base Sarmiento 2790</span>
      </div>
      <nav>
        <ng-container *ngIf="auth.isStaff()">
          <a routerLink="/">Pedidos</a>
          <a routerLink="/cargar">Carga manual</a>
          <a routerLink="/rutas">Rutas</a>
          <a routerLink="/historial">Historial</a>
        </ng-container>
        <a routerLink="/chofer" *ngIf="auth.isDriver() || auth.isStaff()">Vista chofer</a>
        <a routerLink="/login" *ngIf="!auth.user()">Ingresar</a>
        <button class="secondary" *ngIf="auth.user()" (click)="auth.logout()">Salir</button>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      padding: .6rem 1rem;
      background: rgba(11, 12, 14, .72);
      backdrop-filter: saturate(140%) blur(14px);
      -webkit-backdrop-filter: saturate(140%) blur(14px);
      border-bottom: 1px solid var(--line);
      color: var(--texto);
    }
    .topbar > div { display: flex; align-items: baseline; gap: .6rem; }
    .topbar strong {
      font-size: .82rem;
      font-weight: 800;
      letter-spacing: .22em;
      color: var(--texto);
    }
    .topbar strong::before {
      content: '';
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--rojo);
      box-shadow: 0 0 12px var(--rojo);
      margin-right: .55rem;
      vertical-align: middle;
    }
    .topbar span {
      color: var(--muted);
      font-size: .72rem;
      font-weight: 500;
    }
    nav { display: flex; gap: .15rem; align-items: center; }
    nav a {
      color: var(--texto-2);
      text-decoration: none;
      font-weight: 500;
      font-size: .82rem;
      padding: .45rem .7rem;
      border-radius: var(--radius-sm);
      transition: background .15s, color .15s;
    }
    nav a:hover { background: var(--panel-2); color: var(--texto); }
    nav button { margin-left: .35rem; }
    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.1rem;
    }
    @media (max-width: 640px) {
      .topbar { align-items: flex-start; flex-direction: column; }
      nav { flex-wrap: wrap; }
    }
  `]
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
