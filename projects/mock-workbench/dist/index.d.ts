import * as i0 from '@angular/core';
import { ComponentRef, OnChanges, OnDestroy, ElementRef, NgZone, SimpleChanges, ViewContainerRef } from '@angular/core';

/**
 * Public type definitions for lib-mock-workbench.
 * These approximate the data shapes provided by `http-mock-workbench` so consumers
 * can import types from this library even when the original package is dev-only.
 */

/** Minimal shape for a context option emitted by the webcomponent. */
interface ContextOption {
    id?: string | number;
    value?: string;
    useMock?: boolean;
}
type Maybe<T> = T | null | undefined;
/** Full entity stored in IndexedDB (includes DB key). */
interface HttpMockEntity {
    id: string;
    name?: string;
    serviceCode: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | string;
    httpCodeResponseValue: number;
    delayMs: number;
    headers?: Record<string, string>;
    responseBody: string;
}
interface StoreConfig {
    name: string;
    keyPath?: string;
    autoIncrement?: boolean;
    indexes?: {
        name: string;
        keyPath: string | string[];
        options?: IDBIndexParameters;
    }[];
}
interface MountProps {
    nameMock?: string;
    serviceCode?: string;
    url?: string;
    httpMethod?: string;
    httpCodeResponseValue?: number;
    delayMs?: number;
    stores?: StoreConfig[];
    contextOptions: ContextOption[];
}
/**
 * Result returned by mountMockWorkbench.
 * - ref: the created ComponentRef for advanced use
 * - destroy(): convenience to destroy and clean the host
 */
interface MountResult {
    ref: ComponentRef<MockWorkbenchComponent>;
    destroy: () => void;
}
interface DBInitOptions {
    dbName?: string;
    version?: number;
    stores?: StoreConfig[];
    httpOnly?: boolean;
    clearDatabase?: boolean;
}
interface ComponentConfig {
    contextOptions: ContextOption[];
}

/**
 * This Angular wrapper exposes the tag <custom-mock-workbench> and creates/manages
 * the actual inner webcomponent <mock-workbench>.
 * The library's webcomponent handles the UI; this wrapper forwards inputs and
 * listens for events emitted by the webcomponent so consumers can use an Angular API.
 */
declare class MockWorkbenchComponent implements OnChanges, OnDestroy {
    private hostRef;
    private ngZone;
    private wcEl;
    keyMock: string;
    dbName?: string;
    version?: number;
    stores?: StoreConfig[];
    httpOnly?: boolean;
    contextOptions?: ContextOption[];
    httpMockService: any | null;
    private options;
    constructor(hostRef: ElementRef, ngZone: NgZone);
    initDb(): Promise<void>;
    ngOnChanges(changes: SimpleChanges): void;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    onSaveMockSchemaEvent(evt: any): Promise<void>;
    onContextTypeChangeEvent(evt: any): void;
    onLoadContextEventFromWC(evt: any): Promise<void>;
    onDeleteContextEventFromWC(evt: any): Promise<void>;
    onSaveHeadersEvent(evt: any): Promise<void>;
    onSaveMockBodyEvent(evt: any): Promise<void>;
    onReloadEvent(evt: any): void;
    insertSample(): Promise<void>;
    listMocks(): Promise<void>;
    static ɵfac: i0.ɵɵFactoryDeclaration<MockWorkbenchComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<MockWorkbenchComponent, "custom-mock-workbench", never, { "keyMock": { "alias": "keyMock"; "required": false; }; "dbName": { "alias": "dbName"; "required": false; }; "version": { "alias": "version"; "required": false; }; "stores": { "alias": "stores"; "required": false; }; "httpOnly": { "alias": "httpOnly"; "required": false; }; "contextOptions": { "alias": "contextOptions"; "required": false; }; }, {}, never, never, true, never>;
}

/**
 * Helper to mount the MockWorkbenchComponent into a host ViewContainerRef.
 * Returns a small controller with the created ComponentRef and a destroy helper.
 */
declare function mountMockWorkbench(host: ViewContainerRef, props?: MountProps): MountResult;

declare const httpMockClient: {
    options: DBInitOptions;
    setDbOptions(options: DBInitOptions): Promise<void>;
    createMock(data: Partial<HttpMockEntity>): Promise<HttpMockEntity>;
    getMockById(id: IDBValidKey): Promise<HttpMockEntity | null>;
    updateMock(entity: HttpMockEntity): Promise<HttpMockEntity>;
    deleteMock(id: IDBValidKey): Promise<boolean>;
    getAllMocks(): Promise<HttpMockEntity[]>;
    findByUrl(url: string, indexName?: string, expectedKeyPath?: string | string[]): Promise<HttpMockEntity[]>;
    findByServiceCode(serviceCode: string, indexName?: string, expectedKeyPath?: string | string[]): Promise<HttpMockEntity[]>;
    findByIndex(value: IDBValidKey | IDBKeyRange, indexName?: string, expectedKeyPath?: string | string[]): Promise<HttpMockEntity[]>;
    getResponseBodyAs<T>(id: IDBValidKey): Promise<T | null>;
};

/**
 * Helper para recuperar el mock asociado a un `serviceCode` desde la librería
 * Esta función encapsula la import dinámica de `httpMockClient`, la búsqueda
 * por `serviceCode` y el parseo del `responseBody` en un formato usable.
 */

interface ServiceMockResult<T = any> {
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
declare function fetchMockByServiceCode(serviceCode: string, options?: DBInitOptions): Promise<HttpMockEntity[]>;

/**
 * Util que crea y cachea los servicios IndexedDB usados por el workbench.
 * Exporta `ensureServices()` que devuelve un objeto con los servicios o null.
 */

declare function ensureServices(options: DBInitOptions): Promise<any>;
declare function destroyServices(): Promise<void>;

export { MockWorkbenchComponent, destroyServices, ensureServices, fetchMockByServiceCode, httpMockClient, mountMockWorkbench };
export type { ComponentConfig, ContextOption, DBInitOptions, HttpMockEntity, Maybe, MountProps, MountResult, ServiceMockResult, StoreConfig };
