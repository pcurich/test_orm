import { Injectable } from "@angular/core";
import { ITrackRepository } from "@modules/tracks/interfaces/track-repository.interface";
import { TrackModel } from "@core/models/tracks.model";
import { Observable, of, throwError, from, defer } from "rxjs";
import { switchMap, delay } from 'rxjs/operators';
import { environment } from "@env/environment";
import { fetchMockByServiceCode } from 'lib-mock-workbench';


@Injectable({
  providedIn: 'root'
})
export class TrackMockRepository implements ITrackRepository {
  private mockData: TrackModel[] = [];
  private httpCodeResponseValue: number = 200;
  private httpMethod: string = 'GET';
  private delayMs: number = 1500;

  // Promise that resolves when initialization finished (success or fallback)
  private initDone: Promise<void>;

  constructor() {
    if (environment.production) {
      this.mockData = [];
      this.initDone = Promise.resolve();
      return;
    }

  this.initDone = (async () => {
    debugger;
      try {
        // Only use the library helper which returns the raw list of mocks for the serviceCode
        const list = await fetchMockByServiceCode('music-service-1');
        if (!list || !list.length) {
          const { data }: any = ({} as any).default;
          this.mockData = Array.isArray(data) ? data : [];
          return;
        }

        // Use the first mock returned and try to read its response body directly
        const mock = list[0] as any;
        const raw = mock?.responseBody ?? mock?.body ?? mock?.response ?? null;
        let bodyObj: any = null;
        if (raw != null) {
          try {
            bodyObj = typeof raw === 'string' ? JSON.parse(raw) : raw;
          } catch (parseErr) {
            // if parsing fails, log and treat as no body
            // eslint-disable-next-line no-console
            console.warn('[TrackMockRepository] failed parsing responseBody from mock', mock?._id, parseErr);
          }
        }

        if (bodyObj) {
          if (Array.isArray(bodyObj?.data) && bodyObj.data.length) {
            this.mockData = bodyObj.data;
          } else if (Array.isArray(bodyObj) && bodyObj.length) {
            this.mockData = bodyObj;
          }
        }

        if (this.mockData && this.mockData.length) {
          this.httpCodeResponseValue = mock.httpCodeResponseValue || 200;
          this.httpMethod = mock.method || 'GET';
          this.delayMs = mock.delayMs || 1500;
        } else {
          const { data }: any = ({} as any).default;
          this.mockData = Array.isArray(data) ? data : [];
        }
      } catch (err) {
        // fallback y log
        // eslint-disable-next-line no-console
        console.error('[TrackMockRepository] Error loading mockData from httpMockClient', err);
        const { data }: any = ({} as any).default;
        this.mockData = Array.isArray(data) ? data : [];
      }
    })();
  }

  getAllTracks(): Observable<TrackModel[]> {
    // ensure initialization finished before returning data, then delay by delayMs
    return from(this.initDone).pipe(switchMap(() => of(this.mockData).pipe(delay(this.delayMs))));
  }

  getRandomTracks(): Observable<TrackModel[]> {
    // wait for init, then emulate delayed response using configured delayMs
    return from(this.initDone).pipe(switchMap(() => of(this.mockData).pipe(delay(this.delayMs))));
  }

  getTrackById(id: number): Observable<TrackModel> {
    // ensure init done, then return the track (or error) after delayMs
    return from(this.initDone).pipe(switchMap(() => defer(() => {
      const track = this.mockData.find(t => t._id === id);
      return track ? of(track) : throwError(() => new Error('Track not found'));
    }).pipe(delay(this.delayMs))));
  }
}
