import type { DBInitOptions, HttpMockEntity } from './types';
import { ensureServices as ensureSharedServices } from './ensure-services';

let cachedHttpMockService: any | null = null;

async function ensureService(options: DBInitOptions): Promise<any | null> {
  if (cachedHttpMockService) return cachedHttpMockService;
  const s = await ensureSharedServices(options);
  cachedHttpMockService = s?.httpMockService ?? null;
  return cachedHttpMockService;
}

export const httpMockClient = {
  options: {} as DBInitOptions,

  async setDbOptions(options: DBInitOptions): Promise<void> {
    this.options = options;
  },

  async createMock(data: Partial<HttpMockEntity>): Promise<HttpMockEntity> {
    const svc = await ensureService(this.options);
    if (!svc) throw new Error('httpMockService not available');
    const created = await svc.createMock(data as any);
    return created as HttpMockEntity;
  },

  async getMockById(id: IDBValidKey): Promise<HttpMockEntity | null> {
    const svc = await ensureService(this.options);
    if (!svc) throw new Error('httpMockService not available');
    const res = await svc.getMockById(id);
    return (res as HttpMockEntity) ?? null;
  },

  async updateMock(entity: HttpMockEntity): Promise<HttpMockEntity> {
    const svc = await ensureService(this.options);
    if (!svc) throw new Error('httpMockService not available');
    const updated = await svc.updateMock(entity as any);
    return updated as HttpMockEntity;
  },

  async deleteMock(id: IDBValidKey): Promise<boolean> {
    const svc = await ensureService(this.options);
    if (!svc) throw new Error('httpMockService not available');
    const ok = await svc.deleteMock(id);
    return Boolean(ok);
  },

  async getAllMocks(): Promise<HttpMockEntity[]> {
    const svc = await ensureService(this.options);
    if (!svc) throw new Error('httpMockService not available');
    const all = await svc.getAllMocks();
    return (all as HttpMockEntity[]) ?? [];
  },
  async findByUrl(url: string, indexName = 'url', expectedKeyPath: string | string[] = 'url'): Promise<HttpMockEntity[]> {
    const svc = await ensureService(this.options);
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
    const svc = await ensureService(this.options);
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
    const svc = await ensureService(this.options);
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
