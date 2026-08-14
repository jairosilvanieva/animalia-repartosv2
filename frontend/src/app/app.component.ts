import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './core/auth.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf],
  template: `
    <header class="topbar">
      <div>
        <a routerLink="/" class="brand" aria-label="Inicio - Animalia">
          <img src="logo-horizontal.png" alt="Animalia" />
        </a>
      </div>
      <nav>
        <!-- En home: solo link de volver si hace falta + salir -->
        <ng-container *ngIf="auth.isStaff() && !isHome">
          <a routerLink="/" class="back">← Inicio</a>

          <!-- Links de Repartos -->
          <ng-container *ngIf="inRepartos">
            <a routerLink="/repartos">Pedidos</a>
            <a routerLink="/cargar">Carga manual</a>
            <a routerLink="/rutas">Rutas</a>
            <a routerLink="/historial">Historial</a>
          </ng-container>

          <!-- Links de Retiros -->
          <ng-container *ngIf="inRetiros">
            <a routerLink="/retiros">Retiros</a>
          </ng-container>

          <!-- Usuarios solo admin, en cualquier módulo -->
          <a routerLink="/usuarios" *ngIf="auth.isAdmin() && (inRepartos || inRetiros)">Usuarios</a>
        </ng-container>

        <a routerLink="/chofer" *ngIf="auth.isDriver() || (auth.isStaff() && inRepartos)">Vista chofer</a>
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
    .topbar > div { display: flex; align-items: center; gap: .7rem; }
    .brand { display: inline-flex; align-items: center; }
    .brand img { height: 30px; width: auto; display: block; }
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
    nav a.back { color: var(--muted); font-size: .78rem; }
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
  isHome = true;
  inRepartos = false;
  inRetiros = false;

  constructor(public auth: AuthService, private router: Router) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url: string = e.urlAfterRedirects || e.url;
      this.isHome    = url === '/' || url === '';
      this.inRepartos = url.startsWith('/repartos') || url.startsWith('/cargar') || url.startsWith('/rutas') || url.startsWith('/historial') || url.startsWith('/ruta/') || url.startsWith('/imprimir/');
      this.inRetiros  = url.startsWith('/retiros');
    });
  }
}
