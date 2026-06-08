import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  VendedorListado,
  VendedoresRegistradosComponent,
} from '../../../components/vendedores-registrados/vendedores-registrados';
import { AppModalComponent, AppModalVariant } from '../../../components/app-modal/app-modal.component';
import { ApiService } from '../../../services/api.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';

interface VendedorForm {
  nombre: string;
  email: string;
  password: string;
  estado: string;
}

@Component({
  selector: 'app-gestion-vendedores',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbar, VendedoresRegistradosComponent, AppModalComponent, TranslateModule],
  templateUrl: './gestion-vendedores.html',
  styleUrls: ['./gestion-vendedores.scss'],
})
export class GestionVendedoresComponent implements OnInit {
  vendedores: VendedorListado[] = [];
  cargando = false;
  guardando = false;
  errorMensaje = '';

  totalVendedores = 0;
  enRuta = 0;
  ventasTotales = 0;
  ingresos = 0;

  mostrarModal = false;
  editando = false;
  vendedorEditandoId?: string;
  modalState: any = {
    open: false,
    title: '',
    message: '',
    variant: 'info',
    showCancel: false,
    confirmText: '',
    cancelText: '',
    closeLabel: '',
  };
  private modalAction: (() => void) | null = null;

  formulario: VendedorForm = this.formularioInicial();

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private vendedoresService: VendedoresService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit called');
    this.modalState = this.crearModalInicial();
    this.cargarVendedores();
  }

  cargarVendedores(): void {
    console.log('cargarVendedores called');
    this.cargando = true;
    this.errorMensaje = '';

    forkJoin({
      vendedores: this.vendedoresService.getVendedores(),
      ventas: this.apiService.getVentas()
    }).subscribe({
      next: ({ vendedores, ventas }) => {
        console.log('Datos de vendedores y ventas cargados:', { vendedores, ventas });
        this.vendedores = vendedores;
        this.totalVendedores = vendedores.length;
        this.enRuta = vendedores.filter((v) => v.estado === 'EN_RUTA').length;

        // Actualizar monto vendido e ingresos
        this.ventasTotales = ventas.length;
        this.ingresos = ventas.reduce((sum, v) => sum + (v.totalEfectivo ?? 0), 0);

        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar vendedores/ventas:', err);
        this.errorMensaje = 'No se pudo cargar la lista de vendedores o las ventas.';
        this.cargando = false;
      },
    });
  }

  abrirModalNuevo(): void {
    this.editando = false;
    this.vendedorEditandoId = undefined;
    this.formulario = this.formularioInicial();
    this.errorMensaje = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.editando = false;
    this.vendedorEditandoId = undefined;
    this.formulario = this.formularioInicial();
    this.errorMensaje = '';
  }

  guardarVendedor(): void {
    if (!this.formularioValido()) {
      return;
    }

    this.guardando = true;
    this.errorMensaje = '';

    const nombre = this.formulario.nombre.trim();
    const email = this.formulario.email.trim();
    const password = this.formulario.password;

    if (this.editando && this.vendedorEditandoId) {
      const payload: {
        nombre?: string;
        email?: string;
        password?: string;
        estado?: string;
      } = {
        nombre,
        email,
        estado: this.formulario.estado,
      };

      if (password.trim()) {
        payload.password = password;
      }

      this.vendedoresService.updateVendedor(this.vendedorEditandoId, payload).subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarModal();
          this.cargarVendedores();
        },
        error: (err) => {
          this.guardando = false;
          this.errorMensaje =
            err?.error?.message ?? 'Error al actualizar el vendedor.';
        },
      });
      return;
    }

    this.vendedoresService
      .createVendedor({
        nombre,
        email,
        password,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarModal();
          this.cargarVendedores();
        },
        error: (err) => {
          this.guardando = false;
          this.errorMensaje =
            err?.error?.message ?? 'Error al registrar el vendedor.';
        },
      });
  }

  editar(vendedor: VendedorListado): void {
    this.editando = true;
    this.vendedorEditandoId = vendedor.id_usuario;
    this.formulario = {
      nombre: vendedor.nombre,
      email: vendedor.email,
      password: '',
      estado: vendedor.estado,
    };
    this.errorMensaje = '';
    this.mostrarModal = true;
  }

  eliminar(vendedor: VendedorListado): void {
    this.abrirModalConfirmacion(
      this.translate.instant('COMMON.CONFIRM'),
      this.translate.instant('ADMIN.GESTION.VENDOR.CONFIRM.DELETE_VENDOR', { name: vendedor.nombre }),
      () => {
        this.vendedoresService.deleteVendedor(vendedor.id_usuario).subscribe({
          next: () => {
            this.cargarVendedores();
            this.abrirModalMensaje(
              this.translate.instant('COMMON.SUCCESS'),
              this.translate.instant('ADMIN.GESTION.VENDOR.SUCCESS.DELETED'),
              'success'
            );
          },
          error: (err) => {
            this.abrirModalMensaje(
              this.translate.instant('COMMON.ERROR'),
              err?.error?.message ?? this.translate.instant('ADMIN.GESTION.VENDOR.ERROR.DELETE'),
              'error'
            );
          },
        });
      },
      this.translate.instant('COMMON.DELETE')
    );
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
  }

  cerrarModalMensaje(): void {
    this.modalState = this.crearModalInicial();
    this.modalAction = null;
  }

  confirmarModalMensaje(): void {
    const accion = this.modalAction;
    this.cerrarModalMensaje();
    accion?.();
  }

  private abrirModalMensaje(title: string, message: string, variant: AppModalVariant): void {
    this.modalState = {
      open: true,
      title,
      message,
      variant,
      showCancel: false,
      confirmText: this.translate.instant('COMMON.ACCEPT'),
      cancelText: this.translate.instant('COMMON.CANCEL'),
      closeLabel: this.translate.instant('COMMON.CLOSE'),
    };
    this.modalAction = null;
  }

  private abrirModalConfirmacion(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string
  ): void {
    this.modalState = {
      open: true,
      title,
      message,
      variant: 'confirm',
      showCancel: true,
      confirmText,
      cancelText: this.translate.instant('COMMON.CANCEL'),
      closeLabel: this.translate.instant('COMMON.CLOSE'),
    };
    this.modalAction = onConfirm;
  }

  private crearModalInicial(): { open: boolean; title: string; message: string; variant: AppModalVariant; showCancel: boolean; confirmText: string; cancelText: string; closeLabel: string; } {
    return {
      open: false,
      title: '',
      message: '',
      variant: 'info',
      showCancel: false,
      confirmText: this.translate.instant('COMMON.ACCEPT'),
      cancelText: this.translate.instant('COMMON.CANCEL'),
      closeLabel: this.translate.instant('COMMON.CLOSE'),
    };
  }

  private formularioInicial(): VendedorForm {
    return { nombre: '', email: '', password: '', estado: 'ACTIVO' };
  }

  private formularioValido(): boolean {
    if (!this.formulario.nombre.trim()) {
      this.errorMensaje = 'El nombre es requerido.';
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formulario.email.trim())) {
      this.errorMensaje = 'Ingresa un email válido.';
      return false;
    }
    if (!this.editando && this.formulario.password.length < 4) {
      this.errorMensaje = 'La contraseña debe tener al menos 4 caracteres.';
      return false;
    }

    if (
      this.editando &&
      this.formulario.password.trim().length > 0 &&
      this.formulario.password.trim().length < 4
    ) {
      this.errorMensaje =
        'Si ingresas contraseña, debe tener al menos 4 caracteres.';
      return false;
    }

    return true;
  }
}
