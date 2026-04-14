import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface VendedorListado {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  created_at: string;
}

@Component({
  selector: 'app-vendedores-registrados',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './vendedores-registrados.html',
  styleUrl: './vendedores-registrados.scss',
})
export class VendedoresRegistradosComponent {
  @Input({ required: true }) vendedores: VendedorListado[] = [];
  @Output() editar = new EventEmitter<VendedorListado>();
  @Output() eliminar = new EventEmitter<VendedorListado>();

  onEditar(vendedor: VendedorListado): void {
    this.editar.emit(vendedor);
  }

  onEliminar(vendedor: VendedorListado): void {
    this.eliminar.emit(vendedor);
  }
}
