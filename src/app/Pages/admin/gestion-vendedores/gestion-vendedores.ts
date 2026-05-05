import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { TranslateModule } from '@ngx-translate/core';
import {
  VendedorListado,
  VendedoresRegistradosComponent,
} from '../../../components/vendedores-registrados/vendedores-registrados';
import { ApiService } from '../../../services/api.service';
import { VendedoresService } from '../../../services/vendedores.service';
import { AuthService } from '../../../services/auth.service';

interface VendedorForm {
  nombre: string;
  email: string;
  password: string;
  estado: string;
}

@Component({
  selector: 'app-gestion-vendedores',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbar, VendedoresRegistradosComponent, TranslateModule],
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

  formulario: VendedorForm = this.formularioInicial();

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private vendedoresService: VendedoresService,
  ) {}

  ngOnInit(): void {
    this.cargarVendedores();
  }

  cargarVendedores(): void {
    this.cargando = true;
    this.errorMensaje = '';

    this.vendedoresService.getVendedores().subscribe({
      next: (data) => {
        this.vendedores = data;
        this.totalVendedores = data.length;
        this.enRuta = data.filter((v) => v.estado === 'EN_RUTA').length;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar vendedores:', err);
        this.errorMensaje = 'No se pudo cargar la lista de vendedores.';
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
    const confirmar = confirm(`¿Desea eliminar a ${vendedor.nombre}?`);
    if (!confirmar) return;

    this.vendedoresService.deleteVendedor(vendedor.id_usuario).subscribe({
      next: () => {
        this.cargarVendedores();
      },
      error: (err) => {
        this.errorMensaje =
          err?.error?.message ?? 'Error al eliminar el vendedor.';
      },
    });
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
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
