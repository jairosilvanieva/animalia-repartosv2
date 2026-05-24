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
      <h1>Ingresar</h1>
      <label>Email <input type="email" name="email" [(ngModel)]="email" required /></label>
      <label>Clave <input type="password" name="password" [(ngModel)]="password" required /></label>
      <button>Entrar</button>
      <p>{{ error }}</p>
    </form>
  `,
  styles: [`
    .login {
      max-width: 380px;
      margin: 8vh auto 0;
      display: grid;
      gap: 1rem;
    }
    h1, p { margin: 0; }
    p { color: var(--danger); }
  `]
})
export class LoginComponent {
  email = 'admin@animalia.local';
  password = 'admin123';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.error = 'No se pudo ingresar.'
    });
  }
}
