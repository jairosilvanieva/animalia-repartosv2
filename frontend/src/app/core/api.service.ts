import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface Order {
  id: number;
  scheduled_delivery_date?: string;
  current_route_id?: number | null;
  current_route_status?: 'borrador' | 'activa' | null;
  customer_name: string;
  phone?: string;
  dni?: string;
  address: string;
  between_streets?: string;
  city?: string;
  postal_code?: string;
  customer_note?: string;
  internal_notes?: string;
  payment_method?: string;
  payment_status?: string;
  amount_to_collect: number;
  total?: number;
  subtotal?: number;
  discounts?: number;
  delivery_mode?: string;
  status: string;
  time_condition?: string;
  time_window_start?: string;
  time_window_end?: string;
  priority: boolean;
  items_count?: number;
  products_summary?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id?: number;
  product_name: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listOrders(filters: Record<string, string> = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<Order[]>(`${this.baseUrl}/orders`, { params });
  }

  createManualOrder(payload: unknown) {
    return this.http.post<Order>(`${this.baseUrl}/orders/manual`, payload);
  }

  getOrder(id: number) {
    return this.http.get<Order>(`${this.baseUrl}/orders/${id}`);
  }

  updateOrder(id: number, payload: Partial<Order> & Record<string, unknown>) {
    return this.http.patch<Order>(`${this.baseUrl}/orders/${id}`, payload);
  }

  createRoute(payload: { route_date: string; order_ids: number[]; name?: string }) {
    return this.http.post<any>(`${this.baseUrl}/routes`, payload);
  }

  listRoutes(filters: Record<string, string> = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<any[]>(`${this.baseUrl}/routes`, { params });
  }

  getRoute(routeId: string) {
    return this.http.get<any>(`${this.baseUrl}/routes/${routeId}`);
  }

  startRoute(routeId: number) {
    return this.http.post<any>(`${this.baseUrl}/routes/${routeId}/start`, {});
  }

  finishRoute(routeId: number) {
    return this.http.post<any>(`${this.baseUrl}/routes/${routeId}/finish`, {});
  }

  updateStop(routeId: number, stopId: number, status: string, problem_note?: string) {
    return this.http.patch<any>(`${this.baseUrl}/routes/${routeId}/stops/${stopId}`, { status, problem_note });
  }

  addStopsToRoute(routeId: number, order_ids: number[]) {
    return this.http.post<any>(`${this.baseUrl}/routes/${routeId}/stops`, { order_ids });
  }

  reorderRouteStops(routeId: number, stop_ids: number[]) {
    return this.http.patch<any>(`${this.baseUrl}/routes/${routeId}/reorder`, { stop_ids });
  }

  deleteRoute(routeId: number) {
    return this.http.delete(`${this.baseUrl}/routes/${routeId}`);
  }

  claimRoute(routeId: number) {
    return this.http.post<any>(`${this.baseUrl}/routes/${routeId}/claim`, {});
  }
}
