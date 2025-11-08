# test-orm

Proyecto Angular (plantilla) con una librería de desarrollo local llamada `mock-workbench` destinada a proporcionar una UI de mocks (webcomponent) únicamente en entornos de desarrollo.

Este README resume cómo usar y desarrollar la librería `mock-workbench`, el flujo de empaquetado local (tarball) y los eventos/contrato entre la envoltura Angular (`<custom-mock-workbench>`) y el WebComponent `<mock-workbench>`.

## Contenido rápido

- `projects/mock-workbench` — Angular library que envuelve el webcomponent `mock-workbench` (standalone wrapper: `MockWorkbenchComponent`).
- `src/app` — App mínima que monta/desmonta el mock-workbench en desarrollo.

## Desarrollo local (servidor)

 Arrancar la app en modo desarrollo:

 ```powershell
 npm start
 # o
 ng serve
 ```

 Abrir <http://localhost:4200/> en el navegador.

## Flujo de trabajo para la librería `mock-workbench`

La librería está diseñada para no introducir las dependencias de desarrollo (p. ej.`client-storage` y `http-mock-workbench`) en la app por defecto. En su lugar usa imports dinámicos en tiempo de ejecución.

Si trabajas en la librería y necesitas reinstalarla localmente en el workspace (workflow usado aquí):

1. Empaquetar la librería (genera un tarball desde `dist` con el manifest correcto):

 ```powershell
 cd projects\mock-workbench
 npm run pack
 # Esto ejecuta build y crea un .tgz listo para instalar (empaquetado desde dist)
 ```

2. Reinstalar el tarball en la raíz del workspace (script auxiliar):

 ```powershell
 cd ..\..\
 npm run relink:lib
 # El script en la raíz desinstala la versión anterior y reinstala el tarball generado
 ```

 Notas:

- El `pack` está configurado para parchear el `dist/package.json` (main/exports/typings) y empaquetar desde `dist`. Esto evita errores de resolución (p. ej. "Failed to resolve entry for package ...") cuando la app intenta importar la librería.
- El tarball resultante es autocontenido respecto al manifest; si necesitas incluir tgz de dependencias dev locales el script ya tiene un flujo para colocarlos en `dist` antes de empaquetar.

## Uso de la envoltura Angular (`<custom-mock-workbench>`)

 La librería exporta un componente standalone `MockWorkbenchComponent` que proporciona el selector `<custom-mock-workbench>`. Este wrapper:

- Crea internamente el WebComponent `<mock-workbench>` y lo añade al DOM.
- Inicializa (en background) los servicios de IndexedDB mediante `@pcurich/client-storage` y expone `httpMockService` públicamente para consumo por código Angular.
- Escucha eventos del webcomponent y los transforma en llamadas a los servicios locales (create/get/update/delete).

 Ejemplo de uso en una plantilla Angular:

 ```html
 <custom-mock-workbench></custom-mock-workbench>
 ```

 O desde código TypeScript (si necesitas llamar a utilidades públicas):

 ```ts
 // obtener referencia al componente wrapper
 const wrapper = document.querySelector('custom-mock-workbench') as any;
 // la propiedad httpMockService estará disponible cuando initDb haya terminado
 const svc = wrapper?.httpMockService;
 await svc?.getAllMocks();
 ```

### API / Eventos importantes

 El wrapper escucha y maneja varios eventos emitidos por el webcomponent y por la UI de desarrollo. Aquí están los más relevantes:

- `loadContextEvent` (detalle: id) — el wrapper llama a `service.getMockById(id)` y establece las propiedades del `<mock-workbench>` (contextId, nameMock, url, httpMethod, headers, responseBody, etc.).
- `deleteContextEvent` (detalle: id) — el wrapper llama a `service.deleteMock(id)` y, si el mock eliminado estaba cargado, limpia las propiedades del webcomponent.
- `saveMockSchemaEvent` — el wrapper crea/actualiza la metadata del mock (schema) usando `service.createMock(...)` o `service.updateMock(...)` y navega la UI del webcomponent a la pestaña correspondiente.
- `saveHeadersEvent` — persiste cabeceras del mock actual con `service.updateMock(...)`.
- `saveMockBodyEvent` — persiste el cuerpo de la respuesta del mock actual con `service.updateMock(...)`.
- `contextTypeChangeEvent` — el wrapper escribe en `localStorage` la elección del contexto (clave por defecto `useMock`) y recarga la pagina `window.location.reload()`.
- `reloadEvent` — evento que recarga la pagina con un `window.location.reload()` se reporta para hacer una recarga en el host.

 Además, el wrapper expone métodos de conveniencia (internas públicas) que se usan en desarrollo:

