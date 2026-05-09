import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { liveQuery } from 'dexie';
import { DatabaseService } from './database.service';
import { ApiService, CrearVentaRequest } from './api.service';
import { lastValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  readonly pendingCount$: Observable<number>;

  constructor(private db: DatabaseService, private api: ApiService) {
    this.pendingCount$ = from(liveQuery(() => this.db.ventasPendientes.count()));

    window.addEventListener('online', () => {
      this.isOnline$.next(true);
      this.sincronizar();
    });
    window.addEventListener('offline', () => {
      this.isOnline$.next(false);
    });

    // Si al arrancar ya hay conexión, sincronizar de inmediato
    if (navigator.onLine) {
      this.sincronizar();
    }
  }

  async sincronizar(): Promise<void> {
    const pendientes = await this.db.ventasPendientes.orderBy('_savedAt').toArray();
    for (const venta of pendientes) {
      const payload: CrearVentaRequest = {
        idTransaccionLocal: venta.idTransaccionLocal,
        idCliente: venta.idCliente,
        idVendedor: venta.idVendedor,
        descuento: venta.descuento,
        items: venta.items
      };
      try {
        await lastValueFrom(this.api.crearVentaRaw(payload));
        await this.db.ventasPendientes.delete(venta.idTransaccionLocal);
      } catch {
        break; // Se reintentará en la próxima reconexión
      }
    }
  }
}
