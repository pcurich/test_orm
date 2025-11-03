import { Routes } from '@angular/router';
import { HomePage } from '@modules/home/pages/home-page/home-page';

export const routes: Routes = [
   {
    path: '',
    component: HomePage,
    loadChildren: () =>
      import('./modules/home/home.routes').then(m => m.HOME_ROUTES)
  }
];
