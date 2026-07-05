import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./components/kanban/kanban').then(m => m.KanbanBoardComponent)
  },
  {
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full'
  }
];