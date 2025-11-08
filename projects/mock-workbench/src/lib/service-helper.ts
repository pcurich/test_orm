/**
 * Helper para recuperar el mock asociado a un `serviceCode` desde la librería
 * Esta función encapsula la import dinámica de `httpMockClient`, la búsqueda
 * por `serviceCode` y el parseo del `responseBody` en un formato usable.
 */
import type { HttpMockEntity, DBInitOptions } from './types';
import { ensureServices } from './ensure-services';

export interface ServiceMockResult<T = any> {
  data: T[];
  httpCodeResponseValue: number;
  httpMethod: string;
  delayMs: number;
  source?: HttpMockEntity | null;
}


/**
 * Busca mocks por serviceCode y devuelve el primer body válido parseado.
 * Intent: usar await import('lib-mock-workbench') en tiempo de ejecución y
 * preferir la ruta de `ensureServices()` cuando esté disponible.
 */
/**
 * Busca mocks por serviceCode y devuelve la lista de entidades encontradas.
 * No intenta parsear ni iterar los bodies: esa responsabilidad queda para el
 * consumidor. Retorna `HttpMockEntity[]` o `null` si no se pudieron obtener.
 */
/**
 * Busca mocks por `serviceCode` y devuelve la lista de entidades encontradas.
 * Acepta un parámetro opcional `options` de tipo `DBInitOptions` que será
 * pasado a `ensureServices(options)` para inicializar/abrir la DB con la
 * configuración suministrada (dbName, version, stores, etc.).
 */
export async function fetchMockByServiceCode(serviceCode: string, options?: DBInitOptions): Promise<HttpMockEntity[]> {
  try {
  // ensureServices expects a DBInitOptions object (not undefined), so provide
  // an empty object when options is not supplied.
  const services = await ensureServices((options ?? {}) as DBInitOptions);
    const service = services?.httpMockService;

    let client: any | undefined = undefined;
    // si el servicio expone client directamente úsalo; de lo contrario busca propiedades
    client = service?.httpMockClient ?? service?.httpMockService ?? service;
    if (!client) return [];

    const found = typeof client.findByServiceCode === 'function'
      ? await client.findByServiceCode(serviceCode)
      : (typeof client.find === 'function' ? await client.find({ serviceCode }) : null);

    const list: HttpMockEntity[] = Array.isArray(found) ? found : (found ? [found] : []);
    return list.length ? list : [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mock-workbench] fetchMockByServiceCode error', err);
    return [];
  }
}
