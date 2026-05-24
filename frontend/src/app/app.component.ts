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
        <strong>Animalia Repartos</strong>
        <span>Sarmiento y Garay como base</span>
      </div>
      <nav>
        <a routerLink="/">Pedidos</a>
        <a routerLink="/cargar">Carga manual</a>
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
      z-index: 2;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      padding: 0.85rem 1rem;
      background: #ffffff;
      border-bottom: 1px solid var(--line);
    }

    .topbar div {
      display: grid;
      gap: 0.1rem;
    }

    .topbar span {
      color: var(--muted);
      font-size: 0.82rem;
    }

    nav {
      display: flex;
      gap: 0.5rem;
    }

    a {
      color: var(--brand-dark);
      text-decoration: none;
      font-weight: 600;
    }

    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 1rem;
    }

    @media (max-width: 640px) {
      .topbar {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `]
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
