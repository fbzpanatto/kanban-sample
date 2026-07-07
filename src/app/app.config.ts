import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from "@angular/common/http";

import { KanbanMock } from "./services/kanban-mock";
import { FetchData } from "./services/fetch-data";

import { routes } from './app.routes';
import { environment } from "../environments/environment";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    { provide: FetchData, useClass: KanbanMock }
  ]
};
