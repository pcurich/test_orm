import { ViewContainerRef, ComponentRef } from '@angular/core';
import { MockWorkbenchComponent } from './mock-workbench.component';
import { MountProps, MountResult } from './types';

/**
 * Helper to mount the MockWorkbenchComponent into a host ViewContainerRef.
 * Returns a small controller with the created ComponentRef and a destroy helper.
 */
export function mountMockWorkbench(host: ViewContainerRef, props?: MountProps): MountResult {
  const ref = host.createComponent(MockWorkbenchComponent as any) as ComponentRef<MockWorkbenchComponent>;

  if (props && typeof props === 'object') {
    // Assign props defensively: only copy known keys to avoid unexpected writes
    // include `keyMock` so callers can pass the storage key used by the wrapper
    debugger;
    const allowedDB = ['nameMock', 'serviceCode', 'url', 'httpMethod', 'httpCodeResponseValue', 'delayMs', 'keyMock', 'dbName', 'version', 'stores', 'httpOnly'];
    const allowedComponent = ['contextOptions'];
    for (const k of Object.keys(props)) {
      if (!allowedDB.includes(k)) continue;
      try {
        // Special handling for `stores` to ensure the array items are normalized and typed
        if (k === 'stores') {
          const stores = (props as any).stores;
          if (Array.isArray(stores)) {
            const normalized = stores.map((s: any) => ({
              name: String(s?.name ?? ''),
              keyPath: s?.keyPath === undefined ? undefined : s.keyPath,
              autoIncrement: typeof s?.autoIncrement === 'boolean' ? s.autoIncrement : Boolean(s?.autoIncrement),
              indexes: Array.isArray(s?.indexes)
                ? s.indexes.map((idx: any) => ({
                    name: String(idx?.name ?? ''),
                    keyPath: idx?.keyPath,
                    options: idx?.options && typeof idx.options === 'object' ? idx.options : undefined,
                  }))
                : undefined,
            }));
            (ref.instance as any)[k] = normalized;
          }
        } else {
          (ref.instance as any)[k] = (props as any)[k];
        }
      } catch (_e) {
        // ignore individual assignment failures
      }
    };
    for (const k of Object.keys(props)) {
      if (!allowedComponent.includes(k)) continue;
      try {
        // Special handling for `contextOptions` to ensure correct shape
        if (k === 'contextOptions') {
          const ctx = (props as any).contextOptions;
          if (Array.isArray(ctx)) {
            const normalized = ctx.map((c: any) => ({
              id: c?.id,
              value: c?.value === undefined ? undefined : String(c?.value),
              useMock: typeof c?.useMock === 'boolean' ? c.useMock : Boolean(c?.useMock),
            }));
            (ref.instance as any)[k] = normalized;
          }
        } else {
          (ref.instance as any)[k] = (props as any)[k];
        }
      } catch (_e) {
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
      } catch (_e) {
        // ignore
      }
      try {
        // clear the host if possible (best-effort)
        if (host.length && typeof host.clear === 'function') {
          host.clear();
        }
      } catch (_e) {
        // ignore
      }
    }
  };
}
