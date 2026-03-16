import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Producto } from '../../services/api.service';

@Component({
  selector: 'app-producto-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.scss',
})
export class ProductoCardComponent {
  @Input() producto!: Producto;
  @Output() editar = new EventEmitter<Producto>();
  @Output() eliminar = new EventEmitter<number>();

  onEditar(): void {
    this.editar.emit(this.producto);
  }

  onEliminar(): void {
    if (this.producto.id_producto) {
      this.eliminar.emit(this.producto.id_producto);
    }
  }

  getCategoriaBadgeClass(categoria?: string): string {
    if (!categoria) return 'default';
    const categoriaNormalizada = categoria.toLowerCase();
    if (categoriaNormalizada.includes('bebida')) return 'bebidas';
    if (categoriaNormalizada.includes('snack')) return 'snacks';
    if (categoriaNormalizada.includes('lácteo') || categoriaNormalizada.includes('lacteo')) return 'lácteos';
    return 'default';
  }
}
