import * as i0 from '@angular/core';
import { OnChanges, OnDestroy, ElementRef, NgZone, SimpleChanges, ComponentRef, ViewContainerRef } from '@angular/core';

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
    httpMockService: any | null;
    constructor(hostRef: ElementRef, ngZone: NgZone);
    private initDb;
    /**
     * Note: ensureServices logic moved to shared util `ensure-services.ts`.
     * Use the imported `ensureServices()` function to obtain cached services.
     */
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
    static ɵcmp: i0.ɵɵComponentDeclaration<MockWorkbenchComponent, "custom-mock-workbench", never, { "keyMock": { "alias": "keyMock"; "required": false; }; }, {}, never, never, true, never>;
}

interface MountProps {
    nameMock?: string;
    serviceCode?: string;
    url?: string;
    httpMethod?: string;
    httpCodeResponseValue?: number;
    delayMs?: number;
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
/**
 * Helper to mount the MockWorkbenchComponent into a host ViewContainerRef.
 * Returns a small controller with the created ComponentRef and a destroy helper.
 */
declare function mountMockWorkbench(host: ViewContainerRef, props?: MountProps): MountResult;

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
/** A simple HTTP mock fixture shape used by the helper methods. */
interface HttpMockFixture {
    _id?: string | number;
    url: string;
    method: string;
    responseCode?: number;
    responseBody?: any;
    delay?: number;
    [key: string]: any;
}
type Maybe<T> = T | null | undefined;
/** Full entity stored in IndexedDB (includes DB key). */
type HttpMockEntity = HttpMockFixture & {
    _id: IDBValidKey;
};

declare const httpMockClient: {
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
declare function fetchMockByServiceCode(serviceCode: string): Promise<HttpMockEntity[] | null>;

declare function ensureServices(options?: {
    dbName?: string;
    version?: number;
    httpOnly?: boolean;
}): Promise<any>;
declare function destroyServices(): Promise<void>;

export { MockWorkbenchComponent, destroyServices, ensureServices, fetchMockByServiceCode, httpMockClient, mountMockWorkbench };
export type { ContextOption, HttpMockEntity, HttpMockFixture, Maybe, MountProps, MountResult, ServiceMockResult };
