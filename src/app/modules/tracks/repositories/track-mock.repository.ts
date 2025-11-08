// import { Injectable, Inject } from "@angular/core";
import { Injectable, Inject } from "@angular/core";
import { ITrackRepository } from "@modules/tracks/interfaces/track-repository.interface";
import { TrackModel } from "@core/models/tracks.model";
import { Observable, of, throwError, from } from "rxjs";
import { switchMap, delay } from 'rxjs/operators';
import { DEFAULT_DB_INIT_OPTIONS } from "src/app/mock.component";
@Injectable({ providedIn: 'root' })
export class TrackMockRepository implements ITrackRepository {
  private readonly DEFAULT_DELAY = 1000;

  // Fetch and return a contextualized result for the given serviceCode.
  // The returned shape is always { data: TrackModel[], httpCode: number, delayMs: number }.
  private async fetchContext(serviceCode: string): Promise<{ data: TrackModel[]; httpCode: number; delayMs: number }> {
    try {
      const list = await import('lib-mock-workbench').then(m => m.fetchMockByServiceCode(serviceCode, DEFAULT_DB_INIT_OPTIONS));
      const safeList = Array.isArray(list) ? list : [];
      return this.contextFromList(safeList);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[TrackMockRepository] fetchContext error', err);
      return { data: [], httpCode: 200, delayMs: 0 };
    }
  }

  // Turn the raw list returned by the mock fetcher into a normalized context.
  private contextFromList(list: any[]): { data: TrackModel[]; httpCode: number; delayMs: number } {
    const mock = (Array.isArray(list) && list.length) ? list[0] : null;
    if (!mock) return { data: [], httpCode: 200, delayMs: 0 };

    const httpCode = Number(mock?.httpCodeResponseValue ?? mock?.responseCode ?? 200);
    const delayMs = Number(mock?.delayMs ?? this.DEFAULT_DELAY);
    const raw = mock?.responseBody ?? mock?.body ?? mock?.response ?? null;

    let bodyObj: any = null;
    if (raw !== null && raw !== undefined) {
      try { bodyObj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_e) { bodyObj = raw; }
    }

    let data: TrackModel[] = [];
    if (bodyObj) {
      if (Array.isArray(bodyObj?.data) && bodyObj.data.length) data = bodyObj.data as TrackModel[];
      else if (Array.isArray(bodyObj) && bodyObj.length) data = bodyObj as TrackModel[];
    }

    return { data, httpCode, delayMs };
  }

  private toObservable(result: { data: TrackModel[]; httpCode: number; delayMs: number }): Observable<TrackModel[]> {
    const { data, httpCode, delayMs } = result;
    if (httpCode === 200) return of(data).pipe(delay(delayMs));
    if (httpCode === 204) return of([]).pipe(delay(delayMs));
    return throwError(() => new Error(`HTTP Error ${httpCode}`)).pipe(delay(delayMs));
  }

  getAllTracks(): Observable<TrackModel[]> {
    const SERVICE_CODE = 'music-service-1';
    return from(this.fetchContext(SERVICE_CODE)).pipe(switchMap(ctx => this.toObservable(ctx)));
  }

  getRandomTracks(): Observable<TrackModel[]> {
    const SERVICE_CODE = 'music-service-2';
    return from(this.fetchContext(SERVICE_CODE)).pipe(switchMap(ctx => this.toObservable(ctx)));
  }

  getTrackById(id: number): Observable<TrackModel> {
    const SERVICE_CODE = 'music-service-3';
    return from(this.fetchContext(SERVICE_CODE)).pipe(switchMap(ctx => {
      const { data, httpCode, delayMs } = ctx;
      if (httpCode >= 400) return throwError(() => new Error(`HTTP Error ${httpCode}`)).pipe(delay(delayMs));
      const found = (data || []).find((t: TrackModel) => t._id === id);
      if (!found) return throwError(() => new Error('Track not found')).pipe(delay(delayMs));
      return of(found).pipe(delay(delayMs));
    }));
  }
}
