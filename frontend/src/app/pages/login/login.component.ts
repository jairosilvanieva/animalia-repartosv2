import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="panel login" (ngSubmit)="login()">
      <div class="brand">
        <span class="dot"></span>
        <strong>ANIMALIA</strong>
      </div>
      <h1>Ingresar</h1>
      <label>
        Email
        <input type="email" name="email" [(ngModel)]="email" required autocomplete="username" />
      </label>
      <label>
        Contraseña
        <div class="pass-wrap">
          <input
            [type]="showPass ? 'text' : 'password'"
            name="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password"
          />
          <button type="button" class="eye" (click)="showPass = !showPass" tabindex="-1">
            {{ showPass ? '🙈' : '👁' }}
          </button>
        </div>
      </label>
      <button [disabled]="loading">{{ loading ? 'Ingresando…' : 'Entrar' }}</button>
      <p class="err" *ngIf="error">{{ error }}</p>
    </form>
  `,
  styles: [`
    .login {
      max-width: 360px;
      margin: 10vh auto 0;
      display: grid;
      gap: 1.1rem;
    }
    h1 { margin: 0; font-size: 20px; }
    .brand { display: flex; align-items: center; gap: 8px; }
    .brand strong { font-size: 13px; font-weight: 800; letter-spacing: .18em; color: var(--texto); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--rojo); box-shadow: 0 0 10px var(--rojo); display: inline-block; }
    .pass-wrap { position: relative; display: flex; }
    .pass-wrap input { padding-right: 2.4rem; }
    .eye {
      position: absolute; right: 0; top: 0; bottom: 0;
      width: 2.2rem;
      background: transparent; border: none; color: var(--muted);
      font-size: 14px; cursor: pointer; padding: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .eye:hover { color: var(--texto); background: transparent; }
    .err { margin: 0; color: var(--danger); font-size: 13px; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  showPass = false;
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl(this.auth.isDriver() ? '/chofer' : '/'),
      error: () => { this.error = 'Email o contraseña incorrectos.'; this.loading = false; }
    });
  }
}
