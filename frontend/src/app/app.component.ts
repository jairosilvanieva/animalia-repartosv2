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
      padding: 0.9rem 1rem;
      background: linear-gradient(135deg, var(--rojo) 0%, var(--rojo-d) 100%);
      color: #fff;
      box-shadow: 0 2px 18px rgba(0, 0, 0, .22);
    }

    .topbar div {
      display: grid;
      gap: 0.1rem;
    }

    .topbar span {
      color: rgba(255, 255, 255, .76);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .topbar strong {
      font-size: 1.1rem;
      font-weight: 900;
      letter-spacing: 2px;
    }

    nav {
      display: flex;
      gap: 0.5rem;
    }

    a {
      color: #fff;
      text-decoration: none;
      font-weight: 900;
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
