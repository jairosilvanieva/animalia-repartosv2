import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface Order {
  id: number;
  scheduled_delivery_date?: string;
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
  delivery_mode?: string;
  status: string;
  time_condition?: string;
  time_window_start?: string;
  time_window_end?: string;
  priority: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api';

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

  updateOrder(id: number, payload: Partial<Order> & Record<string, unknown>) {
    return this.http.patch<Order>(`${this.baseUrl}/orders/${id}`, payload);
  }

  createRoute(payload: { route_date: string; order_ids: number[]; name?: string }) {
    return this.http.post<any>(`${this.baseUrl}/routes`, payload);
  }

  getRoute(routeId: string) {
    return this.http.get<any>(`${this.baseUrl}/routes/${routeId}`);
  }

  startRoute(routeId: number) {
    return this.http.post<any>(`${this.baseUrl}/routes/${routeId}/start`, {});
  }

  updateStop(routeId: number, stopId: number, status: string, problem_note?: string) {
    return this.http.patch<any>(`${this.baseUrl}/routes/${routeId}/stops/${stopId}`, { status, problem_note });
  }

}
