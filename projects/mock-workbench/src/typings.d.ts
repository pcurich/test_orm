/* Local ambient module declarations for dev-only packages used via dynamic import.
   These packages are shipped as tarballs for local development and may not
   provide TypeScript declarations. Declaring the modules here prevents the
   library build from failing during ng-packagr compilation.
*/

declare module '@pcurich/http-mock-workbench/loader' {
  const content: any;
  export default content;
}

declare module '@pcurich/http-mock-workbench' {
  // Expose a minimal ContextOption type for compile-time only.
  export type ContextOption = any;
  const content: any;
  export default content;
}

declare module '@pcurich/client-storage' {
  const content: any;
  export = content;
}
