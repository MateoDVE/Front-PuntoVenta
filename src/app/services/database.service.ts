import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface VentaPendiente {
  idTransaccionLocal: string;
  idCliente: number;
  idVendedor: string;
  descuento: number;
  items: Array<{ idProducto: string; cantidad: number; tipoUnidad: string }>;
  _savedAt: number;
}

@Injectable({ providedIn: 'root' })
export class DatabaseService extends Dexie {
  ventasPendientes!: Table<VentaPendiente, string>;

  constructor() {
    super('PuntoVentaDB');
    this.version(1).stores({
      ventasPendientes: 'idTransaccionLocal, _savedAt'
    });
  }
}
