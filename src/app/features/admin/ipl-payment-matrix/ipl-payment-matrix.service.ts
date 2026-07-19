import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from '@core/api/api.service';
import { HouseBlocksService } from '@features/admin/house-blocks/house-blocks.service';
import { PaymentMatrixData, HouseBlockOption, emptyMatrixData } from './ipl-payment-matrix.model';

/**
 * IPL Payment Matrix Service
 *
 * Thin client for the backend-owned matrix endpoint
 * `GET /ipl-payments/matrix?year=`. The backend does the unit×month join and
 * reduction and returns the ready-to-render `PaymentMatrixData`; the frontend
 * just displays it. (Previously this composed 3 endpoints client-side — moved
 * backend-side for the ~250-unit scale; see plan
 * `~/.claude/plans/ipl-matrix-backend-endpoint.md`.)
 */
@Injectable({
  providedIn: 'root'
})
export class IplPaymentMatrixService {
  private apiService = inject(ApiService);
  private houseBlocksService = inject(HouseBlocksService);

  /**
   * Fetch the precomputed payment matrix for a year, optionally narrowed to a
   * single house block. `houseBlockId` omitted/null = all blocks.
   * Falls back to an empty matrix on error so the page still renders.
   */
  getMatrix(year: number, houseBlockId?: string | null): Observable<PaymentMatrixData> {
    const params = new URLSearchParams({ year: String(year) });
    if (houseBlockId) {
      params.set('houseBlockId', houseBlockId);
    }
    return this.apiService
      .get<PaymentMatrixData>(`/ipl-payments/matrix?${params.toString()}`)
      .pipe(
        map((response) => response.data ?? emptyMatrixData(year)),
        catchError((error) => {
          console.error('Error loading IPL payment matrix:', error);
          return of(emptyMatrixData(year));
        })
      );
  }

  /**
   * House blocks available for the filter dropdown. Returns a high-limit page
   * (blocks are few) sorted by blockCode; falls back to an empty list on error.
   */
  getBlocks(): Observable<HouseBlockOption[]> {
    return this.houseBlocksService.getAll({ limit: 100, sortBy: 'blockCode', sortOrder: 'asc' }).pipe(
      map((result) =>
        (result.data ?? []).map((block) => ({
          id: block.id,
          blockCode: block.blockCode,
          blockName: block.blockName
        }))
      ),
      catchError((error) => {
        console.error('Error loading house blocks for matrix filter:', error);
        return of([]);
      })
    );
  }
}
