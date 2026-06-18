import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DetallePedido {
  idProducto: string;
  cantidad: number;
  cantidadDisplay?: string;
  nombre?: string;
}

export interface PedidoProgramado {
  id?: string;
  idCliente: number;
  idVendedor: string;
  fechaProgramada: string;
  estado: string;
  prioridad: string;
  observaciones?: string;
  createdAt?: string;
  detalles: DetallePedido[];
  expandido?: boolean;
  nombreNegocio?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosProgramadosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  crearPedido(pedido: PedidoProgramado): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/pedidos-programados`, {
      id_cliente: pedido.idCliente,
      id_vendedor: pedido.idVendedor,
      fecha_programada: pedido.fechaProgramada,
      detalles: pedido.detalles.map(d => ({
        idProducto: d.idProducto,
        cantidad: d.cantidad
      })),
      prioridad: pedido.prioridad,
      observaciones: pedido.observaciones
    });
  }

  obtenerPedidos(vendedorId?: string, fecha?: string): Observable<PedidoProgramado[]> {
    let params: any = {};
    if (vendedorId) {
      params.vendedorId = vendedorId;
    }
    if (fecha) {
      params.fecha = fecha;
    }
    return this.http.get<any>(`${this.apiUrl}/api/pedidos-programados`, { params }).pipe(
      map(res => {
        const rawData = res.data || [];
        return rawData.map((p: any) => ({
          id: p.id || p.id_pedido_programado,
          idCliente: p.idCliente ?? p.id_cliente,
          idVendedor: p.idVendedor || p.id_vendedor,
          fechaProgramada: p.fechaProgramada || p.fecha_programada,
          estado: p.estado,
          prioridad: p.prioridad,
          observaciones: p.observaciones,
          createdAt: p.createdAt || p.created_at,
          detalles: (p.detalles || p.detalle || []).map((d: any) => ({
            idProducto: d.idProducto || d.id_producto,
            cantidad: d.cantidad
          })),
          nombreNegocio: p.nombreNegocio || p.nombre_negocio
        }));
      }),
      catchError(() => of(this.getMockPedidos()))
    );
  }

  private getMockPedidos(): PedidoProgramado[] {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: '1',
        idCliente: 1,
        idVendedor: 'V1',
        fechaProgramada: today,
        estado: 'PROGRAMADO',
        prioridad: 'ALTA',
        detalles: [],
        nombreNegocio: 'Almacén Central'
      },
      {
        id: '2',
        idCliente: 2,
        idVendedor: 'V1',
        fechaProgramada: today,
        estado: 'PROGRAMADO',
        prioridad: 'ALTA',
        detalles: [],
        nombreNegocio: 'Tienda La Caserita'
      },
      {
        id: '3',
        idCliente: 3,
        idVendedor: 'V1',
        fechaProgramada: today,
        estado: 'PROGRAMADO',
        prioridad: 'MEDIA',
        detalles: [],
        nombreNegocio: 'tienda jose jose'
      },
      {
        id: '4',
        idCliente: 4,
        idVendedor: 'V1',
        fechaProgramada: today,
        estado: 'PROGRAMADO',
        prioridad: 'BAJA',
        detalles: [],
        nombreNegocio: 'tienda doña gladys'
      },
      {
        id: '5',
        idCliente: 5,
        idVendedor: 'V1',
        fechaProgramada: today,
        estado: 'PROGRAMADO',
        prioridad: 'MEDIA',
        detalles: [],
        nombreNegocio: 'Tienda Roberto'
      },
      {
        id: '6',
        idCliente: 6,
        idVendedor: 'V1',
        fechaProgramada: today,
        estado: 'PROGRAMADO',
        prioridad: 'BAJA',
        detalles: [],
        nombreNegocio: 'Tienda Tronco'
      },
      {
        id: '7',
        idCliente: 7,
        idVendedor: 'V1',
        fechaProgramada: today,
        estado: 'PROGRAMADO',
        prioridad: 'ALTA',
        detalles: [],
        nombreNegocio: 'tienda doña julia'
      }
    ];
  }

  actualizarEstado(id: string, estado: string, fechaProgramada?: string): Observable<any> {
    const body: any = { estado };
    if (fechaProgramada) {
      body.fechaProgramada = fechaProgramada;
    }
    return this.http.patch<any>(`${this.apiUrl}/api/pedidos-programados/${id}/estado`, body);
  }
}
