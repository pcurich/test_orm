import { Routes } from '@angular/router';
import { HomePage } from './pages/home-page/home-page';

export const HOME_ROUTES: Routes = [
  {
    path: 'tracks',
    loadChildren: () =>
      import('@modules/tracks/track.routes').then(m => m.TRACK_ROUTES)
  },
   {
    path: 'tracks/:trackId',
    loadChildren: () =>
      import('@modules/tracks/track.routes').then(m => m.TRACK_ROUTES)
  },
  {
    path: '**',
    redirectTo: '/tracks',
    pathMatch: 'full'
  },
];
