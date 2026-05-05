import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, ClienteBackend, CreateClientePayload } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

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
  clientes: ClienteBackend[] = [];
  cargando = false;
  guardando = false;
  errorMensaje = '';

  mostrarModal = false;
  editando = false;
  clienteEditandoId?: string;

  formulario: ClienteForm = this.formularioInicial();

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  formularioInicial(): ClienteForm {
    return {
      nombreNegocio: '',
      ciNit: '',
      celular: '',
      frecuenciaVisita: 'semanal',
      estado: 'activo',
    };
  }

  cargarClientes(): void {
    this.cargando = true;
    this.errorMensaje = '';
    // For admin, we need to get all clients. Since API requires vendedorId, perhaps get all vendedores and their clients
    // For simplicity, assume we can call without param or modify API
    // TODO: Implement proper getAllClientes
    this.apiService.getVendedores().subscribe({
      next: (vendedores) => {
        const allClientes: ClienteBackend[] = [];
        let completed = 0;
        if (vendedores.length === 0) {
          this.clientes = [];
          this.cargando = false;
          return;
        }
        vendedores.forEach(vendedor => {
          this.apiService.getClientes(vendedor.id_usuario).subscribe({
            next: (clientes) => {
              allClientes.push(...clientes.map(c => ({ ...c, idVendedorCreador: vendedor.id_usuario })));
              completed++;
              if (completed === vendedores.length) {
                this.clientes = allClientes;
                this.cargando = false;
              }
            },
            error: (error) => {
              console.error('Error loading clients for vendedor', vendedor.id_usuario, error);
              completed++;
              if (completed === vendedores.length) {
                this.clientes = allClientes;
                this.cargando = false;
              }
            }
          });
        });
      },
      error: (error) => {
        this.errorMensaje = 'Error al cargar vendedores';
        this.cargando = false;
        console.error(error);
      }
    });
  }

  abrirModalCrear(): void {
    this.editando = false;
    this.formulario = this.formularioInicial();
    this.mostrarModal = true;
  }

  abrirModalEditar(cliente: ClienteBackend): void {
    this.editando = true;
    this.clienteEditandoId = cliente.id;
    this.formulario = {
      nombreNegocio: cliente.nombreNegocio,
      ciNit: cliente.ciNit || '',
      celular: cliente.celular || '',
      frecuenciaVisita: cliente.frecuenciaVisita || 'semanal',
      estado: cliente.estado || 'activo',
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.formulario = this.formularioInicial();
  }

  guardarCliente(): void {
    if (!this.formulario.nombreNegocio || !this.formulario.ciNit) {
      this.errorMensaje = 'Nombre del negocio y CI/NIT son requeridos';
      return;
    }

    this.guardando = true;
    this.errorMensaje = '';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.errorMensaje = 'Usuario no autenticado';
      this.guardando = false;
      return;
    }

    const payload: CreateClientePayload = {
      idVendedorCreador: currentUser.id_usuario,
      nombreNegocio: this.formulario.nombreNegocio,
      ciNit: this.formulario.ciNit,
      celular: this.formulario.celular,
      frecuenciaVisita: this.formulario.frecuenciaVisita,
    };

    if (this.editando && this.clienteEditandoId) {
      // Assuming update method exists, but it doesn't in current API
      // For now, just recreate or note that update is not implemented
      this.errorMensaje = 'Actualización no implementada';
      this.guardando = false;
    } else {
      this.apiService.createCliente(payload).subscribe({
        next: () => {
          this.cargarClientes();
          this.cerrarModal();
          this.guardando = false;
        },
        error: (error) => {
          this.errorMensaje = 'Error al crear cliente';
          this.guardando = false;
          console.error(error);
        },
      });
    }
  }

  eliminarCliente(id: string): void {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      // Assuming delete method exists, but it doesn't in current API
      this.errorMensaje = 'Eliminación no implementada';
    }
  }
}