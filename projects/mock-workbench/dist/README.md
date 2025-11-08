# lib-mock-workbench (desarrollo — solo dev)

`lib-mock-workbench` es una librería auxiliar pensada para entornos de desarrollo. Proporciona:

- Una envoltura Angular standalone `MockWorkbenchComponent` que crea y gestiona internamente el WebComponent `<mock-workbench>`.
- Un helper programático `mountMockWorkbench(host, props)` para montar la UI en cualquier `ViewContainerRef`.
- Tipos públicos y un utilitario conveniente `httpMockClient` que expone operaciones comunes sobre los mocks (create/get/update/delete/find/getResponseBodyAs).

Importante: esta librería está pensada para usarse como dependencia de desarrollo (devDependency). Emplea imports dinámicos en tiempo de ejecución para evitar que el código de debugging entre en bundles de producción.

## Qué incluye (API pública)

- `MockWorkbenchComponent` — componente standalone (selector: `custom-mock-workbench`).
- `mountMockWorkbench(host: ViewContainerRef, props?: MountProps): MountResult` — helper para montar desde código. `props` admite: `nameMock`, `serviceCode`, `url`, `httpMethod`, `httpCodeResponseValue`, `delayMs`, `keyMock`.
- `httpMockClient` — util exportado que provee:
  - createMock(data): `Promise<HttpMockEntity>`
  - getMockById(id): `Promise<HttpMockEntity | null>`
  - updateMock(entity): `Promise<HttpMockEntity>`
  - deleteMock(id): `Promise<boolean>`
  - getAllMocks(): `Promise<HttpMockEntity[]>`
  - findByUrl(url): `Promise<HttpMockEntity[]>`
  - findByServiceCode(serviceCode): `Promise<HttpMockEntity[]>`
  - findByIndex(...)
  - getResponseBodyAs`<T>`(id): Promise<T | null>
- Tipos exportados: `HttpMockEntity`, `HttpMockFixture`, y otros desde `./lib/types`.

## Comportamiento del wrapper (`MockWorkbenchComponent`)

- Crea internamente el WebComponent `<mock-workbench>` en `ngAfterViewInit()` y lo inserta en el DOM del host.
- Inicializa en background los servicios de IndexedDB llamando a `createIndexedDbServices` de `@pcurich/client-storage` (dinámico). Cuando esos servicios están listos expone `httpMockService` públicamente (`wrapper.httpMockService`).
- Expone un `@Input() keyMock` que reenvía inmediatamente al webcomponent si ya está creado (útil para sincronizar la clave usada en `localStorage`).
- Escucha eventos del webcomponent y llama a los servicios:
  - `loadContextEvent` -> carga mock por id y actualiza propiedades del webcomponent (contextId, nameMock, url, httpMethod, headers, responseBody, delayMs, httpCodeResponseValue).
  - `deleteContextEvent` -> elimina con `service.deleteMock(id)` y limpia UI si el mock eliminado estaba cargado.
  - `saveMockSchemaEvent` -> ahora busca por `serviceCode` con `service.findByServiceCode(serviceCode)`; si existe actualiza el primer registro con `service.updateMock(...)`, si no existe crea uno con `service.createMock(...)`. Luego posiciona la UI en la pestaña correcta.
  - `saveHeadersEvent`, `saveMockBodyEvent` -> actualizan el mock activo mediante `service.updateMock(...)`.

## Ejemplos prácticos (tal y como se usa en el proyecto)

### 1. Montar desde la app (ejemplo inspirado en `src/app/mock.component.ts` del proyecto)

```ts
// Toggle de montaje (dentro de un componente standalone que tiene @ViewChild mockHost)
const pkg: any = await import('lib-mock-workbench').catch(() => null);
if (pkg && typeof pkg.mountMockWorkbench === 'function') {
  const key = environment?.mockKey ?? 'test';
  const controller = pkg.mountMockWorkbench(this.mockHost, { keyMock: key, url: '/api/hello' });
  // controller puede ser { ref, destroy } o un ComponentRef directo
  this.mountController = controller?.ref ? controller : { ref: controller } as any;
}
```

Para desmontar:

```ts
this.mountController?.destroy?.() || this.mountController?.ref?.destroy?.();
```

### 2. Usar `httpMockClient` desde la app (ejemplo)

```ts
import { httpMockClient } from 'lib-mock-workbench';

// crear un mock
const created = await httpMockClient.createMock({
  url: '/api/demo',
  method: 'GET',
  responseCode: 200,
  responseBody: JSON.stringify({ data: [ /* TrackModel[] */ ] }),
  delayMs: 1500,
  serviceCode: 'music-service-1'
});

// buscar por serviceCode
const found = await httpMockClient.findByServiceCode('music-service-1');

// obtener el body parseado como tipo
const body = await httpMockClient.getResponseBodyAs<any>(created._id);
```

### 3. Cómo consume `TrackMockRepository` los mocks (ejemplo de constructor usado en el proyecto)

El repositorio mock del proyecto hace un import dinámico de `lib-mock-workbench` y usa `httpMockClient.findByServiceCode` para cargar datos de mock en `this.mockData`. Aquí un extracto representativo (ya aplicado en el repo):

```ts
this.initDone = (async () => {
  const pkg: any = await import('lib-mock-workbench').catch(() => null);
  const client = pkg?.httpMockClient;
  if (!client) { this.mockData = localFallback; return; }

  const list = await client.findByServiceCode('music-service-1');
  // iterate mocks, tomar responseBody via getResponseBodyAs<TrackModel[]>(id)
  // y asignar this.mockData = parsedBody || fallback
})();
```

Esto permite que la app use la misma colección de mocks definida en la UI del workbench y que el repositorio funcione como si consumiera un backend.

## Packaging local (workflow usado en el proyecto)

Para desarrollar y probar la librería localmente el proyecto incluye un flujo `pack -> relink`:

### 1. Empaqueta la librería desde `dist` (corrige el `package.json` dentro de `dist` y genera el tarball)

```powershell
cd projects\mock-workbench
npm run pack
```

### 2. Reinstala el tarball en la raíz del proyecto (script `relink:lib`)

```powershell
cd ..\..\
npm run relink:lib
```

Notas:

- `npm run pack` realiza `ng-packagr`, parchea `dist/package.json` (exports/main/typings) y genera `lib-mock-workbench-<ver>.tgz` desde `dist`.
- `relink:lib` desinstala la versión previa y reinstala el tarball. Esto hace que la app consuma la versión local empaquetada sin publicar en un registro.

## Buenas prácticas y recomendaciones

- Mantén `lib-mock-workbench` como `devDependency` y usa checks basados en `environment.production` o `environment.mockEnabled` antes de habilitar comportamientos automáticos en producción.
- Para evitar que el constructor de repositorios mock se ejecute en producción, decide la implementación del provider en `TRACK_PROVIDERS` usando `!environment.production && flagLocal`.
- Usa import dinámico (`import('lib-mock-workbench')`) en los puntos que solo deben ejecutarse en dev para evitar bundling en prod.

## Troubleshooting

- `httpMockService` undefined: espera a que `initDb()` finalice en el wrapper o usa `await ensureServices()` antes de usar `httpMockService`.
- Si la app sigue sin resolver la librería desde el tarball, vuelve a ejecutar `npm run pack` y `npm run relink:lib`.

---
