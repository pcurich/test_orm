import { ViewContainerRef, ComponentRef } from '@angular/core';
import { MockWorkbenchComponent } from './mock-workbench.component';

export interface MountProps {
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
export interface MountResult {
  ref: ComponentRef<MockWorkbenchComponent>;
  destroy: () => void;
}

/**
 * Helper to mount the MockWorkbenchComponent into a host ViewContainerRef.
 * Returns a small controller with the created ComponentRef and a destroy helper.
 */
export function mountMockWorkbench(host: ViewContainerRef, props?: MountProps): MountResult {
  const ref = host.createComponent(MockWorkbenchComponent as any) as ComponentRef<MockWorkbenchComponent>;

  if (props && typeof props === 'object') {
    // Assign props defensively: only copy known keys to avoid unexpected writes
  // include `keyMock` so callers can pass the storage key used by the wrapper
  const allowed = ['nameMock', 'serviceCode', 'url', 'httpMethod', 'httpCodeResponseValue', 'delayMs', 'keyMock'];
    for (const k of Object.keys(props)) {
      if (allowed.includes(k)) {
        try {
          (ref.instance as any)[k] = (props as any)[k];
        } catch (_e) {
          // ignore individual assignment failures
        }
      }
    }
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
