import { Injectable } from "@angular/core";
import { ITrackRepository } from "@modules/tracks/interfaces/track-repository.interface";
import { TrackModel } from "@core/models/tracks.model";
import { Observable, of, throwError, from, defer } from "rxjs";
import { switchMap, delay } from 'rxjs/operators';
import { environment } from "@env/environment";


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
      try {
        // import dinámico para evitar enlazar la librería si no está instalada (dev-only)
        const pkg: any = await import('lib-mock-workbench').catch(() => null);
        const client = pkg?.httpMockClient as any | undefined;
        if (!client) {
          // fallback: usar datos locales (si tienes alguno)
          const { data }: any = ({} as any).default;
          this.mockData = Array.isArray(data) ? data : [];
          return;
        }

        // buscar mocks que pertenezcan al serviceCode
        const found = await client.findByServiceCode('music-service-1');
        console.log('[TrackMockRepository] Mocks found for serviceCode "music-service-1":', found);

        // found puede ser: HttpMockEntity | HttpMockEntity[] (dependiendo de la API)
        const list = Array.isArray(found) ? found : (found ? [found] : []);

        // si no hay resultados, fallback a datos locales
        if (!list.length) {
          const { data }: any = ({} as any).default;
          this.mockData = Array.isArray(data) ? data : [];
          return;
        }

        // Intentamos obtener y parsear el responseBody del primer mock que tenga body
        for (const mock of list) {
          try {
            // getResponseBodyAs parsea responseBody acorde al formato almacenado.
            // Pedimos explícitamente TrackModel[] como tipado esperado.
            const body = await (client as any).getResponseBodyAs(mock._id);
            // body puede ya ser objeto; intenta manejar string/JSON
            const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
            if (Array.isArray(bodyObj?.data) && bodyObj.data.length) {
              // usamos el primer body válido que encontremos
              this.mockData = bodyObj.data;
              this.httpCodeResponseValue = mock.httpCodeResponseValue || 200;
              this.httpMethod = mock.method || 'GET';
              this.delayMs = mock.delayMs || 1500;
              break;
            }
            if (Array.isArray(bodyObj) && bodyObj.length) {
              this.mockData = bodyObj;
              break;
            }
          } catch (innerErr) {
            // sigue intentando con el siguiente mock en la lista
            // eslint-disable-next-line no-console
            console.warn('[TrackMockRepository] getResponseBodyAs failed for mock id', mock?._id, innerErr);
          }
        }

        // si tras todo no hemos rellenado mockData, fallback a locales
        if (!this.mockData || !this.mockData.length) {
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
