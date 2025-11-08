/**
 * Public type definitions for lib-mock-workbench.
 * These approximate the data shapes provided by `http-mock-workbench` so consumers
 * can import types from this library even when the original package is dev-only.
 */

import { ComponentRef } from "@angular/core";
import { MockWorkbenchComponent } from "./mock-workbench.component";

/** Minimal shape for a context option emitted by the webcomponent. */
export interface ContextOption {
  id?: string | number;
  value?: string;
  useMock?: boolean;
}

export type Maybe<T> = T | null | undefined;

/** Full entity stored in IndexedDB (includes DB key). */
export interface HttpMockEntity {
  // DB key for the stored entity (allow any valid IDB key)
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

// Define StoreConfig type locally or import from @pcurich/client-storage
export interface StoreConfig {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: { name: string; keyPath: string | string[]; options?: IDBIndexParameters; }[];
}

export interface MountProps {
  nameMock?: string;
  serviceCode?: string;
  url?: string;
  httpMethod?: string;
  httpCodeResponseValue?: number;
  delayMs?: number;
  // Optional indexedDB store configuration used by the workbench/storage wrapper
  stores?: StoreConfig[];
  contextOptions: ContextOption[];
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

export interface DBInitOptions {
  dbName?: string;              // nombre de la base de datos (IndexedDB)
  version?: number;             // versión de la DB (upgrades)
  stores?: StoreConfig[];       // definición de objectStores e índices
  httpOnly?: boolean;           // si true sólo devuelve HttpMockService
  clearDatabase?: boolean;      // dev: eliminar DB antes de abrir
};

export interface ComponentConfig {
  contextOptions: ContextOption[],

}
