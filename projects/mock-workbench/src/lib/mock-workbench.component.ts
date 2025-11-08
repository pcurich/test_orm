import { Component, ElementRef, HostListener, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ContextOption, DBInitOptions, StoreConfig } from './types';
import { ensureServices, destroyServices } from './ensure-services';

/**
 * This Angular wrapper exposes the tag <custom-mock-workbench> and creates/manages
 * the actual inner webcomponent <mock-workbench>.
 * The library's webcomponent handles the UI; this wrapper forwards inputs and
 * listens for events emitted by the webcomponent so consumers can use an Angular API.
 */
@Component({
  standalone: true,
  selector: 'custom-mock-workbench',
  imports: [CommonModule],
  template: `
    <div class="mock-workbench-host"></div>
  `
})
export class MockWorkbenchComponent implements OnChanges, OnDestroy {
  private wcEl: any | null = null;
  @Input() keyMock: string = 'useMock';
  @Input() dbName?: string = 'myDb';
  @Input() version?: number = 1;
  @Input() stores?: StoreConfig[] = [];
  @Input() httpOnly?: boolean = true;

  @Input() contextOptions?: ContextOption[] = [];

  public httpMockService: any | null = null;

  private options!: DBInitOptions;

  constructor(private hostRef: ElementRef, private ngZone: NgZone) {

  }

  public async initDb(): Promise<void> {
    try {
      this.options = { dbName: this.dbName, version: this.version, stores: this.stores, httpOnly: this.httpOnly };
      window.console.log('Initializing IndexedDB services with options:', this.options);
      window.console.log('ensureServices called with options:', this.dbName, this.version, this.stores, this.httpOnly);
      const services = await ensureServices(this.options);
      this.httpMockService = services?.httpMockService ?? this.httpMockService;

    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[custom-mock-workbench] Failed to initialize IndexedDB services', e);
    }
  }


  ngOnChanges(changes: SimpleChanges): void {
    // Forward changed inputs to the underlying webcomponent if it's already created
    if (!this.wcEl) return;
    for (const k of Object.keys(changes)) {
      try {
        // map inputs to properties expected by the webcomponent
        (this.wcEl as any)[k] = (this as any)[k];
        console.log(`[custom-mock-workbench] Updated property ${k} on webcomponent to`, (this as any)[k]);
      } catch (_e) {
        // ignore assignment failures
        console.error(`[custom-mock-workbench] Could not update property ${k} on webcomponent`);
      }
    }
  }

