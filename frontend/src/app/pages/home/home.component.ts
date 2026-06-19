import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="hub">
      <header class="hub-head">
        <p class="eyebrow">Sistema interno</p>
        <h1>Animalia</h1>
        <p class="sub">Elegí el módulo que querés operar.</p>
      </header>

      <div class="cards">
        <a class="card" routerLink="/repartos">
          <span class="card-icon">🚚</span>
          <div>
            <h2>Repartos</h2>
            <p>Pedidos a domicilio, armado de rutas y vista del chofer.</p>
          </div>
        </a>

        <a class="card" routerLink="/retiros">
          <span class="card-icon">🏪</span>
          <div>
            <h2>Retiros en local</h2>
            <p>Pedidos que el cliente retira por la sucursal.</p>
          </div>
        </a>

        <a class="card" routerLink="/usuarios" *ngIf="auth.isAdmin()">
          <span class="card-icon">👥</span>
          <div>
            <h2>Usuarios</h2>
            <p>Alta, baja y modificación de usuarios del sistema.</p>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .hub {
      max-width: 760px;
      margin: 60px auto;
      padding: 0 16px;
      display: grid;
      gap: 36px;
    }
    .hub-head { text-align: center; display: grid; gap: 6px; }
    .hub-head h1 { font-size: 28px; font-weight: 800; letter-spacing: -.02em; }
    .hub-head .sub { color: var(--muted); font-size: 14px; }
    .cards { display: grid; gap: 12px; }
    .card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 22px 20px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      text-decoration: none;
      color: var(--texto);
      transition: border-color .15s, background .15s;
    }
    .card:hover { border-color: var(--rojo); background: var(--panel-2); }
    .card-icon { font-size: 32px; line-height: 1; flex-shrink: 0; }
    .card h2 { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
    .card p { font-size: 13px; color: var(--muted); margin: 0; }
  `]
})
export class HomeComponent {
  constructor(public auth: AuthService) {}
}