- `insertSample()` — crea un ejemplo de mock y emite su id al resto de la app.
- `listMocks()` — imprime en consola la lista de mocks existentes.

 Si necesitas que el wrapper emita eventos Angular a los consumidores, revisa/activa `this.loadContextEvent.emit(...)` en el componente.

## Desarrollo y debugging

- Si el dev server reporta problemas al resolver `lib-mock-workbench`, vuelve a ejecutar `npm run pack` desde `projects/mock-workbench` y `npm run relink:lib` desde la raíz para actualizar la dependencia local.
- La librería usa imports dinámicos para `@pcurich/http-mock-workbench/loader` y `@pcurich/client-storage` — esto evita que el código de desarrollo se incluya en builds de producción. Si lo necesitas dentro de producción, tendrás que convertir estas dependencias en dependencias regulares y publicar el paquete correspondiente.

## Uso del util `httpMockClient`

La librería exporta un utilitario de conveniencia `httpMockClient` que encapsula el acceso a `httpMockService` y ofrece las operaciones comunes contra la base de datos de mocks. Ejemplo de import y uso desde la app:

```ts
import { httpMockClient } from 'lib-mock-workbench';
import type { HttpMockEntity } from 'lib-mock-workbench';

async function demo() {
 // Crear un mock
 const created = await httpMockClient.createMock({
  url: '/api/demo',
  method: 'GET',
  responseCode: 200,
  responseBody: { ok: true }
 } as Partial<HttpMockEntity>);

 // Obtener por id
 const loaded = await httpMockClient.getMockById(created._id);

 // Actualizar
 if (loaded) {
  loaded.responseBody = { ok: true, updated: true };
  await httpMockClient.updateMock(loaded);
 }

 // Buscar por url
 const found = await httpMockClient.findByUrl('/api/demo');

 // Borrar
 await httpMockClient.deleteMock(created._id);

 // Obtener todos
 const all = await httpMockClient.getAllMocks();

 // Obtener el body como un tipo
 const body = await httpMockClient.getResponseBodyAs<{ ok: boolean }>(created._id);
}
```

Notas:

- `httpMockClient` realiza un `import()` dinámico de los servicios de IndexedDB la primera vez que se invoca; esto significa que puede lanzar si la dependencia de servicios no está disponible en ese entorno (por ejemplo en producción si no se instaló). Maneja errores en tu código con try/catch.
- Tipos disponibles: `HttpMockEntity`, `HttpMockFixture` (importables desde `lib-mock-workbench`).

## Buenas prácticas y recomendaciones

- Para entregas reproducibles considera publicar las dependencias dev (@pcurich/http-mock-workbench, @pcurich/client-storage) en un registro privado/npm en lugar de empaquetarlas en tarballs locales.
- Mantén la lógica del wrapper limitada a la coordinación entre webcomponent y servicios. La UI y lógica de mocks deben residir en el webcomponent para evitar duplicación.

## Troubleshooting rápido

- Error: "Failed to resolve entry for package 'lib-mock-workbench'" — asegúrate de ejecutar `npm run pack` en `projects/mock-workbench` y luego `npm run relink:lib` desde la raíz.
- Error: `httpMockService` undefined — espera a que `initDb()` termine; puedes comprobar en consola el log "IndexedDB services initialized" o usar `await this.ensureServices()` antes de usar `httpMockService`.

 ---

## Librería `mock-workbench` (detalles)

Esta sección resume con más detalle los cambios y la API que la librería aporta al proyecto:

- Componente wrapper: `MockWorkbenchComponent` (selector: `<custom-mock-workbench>`). Este componente:
  - Crea internamente el WebComponent `<mock-workbench>` en `ngAfterViewInit()` y lo inserta en el DOM.
  - En el constructor llama `initDb()` que dispara `ensureServices()` para crear y cachear los servicios de IndexedDB mediante `@pcurich/client-storage`.
  - Expone `httpMockService` públicamente cuando los servicios han sido inicializados (útil para scripts o componentes que necesiten acceso directo al servicio desde Angular).
  - Implementa un setter/forwarder para `keyMock` (propiedad de entrada) que envía el valor al webcomponent si ya existe, y registra en consola cuando se asigna.

