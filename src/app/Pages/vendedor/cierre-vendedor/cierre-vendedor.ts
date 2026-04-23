import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';
import { AuthService } from '../../../services/auth.service';

interface ProductoDetalle {
  nombre: string;
  descripcion: string;
  stock: number;
}

@Component({
  selector: 'app-cierre-vendedor',
  standalone: true,
  imports: [CommonModule, VendedorNavbar],
  templateUrl: './cierre-vendedor.html',
  styleUrl: './cierre-vendedor.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CierreVendedor implements OnInit {
  ventasRealizadas: number = 0;
  totalEfectivo: number = 0.00;
  stockInicial: number = 225;
  stockFinal: number = 225;

  productosDetalle: ProductoDetalle[] = [
    { nombre: 'Coca Cola 2L', descripcion: 'Inicial: 50 | Vendido: 0 | Esperado: 50', stock: 50 },
    { nombre: 'Agua Vital 2L', descripcion: 'Inicial: 80 | Vendido: 0 | Esperado: 80', stock: 80 },
    { nombre: 'Papas Lays 150g', descripcion: 'Inicial: 30 | Vendido: 0 | Esperado: 30', stock: 30 },
    { nombre: 'Galletas Oreo', descripcion: 'Inicial: 25 | Vendido: 0 | Esperado: 25', stock: 25 },
    { nombre: 'Leche Pil 1L', descripcion: 'Inicial: 40 | Vendido: 0 | Esperado: 40', stock: 40 }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Inicializar datos desde el servicio si es necesario
    this.calcularTotales();
  }

  calcularTotales(): void {
    // Calcular totales basados en vendidos
    this.stockFinal = this.stockInicial - this.ventasRealizadas;
  }

  confirmarCierre(): void {
    // Lógica para confirmar el cierre de jornada
    console.log('Cierre de jornada confirmado');
    // Aquí iría la lógica para enviar al backend
  }

  cerrarSesion(): void {
    this.authService.signOut().subscribe({
      next: () => {
        console.log('Sesión cerrada correctamente');
      },
      error: (err) => {
        console.error('Error al cerrar sesión:', err);
      }
    });
  }
}
