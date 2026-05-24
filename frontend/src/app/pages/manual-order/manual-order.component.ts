import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-manual-order',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="panel grid" (ngSubmit)="save()">
      <h1>Carga manual</h1>
      <div class="grid two">
        <label>Cliente <input name="cliente" [(ngModel)]="model.cliente" required /></label>
        <label>Telefono <input name="telefono" [(ngModel)]="model.telefono" /></label>
        <label>Domicilio <input name="domicilio" [(ngModel)]="model.domicilio" required /></label>
        <label>Entre calles <input name="entre_calles" [(ngModel)]="model.entre_calles" /></label>
        <label>Forma de pago <input name="forma_pago" [(ngModel)]="model.forma_pago" /></label>
        <label>Importe a cobrar <input type="number" name="importe_a_cobrar" [(ngModel)]="model.importe_a_cobrar" /></label>
        <label>Condicion horaria <input name="condicion_horaria" [(ngModel)]="model.condicion_horaria" /></label>
        <label>Local
          <select name="local_origen" [(ngModel)]="model.local_origen">
            <option value="1">Constitucion</option>
            <option value="2">Sarmiento y Garay</option>
            <option value="3">Guemes y Roca</option>
          </select>
        </label>
      </div>
      <label>Productos <textarea rows="5" name="productos" [(ngModel)]="model.productos"></textarea></label>
      <label>Observaciones <textarea rows="3" name="observaciones" [(ngModel)]="model.observaciones"></textarea></label>
      <label>Estado
        <select name="estado" [(ngModel)]="model.estado">
          <option value="pendiente">Pendiente</option>
          <option value="en_preparacion">En preparacion</option>
          <option value="listo_para_repartir">Listo para repartir</option>
        </select>
      </label>
      <button>Guardar pedido</button>
      <p>{{ message }}</p>
    </form>
  `,
  styles: [`
    h1, p { margin: 0; }
    form { max-width: 860px; margin: 0 auto; }
    button { justify-self: start; }
    p { color: var(--brand-dark); font-weight: 700; }
  `]
})
export class ManualOrderComponent {
  message = '';
  model = {
    cliente: '',
    telefono: '',
    domicilio: '',
    entre_calles: '',
    productos: '',
    forma_pago: '',
    importe_a_cobrar: 0,
    condicion_horaria: '',
    local_origen: '2',
    observaciones: '',
    estado: 'pendiente'
  };

  constructor(private api: ApiService) {}

  save() {
    this.api.createManualOrder(this.model).subscribe(() => {
      this.message = 'Pedido guardado.';
      this.model.cliente = '';
      this.model.telefono = '';
      this.model.domicilio = '';
      this.model.productos = '';
      this.model.observaciones = '';
    });
  }
}
