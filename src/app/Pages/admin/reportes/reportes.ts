import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import {
  ApiService,
  VentaResumenResponse,
  CierreJornadaResponse,
  Producto,
  VendedorBackend,
} from '../../../services/api.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { ProductosService } from '../../../services/productos.service';

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
  imports: [CommonModule, AdminNavbar],
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
    private vendedoresService: VendedoresService,
    private productosService: ProductosService,
    private router: Router,
    private cdr: ChangeDetectorRef,
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
        this.ingresosTotal = ventas.reduce((s, v) => s + (v.totalEfectivo ?? 0), 0);
        this.ticketPromedio = this.totalVentas > 0 ? this.ingresosTotal / this.totalVentas : 0;

        this.discrepancias = discrepancias.map(d => ({
          nombre: d.nombre,
          stockEsperado: d.stockEsperado,
          stockActual: d.stockActual,
          diferencia: d.diferencia,
          correcto: d.correcto
        }));

        this.cargando = false;
        this.cdr.detectChanges();
        this.renderizarCharts(ventas, vendedores, productos);
      },
      error: () => {
        this.error = 'No se pudieron cargar los datos de reportes.';
        this.cargando = false;
      },
    });
  }

  // ── Chart rendering ───────────────────────────────────────────────────────

  private renderizarCharts(ventas: VentaResumenResponse[], vendedores: VendedorBackend[], productos: Producto[]): void {
    this.cargarChartJs().then(() => {
      this.renderChartVentasIngresos(ventas, vendedores);
      this.renderChartCategorias(productos);
      this.renderChartStock(productos);
      this.renderChartTendencia(ventas, vendedores);
    }).catch(() => {});
  }

  private cargarChartJs(): Promise<void> {
    if ((window as any).Chart) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('chartjs-script');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const script = document.createElement('script');
      script.id = 'chartjs-script';
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private renderChartVentasIngresos(ventas: VentaResumenResponse[], vendedores: VendedorBackend[]): void {
    const canvas = this.chartVentasIngresosRef?.nativeElement;
    if (!canvas) return;
    const Chart = (window as any).Chart;

    const ventasPorVendedor = new Map<string, { ventas: number; ingresos: number }>();
    for (const v of vendedores) {
      ventasPorVendedor.set(v.id_usuario, { ventas: 0, ingresos: 0 });
    }
    for (const venta of ventas) {
      const entry = ventasPorVendedor.get(venta.idVendedor);
      if (entry) {
        entry.ventas++;
        entry.ingresos += venta.totalEfectivo ?? 0;
      }
    }

    const labels = vendedores.map(v => v.nombre);
    const dataVentas = vendedores.map(v => ventasPorVendedor.get(v.id_usuario)?.ventas ?? 0);
    const dataIngresos = vendedores.map(v => ventasPorVendedor.get(v.id_usuario)?.ingresos ?? 0);

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Ventas', data: dataVentas, backgroundColor: '#3b82f6', borderRadius: 4 },
          { label: 'Ingresos (Bs.)', data: dataIngresos, backgroundColor: '#22c55e', borderRadius: 4 },
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
    const Chart = (window as any).Chart;

    const conteo = new Map<number, number>();
    for (const p of productos) {
      const cat = p.id_categoria ?? 0;
      conteo.set(cat, (conteo.get(cat) ?? 0) + 1);
    }

    const labels = [...conteo.keys()].map(id => id === 0 ? 'Sin categoría' : `Categoría ${id}`);
    const data = [...conteo.values()];
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

    const chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
        },
      },
    });
    this.charts.push(chart);
  }

  private renderChartStock(productos: Producto[]): void {
    const canvas = this.chartStockRef?.nativeElement;
    if (!canvas) return;
    const Chart = (window as any).Chart;

    const top = [...productos]
      .sort((a, b) => (b.stock_almacen_central ?? 0) - (a.stock_almacen_central ?? 0))
      .slice(0, 8);

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(p => p.nombre),
        datasets: [{
          label: 'Stock',
          data: top.map(p => p.stock_almacen_central ?? 0),
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
    const Chart = (window as any).Chart;

    const ventasPorVendedor = new Map<string, number>();
    for (const v of vendedores) ventasPorVendedor.set(v.id_usuario, 0);
    for (const venta of ventas) {
      const curr = ventasPorVendedor.get(venta.idVendedor) ?? 0;
      ventasPorVendedor.set(venta.idVendedor, curr + 1);
    }

    const labels = vendedores.map(v => v.nombre);
    const data = vendedores.map(v => ventasPorVendedor.get(v.id_usuario) ?? 0);

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Ventas',
          data,
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

  // ── Utilidades ────────────────────────────────────────────────────────────

  private getFechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onSignOut(): void {
    this.router.navigate(['/login']);
  }
}
