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
  cargandoImagen = false;
  imagenPreview?: string;
  archivoSeleccionado?: File;
  
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

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

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
    this.limpiarImagen();
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

  // ==================== MANEJO DE IMÁGENES ====================

  onSeleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      // Validar tipo MIME
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido. Solo se aceptan JPEG, PNG, WebP y GIF');
      }

      // Validar tamaño (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`El archivo excede el tamaño máximo de 5MB (actual: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }

      // Guardar archivo
      this.archivoSeleccionado = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagenPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Error al procesar imagen'}`);
      input.value = '';
    }
  }

  subirImagen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.archivoSeleccionado) {
        resolve();
        return;
      }

      try {
        this.cargandoImagen = true;

        // Crear FormData para enviar el archivo
        const formData = new FormData();
        formData.append('image', this.archivoSeleccionado);

        // Usar ruta con ID si estamos editando, sin ID si es nuevo producto
        const endpoint = this.productoEditandoId 
          ? `productos/upload/${this.productoEditandoId}` 
          : 'productos/upload';

        // Usar HttpClient para enviar
        this.apiService.uploadProductImage(endpoint, formData).subscribe({
          next: (response: any) => {
            this.nuevoProducto.url_imagen = response.imageUrl;
            this.cargandoImagen = false;
            this.archivoSeleccionado = undefined;
            this.imagenPreview = undefined;
            resolve();
          },
          error: (error) => {
            this.cargandoImagen = false;
            const errorMsg = error?.error?.message || 'Error desconocido';
            reject(new Error(`Error al subir imagen: ${errorMsg}`));
          },
        });
      } catch (error) {
        this.cargandoImagen = false;
        reject(error);
      }
    });
  }

  limpiarImagen(): void {
    this.imagenPreview = undefined;
    this.archivoSeleccionado = undefined;
  }

  eliminarImagenGuardada(): void {
    if (!this.nuevoProducto.url_imagen) return;

    if (confirm('¿Desea eliminar esta imagen?')) {
      this.apiService.deleteProductImage(this.nuevoProducto.url_imagen).subscribe({
        next: () => {
          this.nuevoProducto.url_imagen = '';
          alert('Imagen eliminada correctamente');
        },
        error: (error) => {
          alert(`Error al eliminar imagen: ${error?.error?.message || 'Error desconocido'}`);
        },
      });
    }
  }

  async guardarProducto(): Promise<void> {
    if (!this.validarFormulario()) {
      return;
    }

    try {
      this.cargando = true;

      // Si hay imagen seleccionada sin subir, subirla primero
      if (this.archivoSeleccionado && this.imagenPreview) {
        try {
          await this.subirImagen();
        } catch (error) {
          alert(`Error al subir imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          this.cargando = false;
          return;
        }
      }

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
    } catch (error) {
      this.cargando = false;
      alert(`Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
