import * as i0 from '@angular/core';
import { HostListener, Input, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Util que crea y cachea los servicios IndexedDB usados por el workbench.
 * Exporta `ensureServices()` que devuelve un objeto con los servicios o null.
 */
let cachedServices = null;
async function ensureServices(options) {
    window.console.log('ensureServices called with options:', options);
    if (cachedServices)
        return cachedServices;
    try {
        // dynamic import to keep dev-only package out of prod bundles
        // @ts-ignore
        const lib = await import('@pcurich/client-storage').catch(() => null);
        const createIndexedDbServices = lib?.createIndexedDbServices;
        if (typeof createIndexedDbServices !== 'function') {
            // eslint-disable-next-line no-console
            console.warn('[lib-mock-workbench] createIndexedDbServices not found in @pcurich/client-storage');
            return null;
        }
        const cfg = { dbName: options?.dbName ?? 'myDb', version: options?.version ?? 1, stores: options?.stores ?? [], httpOnly: options?.httpOnly ?? true };
        window.console.log('Creating IndexedDB services with config:', cfg);
        const services = await createIndexedDbServices(cfg);
        cachedServices = services;
        // eslint-disable-next-line no-console
        console.log('[lib-mock-workbench] IndexedDB services created');
        return services;
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('[lib-mock-workbench] ensureServices failed', err);
        return null;
    }
}
async function destroyServices() {
    try {
        const s = cachedServices;
        if (!s)
            return;
        if (typeof s.destroy === 'function')
            await s.destroy();
        else if (typeof s.close === 'function')
            await s.close();
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[lib-mock-workbench] destroyServices failed', err);
    }
    finally {
        cachedServices = null;
    }
}

/**
 * This Angular wrapper exposes the tag <custom-mock-workbench> and creates/manages
 * the actual inner webcomponent <mock-workbench>.
 * The library's webcomponent handles the UI; this wrapper forwards inputs and
 * listens for events emitted by the webcomponent so consumers can use an Angular API.
 */
class MockWorkbenchComponent {
    hostRef;
    ngZone;
    wcEl = null;
    keyMock = 'useMock';
    dbName = 'myDb';
    version = 1;
    stores = [];
    httpOnly = true;
    contextOptions = [];
    httpMockService = null;
    options;
    constructor(hostRef, ngZone) {
        this.hostRef = hostRef;
        this.ngZone = ngZone;
    }
    async initDb() {
        try {
            this.options = { dbName: this.dbName, version: this.version, stores: this.stores, httpOnly: this.httpOnly };
            window.console.log('Initializing IndexedDB services with options:', this.options);
            window.console.log('ensureServices called with options:', this.dbName, this.version, this.stores, this.httpOnly);
            const services = await ensureServices(this.options);
            this.httpMockService = services?.httpMockService ?? this.httpMockService;
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error('[custom-mock-workbench] Failed to initialize IndexedDB services', e);
        }
    }
    ngOnChanges(changes) {
        // Forward changed inputs to the underlying webcomponent if it's already created
        if (!this.wcEl)
            return;
        for (const k of Object.keys(changes)) {
            try {
                // map inputs to properties expected by the webcomponent
                this.wcEl[k] = this[k];
                console.log(`[custom-mock-workbench] Updated property ${k} on webcomponent to`, this[k]);
            }
            catch (_e) {
                // ignore assignment failures
                console.error(`[custom-mock-workbench] Could not update property ${k} on webcomponent`);
            }
        }
    }
    ngAfterViewInit() {
        // Create and attach the webcomponent inside the host element
        // Run outside Angular to avoid triggering change detection from webcomponent internals
        this.ngZone.runOutsideAngular(() => {
            try {
                // Ensure the webcomponent's loader is defined. The loader package
                // `http-mock-workbench` is development-only and should be a dependency of
                // this library. Load it dynamically and call its registration helpers
                // if available. This keeps the main app free of direct references.
                (async () => {
                    try {
                        // The loader is a dev-only package and may not have typings available
                        // to the library build. Suppress TS here because the import is dynamic
                        // and only required at runtime in dev environments.
                        // @ts-ignore: Dynamic dev-only import
                        const mod = await import('@pcurich/http-mock-workbench/loader');
                        const modAny = mod;
                        const apply = (modAny && (modAny.applyPolyfills ?? modAny.default?.applyPolyfills));
                        const define = (modAny && (modAny.defineCustomElements ?? modAny.default?.defineCustomElements));
                        if (apply) {
                            await apply();
                        }
                        if (define) {
                            define(window);
                        }
                    }
                    catch (_err) {
                        // If the loader isn't available, continue — the component may still
                        // work if it's registered elsewhere or not required in this env.
                        // eslint-disable-next-line no-console
                        console.warn('@pcurich/http-mock-workbench loader not available from library; webcomponent may not be defined.');
                    }
                })();
                const hostEl = this.hostRef.nativeElement.querySelector('.mock-workbench-host') || this.hostRef.nativeElement;
                // We create the original webcomponent (<mock-workbench>) inside this wrapper so
                // consumers can use the wrapper tag <custom-mock-workbench> while the Stencil
                // component remains registered as <mock-workbench> by its loader.
                const el = document.createElement('mock-workbench');
                // append to DOM
                hostEl.appendChild(el);
                this.wcEl = el;
                // Ensure initial inputs are forwarded to the webcomponent (e.g. keyMock)
                try {
                    if (this.keyMock != null)
                        this.wcEl.keyMock = this.keyMock;
                    if (this.contextOptions != null)
                        this.wcEl.contextOptions = this.contextOptions;
                }
                catch (_e) {
                    /* ignore */
                }
                console.log('[custom-mock-workbench] <mock-workbench> webcomponent created inside wrapper.');
            }
            catch (e) {
                // eslint-disable-next-line no-console
                console.warn('Could not create inner <mock-workbench> webcomponent for <custom-mock-workbench> wrapper:', e);
            }
        });
    }
    ngOnDestroy() {
        try {
            if (this.wcEl && this.wcEl.parentNode) {
                this.wcEl.parentNode.removeChild(this.wcEl);
            }
        }
        catch (_e) {
            /* noop */
        }
        this.wcEl = null;
        // best-effort destroy of cached services in the util
        try {
            void destroyServices();
        }
        catch (_e) {
            /* noop */
        }
    }
    async onSaveMockSchemaEvent(evt) {
        // eslint-disable-next-line no-console
        const { delayMs, headers, httpCodeResponseValue, httpMethod, nameMock, serviceCode, url } = evt?.detail ?? evt;
        const services = await ensureServices(this.options);
        const service = services?.httpMockService ?? this.httpMockService;
        if (!service) {
            // eslint-disable-next-line no-console
            console.warn('[custom-mock-workbench] httpMockService not available; cannot save mock schema');
            return;
        }
        let contextId = null;
        try {
            // Try to find existing mocks for the same serviceCode
            let existing = null;
            if (typeof service.findByServiceCode === 'function') {
                try {
                    existing = await service.findByServiceCode(serviceCode);
                }
                catch (_e) {
                    // ignore find errors and continue to create
                    existing = null;
                }
            }
            const foundList = Array.isArray(existing) ? existing : (existing ? [existing] : []);
            if (foundList.length) {
                // Update the first matching entry
                const original = foundList[0];
                const toUpdate = {
                    ...original,
                    delayMs,
                    headers,
                    httpCodeResponseValue,
                    httpMethod,
                    nameMock,
                    serviceCode,
                    url
                };
                const updated = await service.updateMock(toUpdate);
                contextId = updated?._id ?? updated?.id ?? updated;
            }
            else {
                // Create new mock if none found
                const created = await service.createMock({ delayMs, headers, httpCodeResponseValue, httpMethod, nameMock, serviceCode, url });
                contextId = created?._id ?? created?.id ?? created;
            }
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error('[custom-mock-workbench] Error creating/updating mock schema', err);
            return;
        }
        const el = this.wcEl ?? document.querySelector('mock-workbench');
        if (el) {
            el.contextId = contextId;
            el.activeTab = 1;
        }
        console.log('[custom-mock-workbench] saveMockSchemaEvent', contextId);
    }
    onContextTypeChangeEvent(evt) {
        // eslint-disable-next-line no-console
        const context = (evt?.detail ?? evt);
        window.localStorage.setItem(this.keyMock, JSON.stringify(context));
        console.log('[custom-mock-workbench] contextTypeChangeEvent', context);
        window.location.reload();
    }
    async onLoadContextEventFromWC(evt) {
        const id = evt?.detail ?? evt;
        try {
            // Prefer existing cached services; ensureServices handles dynamic import and caching.
            const services = await ensureServices(this.options);
            const service = services?.httpMockService ?? this.httpMockService;
            if (!service) {
                // eslint-disable-next-line no-console
                console.warn('[custom-mock-workbench] httpMockService not available; cannot load mock');
                return;
            }
            const mock = await service.getMockById(id);
            // eslint-disable-next-line no-console
            console.log('[custom-mock-workbench] Loaded mock from webcomponent event:', mock);
            const el = this.wcEl ?? document.querySelector('mock-workbench');
            if (!el || !mock)
                return;
            // Map fields with safe fallbacks for different fixture shapes
            try {
                el.contextId = mock._id ?? mock.id;
            }
            catch { }
            try {
                el.nameMock = mock.nameMock ?? mock.name;
            }
            catch { }
            try {
                el.serviceCode = mock.serviceCode ?? mock.service;
            }
            catch { }
            try {
                el.url = mock.url ?? mock.path ?? mock.endpoint;
            }
            catch { }
            try {
                el.httpMethod = mock.httpMethod ?? mock.method;
            }
            catch { }
            try {
                el.httpCodeResponseValue = Number(mock.httpCodeResponseValue ?? mock.responseCode ?? mock.responseCodeValue ?? 0);
            }
            catch { }
            try {
                el.delayMs = Number(mock.delayMs ?? mock.delay ?? 0);
            }
            catch { }
            if (mock.headers)
                try {
                    el.headers = mock.headers;
                }
                catch { }
            if (mock.responseBody)
                try {
                    el.responseBody = mock.responseBody;
                }
                catch { }
            try {
                el.activeTab = 2;
            }
            catch { }
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error('[custom-mock-workbench] Error loading mock for id', id, err);
        }
    }
    async onDeleteContextEventFromWC(evt) {
        const id = evt?.detail ?? evt;
        try {
            const services = await ensureServices(this.options);
            const service = services?.httpMockService ?? this.httpMockService;
            if (!service) {
                // eslint-disable-next-line no-console
                console.warn('[custom-mock-workbench] httpMockService not available; cannot delete mock');
                return;
            }
            await service.deleteMock(id);
            const el = this.wcEl ?? document.querySelector('mock-workbench');
            // If the deleted mock is currently loaded in the webcomponent, clear its state
            if (el && (el.contextId === id || el.contextId === id?._id)) {
                try {
                    el.contextId = 0;
                }
                catch { }
                try {
                    el.nameMock = '';
                }
                catch { }
                try {
                    el.serviceCode = '';
                }
                catch { }
                try {
                    el.url = '';
                }
                catch { }
                try {
                    el.httpMethod = 'GET';
                }
                catch { }
                try {
                    el.httpCodeResponseValue = 200;
                }
                catch { }
                try {
                    el.delayMs = 0;
                }
                catch { }
                try {
                    el.headers = {};
                }
                catch { }
                try {
                    el.responseBody = '{}';
                }
                catch { }
                try {
                    el.activeTab = 2;
                }
                catch { }
            }
            // eslint-disable-next-line no-console
            console.log('[custom-mock-workbench] deleteContextEvent deleted id', id);
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error('[custom-mock-workbench] Error deleting mock for id', id, err);
        }
    }
    async onSaveHeadersEvent(evt) {
        // eslint-disable-next-line no-console
        let headers = evt?.detail ?? evt;
        try {
            const services = await ensureServices(this.options);
            const service = services?.httpMockService ?? this.httpMockService;
            if (!service) {
                // eslint-disable-next-line no-console
                console.warn('[custom-mock-workbench] httpMockService not available; cannot save headers');
                return;
            }
            const el = this.wcEl ?? document.querySelector('mock-workbench');
            const mock = el ? await service.getMockById(el.contextId) : null;
            if (mock) {
                mock.headers = headers;
                await service.updateMock(mock);
            }
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error('[custom-mock-workbench] Error saving headers', evt?.detail ?? evt, err);
        }
        console.log('[custom-mock-workbench] saveHeadersEvent', evt?.detail ?? evt);
    }
    async onSaveMockBodyEvent(evt) {
        // eslint-disable-next-line no-console
        let response = evt?.detail ?? evt;
        try {
            const services = await ensureServices(this.options);
            const service = services?.httpMockService ?? this.httpMockService;
            if (!service) {
                // eslint-disable-next-line no-console
                console.warn('[custom-mock-workbench] httpMockService not available; cannot save mock body');
                return;
            }
            const el = this.wcEl ?? document.querySelector('mock-workbench');
            const mock = el ? await service.getMockById(el.contextId) : null;
            // eslint-disable-next-line no-console
            console.log('contextId in saveMockBodyEvent:', el?.contextId, 'current mock:', mock);
            if (mock) {
                // Update responseBody and persist
                mock.responseBody = response.responseBody;
                await service.updateMock(mock);
            }
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error('[custom-mock-workbench] Error saving mock body', evt?.detail ?? evt, err);
        }
        console.log('[custom-mock-workbench] saveMockBodyEvent', evt?.detail ?? evt);
    }
    onReloadEvent(evt) {
        // eslint-disable-next-line no-console
        window.location.reload();
        console.log('[custom-mock-workbench] reloadEvent', evt?.detail ?? evt);
    }
    async insertSample() {
        try {
            const services = await ensureServices(this.options);
            const service = services?.httpMockService ?? this.httpMockService;
            if (!service)
                throw new Error('httpMockService not available');
            const fixture = {
                url: '/api/sample',
                method: 'GET',
                responseCode: 200,
                responseBody: { message: 'Sample mock response' },
                delay: 1000
            };
            await service.createMock(fixture);
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error('[custom-mock-workbench] Error insertando mock de ejemplo', e);
        }
    }
    async listMocks() {
        try {
            const services = await ensureServices(this.options);
            const service = services?.httpMockService ?? this.httpMockService;
            if (!service)
                throw new Error('httpMockService not available');
            const all = await service.getAllMocks();
            // eslint-disable-next-line no-console
            console.log('[custom-mock-workbench] Mocks registrados:', all);
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error('[custom-mock-workbench] Error listando mocks', e);
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.9", ngImport: i0, type: MockWorkbenchComponent, deps: [{ token: i0.ElementRef }, { token: i0.NgZone }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.3.9", type: MockWorkbenchComponent, isStandalone: true, selector: "custom-mock-workbench", inputs: { keyMock: "keyMock", dbName: "dbName", version: "version", stores: "stores", httpOnly: "httpOnly", contextOptions: "contextOptions" }, host: { listeners: { "saveMockSchemaEvent": "onSaveMockSchemaEvent($event)", "contextTypeChangeEvent": "onContextTypeChangeEvent($event)", "loadContextEvent": "onLoadContextEventFromWC($event)", "deleteContextEvent": "onDeleteContextEventFromWC($event)", "saveHeadersEvent": "onSaveHeadersEvent($event)", "saveMockBodyEvent": "onSaveMockBodyEvent($event)", "reloadEvent": "onReloadEvent($event)" } }, usesOnChanges: true, ngImport: i0, template: `
    <div class="mock-workbench-host"></div>
  `, isInline: true, dependencies: [{ kind: "ngmodule", type: CommonModule }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.9", ngImport: i0, type: MockWorkbenchComponent, decorators: [{
            type: Component,
            args: [{
                    standalone: true,
                    selector: 'custom-mock-workbench',
                    imports: [CommonModule],
                    template: `
    <div class="mock-workbench-host"></div>
  `
                }]
        }], ctorParameters: () => [{ type: i0.ElementRef }, { type: i0.NgZone }], propDecorators: { keyMock: [{
                type: Input
            }], dbName: [{
                type: Input
            }], version: [{
                type: Input
            }], stores: [{
                type: Input
            }], httpOnly: [{
                type: Input
            }], contextOptions: [{
                type: Input
            }], onSaveMockSchemaEvent: [{
                type: HostListener,
                args: ['saveMockSchemaEvent', ['$event']]
            }], onContextTypeChangeEvent: [{
                type: HostListener,
                args: ['contextTypeChangeEvent', ['$event']]
            }], onLoadContextEventFromWC: [{
                type: HostListener,
                args: ['loadContextEvent', ['$event']]
            }], onDeleteContextEventFromWC: [{
                type: HostListener,
                args: ['deleteContextEvent', ['$event']]
            }], onSaveHeadersEvent: [{
                type: HostListener,
                args: ['saveHeadersEvent', ['$event']]
            }], onSaveMockBodyEvent: [{
                type: HostListener,
                args: ['saveMockBodyEvent', ['$event']]
            }], onReloadEvent: [{
                type: HostListener,
                args: ['reloadEvent', ['$event']]
            }] } });

/**
 * Helper to mount the MockWorkbenchComponent into a host ViewContainerRef.
 * Returns a small controller with the created ComponentRef and a destroy helper.
 */
function mountMockWorkbench(host, props) {
    const ref = host.createComponent(MockWorkbenchComponent);
    if (props && typeof props === 'object') {
        // Assign props defensively: only copy known keys to avoid unexpected writes
        // include `keyMock` so callers can pass the storage key used by the wrapper
        debugger;
        const allowedDB = ['nameMock', 'serviceCode', 'url', 'httpMethod', 'httpCodeResponseValue', 'delayMs', 'keyMock', 'dbName', 'version', 'stores', 'httpOnly'];
        const allowedComponent = ['contextOptions'];
        for (const k of Object.keys(props)) {
            if (!allowedDB.includes(k))
                continue;
            try {
                // Special handling for `stores` to ensure the array items are normalized and typed
                if (k === 'stores') {
                    const stores = props.stores;
                    if (Array.isArray(stores)) {
                        const normalized = stores.map((s) => ({
                            name: String(s?.name ?? ''),
                            keyPath: s?.keyPath === undefined ? undefined : s.keyPath,
                            autoIncrement: typeof s?.autoIncrement === 'boolean' ? s.autoIncrement : Boolean(s?.autoIncrement),
                            indexes: Array.isArray(s?.indexes)
                                ? s.indexes.map((idx) => ({
                                    name: String(idx?.name ?? ''),
                                    keyPath: idx?.keyPath,
                                    options: idx?.options && typeof idx.options === 'object' ? idx.options : undefined,
                                }))
                                : undefined,
                        }));
                        ref.instance[k] = normalized;
                    }
                }
                else {
                    ref.instance[k] = props[k];
                }
            }
            catch (_e) {
                // ignore individual assignment failures
            }
        }
        ;
        for (const k of Object.keys(props)) {
            if (!allowedComponent.includes(k))
                continue;
            try {
                // Special handling for `contextOptions` to ensure correct shape
                if (k === 'contextOptions') {
                    const ctx = props.contextOptions;
                    if (Array.isArray(ctx)) {
                        const normalized = ctx.map((c) => ({
                            id: c?.id,
                            value: c?.value === undefined ? undefined : String(c?.value),
                            useMock: typeof c?.useMock === 'boolean' ? c.useMock : Boolean(c?.useMock),
                        }));
                        ref.instance[k] = normalized;
                    }
                }
                else {
                    ref.instance[k] = props[k];
                }
            }
            catch (_e) {
                // ignore individual assignment failures
            }
        }
        ref.instance.initDb?.();
    }
    return {
        ref,
        destroy: () => {
            try {
                ref.destroy();
            }
            catch (_e) {
                // ignore
            }
            try {
                // clear the host if possible (best-effort)
                if (host.length && typeof host.clear === 'function') {
                    host.clear();
                }
            }
            catch (_e) {
                // ignore
            }
        }
    };
}

let cachedHttpMockService = null;
async function ensureService(options) {
    if (cachedHttpMockService)
        return cachedHttpMockService;
    const s = await ensureServices(options);
    cachedHttpMockService = s?.httpMockService ?? null;
    return cachedHttpMockService;
}
const httpMockClient = {
    options: {},
    async setDbOptions(options) {
        this.options = options;
    },
    async createMock(data) {
        const svc = await ensureService(this.options);
        if (!svc)
            throw new Error('httpMockService not available');
        const created = await svc.createMock(data);
        return created;
    },
    async getMockById(id) {
        const svc = await ensureService(this.options);
        if (!svc)
            throw new Error('httpMockService not available');
        const res = await svc.getMockById(id);
        return res ?? null;
    },
    async updateMock(entity) {
        const svc = await ensureService(this.options);
        if (!svc)
            throw new Error('httpMockService not available');
        const updated = await svc.updateMock(entity);
        return updated;
    },
    async deleteMock(id) {
        const svc = await ensureService(this.options);
        if (!svc)
            throw new Error('httpMockService not available');
        const ok = await svc.deleteMock(id);
        return Boolean(ok);
    },
    async getAllMocks() {
        const svc = await ensureService(this.options);
        if (!svc)
            throw new Error('httpMockService not available');
        const all = await svc.getAllMocks();
        return all ?? [];
    },
    async findByUrl(url, indexName = 'url', expectedKeyPath = 'url') {
        const svc = await ensureService(this.options);
        if (!svc)
            throw new Error('httpMockService not available');
        // Try service-provided index search
        if (typeof svc.findByIndex === 'function') {
            try {
                return await svc.findByIndex(url, indexName, expectedKeyPath);
            }
            catch (_e) {
                // fallback
            }
        }
        // fallback: scan all
        const all = await svc.getAllMocks();
        return all.filter(m => String(m.url) === String(url));
    },
    async findByServiceCode(serviceCode, indexName = 'serviceCode', expectedKeyPath = 'serviceCode') {
        const svc = await ensureService(this.options);
        if (!svc)
            throw new Error('httpMockService not available');
        if (typeof svc.findByIndex === 'function') {
            try {
                return await svc.findByIndex(serviceCode, indexName, expectedKeyPath);
            }
            catch (_e) {
                // fallback
            }
        }
        const all = await svc.getAllMocks();
        return all.filter(m => String(m.serviceCode) === String(serviceCode));
    },
    async findByIndex(value, indexName = 'by_url', expectedKeyPath) {
        const svc = await ensureService(this.options);
        if (!svc)
            throw new Error('httpMockService not available');
        if (typeof svc.findByIndex === 'function') {
            return await svc.findByIndex(value, indexName, expectedKeyPath);
        }
        // fallback: naive scan
        const all = await svc.getAllMocks();
        return all.filter(m => {
            const candidate = expectedKeyPath ? (Array.isArray(expectedKeyPath) ? expectedKeyPath.map(k => m[k]).join('|') : m[expectedKeyPath]) : m.url;
            return candidate === value;
        });
    },
    async getResponseBodyAs(id) {
        const mock = await this.getMockById(id);
        if (!mock)
            return null;
        return (mock.responseBody ?? null);
    }
};

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
async function fetchMockByServiceCode(serviceCode, options) {
    try {
        // ensureServices expects a DBInitOptions object (not undefined), so provide
        // an empty object when options is not supplied.
        const services = await ensureServices((options ?? {}));
        const service = services?.httpMockService;
        let client = undefined;
        // si el servicio expone client directamente úsalo; de lo contrario busca propiedades
        client = service?.httpMockClient ?? service?.httpMockService ?? service;
        if (!client)
            return [];
        const found = typeof client.findByServiceCode === 'function'
            ? await client.findByServiceCode(serviceCode)
            : (typeof client.find === 'function' ? await client.find({ serviceCode }) : null);
        const list = Array.isArray(found) ? found : (found ? [found] : []);
        return list.length ? list : [];
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('[mock-workbench] fetchMockByServiceCode error', err);
        return [];
    }
}

/**
 * Generated bundle index. Do not edit.
 */

export { MockWorkbenchComponent, destroyServices, ensureServices, fetchMockByServiceCode, httpMockClient, mountMockWorkbench };
//# sourceMappingURL=lib-mock-workbench.mjs.map
