import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then(m => m.HOME_ROUTES)
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'about-us',
    loadComponent: () => import('./features/about-us/about-us.component').then(m => m.AboutUsComponent)
  },
  {
    path: 'list-house',
    loadComponent: () => import('./features/listings/list-house.component').then(m => m.ListHouseComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'listings',
    loadComponent: () => import('./features/listings/listings-page.component').then(m => m.ListingsPageComponent)
  },
  {
    path: 'listings/:id',
    loadComponent: () => import('./features/listings/house-details.component').then(m => m.HouseDetailsComponent)
  }
];
