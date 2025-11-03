/**
 * Helper para recuperar el mock asociado a un `serviceCode` desde la librería
 * Esta función encapsula la import dinámica de `httpMockClient`, la búsqueda
 * por `serviceCode` y el parseo del `responseBody` en un formato usable.
 */
import type { HttpMockEntity } from './types';
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
export async function fetchMockByServiceCode(serviceCode: string): Promise<HttpMockEntity[] | null> {
  try {
    const services = await ensureServices();
    const service = services?.httpMockService;

    let client: any | undefined = undefined;
    // si el servicio expone client directamente úsalo; de lo contrario busca propiedades
    client = service?.httpMockClient ?? service?.httpMockService ?? service;
    if (!client) return null;

    const found = typeof client.findByServiceCode === 'function'
      ? await client.findByServiceCode(serviceCode)
      : (typeof client.find === 'function' ? await client.find({ serviceCode }) : null);

    const list: HttpMockEntity[] = Array.isArray(found) ? found : (found ? [found] : []);
    return list.length ? list : null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mock-workbench] fetchMockByServiceCode error', err);
    return null;
  }
}
