import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { TRACK_PROVIDERS } from '@modules/tracks';
import { SHARED_PROVIDERS } from './shared';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
  // Provide Angular HTTP client for repositories/services that inject HttpClient
  provideHttpClient(withFetch()),
    ...TRACK_PROVIDERS,
    ...SHARED_PROVIDERS,
  ]
};
