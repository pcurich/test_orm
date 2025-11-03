import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { App } from './app/app';

// The webcomponent loader (@pcurich/http-mock-workbench) is intentionally not loaded here so
// the main application has no direct dependency on the dev-only webcomponent.
// The `lib-mock-workbench` package is responsible for loading/defining the
// webcomponent when the workbench is mounted in development.

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

