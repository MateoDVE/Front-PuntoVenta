import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DetallePedido {
  idProducto: string;
  cantidad: number;
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
          }))
        }));
      })
    );
  }

  actualizarEstado(id: string, estado: string, fechaProgramada?: string): Observable<any> {
    const body: any = { estado };
    if (fechaProgramada) {
      body.fechaProgramada = fechaProgramada;
    }
    return this.http.patch<any>(`${this.apiUrl}/api/pedidos-programados/${id}/estado`, body);
  }
}
