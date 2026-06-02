import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiUrl;
  user = signal<any>(JSON.parse(localStorage.getItem('animalia_user') || 'null'));

  isAuthenticated() {
    return !!localStorage.getItem('animalia_token') && !!this.user();
  }
  isStaff() {
    const role = this.user()?.role;
    return role === 'administrador' || role === 'local';
  }
  isAdmin() {
    return this.user()?.role === 'administrador';
  }
  isDriver() {
    return this.user()?.role === 'chofer';
  }

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      tap((response) => {
        localStorage.setItem('animalia_token', response.token);
        localStorage.setItem('animalia_user', JSON.stringify(response.user));
        this.user.set(response.user);
      })
    );
  }

  logout() {
    localStorage.removeItem('animalia_token');
    localStorage.removeItem('animalia_user');
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }
}
