/**
 * Plain fixture object for demo/testing. Kept simple so the app doesn't need
 * a dependency on @pcurich/client-storage. The full mock lifecycle lives in
 * `lib-mock-workbench` in development.
 */
const sampleHttpMockEntity = {
  name: 'Mock de ejemplo',
  serviceCode: 'svc-test-001',
  url: '/api/test/mock',
  method: 'GET',
  httpCodeResponseValue: 200,
  delayMs: 1000,
  headers: { 'Content-Type': 'application/json' },
  responseBody: { message: 'ok' }
};

// Debug log in dev
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('sampleHttpMockEntity creado (plain):', sampleHttpMockEntity);
}

export default sampleHttpMockEntity;
