import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';

@Component({
  selector: 'app-dashboard-vendedor',
  standalone: true, 
  imports: [CommonModule, VendedorNavbar], 
  templateUrl: './dashboard-vendedor.html',
  styleUrls: ['./dashboard-vendedor.scss']
})
export class DashboardVendedor {

  productos = [
    { nombre: 'Coca Cola 2L', categoria: 'Bebidas', cantidad: 50, precio: 15.5 },
    { nombre: 'Agua Vital 2L', categoria: 'Bebidas', cantidad: 80, precio: 6 },
    { nombre: 'Papas Lays 150g', categoria: 'Snacks', cantidad: 30, precio: 8.5 },
    { nombre: 'Galletas Oreo', categoria: 'Snacks', cantidad: 25, precio: 12 },
    { nombre: 'Leche Pil 1L', categoria: 'Lácteos', cantidad: 40, precio: 10 }
  ];

  stockActual: number = 100;
  ventasHoy: number = 5;
  ingresos: number = 250;

  confirmarCarga() {
    alert('Carga confirmada');
  }
}