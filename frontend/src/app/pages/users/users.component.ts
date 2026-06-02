import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: 'administrador' | 'local' | 'chofer';
  store_id: number | null;
  active: boolean;
  created_at: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="users">
      <header class="head">
        <div>
          <h1>Usuarios</h1>
          <p>Gestion de cuentas y roles. Solo los administradores ven esta seccion.</p>
        </div>
        <div class="head-actions">
          <button class="ghost" (click)="load()" title="Actualizar">↻</button>
          <button (click)="openCreate()">+ Nuevo usuario</button>
        </div>
      </header>

      <span class="message" *ngIf="message()">{{ message() }}</span>

      <div class="table-wrap">
        <table class="grid-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Alta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users()" [class.inactive]="!u.active">
              <td class="strong">{{ u.name }}</td>
              <td class="mono small">{{ u.email }}</td>
              <td>
                <span class="pill" [class]="'role-' + u.role">{{ roleLabel(u.role) }}</span>
              </td>
              <td>
                <span class="dot" [class.on]="u.active" [class.off]="!u.active"></span>
                {{ u.active ? 'Activo' : 'Inactivo' }}
              </td>
              <td class="mono small">{{ shortDate(u.created_at) }}</td>
              <td class="actions">
                <button class="ghost" (click)="openEdit(u)" title="Editar">✎</button>
                <button class="ghost" (click)="openReset(u)" title="Resetear clave">🔑</button>
                <button class="ghost" (click)="toggleActive(u)" [title]="u.active ? 'Desactivar' : 'Activar'" [disabled]="isMe(u)">
                  {{ u.active ? '⏸' : '▶' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty" *ngIf="!users().length">Sin usuarios.</div>
      </div>

      <!-- Modal crear / editar -->
      <div class="drawer-bg" *ngIf="editing()" (click)="closeForm()"></div>
      <aside class="drawer" *ngIf="editing() as e">
        <form (ngSubmit)="save()">
          <div class="drawer-head">
            <div>
              <span class="eyebrow">Usuario</span>
              <h2>{{ e.id ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
            </div>
            <button class="icon" type="button" (click)="closeForm()">X</button>
          </div>

          <div class="form-grid">
            <label>Nombre completo <input name="name" required [(ngModel)]="form.name" /></label>
            <label>Email <input type="email" name="email" required [(ngModel)]="form.email" /></label>
            <label>Rol
              <select name="role" required [(ngModel)]="form.role">
                <option value="administrador">Administrador</option>
                <option value="local">Local</option>
                <option value="chofer">Chofer</option>
              </select>
            </label>
            <label *ngIf="!e.id">Clave inicial
              <div class="pass-row">
                <input name="password" required minlength="6" [(ngModel)]="form.password" placeholder="Mínimo 6 caracteres" />
                <button type="button" class="secondary" (click)="generatePassword()">Generar</button>
              </div>
            </label>
          </div>

          <div class="drawer-actions">
            <button type="submit" [disabled]="saving()">{{ saving() ? '...' : 'Guardar' }}</button>
            <button class="secondary" type="button" (click)="closeForm()">Cancelar</button>
          </div>
        </form>
      </aside>

      <!-- Modal reset -->
      <div class="drawer-bg" *ngIf="resetTarget()" (click)="closeReset()"></div>
      <aside class="drawer" *ngIf="resetTarget() as t">
        <form (ngSubmit)="doReset()">
          <div class="drawer-head">
            <div>
              <span class="eyebrow">Resetear clave</span>
              <h2>{{ t.name }}</h2>
            </div>
            <button class="icon" type="button" (click)="closeReset()">X</button>
          </div>
          <label>Nueva clave
            <div class="pass-row">
              <input name="newPass" required minlength="6" [(ngModel)]="resetPass" placeholder="Mínimo 6 caracteres" />
              <button type="button" class="secondary" (click)="generateResetPassword()">Generar</button>
            </div>
          </label>
          <p class="hint">Copiá la clave nueva antes de guardar. No vas a poder verla otra vez.</p>
          <div class="drawer-actions">
            <button type="submit" [disabled]="saving()">{{ saving() ? '...' : 'Resetear' }}</button>
            <button class="secondary" type="button" (click)="closeReset()">Cancelar</button>
          </div>
        </form>
      </aside>
    </section>
  `,
  styles: [`
    h1, h2, p { margin: 0; }
    .users { display: grid; gap: 12px; }
    .head { display: flex; justify-content: space-between; align-items: center; padding: 2px 2px 4px; }
    .head h1 { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
    .head p { color: var(--muted); font-size: 12px; margin-top: 2px; }
    .head-actions { display: flex; gap: 6px; }
    .head-actions .ghost { padding: .35rem .55rem; font-size: 14px; }
    .head-actions button { font-size: 12px; padding: .5rem .85rem; }
    .message { color: var(--rojo); font-size: 12px; font-weight: 600; }

    .table-wrap { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
    .grid-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .grid-table thead th {
      background: var(--panel-2); text-align: left;
      font-weight: 600; font-size: 11px;
      letter-spacing: .04em; text-transform: uppercase;
      color: var(--muted); padding: 8px 12px;
      border-bottom: 1px solid var(--line);
    }
    .grid-table tbody td {
      padding: 9px 12px;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    .grid-table tbody tr:last-child td { border-bottom: 0; }
    .grid-table tbody tr.inactive { opacity: .5; }
    .strong { color: var(--texto); font-weight: 600; }
    .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .small { font-size: 12px; }

    .pill {
      display: inline-block; padding: 2px 8px;
      border-radius: 999px; font-size: 11px; font-weight: 600;
      letter-spacing: .01em; border: 1px solid currentColor;
    }
    .pill.role-administrador { color: var(--rojo); background: rgba(239,68,68,.10); }
    .pill.role-local { color: var(--st-en_camino); background: rgba(56,189,248,.10); }
    .pill.role-chofer { color: var(--st-entregado); background: rgba(34,197,94,.10); }

    .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    .dot.on { background: var(--st-entregado); }
    .dot.off { background: var(--muted); }

    .actions { display: flex; gap: 4px; justify-content: flex-end; }
    .actions .ghost { padding: .25rem .5rem; font-size: 13px; }

    .empty { color: var(--muted); padding: 28px; text-align: center; font-size: 13px; }

    .drawer-bg { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); z-index: 20; }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 21;
      width: min(460px, 100vw);
      background: var(--panel); border-left: 1px solid var(--line);
      box-shadow: -8px 0 40px rgba(0,0,0,.5); overflow-y: auto;
    }
    .drawer form { display: grid; gap: 14px; padding: 18px 20px 80px; }
    .drawer-head {
      display: flex; justify-content: space-between; align-items: start;
      padding-bottom: 12px; border-bottom: 1px solid var(--line);
    }
    .eyebrow { color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
    .drawer-head h2 { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .icon {
      width: 30px; height: 30px; padding: 0; border-radius: 6px;
      background: var(--panel-2); color: var(--texto-2);
      border: 1px solid var(--line); font-size: 14px;
    }
    .form-grid { display: grid; gap: 10px; }
    .pass-row { display: flex; gap: 6px; }
    .pass-row input { flex: 1; }
    .hint { color: var(--muted); font-size: 12px; }
    .drawer-actions { display: flex; gap: 8px; position: sticky; bottom: 0; background: linear-gradient(180deg, transparent, var(--panel) 30%); padding: 14px 0 4px; }
  `]
})
export class UsersComponent implements OnInit {
  users = signal<UserRow[]>([]);
  editing = signal<Partial<UserRow> | null>(null);
  resetTarget = signal<UserRow | null>(null);
  saving = signal(false);
  message = signal('');
  form: any = { name: '', email: '', role: 'local', password: '' };
  resetPass = '';

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.listUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (e) => this.message.set(e.error?.error || 'No se pudo cargar usuarios.')
    });
  }

  openCreate() {
    this.form = { name: '', email: '', role: 'local', password: '' };
    this.editing.set({});
  }

  openEdit(u: UserRow) {
    this.form = { name: u.name, email: u.email, role: u.role };
    this.editing.set(u);
  }

  closeForm() {
    this.editing.set(null);
    this.message.set('');
  }

  save() {
    const e = this.editing();
    if (!e) return;
    this.saving.set(true);
    this.message.set('');

    const obs = e.id
      ? this.api.updateUser(e.id, { name: this.form.name, email: this.form.email, role: this.form.role })
      : this.api.createUser({
          name: this.form.name,
          email: this.form.email,
          role: this.form.role,
          password: this.form.password
        });

    obs.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (err) => { this.saving.set(false); this.message.set(err.error?.error || 'No se pudo guardar.'); }
    });
  }

  toggleActive(u: UserRow) {
    if (this.isMe(u)) return;
    this.api.updateUser(u.id, { active: !u.active }).subscribe({
      next: () => this.load(),
      error: (e) => this.message.set(e.error?.error || 'No se pudo cambiar el estado.')
    });
  }

  openReset(u: UserRow) {
    this.resetPass = '';
    this.resetTarget.set(u);
  }

  closeReset() {
    this.resetTarget.set(null);
    this.resetPass = '';
  }

  doReset() {
    const t = this.resetTarget();
    if (!t || !this.resetPass) return;
    this.saving.set(true);
    this.api.resetUserPassword(t.id, this.resetPass).subscribe({
      next: () => { this.saving.set(false); this.closeReset(); this.load(); },
      error: (e) => { this.saving.set(false); this.message.set(e.error?.error || 'No se pudo resetear.'); }
    });
  }

  generatePassword() { this.form.password = this.randomPass(); }
  generateResetPassword() { this.resetPass = this.randomPass(); }

  isMe(u: UserRow) {
    return this.auth.user()?.id === u.id;
  }

  roleLabel(role: string) {
    return { administrador: 'Administrador', local: 'Local', chofer: 'Chofer' }[role] || role;
  }

  shortDate(value?: string) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-AR');
  }

  private randomPass() {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    for (const n of arr) out += chars[n % chars.length];
    return out;
  }
}
