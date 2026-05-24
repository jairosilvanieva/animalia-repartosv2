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
        <label>Total del pedido <input type="number" name="total" [(ngModel)]="model.total" /></label>
        <label>Estado
          <select name="estado" [(ngModel)]="model.estado">
            <option value="pendiente">Pendiente</option>
            <option value="en_camino">En camino</option>
            <option value="entregado">Entregado</option>
            <option value="no_entregado">No entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
        <label class="check">
          <input type="checkbox" name="pagado" [(ngModel)]="model.pagado" />
          Pagado
        </label>
      </div>

      <div class="product-editor">
        <div class="product-editor-head">
          <strong>Productos</strong>
          <button type="button" class="secondary" (click)="addProduct()">Agregar producto</button>
        </div>
        <div class="product-row" *ngFor="let item of productItems; let i = index">
          <label>Cantidad
            <input type="number" min="1" step="1" [name]="'product_qty_' + i" [(ngModel)]="item.quantity" />
          </label>
          <label>Producto
            <input [name]="'product_name_' + i" [(ngModel)]="item.product_name" />
          </label>
          <button type="button" class="remove" (click)="removeProduct(i)" [disabled]="productItems.length === 1">Eliminar</button>
        </div>
      </div>

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
    .product-editor {
      display: grid;
      gap: 8px;
      padding: 10px;
      border-radius: 10px;
      border: 1.5px solid var(--gris-l);
      background: #f8fafc;
    }
    .product-editor-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .product-editor strong {
      font-size: 13px;
      font-weight: 900;
    }
    .product-row {
      display: grid;
      grid-template-columns: 90px 1fr auto;
      gap: 10px;
      align-items: end;
    }
    .product-row .remove {
      background: #fff;
      border: 1.5px solid var(--gris-l);
      color: var(--rojo);
      padding: 10px 12px;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--texto);
      font-weight: 800;
    }
    .check input {
      width: auto;
      accent-color: var(--rojo);
    }
    @media (max-width: 760px) {
      .product-row { grid-template-columns: 1fr; }
    }
  `]
})
export class ManualOrderComponent {
  message = '';
  paymentMethods = PAYMENT_METHODS;
  productItems = [this.emptyProduct()];
  model = {
    cliente: '',
    fecha_reparto: new Date().toISOString().slice(0, 10),
    telefono: '',
    domicilio: '',
    entre_calles: '',
    forma_pago: '',
    total: 0,
    pagado: false,
    rango_horario_desde: '',
    rango_horario_hasta: '',
    observaciones: '',
    estado: 'pendiente'
  };

  constructor(private api: ApiService) {}

  save() {
    this.api.createManualOrder({
      ...this.model,
      productos: this.productPayload()
    }).subscribe(() => {
      this.message = 'Pedido guardado.';
      this.model.cliente = '';
      this.model.telefono = '';
      this.model.domicilio = '';
      this.model.total = 0;
      this.model.pagado = false;
      this.productItems = [this.emptyProduct()];
      this.model.observaciones = '';
      this.model.fecha_reparto = new Date().toISOString().slice(0, 10);
      this.model.rango_horario_desde = '';
      this.model.rango_horario_hasta = '';
    });
  }

  addProduct() {
    this.productItems = [...this.productItems, this.emptyProduct()];
  }

  removeProduct(index: number) {
    if (this.productItems.length === 1) return;
    this.productItems = this.productItems.filter((_, itemIndex) => itemIndex !== index);
  }

  private productPayload() {
    return this.productItems
      .map((item) => ({
        product_name: String(item.product_name || '').trim(),
        quantity: Number(item.quantity || 1),
        unit_price: 0,
        total: 0
      }))
      .filter((item) => item.product_name);
  }

  private emptyProduct() {
    return { product_name: '', quantity: 1 };
  }
}
