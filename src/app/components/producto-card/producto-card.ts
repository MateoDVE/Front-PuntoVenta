import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Producto } from '../../services/api.service';

@Component({
  selector: 'app-producto-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.scss',
})
export class ProductoCardComponent {
  @Input() producto!: Producto;
  @Output() editar = new EventEmitter<Producto>();
  @Output() eliminar = new EventEmitter<number>();

  private readonly descriptionTermMap: Record<string, string> = {
    'con verduras': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.CON_VERDURAS',
    'extremoo': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.EXTREMOO',
    'de': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.DE',
    'gallina': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.GALLINA',
    'carne': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.CARNE',
    'costilla': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.COSTILLA',
    'picante': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.PICANTE',
    'crocante': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.CROCANTE',
    'pollo': 'ADMIN.CATALOG.PRODUCT_DESCRIPTION_TERMS.POLLO',
    'bolsa': 'ADMIN.CATALOG.PRESENTATION_TYPE.BOLSA',
    'unidad': 'ADMIN.CATALOG.PRESENTATION_TYPE.UNIDAD',
    'caja': 'ADMIN.CATALOG.PRESENTATION_TYPE.CAJA',
    'botella': 'ADMIN.CATALOG.PRESENTATION_TYPE.BOTELLA',
    'paquete': 'ADMIN.CATALOG.PRESENTATION_TYPE.PAQUETE',
    'bl[ií]ster': 'ADMIN.CATALOG.PRESENTATION_TYPE.BLISTER',
    'vaso': 'ADMIN.CATALOG.PRESENTATION_TYPE.VASO',
    'tira': 'ADMIN.CATALOG.PRESENTATION_TYPE.TIRA',
    'sobres': 'ADMIN.CATALOG.PRESENTATION_TYPE.SOBRES'
  };

  constructor(private translate: TranslateService) {}

  onEditar(): void {
    this.editar.emit(this.producto);
  }

  onEliminar(): void {
    if (this.producto.id_producto) {
      this.eliminar.emit(this.producto.id_producto);
    }
  }

  getTranslatedProductDescription(descripcion?: string): string {
    if (!descripcion?.trim()) {
      return this.translate.instant('ADMIN.CATALOG.NO_DESCRIPTION');
    }

    let current = descripcion.replace(/Presentaci[oó]n/gi, this.translate.instant('ADMIN.CATALOG.DESCRIPTION_PRESENTATION'));

    return Object.entries(this.descriptionTermMap)
      .sort(([a], [b]) => b.length - a.length)
      .reduce((texto, [term, translationKey]) => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        return texto.replace(regex, this.translate.instant(translationKey));
      }, current);
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
