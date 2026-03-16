import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { ProductoCardComponent } from '../../../components/producto-card/producto-card';
import { ApiService, Producto } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbar, ProductoCardComponent],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo implements OnInit {
  productos: Producto[] = [];
  mostrarModal = false;
  cargando = false;
  editando = false;
  productoEditandoId?: number;
  
  nuevoProducto: Producto = {
    sku: '',
    nombre: '',
    descripcion: '',
    url_imagen: '',
    precio_unidad: 0,
    precio_caja: 0,
    unidades_por_caja: 1,
    stock_almacen_central: 0,
  };

  categorias = ['Bebidas', 'Snacks', 'Lácteos'];

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.apiService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.cargando = false;
      },
    });
  }

  abrirModal(): void {
    this.editando = false;
    this.productoEditandoId = undefined;
    this.mostrarModal = true;
    this.resetearFormulario();
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.resetearFormulario();
  }

  resetearFormulario(): void {
    this.nuevoProducto = {
      sku: '',
      nombre: '',
      descripcion: '',
      url_imagen: '',
      precio_unidad: 0,
      precio_caja: 0,
      unidades_por_caja: 1,
      stock_almacen_central: 0,
    };
  }

  guardarProducto(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.cargando = true;

    if (this.editando && this.productoEditandoId) {
      // Actualizar producto existente
      this.apiService.updateProducto(this.productoEditandoId.toString(), this.nuevoProducto).subscribe({
        next: (response) => {
          const index = this.productos.findIndex(p => p.id_producto === this.productoEditandoId);
          if (index !== -1) {
            this.productos[index] = response;
          }
          this.cerrarModal();
          this.cargando = false;
          alert('Producto actualizado correctamente');
        },
        error: (error) => {
          console.error('Error al actualizar producto:', error);
          alert('Error al actualizar el producto');
          this.cargando = false;
        },
      });
    } else {
      // Crear nuevo producto
      this.apiService.createProducto(this.nuevoProducto).subscribe({
        next: (response) => {
          this.productos.push(response);
          this.cerrarModal();
          this.cargando = false;
          alert('Producto creado correctamente');
        },
        error: (error) => {
          console.error('Error al crear producto:', error);
          alert('Error al crear el producto');
          this.cargando = false;
        },
      });
    }
  }

  validarFormulario(): boolean {
    if (!this.nuevoProducto.sku || !this.nuevoProducto.nombre ||
        this.nuevoProducto.precio_unidad <= 0 || this.nuevoProducto.precio_caja <= 0 ||
        this.nuevoProducto.unidades_por_caja <= 0) {
      alert('Por favor complete todos los campos requeridos correctamente');
      return false;
    }
    return true;
  }

  editarProducto(producto: Producto): void {
    this.editando = true;
    this.productoEditandoId = producto.id_producto;
    this.nuevoProducto = { ...producto };
    this.mostrarModal = true;
  }

  eliminarProducto(id: number | undefined): void {
    if (!id) return;
    if (confirm('¿Desea eliminar este producto?')) {
      this.apiService.deleteProducto(id.toString()).subscribe({
        next: () => {
          this.productos = this.productos.filter(p => p.id_producto !== id);
        },
        error: (error) => {
          console.error('Error al eliminar producto:', error);
        },
      });
    }
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
  }
}