  ngAfterViewInit(): void {
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
            const modAny = mod as any;
            const apply = (modAny && (modAny.applyPolyfills ?? modAny.default?.applyPolyfills)) as
              | (() => Promise<any>)
              | undefined;
            const define = (modAny && (modAny.defineCustomElements ?? modAny.default?.defineCustomElements)) as
              | ((win: any) => void)
              | undefined;
            if (apply) {
              await apply();
            }
            if (define) {
              define(window);
            }
          } catch (_err) {
            // If the loader isn't available, continue — the component may still
            // work if it's registered elsewhere or not required in this env.
            // eslint-disable-next-line no-console
            console.warn('@pcurich/http-mock-workbench loader not available from library; webcomponent may not be defined.');
          }
        })();
        const hostEl: HTMLElement = this.hostRef.nativeElement.querySelector('.mock-workbench-host') || this.hostRef.nativeElement;
        // We create the original webcomponent (<mock-workbench>) inside this wrapper so
        // consumers can use the wrapper tag <custom-mock-workbench> while the Stencil
        // component remains registered as <mock-workbench> by its loader.
        const el = document.createElement('mock-workbench') as any;
        // append to DOM
        hostEl.appendChild(el);
        this.wcEl = el;
        // Ensure initial inputs are forwarded to the webcomponent (e.g. keyMock)
        try {
          if (this.keyMock != null) (this.wcEl as any).keyMock = this.keyMock;
          if (this.contextOptions != null) (this.wcEl as any).contextOptions = this.contextOptions;

        } catch (_e) {
          /* ignore */
        }
        console.log('[custom-mock-workbench] <mock-workbench> webcomponent created inside wrapper.');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Could not create inner <mock-workbench> webcomponent for <custom-mock-workbench> wrapper:', e);
      }
    });
  }

  ngOnDestroy(): void {
    try {
      if (this.wcEl && this.wcEl.parentNode) {
        this.wcEl.parentNode.removeChild(this.wcEl);
      }
    } catch (_e) {
      /* noop */
    }
    this.wcEl = null;
    // best-effort destroy of cached services in the util
    try {
      void destroyServices();
    } catch (_e) {
      /* noop */
    }
  }

  @HostListener('saveMockSchemaEvent', ['$event'])
  async onSaveMockSchemaEvent(evt: any): Promise<void> {
    // eslint-disable-next-line no-console
    const { delayMs, headers, httpCodeResponseValue, httpMethod, nameMock, serviceCode, url } = evt?.detail ?? evt;

    const services = await ensureServices(this.options);
    const service = services?.httpMockService ?? this.httpMockService;
    if (!service) {
      // eslint-disable-next-line no-console
      console.warn('[custom-mock-workbench] httpMockService not available; cannot save mock schema');
      return;
    }

    let contextId: any = null;
    try {
      // Try to find existing mocks for the same serviceCode
      let existing: any = null;
      if (typeof service.findByServiceCode === 'function') {
        try {
          existing = await service.findByServiceCode(serviceCode);
        } catch (_e) {
          // ignore find errors and continue to create
          existing = null;
        }
      }

      const foundList = Array.isArray(existing) ? existing : (existing ? [existing] : []);
      if (foundList.length) {
        // Update the first matching entry
        const original = foundList[0] as any;
        const toUpdate = {
          ...original,
          delayMs,
          headers,
          httpCodeResponseValue,
          httpMethod,
          nameMock,
          serviceCode,
          url
        } as any;
        const updated = await service.updateMock(toUpdate);
        contextId = updated?._id ?? updated?.id ?? updated;
      } else {
        // Create new mock if none found
        const created = await service.createMock({ delayMs, headers, httpCodeResponseValue, httpMethod, nameMock, serviceCode, url } as any);
        contextId = created?._id ?? created?.id ?? created;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[custom-mock-workbench] Error creating/updating mock schema', err);
      return;
    }
    const el = this.wcEl ?? (document.querySelector('mock-workbench') as any);
    if (el) {
      el.contextId = contextId;
      el.activeTab = 1;
    }
    console.log('[custom-mock-workbench] saveMockSchemaEvent', contextId);
  }

  @HostListener('contextTypeChangeEvent', ['$event'])
  onContextTypeChangeEvent(evt: any): void {
    // eslint-disable-next-line no-console
    const context: ContextOption = (evt?.detail ?? evt) as ContextOption;
    window.localStorage.setItem(this.keyMock, JSON.stringify(context));
    console.log('[custom-mock-workbench] contextTypeChangeEvent', context);
    window.location.reload();
  }

  @HostListener('loadContextEvent', ['$event'])
  async onLoadContextEventFromWC(evt: any): Promise<void> {
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

      const el = this.wcEl ?? (document.querySelector('mock-workbench') as any);
      if (!el || !mock) return;

      // Map fields with safe fallbacks for different fixture shapes
      try { el.contextId = mock._id ?? mock.id; } catch { }
      try { el.nameMock = mock.nameMock ?? mock.name; } catch { }
      try { el.serviceCode = mock.serviceCode ?? mock.service; } catch { }
      try { el.url = mock.url ?? mock.path ?? mock.endpoint; } catch { }
      try { el.httpMethod = mock.httpMethod ?? mock.method; } catch { }
      try { el.httpCodeResponseValue = Number(mock.httpCodeResponseValue ?? mock.responseCode ?? mock.responseCodeValue ?? 0); } catch { }
      try { el.delayMs = Number(mock.delayMs ?? mock.delay ?? 0); } catch { }
      if (mock.headers) try { el.headers = mock.headers; } catch { }
      if (mock.responseBody) try { el.responseBody = mock.responseBody; } catch { }
      try { el.activeTab = 2; } catch { }

    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[custom-mock-workbench] Error loading mock for id', id, err);
    }
  }

  @HostListener('deleteContextEvent', ['$event'])
  async onDeleteContextEventFromWC(evt: any): Promise<void> {
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

      const el = this.wcEl ?? (document.querySelector('mock-workbench') as any);
      // If the deleted mock is currently loaded in the webcomponent, clear its state
      if (el && (el.contextId === id || el.contextId === (id as any)?._id)) {
        try { el.contextId = 0; } catch { }
        try { el.nameMock = ''; } catch { }
        try { el.serviceCode = ''; } catch { }
        try { el.url = ''; } catch { }
        try { el.httpMethod = 'GET'; } catch { }
        try { el.httpCodeResponseValue = 200; } catch { }
        try { el.delayMs = 0; } catch { }
        try { el.headers = {}; } catch { }
        try { el.responseBody = '{}'; } catch { }
        try { el.activeTab = 2; } catch { }
      }

      // eslint-disable-next-line no-console
      console.log('[custom-mock-workbench] deleteContextEvent deleted id', id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[custom-mock-workbench] Error deleting mock for id', id, err);
    }
  }

  @HostListener('saveHeadersEvent', ['$event'])
  async onSaveHeadersEvent(evt: any): Promise<void> {
    // eslint-disable-next-line no-console
    let headers: Record<string, string> = evt?.detail ?? evt;
    try {
      const services = await ensureServices(this.options);
      const service = services?.httpMockService ?? this.httpMockService;
      if (!service) {
        // eslint-disable-next-line no-console
        console.warn('[custom-mock-workbench] httpMockService not available; cannot save headers');
        return;
      }

      const el = this.wcEl ?? (document.querySelector('mock-workbench') as any);
      const mock = el ? await service.getMockById(el.contextId) : null;
      if (mock) {
        mock.headers = headers;
        await service.updateMock(mock);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[custom-mock-workbench] Error saving headers', evt?.detail ?? evt, err);
    }
    console.log('[custom-mock-workbench] saveHeadersEvent', evt?.detail ?? evt);
  }

  @HostListener('saveMockBodyEvent', ['$event'])
  async onSaveMockBodyEvent(evt: any): Promise<void> {
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

      const el = this.wcEl ?? (document.querySelector('mock-workbench') as any);
      const mock = el ? await service.getMockById(el.contextId) : null;

      // eslint-disable-next-line no-console
      console.log('contextId in saveMockBodyEvent:', el?.contextId, 'current mock:', mock);

      if (mock) {
        // Update responseBody and persist
        mock.responseBody = response.responseBody;
        await service.updateMock(mock);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[custom-mock-workbench] Error saving mock body', evt?.detail ?? evt, err);
    }
    console.log('[custom-mock-workbench] saveMockBodyEvent', evt?.detail ?? evt);
  }

  @HostListener('reloadEvent', ['$event'])
  onReloadEvent(evt: any): void {
    // eslint-disable-next-line no-console
    window.location.reload()
    console.log('[custom-mock-workbench] reloadEvent', evt?.detail ?? evt);
  }

  async insertSample(): Promise<void> {
    try {
      const services = await ensureServices(this.options);
      const service = services?.httpMockService ?? this.httpMockService;
      if (!service) throw new Error('httpMockService not available');

      const fixture = {
        url: '/api/sample',
        method: 'GET',
        responseCode: 200,
        responseBody: { message: 'Sample mock response' },
        delay: 1000
      };

      await service.createMock(fixture as any);

    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[custom-mock-workbench] Error insertando mock de ejemplo', e);
    }
  }

  async listMocks(): Promise<void> {
    try {
      const services = await ensureServices(this.options);
      const service = services?.httpMockService ?? this.httpMockService;
      if (!service) throw new Error('httpMockService not available');

      const all = await service.getAllMocks();
      // eslint-disable-next-line no-console
      console.log('[custom-mock-workbench] Mocks registrados:', all);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[custom-mock-workbench] Error listando mocks', e);
    }
  }
}
