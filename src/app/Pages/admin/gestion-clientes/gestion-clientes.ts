import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { ClientesService } from '../../../services/clientes.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { Cliente, VendedorBackend, UpdateClientePayload } from '../../../services/api.service';

interface VendedorRow {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  expandido: boolean;
  clientes: Cliente[];
}

interface ClienteForm {
  nombreNegocio: string;
  ciNit: string;
  celular: string;
  frecuenciaVisita: string;
  estado: string;
}

@Component({
  selector: 'app-gestion-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbar, TranslateModule],
  templateUrl: './gestion-clientes.html',
  styleUrls: ['./gestion-clientes.scss'],
})
export class GestionClientesComponent implements OnInit {

  grupos: VendedorRow[] = [];
  cargando = false;
  error = '';

  mostrarModal = false;
  guardando = false;
  errorModal = '';
  clienteEditandoId = '';
  formulario: ClienteForm = this.formularioInicial();

  constructor(
    private clientesService: ClientesService,
    private vendedoresService: VendedoresService,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    this.vendedoresService.getVendedores().pipe(
      switchMap((vendedores: VendedorBackend[]) => {
        if (vendedores.length === 0) return of([] as VendedorRow[]);

        const peticiones = vendedores.map(v =>
          this.clientesService.getClientes(v.id_usuario).pipe(
            catchError(() => of([] as Cliente[])),
          ).pipe(
            switchMap(clientes => of({
              id: v.id_usuario,
              nombre: v.nombre,
              email: v.email,
              estado: v.estado,
              expandido: false,
              clientes,
            } as VendedorRow))
          )
        );

        return forkJoin(peticiones);
      }),
      catchError(() => {
        this.error = this.translate.instant('ADMIN.CLIENTES.ERROR.LOAD_FAILED');
        return of([] as VendedorRow[]);
      })
    ).subscribe(grupos => {
      this.grupos = grupos;
      if (grupos.length > 0) grupos[0].expandido = true;
      this.cargando = false;
    });
  }

  get totalClientes(): number {
    return this.grupos.reduce((sum, g) => sum + g.clientes.length, 0);
  }

  get clientesActivos(): number {
    return this.grupos.reduce(
      (sum, g) => sum + g.clientes.filter(c => c.estado?.toUpperCase() === 'ACTIVO').length,
      0,
    );
  }

  get clientesInactivos(): number {
    return this.grupos.reduce(
      (sum, g) => sum + g.clientes.filter(c => c.estado?.toUpperCase() !== 'ACTIVO').length,
      0,
    );
  }

  toggleVendedor(grupo: VendedorRow): void {
    grupo.expandido = !grupo.expandido;
  }

  getInitials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  getFrecuenciaLabel(frecuencia: string): string {
    const labels: Record<string, string> = {
      diaria: 'VENDEDOR.MAP.FREQUENCY_DAILY', semanal: 'VENDEDOR.MAP.FREQUENCY_WEEKLY', quincenal: 'VENDEDOR.MAP.FREQUENCY_BIWEEKLY', mensual: 'VENDEDOR.MAP.FREQUENCY_MONTHLY',
      DIARIA: 'VENDEDOR.MAP.FREQUENCY_DAILY', SEMANAL: 'VENDEDOR.MAP.FREQUENCY_WEEKLY', QUINCENAL: 'VENDEDOR.MAP.FREQUENCY_BIWEEKLY', MENSUAL: 'VENDEDOR.MAP.FREQUENCY_MONTHLY',
    };
    return this.translate.instant(labels[frecuencia] ?? frecuencia);
  }

  getEstadoClienteLabel(estado: string | undefined): string {
    const keys: Record<string, string> = {
      ACTIVO: 'ADMIN.CLIENTES.STATUS.ACTIVE',
      INACTIVO: 'ADMIN.CLIENTES.STATUS.INACTIVE',
      'EN RUTA': 'ADMIN.MONITOR.STATUS.EN_ROUTE',
    };
    return this.translate.instant(keys[estado?.toUpperCase() ?? ''] ?? estado ?? '');
  }

  esActivo(estado: string | undefined): boolean {
    return estado?.toUpperCase() === 'ACTIVO';
  }

  abrirModalEditar(cliente: Cliente): void {
    this.clienteEditandoId = cliente.id_cliente ?? '';
    this.formulario = {
      nombreNegocio: cliente.nombre_negocio,
      ciNit: cliente.ci_nit,
      celular: cliente.celular ?? '',
      frecuenciaVisita: cliente.frecuencia_visita?.toLowerCase() || 'semanal',
      estado: cliente.estado?.toUpperCase() === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
    };
    this.errorModal = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.clienteEditandoId = '';
    this.formulario = this.formularioInicial();
    this.errorModal = '';
  }

  guardarCambios(): void {
    if (!this.clienteEditandoId) return;
    if (!this.formulario.nombreNegocio.trim() || !this.formulario.ciNit.trim()) {
      this.errorModal = this.translate.instant('ADMIN.CLIENTES.ERROR.REQUIRED_FIELDS');
      return;
    }

    this.guardando = true;
    this.errorModal = '';

    const payload: UpdateClientePayload = {
      nombreNegocio: this.formulario.nombreNegocio.trim(),
      ciNit: this.formulario.ciNit.trim(),
      celular: this.formulario.celular.trim() || undefined,
      frecuenciaVisita: this.formulario.frecuenciaVisita,
      estado: this.formulario.estado,
    };

    this.clientesService.updateCliente(this.clienteEditandoId, payload).subscribe({
      next: (actualizado) => {
        for (const grupo of this.grupos) {
          const idx = grupo.clientes.findIndex(c => c.id_cliente === this.clienteEditandoId);
          if (idx !== -1) {
            grupo.clientes[idx] = actualizado;
            break;
          }
        }
        this.guardando = false;
        this.cerrarModal();
      },
      error: () => {
        this.errorModal = this.translate.instant('ADMIN.CLIENTES.ERROR.UPDATE_FAILED');
        this.guardando = false;
      },
    });
  }

  toggleEstadoCliente(cliente: Cliente): void {
    const nuevoEstado = this.esActivo(cliente.estado) ? 'INACTIVO' : 'ACTIVO';

    this.clientesService.updateCliente(cliente.id_cliente!, { estado: nuevoEstado }).subscribe({
      next: (actualizado) => {
        cliente.estado = actualizado.estado;
      },
      error: () => {},
    });
  }

  onSignOut(): void {
    this.router.navigate(['/login']);
  }

  private formularioInicial(): ClienteForm {
    return { nombreNegocio: '', ciNit: '', celular: '', frecuenciaVisita: 'semanal', estado: 'ACTIVO' };
  }
}
