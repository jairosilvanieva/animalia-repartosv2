import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PAYMENT_METHODS } from '../../shared/payment-methods';

@Component({
  selector: 'app-manual-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="manual" (ngSubmit)="save()">
      <div class="form-head">
        <span class="eyebrow">Nuevo pedido</span>
        <h1>Carga manual</h1>
        <p>Para ventas telefonicas, WhatsApp o pedidos internos. Todos salen desde Sarmiento 2790.</p>
      </div>

      <div class="section-title"><span>Cliente y entrega</span><hr /></div>
      <div class="grid two">
        <label>Fecha de reparto <input type="date" name="fecha_reparto" [(ngModel)]="model.fecha_reparto" required /></label>
        <label>Cliente <input name="cliente" [(ngModel)]="model.cliente" required /></label>
        <label>Telefono <input name="telefono" [(ngModel)]="model.telefono" /></label>
        <label>Domicilio <input name="domicilio" [(ngModel)]="model.domicilio" required /></label>
        <label>Entre calles <input name="entre_calles" [(ngModel)]="model.entre_calles" /></label>
        <label>Desde <input type="time" name="rango_horario_desde" [(ngModel)]="model.rango_horario_desde" /></label>
        <label>Hasta <input type="time" name="rango_horario_hasta" [(ngModel)]="model.rango_horario_hasta" /></label>
      </div>

      <div class="section-title"><span>Pedido y pago</span><hr /></div>
      <div class="grid two">
        <label>Forma de pago
          <select name="forma_pago" [(ngModel)]="model.forma_pago">
            <option value="">Sin definir</option>
            <option *ngFor="let method of paymentMethods" [value]="method">{{ method }}</option>
          </select>
        </label>
        <label>Importe a cobrar <input type="number" name="importe_a_cobrar" [(ngModel)]="model.importe_a_cobrar" /></label>
        <label>Estado
          <select name="estado" [(ngModel)]="model.estado">
            <option value="pendiente">Pendiente</option>
            <option value="en_camino">En camino</option>
            <option value="entregado">Entregado</option>
            <option value="no_entregado">No entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
      </div>

      <label>Productos <textarea rows="5" name="productos" [(ngModel)]="model.productos"></textarea></label>
      <label>Observaciones <textarea rows="3" name="observaciones" [(ngModel)]="model.observaciones"></textarea></label>

      <div class="actions">
        <button>Guardar pedido</button>
        <p>{{ message }}</p>
      </div>
    </form>
  `,
  styles: [`
    h1, p { margin: 0; }
    .manual {
      max-width: 900px;
      margin: 0 auto;
      display: grid;
      gap: 14px;
      background: #fff;
      border: 1.5px solid var(--gris-l);
      border-radius: 12px;
      padding: 18px;
      box-shadow: 0 4px 14px rgba(154, 15, 8, .06);
    }
    .form-head h1 {
      font-size: 28px;
      font-weight: 900;
    }
    .form-head p {
      color: var(--gris);
      font-weight: 600;
    }
    .eyebrow {
      color: var(--rojo);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .8px;
      text-transform: uppercase;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .section-title span {
      background: var(--rojo);
      color: #fff;
      border-radius: 5px;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .section-title hr {
      flex: 1;
      border: 0;
      border-top: 2px solid var(--gris-l);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .actions p {
      color: var(--rojo);
      font-weight: 900;
    }
  `]
})
export class ManualOrderComponent {
  message = '';
  paymentMethods = PAYMENT_METHODS;
  model = {
    cliente: '',
    fecha_reparto: new Date().toISOString().slice(0, 10),
    telefono: '',
    domicilio: '',
    entre_calles: '',
    productos: '',
    forma_pago: '',
    importe_a_cobrar: 0,
    rango_horario_desde: '',
    rango_horario_hasta: '',
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
      this.model.fecha_reparto = new Date().toISOString().slice(0, 10);
      this.model.rango_horario_desde = '';
      this.model.rango_horario_hasta = '';
    });
  }
}
