import type { HttpMockEntity } from './types';

let cachedServices: any | null = null;
let cachedHttpMockService: any | null = null;

async function ensureServices(): Promise<any | null> {
  if (cachedServices) return cachedServices;
  try {
  // dynamic dev-only import; suppress TS since the package may be dev-only
  // @ts-ignore: Dynamic dev-only import
  const lib = (await import('@pcurich/client-storage')) as any;
    const { createIndexedDbServices } = lib;
    if (typeof createIndexedDbServices !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('[lib-mock-workbench/util] createIndexedDbServices not available');
      return null;
    }
    const services = await createIndexedDbServices({ dbName: 'myDb', version: 2, httpOnly: true });
    cachedServices = services;
    cachedHttpMockService = services?.httpMockService ?? null;
    // eslint-disable-next-line no-console
    console.log('[lib-mock-workbench/util] IndexedDB services initialized (util)');
    return services;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[lib-mock-workbench/util] Failed to create services', err);
    return null;
  }
}

async function ensureService(): Promise<any | null> {
  if (cachedHttpMockService) return cachedHttpMockService;
  const s = await ensureServices();
  cachedHttpMockService = s?.httpMockService ?? null;
  return cachedHttpMockService;
}

export const httpMockClient = {
  async createMock(data: Partial<HttpMockEntity>): Promise<HttpMockEntity> {
    const svc = await ensureService();
    if (!svc) throw new Error('httpMockService not available');
    const created = await svc.createMock(data as any);
    return created as HttpMockEntity;
  },

  async getMockById(id: IDBValidKey): Promise<HttpMockEntity | null> {
    const svc = await ensureService();
    if (!svc) throw new Error('httpMockService not available');
    const res = await svc.getMockById(id);
    return (res as HttpMockEntity) ?? null;
  },

  async updateMock(entity: HttpMockEntity): Promise<HttpMockEntity> {
    const svc = await ensureService();
    if (!svc) throw new Error('httpMockService not available');
    const updated = await svc.updateMock(entity as any);
    return updated as HttpMockEntity;
  },

  async deleteMock(id: IDBValidKey): Promise<boolean> {
    const svc = await ensureService();
    if (!svc) throw new Error('httpMockService not available');
    const ok = await svc.deleteMock(id);
    return Boolean(ok);
  },

  async getAllMocks(): Promise<HttpMockEntity[]> {
    const svc = await ensureService();
    if (!svc) throw new Error('httpMockService not available');
    const all = await svc.getAllMocks();
    return (all as HttpMockEntity[]) ?? [];
  },
  async findByUrl(url: string, indexName = 'url', expectedKeyPath: string | string[] = 'url'): Promise<HttpMockEntity[]> {
    const svc = await ensureService();
    if (!svc) throw new Error('httpMockService not available');
    // Try service-provided index search
    if (typeof svc.findByIndex === 'function') {
      try {
        return await svc.findByIndex(url, indexName, expectedKeyPath);
      } catch (_e) {
        // fallback
      }
    }
    // fallback: scan all
    const all = await svc.getAllMocks();
    return (all as HttpMockEntity[]).filter(m => String(m.url) === String(url));
  },
  async findByServiceCode(serviceCode: string, indexName = 'serviceCode', expectedKeyPath: string | string[] = 'serviceCode'): Promise<HttpMockEntity[]> {
    const svc = await ensureService();
    if (!svc) throw new Error('httpMockService not available');
    if (typeof svc.findByIndex === 'function') {
      try {
        return await svc.findByIndex(serviceCode, indexName, expectedKeyPath);
      } catch (_e) {
        // fallback
      }
    }
    const all = await svc.getAllMocks();
    return (all as HttpMockEntity[]).filter(m => String(m.serviceCode) === String(serviceCode));
  },
  async findByIndex(value: IDBValidKey | IDBKeyRange, indexName = 'by_url', expectedKeyPath?: string | string[]): Promise<HttpMockEntity[]> {
    const svc = await ensureService();
    if (!svc) throw new Error('httpMockService not available');
    if (typeof svc.findByIndex === 'function') {
      return await svc.findByIndex(value, indexName, expectedKeyPath);
    }
    // fallback: naive scan
    const all = await svc.getAllMocks();
    return (all as HttpMockEntity[]).filter(m => {
      const candidate = expectedKeyPath ? (Array.isArray(expectedKeyPath) ? expectedKeyPath.map(k => (m as any)[k]).join('|') : (m as any)[expectedKeyPath]) : m.url;
      return candidate === value;
    });
  },

  async getResponseBodyAs<T>(id: IDBValidKey): Promise<T | null> {
    const mock = await this.getMockById(id);
    if (!mock) return null;
    return (mock.responseBody ?? null) as T | null;
  }
};

export default httpMockClient;
