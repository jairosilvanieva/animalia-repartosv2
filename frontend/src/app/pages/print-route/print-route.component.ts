import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-print-route',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="print-page" *ngIf="route() as r">
      <div class="line">========================</div>
      <div class="header">ANIMALIA REPARTOS</div>
      <div class="centered">{{ r.name }}</div>
      <div class="centered">{{ formatDate(r.route_date) }}</div>
      <div class="centered">{{ r.stops?.length || 0 }} paradas</div>
      <div class="line">========================</div>
      <br>

      <div *ngFor="let stop of r.stops; let i = index" class="stop">
        <div><b>{{ i + 1 }}. {{ stop.address }}</b></div>
        <div *ngIf="stop.between_streets" class="indent">e/ {{ stop.between_streets }}</div>
        <div *ngIf="stop.customer_name" class="indent">{{ stop.customer_name }}</div>
        <div *ngIf="stop.priority" class="indent priority">⭐ PRIORIDAD</div>
        <br>
      </div>

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
      font-size: 8pt;
      line-height: 1.15;
      font-weight: bold;
      width: 80mm;
      max-width: 80mm;
      margin: 20px auto;
      padding: 6px;
      color: #000;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,.15);
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header {
      font-weight: 900;
      font-size: 10pt;
      text-align: center;
    }
    .centered { text-align: center; }
    .line { text-align: center; }
    .indent { padding-left: 14px; }
    .priority { font-weight: 900; }
    .stop { page-break-inside: avoid; margin-bottom: 4px; }
    br { line-height: 0.6; }
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
export class PrintRouteComponent implements OnInit {
  route = signal<any | null>(null);

  constructor(private routeInfo: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = this.routeInfo.snapshot.paramMap.get('id') || '';
    if (!id) return;
    this.api.getRoute(id).subscribe((r) => {
      this.route.set(r);
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
}