- Montaje programático: la librería exporta `mountMockWorkbench(host: ViewContainerRef, props?)` desde `./lib/mount`.
  - `mountMockWorkbench` crea dinámicamente una instancia de `MockWorkbenchComponent` en el `ViewContainerRef` proporcionado.
  - Props soportadas (ejemplo): `nameMock`, `serviceCode`, `url`, `httpMethod`, `httpCodeResponseValue`, `delayMs`, `keyMock`.
  - Devuelve un `MountResult` con `{ ref, destroy() }` para manipular y limpiar la instancia.

Ejemplo (component.ts) — montar desde un host `ViewContainerRef`:

```ts
import { mountMockWorkbench } from 'lib-mock-workbench';

// dentro de un componente con acceso a ViewContainerRef `vc`
const { ref, destroy } = mountMockWorkbench(vc, { keyMock: environment.mockKey ?? 'test', url: '/api/hello' });

// destruir cuando no lo necesites
destroy();
```

- Eventos y cómo los maneja la envoltura:
  - `loadContextEvent` (detalle: id) — llama a `service.getMockById(id)` y establece propiedades del webcomponent (`contextId`, `nameMock`, `url`, `httpMethod`, `headers`, `responseBody`, etc.).
  - `deleteContextEvent` (detalle: id) — llama a `service.deleteMock(id)` y si el mock estaba cargado limpia la UI internamente.
  - `saveMockSchemaEvent` — crea/actualiza metadata del mock; el wrapper posiciona la UI en la pestaña correspondiente.
  - `saveHeadersEvent` / `saveMockBodyEvent` — persisten cabeceras y cuerpo mediante `service.updateMock(...)`.

- Utilitario exportado: `httpMockClient` (en `./lib/http-mock-client`).
  - Encapsula las operaciones comunes contra `httpMockService`: `createMock`, `getMockById`, `updateMock`, `deleteMock`, `getAllMocks`, `findByUrl`, `findByServiceCode`, `findByIndex`, `getResponseBodyAs<T>`.
  - Realiza un `import()` dinámico de los servicios la primera vez que se usa y cachea la instancia para llamadas posteriores.

- Tipos exportados: `HttpMockEntity`, `HttpMockFixture` (re-exportados desde `./lib/types`). Importa estos tipos desde `lib-mock-workbench` cuando los necesites.

## Ejemplo: pasar `keyMock` desde la app

En el proyecto de ejemplo usamos un componente host (`src/app/mock.component.ts`) que llama a `mountMockWorkbench` y pasa la clave `keyMock` tomada de `environment`:

```ts
mountMockWorkbench(hostRef, { keyMock: environment.mockKey ?? 'test' });
```

El wrapper tiene un setter que reenvía `keyMock` al `<mock-workbench>` para que el webcomponent utilice la misma clave de almacenamiento en `localStorage`.

## Exports públicos

La librería expone sus APIs principales desde `projects/mock-workbench/src/public-api.ts`:

```ts
export * from './lib/mock-workbench.component';
export * from './lib/mount';
export * from './lib/types';
export * from './lib/http-mock-client';
```

Importa desde tu aplicación ya sea el componente (selector), `mountMockWorkbench` o `httpMockClient` según necesites:

```ts
import { httpMockClient, mountMockWorkbench } from 'lib-mock-workbench';
```

## Empaquetado local y 'relink' (recordatorio rápido)

Si trabajas en la librería y la pruebas en la app localmente sigue estos pasos:

### 1. Desde la carpeta de la librería:

```powershell
cd projects\mock-workbench
npm run pack
```

### 2. Desde la raíz del repo: (reinstala el tarball en la app)

```powershell
npm run relink:lib
```

Notas:

- `npm run pack` genera el tarball a partir de `dist` y parchea `dist/package.json` para incluir `main/exports/typings` correctos.
- Si cambias la API pública (exports / types) recuerda regenerar el paquete y reinstalarlo.

## Observaciones finales

- La librería está pensada para entornos de desarrollo. Evita añadir los paquetes `@pcurich/http-mock-workbench` o `@pcurich/client-storage` como dependencias regulares a menos que quieras que estén disponibles en producción.
- Si quieres que añada ejemplos de tests unitarios que consuman `httpMockClient` o un pequeño script PowerShell que automatice `pack -> relink:lib`, lo incluyo en el README.

---

Si quieres, añado una sección con ejemplos de código más detallados o un pequeño script que automatice el loop build->pack->relink para desarrollo local. ¿Te interesa que lo incluya?
