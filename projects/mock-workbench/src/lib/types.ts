/**
 * Public type definitions for lib-mock-workbench.
 * These approximate the data shapes provided by `http-mock-workbench` so consumers
 * can import types from this library even when the original package is dev-only.
 */

/** Minimal shape for a context option emitted by the webcomponent. */
export interface ContextOption {
  id?: string | number;
  value?: string;
  useMock?: boolean;
}

/** A simple HTTP mock fixture shape used by the helper methods. */
export interface HttpMockFixture {
  _id?: string | number;
  url: string;
  method: string;
  responseCode?: number;
  responseBody?: any;
  delay?: number;
  [key: string]: any;
}

export type Maybe<T> = T | null | undefined;

/** Full entity stored in IndexedDB (includes DB key). */
export type HttpMockEntity = HttpMockFixture & { _id: IDBValidKey };
