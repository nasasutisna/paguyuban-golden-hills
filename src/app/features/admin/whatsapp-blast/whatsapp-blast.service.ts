import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import {
  WhatsAppStatus,
  DelinquentPreview,
  TriggerBlastDto,
  BlastResult,
  SendTestDto,
  SendTestResult,
  BlastBatch,
  BlastBatchListResponse,
  BlastBatchQueryParams,
} from './whatsapp-blast.model';

/**
 * WhatsApp Blast Service
 * Wraps ApiService for all /whatsapp-blast/* endpoints.
 * Reads (status/delinquents/batches) swallow errors and return safe defaults;
 * writes (connect/send-test/blast) rethrow so the page can surface the error.
 */
@Injectable({ providedIn: 'root' })
export class WhatsappBlastService {
  private apiService = inject(ApiService);

  /** GET /whatsapp-blast/status */
  getStatus(): Observable<WhatsAppStatus | null> {
    return this.apiService.get<WhatsAppStatus>('/whatsapp-blast/status').pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching WhatsApp status:', error);
        return of(null);
      }),
    );
  }

  /** POST /whatsapp-blast/connect — returns the new connection state. */
  connect(): Observable<{ state: string } | null> {
    return this.apiService.post<{ state: string }>('/whatsapp-blast/connect', {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error connecting WhatsApp:', error);
        throw error;
      }),
    );
  }

  /** POST /whatsapp-blast/disconnect */
  disconnect(): Observable<{ state: string } | null> {
    return this.apiService.post<{ state: string }>('/whatsapp-blast/disconnect', {}).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error disconnecting WhatsApp:', error);
        throw error;
      }),
    );
  }

  /** POST /whatsapp-blast/send-test */
  sendTest(dto: SendTestDto): Observable<SendTestResult | null> {
    return this.apiService.post<SendTestResult>('/whatsapp-blast/send-test', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error sending test message:', error);
        throw error;
      }),
    );
  }

  /** GET /whatsapp-blast/delinquents?year=&houseBlockId= */
  getDelinquents(
    year?: number,
    houseBlockId?: string | null,
  ): Observable<DelinquentPreview | null> {
    const query = this.buildQuery({ year, houseBlockId });
    return this.apiService
      .get<DelinquentPreview>(`/whatsapp-blast/delinquents${query}`)
      .pipe(
        map((response) => response.data || null),
        catchError((error) => {
          console.error('Error fetching delinquent preview:', error);
          return of(null);
        }),
      );
  }

  /** POST /whatsapp-blast/blast */
  triggerBlast(dto: TriggerBlastDto): Observable<BlastResult | null> {
    return this.apiService.post<BlastResult>('/whatsapp-blast/blast', dto).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error triggering blast:', error);
        throw error;
      }),
    );
  }

  /** GET /whatsapp-blast/batches (paginated) */
  getBatches(params?: BlastBatchQueryParams): Observable<BlastBatchListResponse> {
    const query = this.buildQuery(params);
    return this.apiService.get<any>(`/whatsapp-blast/batches${query}`).pipe(
      map((response) => {
        const paginatedData = response.data || {};
        const data = Array.isArray(paginatedData)
          ? paginatedData
          : paginatedData.data || [];
        const metadata = response?.meta;
        return {
          data: data as BlastBatch[],
          total: metadata?.total ?? data.length,
          page: metadata?.page ?? 1,
          limit: metadata?.limit ?? 10,
          totalPages: metadata?.totalPages ?? 1,
        };
      }),
      catchError((error) => {
        console.error('Error fetching blast batches:', error);
        return of({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      }),
    );
  }

  /** GET /whatsapp-blast/batches/:id (with recipients) */
  getBatch(id: string): Observable<BlastBatch | null> {
    return this.apiService.get<BlastBatch>(`/whatsapp-blast/batches/${id}`).pipe(
      map((response) => response.data || null),
      catchError((error) => {
        console.error('Error fetching blast batch:', error);
        return of(null);
      }),
    );
  }

  /** Build `?k=v&...` from a params object, skipping empties. */
  private buildQuery(params?: Record<string, any>): string {
    if (!params) return '';
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      q.append(key, String(value));
    }
    const qs = q.toString();
    return qs ? `?${qs}` : '';
  }
}
