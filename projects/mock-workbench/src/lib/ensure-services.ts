/**
 * Util que crea y cachea los servicios IndexedDB usados por el workbench.
 * Exporta `ensureServices()` que devuelve un objeto con los servicios o null.
 */
let cachedServices: any | null = null;

export async function ensureServices(options?: { dbName?: string; version?: number; httpOnly?: boolean }) {
  if (cachedServices) return cachedServices;
  try {
    // dynamic import to keep dev-only package out of prod bundles
    // @ts-ignore
    const lib = await import('@pcurich/client-storage').catch(() => null);
    const createIndexedDbServices = lib?.createIndexedDbServices ?? lib?.default?.createIndexedDbServices;
    if (typeof createIndexedDbServices !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('[lib-mock-workbench] createIndexedDbServices not found in @pcurich/client-storage');
      return null;
    }

    const cfg = { dbName: options?.dbName ?? 'myDb', version: options?.version ?? 2, httpOnly: options?.httpOnly ?? true };
    const services = await createIndexedDbServices(cfg);
    cachedServices = services;
    // eslint-disable-next-line no-console
    console.log('[lib-mock-workbench] IndexedDB services created');
    return services;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[lib-mock-workbench] ensureServices failed', err);
    return null;
  }
}

export async function destroyServices() {
  try {
    const s = cachedServices;
    if (!s) return;
    if (typeof s.destroy === 'function') await s.destroy();
    else if (typeof s.close === 'function') await s.close();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[lib-mock-workbench] destroyServices failed', err);
  } finally {
    cachedServices = null;
  }
}
