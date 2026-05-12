import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ProductoCardComponent } from '../../../components/producto-card/producto-card';
import { AppModalComponent, AppModalVariant } from '../../../components/app-modal/app-modal.component';
import { ApiService, Producto } from '../../../services/api.service';
import { ProductosService } from '../../../services/productos.service';
import { AuthService } from '../../../services/auth.service';

interface ModalState {
  open: boolean;
  title: string;
  message: string;
  variant: AppModalVariant;
  showCancel: boolean;
  confirmText: string;
  cancelText: string;
  closeLabel: string;
}

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbar, ProductoCardComponent, AppModalComponent, TranslateModule],
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
  modalState: ModalState = {
    open: false,
    title: '',
    message: '',
    variant: 'info',
    showCancel: false,
    confirmText: '',
    cancelText: '',
    closeLabel: '',
  };
  private modalAction: (() => void) | null = null;
  
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

  // Errores de validación en tiempo real
  erroresValidacion = {
    precio_unidad: '',
    precio_caja: '',
    unidades_por_caja: '',
    stock_almacen_central: ''
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private translate: TranslateService,
    private productosService: ProductosService
  ) {}

  ngOnInit(): void {
    this.modalState = this.crearModalInicial();
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.productosService.getProductos().subscribe({
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
    // Limpiar errores de validación
    this.erroresValidacion = {
      precio_unidad: '',
      precio_caja: '',
      unidades_por_caja: '',
      stock_almacen_central: ''
    };
  }

  // ==================== VALIDACIONES EN TIEMPO REAL ====================

  validarPrecioUnidad(): void {
    if (this.nuevoProducto.precio_unidad < 0) {
      this.erroresValidacion.precio_unidad = this.translate.instant('ADMIN.CATALOG.VALIDATION.PRICE_NON_NEGATIVE');
    } else {
      this.erroresValidacion.precio_unidad = '';
    }
  }

  validarPrecioCaja(): void {
    if (this.nuevoProducto.precio_caja < 0) {
      this.erroresValidacion.precio_caja = this.translate.instant('ADMIN.CATALOG.VALIDATION.PRICE_NON_NEGATIVE');
    } else {
      this.erroresValidacion.precio_caja = '';
    }
  }

  validarUnidadesCaja(): void {
    if (this.nuevoProducto.unidades_por_caja < 1) {
      this.erroresValidacion.unidades_por_caja = this.translate.instant('ADMIN.CATALOG.VALIDATION.MIN_ONE_UNIT');
    } else {
      this.erroresValidacion.unidades_por_caja = '';
    }
  }

  validarStockCentral(): void {
    if (this.nuevoProducto.stock_almacen_central < 0) {
      this.erroresValidacion.stock_almacen_central = this.translate.instant('ADMIN.CATALOG.VALIDATION.STOCK_NON_NEGATIVE');
    } else {
      this.erroresValidacion.stock_almacen_central = '';
    }
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
        throw new Error(this.translate.instant('ADMIN.CATALOG.ERROR.INVALID_FILE_TYPE'));
      }

      // Validar tamaño (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(this.translate.instant('ADMIN.CATALOG.ERROR.FILE_TOO_LARGE', {
          size: (file.size / 1024 / 1024).toFixed(2),
        }));
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
      this.abrirModalMensaje(
        this.translate.instant('COMMON.ERROR'),
        error instanceof Error ? error.message : this.translate.instant('ADMIN.CATALOG.ERROR.PROCESS_IMAGE'),
        'error'
      );
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
        this.productosService.uploadProductImage(endpoint, formData).subscribe({
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

    this.abrirModalConfirmacion(
      this.translate.instant('COMMON.CONFIRM'),
      this.translate.instant('ADMIN.CATALOG.CONFIRM.DELETE_IMAGE'),
      () => {
        this.productosService.deleteProductImage(this.nuevoProducto.url_imagen ?? '').subscribe({
          next: () => {
            this.nuevoProducto.url_imagen = '';
            this.abrirModalMensaje(
              this.translate.instant('COMMON.SUCCESS'),
              this.translate.instant('ADMIN.CATALOG.SUCCESS.IMAGE_DELETED'),
              'success'
            );
          },
          error: (error) => {
            this.abrirModalMensaje(
              this.translate.instant('COMMON.ERROR'),
              `${this.translate.instant('ADMIN.CATALOG.ERROR.DELETE_IMAGE')}: ${error?.error?.message || this.translate.instant('ADMIN.CATALOG.ERROR.UNKNOWN')}`,
              'error'
            );
          },
        });
      },
      this.translate.instant('COMMON.DELETE')
    );
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
          this.abrirModalMensaje(
            this.translate.instant('COMMON.ERROR'),
            error instanceof Error ? error.message : this.translate.instant('ADMIN.CATALOG.ERROR.UPLOAD_IMAGE'),
            'error'
          );
          this.cargando = false;
          return;
        }
      }

      if (this.editando && this.productoEditandoId) {
        // Actualizar producto existente
        this.productosService.updateProducto(this.productoEditandoId.toString(), this.nuevoProducto).subscribe({
          next: (response) => {
            const index = this.productos.findIndex(p => p.id_producto === this.productoEditandoId);
            if (index !== -1) {
              this.productos[index] = response;
            }
            this.cerrarModal();
            this.cargando = false;
            this.abrirModalMensaje(
              this.translate.instant('COMMON.SUCCESS'),
              this.translate.instant('ADMIN.CATALOG.SUCCESS.PRODUCT_UPDATED'),
              'success'
            );
          },
          error: (error) => {
            console.error('Error al actualizar producto:', error);
            this.abrirModalMensaje(
              this.translate.instant('COMMON.ERROR'),
              this.translate.instant('ADMIN.CATALOG.ERROR.PRODUCT_UPDATED'),
              'error'
            );
            this.cargando = false;
          },
        });
      } else {
        // Crear nuevo producto
        this.productosService.createProducto(this.nuevoProducto).subscribe({
          next: (response) => {
            this.productos.push(response);
            this.cerrarModal();
            this.cargando = false;
            this.abrirModalMensaje(
              this.translate.instant('COMMON.SUCCESS'),
              this.translate.instant('ADMIN.CATALOG.SUCCESS.PRODUCT_CREATED'),
              'success'
            );
          },
          error: (error) => {
            console.error('Error al crear producto:', error);
            this.abrirModalMensaje(
              this.translate.instant('COMMON.ERROR'),
              this.translate.instant('ADMIN.CATALOG.ERROR.PRODUCT_CREATED'),
              'error'
            );
            this.cargando = false;
          },
        });
      }
    } catch (error) {
      this.cargando = false;
      this.abrirModalMensaje(
        this.translate.instant('COMMON.ERROR'),
        error instanceof Error ? error.message : this.translate.instant('ADMIN.CATALOG.ERROR.UNKNOWN'),
        'error'
      );
    }
  }

  validarFormulario(): boolean {
    // Verificar errores en tiempo real primero
    if (this.erroresValidacion.precio_unidad || this.erroresValidacion.precio_caja ||
        this.erroresValidacion.unidades_por_caja || this.erroresValidacion.stock_almacen_central) {
      this.abrirModalMensaje(
        this.translate.instant('COMMON.WARNING'),
        this.translate.instant('ADMIN.CATALOG.ERROR.FIX_FIELDS'),
        'warning'
      );
      return false;
    }

    // Verificar campos requeridos
    if (!this.nuevoProducto.sku || !this.nuevoProducto.nombre ||
        this.nuevoProducto.precio_unidad < 0 || this.nuevoProducto.precio_caja < 0 ||
        this.nuevoProducto.unidades_por_caja <= 0 || this.nuevoProducto.stock_almacen_central < 0) {
      this.abrirModalMensaje(
        this.translate.instant('COMMON.WARNING'),
        this.translate.instant('ADMIN.CATALOG.ERROR.COMPLETE_REQUIRED_FIELDS'),
        'warning'
      );
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
    this.abrirModalConfirmacion(
      this.translate.instant('COMMON.CONFIRM'),
      this.translate.instant('ADMIN.CATALOG.CONFIRM.DELETE_PRODUCT'),
      () => {
        this.productosService.deleteProducto(id.toString()).subscribe({
          next: () => {
            this.productos = this.productos.filter(p => p.id_producto !== id);
            this.abrirModalMensaje(
              this.translate.instant('COMMON.SUCCESS'),
              this.translate.instant('ADMIN.CATALOG.SUCCESS.PRODUCT_DELETED'),
              'success'
            );
          },
          error: (error) => {
            console.error('Error al eliminar producto:', error);
            this.abrirModalMensaje(
              this.translate.instant('COMMON.ERROR'),
              this.translate.instant('ADMIN.CATALOG.ERROR.PRODUCT_DELETED'),
              'error'
            );
          },
        });
      },
      this.translate.instant('COMMON.DELETE')
    );
  }

  onSignOut(): void {
    this.authService.signOut().subscribe();
  }

  cerrarModalMensaje(): void {
    this.modalState = this.crearModalInicial();
    this.modalAction = null;
  }

  confirmarModalMensaje(): void {
    const accion = this.modalAction;
    this.cerrarModalMensaje();
    accion?.();
  }

  private abrirModalMensaje(title: string, message: string, variant: AppModalVariant): void {
    this.modalState = {
      open: true,
      title,
      message,
      variant,
      showCancel: false,
      confirmText: this.translate.instant('COMMON.ACCEPT'),
      cancelText: this.translate.instant('COMMON.CANCEL'),
      closeLabel: this.translate.instant('COMMON.CLOSE'),
    };
    this.modalAction = null;
  }

  private abrirModalConfirmacion(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string
  ): void {
    this.modalState = {
      open: true,
      title,
      message,
      variant: 'confirm',
      showCancel: true,
      confirmText,
      cancelText: this.translate.instant('COMMON.CANCEL'),
      closeLabel: this.translate.instant('COMMON.CLOSE'),
    };
    this.modalAction = onConfirm;
  }

  private crearModalInicial(): ModalState {
    return {
      open: false,
      title: '',
      message: '',
      variant: 'info',
      showCancel: false,
      confirmText: 'Aceptar',
      cancelText: 'Cancelar',
      closeLabel: 'Cerrar',
    };
  }
}
