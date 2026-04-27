import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';
import { AuthService } from '../../../services/auth.service';
import {
  ApiService,
  CierreJornadaResponse,
  CierreGuardado,
  ConfirmarCierreResponse,
  RegistrarCierrePayload
} from '../../../services/api.service';

@Component({
  selector: 'app-cierre-vendedor',
  standalone: true,
  imports: [CommonModule, FormsModule, VendedorNavbar],
  templateUrl: './cierre-vendedor.html',
  styleUrl: './cierre-vendedor.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CierreVendedor implements OnInit {

  // Datos del cierre
  cierre: CierreJornadaResponse | null = null;
  resultadoCierre: ConfirmarCierreResponse | null = null;
  cierreGuardado: CierreGuardado | null = null;
  errorGuardado: string = '';

  // Fecha de hoy en formato yyyy-MM-dd
  readonly fechaHoy: string = this.getFechaHoy();

  // Vendedor
  idVendedor: string = '';

  // Estados de UI
  cargando: boolean = false;
  enviando: boolean = false;
  error: string = '';

  // Modal confirmar cierre
  mostrarModalConfirmar: boolean = false;
  dineroContado: number | null = null;

  // Modal resultado
  mostrarModalResultado: boolean = false;

  constructor(
    private authService: AuthService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getStoredUser();
    if (user) {
      this.idVendedor = user.id_usuario || '';
    }
    this.cargarCierre();
  }

  private getFechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  cargarCierre(): void {
    if (!this.idVendedor) return;
    this.cargando = true;
    this.error = '';

    this.apiService.getCierreJornada(this.idVendedor, this.fechaHoy).subscribe({
      next: (data) => {
        this.cierre = data;
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al cargar el cierre de jornada';
        this.cargando = false;
      }
    });
  }

  abrirModalConfirmar(): void {
    this.dineroContado = null;
    this.error = '';
    this.mostrarModalConfirmar = true;
  }

  cerrarModalConfirmar(): void {
    this.mostrarModalConfirmar = false;
    this.error = '';
  }

  procesarCierre(): void {
    if (this.dineroContado === null || this.dineroContado < 0) {
      this.error = 'Ingresa el monto de dinero contado';
      return;
    }
    this.error = '';
    this.enviando = true;

    this.apiService.confirmarCierreJornada(
      this.idVendedor,
      this.fechaHoy,
      this.dineroContado
    ).subscribe({
      next: (resultado) => {
        this.resultadoCierre = resultado;
        this.mostrarModalConfirmar = false;
        this.guardarCierre(resultado);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al confirmar el cierre';
        this.enviando = false;
      }
    });
  }

  private guardarCierre(resultado: ConfirmarCierreResponse): void {
    if (!this.cierre) {
      this.mostrarModalResultado = true;
      this.enviando = false;
      return;
    }

    const payload: RegistrarCierrePayload = {
      idVendedor: this.idVendedor,
      fecha: this.fechaHoy,
      ventasRealizadas: this.cierre.resumenFinanciero.ventasRealizadas,
      totalEfectivo: this.cierre.resumenFinanciero.totalEfectivo,
      totalDescuentos: this.cierre.resumenFinanciero.totalDescuentos,
      stockInicialTotal: this.cierre.conciliacionInventario.stockInicialTotal,
      vendidosTotal: this.cierre.conciliacionInventario.vendidosTotal,
      stockFinalTotal: this.cierre.conciliacionInventario.stockFinalTotal,
      estadoInventario: this.cierre.conciliacionInventario.estadoConciliacion,
      dineroEsperado: resultado.dineroEsperado,
      dineroContado: resultado.dineroContado,
      diferencia: resultado.diferencia,
      estadoEfectivo: resultado.estadoConciliacion
    };

    this.apiService.registrarCierre(payload).subscribe({
      next: (guardado) => {
        this.cierreGuardado = guardado;
        this.errorGuardado = '';
        this.mostrarModalResultado = true;
        this.enviando = false;
      },
      error: (err) => {
        this.errorGuardado = err?.error?.message || 'El cierre fue calculado pero no se pudo guardar';
        this.mostrarModalResultado = true;
        this.enviando = false;
      }
    });
  }

  cerrarModalResultado(): void {
    this.mostrarModalResultado = false;
    this.resultadoCierre = null;
    this.cierreGuardado = null;
    this.errorGuardado = '';
  }

  get estadoConciliacionInventario(): string {
    return this.cierre?.conciliacionInventario?.estadoConciliacion ?? '';
  }

  get esConciliacionCorrecta(): boolean {
    return this.estadoConciliacionInventario === 'CORRECTO';
  }

  cerrarSesion(): void {
    this.authService.signOut().subscribe();
  }
}
