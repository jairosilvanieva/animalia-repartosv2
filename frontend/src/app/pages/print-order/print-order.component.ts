import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Order } from '../../core/api.service';

@Component({
  selector: 'app-print-order',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="print-page" *ngIf="order() as o">
      <div class="line">========================</div>
      <div class="header">ANIMALIA REPARTOS</div>
      <div class="centered">Pedido #{{ o.id }}</div>
      <div class="centered">{{ today }}</div>
      <div class="line">========================</div>
      <br>

      <div class="section">CLIENTE</div>
      <div>{{ o.customer_name }}</div>
      <div *ngIf="o.dni">DNI: {{ o.dni }}</div>
      <div *ngIf="o.phone">Tel: {{ o.phone }}</div>
      <br>

      <div class="section">ENTREGA</div>
      <div>{{ o.address }}</div>
      <div *ngIf="o.between_streets">e/ {{ o.between_streets }}</div>
      <div>{{ o.city || 'Mar del Plata' }}<ng-container *ngIf="o.postal_code"> - {{ o.postal_code }}</ng-container></div>
      <div *ngIf="timeRange(o)">Horario: {{ timeRange(o) }}</div>
      <div *ngIf="o.scheduled_delivery_date">Reparto: {{ formatDate(o.scheduled_delivery_date) }}</div>
      <br>

      <ng-container *ngIf="o.items && o.items.length">
        <div class="section">PRODUCTOS</div>
        <div *ngFor="let item of o.items">
          {{ formatQty(item.quantity) }} x {{ item.product_name }}
        </div>
        <br>
      </ng-container>

      <div class="section">PAGO</div>
      <div *ngIf="o.subtotal && o.subtotal > 0">Subtotal:   $ {{ o.subtotal | number:'1.0-0' }}</div>
      <div *ngIf="o.discounts && o.discounts > 0">Descuentos: $ {{ o.discounts | number:'1.0-0' }}</div>
      <div><b>TOTAL:      $ {{ (o.total || 0) | number:'1.0-0' }}</b></div>
      <br>
      <div *ngIf="o.payment_method">Forma: {{ o.payment_method }}</div>
      <div>Estado: {{ paymentLabel(o.payment_status) }}</div>
      <div *ngIf="o.payment_status !== 'cobrado' && o.amount_to_collect">
        A cobrar: $ {{ o.amount_to_collect | number:'1.0-0' }}
      </div>

      <ng-container *ngIf="o.customer_note">
        <br>
        <div class="section">NOTA CLIENTE</div>
        <div class="wrap">{{ o.customer_note }}</div>
      </ng-container>

      <ng-container *ngIf="o.internal_notes">
        <br>
        <div class="section">OBSERVACIONES INTERNAS</div>
        <div class="wrap">{{ o.internal_notes }}</div>
      </ng-container>

      <br>
      <div class="line">------------------------</div>
      <br>
      <div>Firma: ________________</div>
      <br><br>
      <div class="line">========================</div>
      <br>

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
      font-size: 12pt;
      line-height: 1.35;
      width: 80mm;
      max-width: 80mm;
      margin: 20px auto;
      padding: 10px;
      color: black;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,.15);
    }
    .header {
      font-weight: bold;
      font-size: 14pt;
      text-align: center;
    }
    .centered { text-align: center; }
    .section {
      font-weight: bold;
      margin-bottom: 2px;
    }
    .line { text-align: center; }
    .wrap { white-space: pre-wrap; }
    .no-print {
      margin-top: 20px;
      display: flex;
      gap: 8px;
      justify-content: center;
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
      margin: 4mm;
    }
    @media print {
      :host { background: white; }
      .print-page {
        width: 100%;
        max-width: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
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
