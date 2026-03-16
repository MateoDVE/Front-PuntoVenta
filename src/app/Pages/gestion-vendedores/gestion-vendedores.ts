import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';


interface Vendedor {
  nombre: string;
  ci: string;
  telefono: string;
  transporte: string;
  estado: string;
  stock: number;
  ventas: number;
  ingreso: number;
}

@Component({
  selector: 'app-gestion-vendedores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-vendedores.html',
  styleUrls: ['./gestion-vendedores.scss']
})
export class GestionVendedoresComponent {

  totalVendedores = 2;
  enRuta = 0;
  ventasTotales = 0;
  ingresos = 0;

  vendedores: Vendedor[] = [
    {
      nombre: 'Juan Pérez',
      ci: '123456789',
      telefono: '123456789',
      transporte: 'Camión A-123',
      estado: 'Pendiente',
      stock: 225,
      ventas: 0,
      ingreso: 0
    },
    {
      nombre: 'María López',
      ci: '987654321',
      telefono: '987654321',
      transporte: 'Camión B-456',
      estado: 'Pendiente',
      stock: 270,
      ventas: 0,
      ingreso: 0
    }
  ];

  editar(vendedor: Vendedor) {
    console.log('Editar', vendedor);
  }

  eliminar(vendedor: Vendedor) {
    console.log('Eliminar', vendedor);
  }

}
