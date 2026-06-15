import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import {
  ApiService,
  VentaResumenResponse,
  Producto,
  VendedorBackend,
} from '../../../services/api.service';
import Chart from 'chart.js/auto';

interface DiscrepanciaVendedor {
  nombre: string;
  stockEsperado: number;
  stockActual: number;
  diferencia: number;
  correcto: boolean;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, AdminNavbar, TranslateModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.scss'],
})
export class ReportesComponent implements OnInit, OnDestroy {

  @ViewChild('chartVentasIngresos', { static: false }) chartVentasIngresosRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCategorias', { static: false }) chartCategoriasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartStock', { static: false }) chartStockRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTendencia', { static: false }) chartTendenciaRef!: ElementRef<HTMLCanvasElement>;

  totalVentas = 0;
  ingresosTotal = 0;
  ticketPromedio = 0;
  discrepancias: DiscrepanciaVendedor[] = [];
  cargando = false;
  error = '';

  private charts: any[] = [];
  private fechaHoy = '';

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.fechaHoy = this.getFechaHoy();
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destruirCharts();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.destruirCharts();

    this.apiService.getReportesConsolidados(this.fechaHoy).subscribe({
      next: (reporte) => {
        const { ventas, vendedores, productos, discrepancias } = reporte;

        this.totalVentas = ventas.length;
        const rawIngresos = ventas.reduce((s, v) => s + (v.totalEfectivo ?? 0), 0);
        this.ingresosTotal = Math.round(rawIngresos * 100) / 100;
        const rawTicket = this.totalVentas > 0 ? this.ingresosTotal / this.totalVentas : 0;
        this.ticketPromedio = Math.round(rawTicket * 100) / 100;

        this.discrepancias = discrepancias.map(d => ({
          nombre: d.nombre,
          stockEsperado: d.stockEsperado,
          stockActual: d.stockActual,
          diferencia: d.diferencia,
          correcto: d.correcto,
        }));

        this.cargando = false;
        this.cdr.detectChanges();
        this.renderizarCharts(ventas, vendedores, productos);
      },
      error: () => {
        this.error = this.translate.instant('ADMIN.REPORTES.ERROR.LOAD_FAILED');
        this.cargando = false;
      },
    });
  }

  // ── Chart rendering ───────────────────────────────────────────────────────

  private renderizarCharts(ventas: VentaResumenResponse[], vendedores: VendedorBackend[], productos: Producto[]): void {
    this.renderChartVentasIngresos(ventas, vendedores);
    this.renderChartCategorias(productos);
    this.renderChartStock(productos);
    this.renderChartTendencia(ventas, vendedores);
  }

  private renderChartVentasIngresos(ventas: VentaResumenResponse[], vendedores: VendedorBackend[]): void {
    const canvas = this.chartVentasIngresosRef?.nativeElement;
    if (!canvas) return;

    const ventasPorVendedor = new Map<string, { ventas: number; ingresos: number }>();
    for (const v of vendedores) {
      const id = v.id_usuario || (v as any).id;
      ventasPorVendedor.set(id, { ventas: 0, ingresos: 0 });
    }
    for (const venta of ventas) {
      const entry = ventasPorVendedor.get(venta.idVendedor);
      if (entry) {
        entry.ventas++;
        const rawInc = (entry.ingresos ?? 0) + (venta.totalEfectivo ?? 0);
        entry.ingresos = Math.round(rawInc * 100) / 100;
      }
    }

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: vendedores.map(v => v.nombre),
        datasets: [
          {
            label: this.translate.instant('ADMIN.REPORTES.CHART.DATASET.SALES'),
            data: vendedores.map(v => ventasPorVendedor.get(v.id_usuario || (v as any).id)?.ventas ?? 0),
            backgroundColor: '#3b82f6',
            borderRadius: 4,
          },
          {
            label: this.translate.instant('ADMIN.REPORTES.CHART.DATASET.INCOME'),
            data: vendedores.map(v => ventasPorVendedor.get(v.id_usuario || (v as any).id)?.ingresos ?? 0),
            backgroundColor: '#22c55e',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false } },
        },
      },
    });
    this.charts.push(chart);
  }

  private renderChartCategorias(productos: Producto[]): void {
    const canvas = this.chartCategoriasRef?.nativeElement;
    if (!canvas) return;

    const conteo = new Map<number, number>();
    for (const p of productos) {
      const cat = p.id_categoria !== undefined ? p.id_categoria : (p as any).idCategoria;
      const catKey = cat ?? 0;
      conteo.set(catKey, (conteo.get(catKey) ?? 0) + 1);
    }

    const sinCategoria = this.translate.instant('ADMIN.REPORTES.CHART.NO_CATEGORY');
    const categoriaPrefix = this.translate.instant('ADMIN.REPORTES.CHART.CATEGORY_PREFIX');
    const labels = [...conteo.keys()].map(id =>
      id === 0 ? sinCategoria : `${categoriaPrefix} ${id}`
    );
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

    const chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: [...conteo.values()],
          backgroundColor: colors.slice(0, conteo.size),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } },
      },
    });
    this.charts.push(chart);
  }

  private renderChartStock(productos: Producto[]): void {
    const canvas = this.chartStockRef?.nativeElement;
    if (!canvas) return;

    const getStockVal = (p: any) => p.stock_almacen_central !== undefined ? p.stock_almacen_central : p.stockAlmacenCentral;

    const top = [...productos]
      .sort((a, b) => (getStockVal(b) ?? 0) - (getStockVal(a) ?? 0))
      .slice(0, 8);

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(p => p.nombre),
        datasets: [{
          label: this.translate.instant('ADMIN.REPORTES.CHART.DATASET.STOCK'),
          data: top.map(p => getStockVal(p) ?? 0),
          backgroundColor: '#6366f1',
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f0f0f0' } },
          y: { grid: { display: false } },
        },
      },
    });
    this.charts.push(chart);
  }

  private renderChartTendencia(ventas: VentaResumenResponse[], vendedores: VendedorBackend[]): void {
    const canvas = this.chartTendenciaRef?.nativeElement;
    if (!canvas) return;

    const ventasPorVendedor = new Map<string, number>();
    for (const v of vendedores) {
      const id = v.id_usuario || (v as any).id;
      ventasPorVendedor.set(id, 0);
    }
    for (const venta of ventas) {
      const sellerId = venta.idVendedor;
      const curr = ventasPorVendedor.get(sellerId) ?? 0;
      ventasPorVendedor.set(sellerId, curr + 1);
    }

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: vendedores.map(v => v.nombre),
        datasets: [{
          label: this.translate.instant('ADMIN.REPORTES.CHART.DATASET.SALES'),
          data: vendedores.map(v => ventasPorVendedor.get(v.id_usuario || (v as any).id) ?? 0),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false } },
        },
      },
    });
    this.charts.push(chart);
  }

  private destruirCharts(): void {
    this.charts.forEach(c => { try { c.destroy(); } catch {} });
    this.charts = [];
  }

  private getFechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onSignOut(): void {
    this.router.navigate(['/login']);
  }
}
