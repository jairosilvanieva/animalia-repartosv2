import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Order } from '../../core/api.service';
import { orderDisplayNumber } from '../../shared/order-number';

@Component({
  selector: 'app-print-order',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="print-page" *ngIf="order() as o">
      <div class="topline">Pedido {{ displayNumber(o) }} - {{ today }}</div>

      <div class="section">CLIENTE</div>
      <div>{{ o.customer_name }}</div>
      <div *ngIf="o.dni">DNI: {{ o.dni }}</div>
      <div *ngIf="o.phone">Tel: {{ o.phone }}</div>

      <div class="section">ENTREGA</div>
      <div>{{ o.address }}</div>
      <div *ngIf="o.between_streets">e/ {{ o.between_streets }}</div>
      <div>{{ o.city || 'Mar del Plata' }}<ng-container *ngIf="o.postal_code"> - {{ o.postal_code }}</ng-container></div>
      <div *ngIf="timeRange(o)">Horario: {{ timeRange(o) }}</div>
      <div *ngIf="o.scheduled_delivery_date">Reparto: {{ formatDate(o.scheduled_delivery_date) }}</div>

      <ng-container *ngIf="o.items && o.items.length">
        <div class="section">PRODUCTOS</div>
        <div *ngFor="let item of o.items">
          {{ formatQty(item.quantity) }} x {{ item.product_name }}
        </div>
      </ng-container>

      <div class="section">PAGO</div>
      <div *ngIf="o.subtotal && o.subtotal > 0">Subtotal:   $ {{ o.subtotal | number:'1.0-0' }}</div>
      <div *ngIf="o.discounts && o.discounts > 0">Descuentos: $ {{ o.discounts | number:'1.0-0' }}</div>
      <div>TOTAL:      $ {{ (o.total || 0) | number:'1.0-0' }}</div>
      <div *ngIf="o.payment_method">Forma: {{ o.payment_method }}</div>
      <div>Estado: {{ paymentLabel(o.payment_status) }}</div>
      <div *ngIf="o.payment_status !== 'cobrado' && o.amount_to_collect">
        A cobrar: $ {{ o.amount_to_collect | number:'1.0-0' }}
      </div>

      <ng-container *ngIf="o.customer_note">
        <div class="section">NOTA CLIENTE</div>
        <div class="wrap">{{ o.customer_note }}</div>
      </ng-container>

      <ng-container *ngIf="o.internal_notes">
        <div class="section">OBSERVACIONES</div>
        <div class="wrap">{{ o.internal_notes }}</div>
      </ng-container>

      <div class="screen-only no-print">
        <button (click)="reprint()">🖨 Reimprimir</button>
        <button (click)="close()">Cerrar</button>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      background: white;
      color: black;
    }
    .print-page {
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 10pt;
      line-height: 1.2;
      font-weight: 900;
      width: 76mm;
      max-width: 76mm;
      margin: 20px auto;
      padding: 4px;
      color: #000;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,.15);
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-text-stroke: 0.18px #000;
    }
    .topline {
      text-align: center;
      font-weight: 900;
      font-size: 12pt;
      margin-bottom: 4px;
    }
    .section {
      font-weight: 900;
      margin-top: 3px;
      margin-bottom: 0;
    }
    .wrap { white-space: pre-wrap; }
    .no-print {
      margin-top: 20px;
      display: flex;
      gap: 8px;
      justify-content: center;
      font-weight: normal;
    }
    .no-print button {
      padding: 8px 14px;
      font-size: 12px;
      background: #333;
      color: white;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
    }
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
    @media print {
      :host { background: white; }
      .print-page {
        width: 100%;
        max-width: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
        font-weight: bold;
        color: #000 !important;
      }
      .no-print { display: none !important; }
    }
  `]
})
export class PrintOrderComponent implements OnInit {
  order = signal<Order | null>(null);
  today = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  constructor(private routeInfo: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = Number(this.routeInfo.snapshot.paramMap.get('id') || 0);
    if (!id) return;
    this.api.getOrder(id).subscribe((order) => {
      this.order.set(order);
      // Esperar siguiente tick para que renderice antes de print
      setTimeout(() => window.print(), 500);
    });
  }

  reprint() { window.print(); }
  close() { window.close(); }

  displayNumber(o: Order) { return orderDisplayNumber(o as any); }

  formatDate(value?: string) {
    if (!value) return '';
    const d = value.slice(0, 10).split('-');
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : value;
  }

  formatQty(q: any) {
    const n = Number(q || 1);
    return Number.isInteger(n) ? n.toString() : n.toFixed(2);
  }

  timeRange(o: Order) {
    const s = (o.time_window_start || '').slice(0, 5);
    const e = (o.time_window_end || '').slice(0, 5);
    if (s && e) return `${s} - ${e}`;
    if (s) return `desde ${s}`;
    if (e) return `hasta ${e}`;
    return '';
  }

  paymentLabel(status?: string) {
    if (status === 'cobrado') return 'COBRADO';
    if (status === 'corroborar_pago') return 'A CORROBORAR';
    return 'A COBRAR';
  }
}
