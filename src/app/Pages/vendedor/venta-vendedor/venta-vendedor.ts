import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { VendedorNavbar } from '../../../components/vendedor-navbar/vendedor-navbar';

@Component({
  selector: 'app-venta-vendedor',
  standalone: true,
  imports: [CommonModule, VendedorNavbar],
  templateUrl: './venta-vendedor.html',
  styleUrls: ['./venta-vendedor.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VentaVendedorComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {}

}
