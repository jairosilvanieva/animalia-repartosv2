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

      <div class="paste-box">
        <div class="paste-head">
          <span>📋 Pegar pedido de WhatsApp</span>
          <small>Pegá el mensaje y tocá Autocompletar. Despues revisá los campos antes de guardar.</small>
        </div>
        <textarea rows="6" name="pasteText" [(ngModel)]="pasteText"
          placeholder="Nombre: ...&#10;Teléfono: ...&#10;Dirección: ...&#10;Forma de pago / promoción:&#10;...&#10;Productos:&#10;..."></textarea>
        <div class="paste-actions">
          <button type="button" class="paste-fill" (click)="parsePaste()">Autocompletar</button>
          <button type="button" class="paste-clear" (click)="clearPaste()">Limpiar</button>
          <span class="paste-msg" [class.warn]="pasteWarn" *ngIf="pasteMessage">{{ pasteMessage }}</span>
        </div>
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
      background: var(--panel);
      color: var(--texto);
      border: 1.5px solid var(--gris-l);
      border-radius: 12px;
      padding: 18px;
      box-shadow: 0 4px 14px rgba(154, 15, 8, .06);
    }
    .form-head h1 { font-size: 22px; font-weight: 700; letter-spacing: -.01em; }
    .form-head p { color: var(--muted); font-weight: 500; font-size: 13px; }
    .paste-box {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--rojo);
      border-radius: 10px;
      background: var(--rojo-l);
    }
    .paste-head { display: grid; gap: 3px; }
    .paste-head span { font-size: 14px; font-weight: 800; color: var(--texto); }
    .paste-head small { font-size: 12px; color: var(--muted); }
    .paste-box textarea {
      width: 100%;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 12px;
      resize: vertical;
    }
    .paste-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .paste-fill {
      background: var(--rojo);
      color: #fff;
      border: none;
      padding: 10px 16px;
      font-weight: 800;
    }
    .paste-clear {
      background: var(--panel);
      color: var(--texto);
      border: 1.5px solid var(--gris-l);
      padding: 10px 14px;
    }
    .paste-msg { font-size: 12px; font-weight: 700; color: var(--st-entregado); }
    .paste-msg.warn { color: var(--naranja); }
    .eyebrow {
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .section-title span {
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .section-title hr { flex: 1; border: 0; border-top: 1px solid var(--line); }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .actions p { color: var(--rojo); font-weight: 500; font-size: 13px; }
    .product-editor {
      display: grid;
      gap: 8px;
      padding: 10px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--panel-2);
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
      background: var(--panel);
      color: var(--texto);
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
  pasteText = '';
  pasteMessage = '';
  pasteWarn = false;
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
    this.message = 'Guardando pedido...';
    this.api.createManualOrder({
      ...this.model,
      productos: this.productPayload()
    }).subscribe({
      next: () => {
        this.message = 'Pedido guardado.';
        this.pasteText = '';
        this.pasteMessage = '';
        this.pasteWarn = false;
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
      },
      error: (error) => {
        if (error.status === 401) {
          this.message = 'Sesion vencida. Toca Salir y volve a ingresar.';
          return;
        }
        if (error.status === 0) {
          this.message = 'No hay conexion con el backend. Verifica que npm run dev:backend este corriendo.';
          return;
        }
        this.message = error.error?.error || `No se pudo guardar el pedido. Error ${error.status || 'desconocido'}.`;
      }
    });
  }

  // Toma un pedido pegado de WhatsApp y completa el formulario.
  // No guarda: siempre queda para que el usuario revise y toque Guardar.
  parsePaste() {
    const text = this.pasteText || '';
    if (!text.trim()) {
      this.pasteWarn = true;
      this.pasteMessage = 'Pega primero el pedido de WhatsApp.';
      return;
    }

    const grab = (re: RegExp) => {
      const m = text.match(re);
      return m ? m[1].trim() : '';
    };

    const cliente = grab(/Nombre:\s*(.+)/i);
    if (cliente) this.model.cliente = cliente;

    const telefono = grab(/Tel[eé]fono:\s*(.+)/i);
    if (telefono) this.model.telefono = telefono;

    const domicilio = grab(/Direcci[oó]n:\s*(.+)/i);
    if (domicilio) this.model.domicilio = domicilio;

    // Forma de pago: la primera linea no vacia despues del encabezado.
    const lines = text.split(/\r?\n/);
    const payIdx = lines.findIndex((l) => /forma de pago/i.test(l));
    let payLine = '';
    if (payIdx >= 0) {
      for (let i = payIdx + 1; i < lines.length; i++) {
        if (lines[i].trim()) { payLine = lines[i].trim(); break; }
      }
    }
    const formaPago = this.mapPago(payLine);
    if (formaPago) this.model.forma_pago = formaPago;

    const total = this.parseMoney(grab(/Total estimado[^$]*\$?\s*([\d.,]+)/i));
    if (total) this.model.total = total;

    // Notas / Horario -> observaciones (+ intento de rango horario y fecha).
    const notas = grab(/Notas\s*\/\s*Horario:\s*(.+)/i);
    if (notas) this.model.observaciones = notas;

    const rango = notas.match(/(\d{1,2})\s*(?:-|a)\s*(\d{1,2})\s*h/i);
    if (rango) {
      this.model.rango_horario_desde = rango[1].padStart(2, '0') + ':00';
      this.model.rango_horario_hasta = rango[2].padStart(2, '0') + ':00';
    }

    const fecha = notas.match(/(\d{1,2})\/(\d{1,2})/);
    if (fecha) {
      const year = new Date().getFullYear();
      this.model.fecha_reparto = `${year}-${fecha[2].padStart(2, '0')}-${fecha[1].padStart(2, '0')}`;
    }

    // Productos: pares Producto/Cantidad (tolera con o sin "- Código").
    const prods: { product_name: string; quantity: number }[] = [];
    const re = /Producto:\s*(.+?)[\r\n]+\s*Cantidad:\s*(\d+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      prods.push({ product_name: m[1].trim(), quantity: Number(m[2]) || 1 });
    }
    if (prods.length) this.productItems = prods;

    const esRetiro = /retira en/i.test(text) && !domicilio;
    if (esRetiro) {
      this.pasteWarn = true;
      this.pasteMessage = 'Es un RETIRO en sucursal: por ahora cargalo en el modulo Retiros. Complete lo que pude, revisa antes de guardar.';
    } else {
      this.pasteWarn = false;
      this.pasteMessage = `Listo: ${prods.length} producto(s) cargado(s). Revisa los campos y toca Guardar.`;
    }
  }

  clearPaste() {
    this.pasteText = '';
    this.pasteMessage = '';
    this.pasteWarn = false;
  }

  private mapPago(line: string): string {
    const t = (line || '').toLowerCase();
    if (!t) return '';
    if (t.includes('bbva') && t.includes('modo')) return 'BBVA + MODO';
    if (t.includes('bbva') && t.includes('40')) return 'BBVA tarjeta - 40%';
    if (t.includes('bbva') && t.includes('10%')) return 'BBVA 10% + 3 cuotas';
    if (t.includes('galicia') && t.includes('modo')) return 'Galicia + MODO';
    if (t.includes('galicia')) return 'Galicia tarjeta fisica';
    if (t.includes('cuenta dni')) return 'Cuenta DNI';
    if (t.includes('provincia')) return 'Bco. Provincia credito';
    if (t.includes('modo')) return 'MODO - 20%';
    if (t.includes('efectivo')) return 'Efectivo';
    if (t.includes('transferencia') || t.includes('1 pago')) return 'Tarjeta 1 pago / Transf.';
    if (t.includes('3 cuota')) return 'Tarjeta 3 cuotas';
    if (t.includes('local')) return 'Pago en local';
    return '';
  }

  // Formato argentino: "." separa miles y "," decimales. "$12.169" -> 12169.
  private parseMoney(raw: string): number {
    if (!raw) return 0;
    const clean = raw.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const n = Number(clean);
    return isNaN(n) ? 0 : n;
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
