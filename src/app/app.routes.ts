import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./components/kanban/kanban').then(m => m.KanbanBoardComponent)},
  { path: 'students/:id/details', loadComponent: () => import('./components/student-detail/student-detail').then(m => m.StudentDetails)},
  { path: '**', redirectTo: 'home', pathMatch: 'full' }
];