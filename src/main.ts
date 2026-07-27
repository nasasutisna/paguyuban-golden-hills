import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { APP_INITIALIZER } from '@angular/core';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { JwtInterceptor } from '@interceptors/jwt.interceptor';
import { AuthService } from '@core/auth/auth.service';

function initializeAuth(authService: AuthService) {
  return () => authService.initializeAuth();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    AuthService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    },
    provideIonicAngular(),
    // Ionic 8: unlike Toast/Alert/LoadingController, ModalController is NOT
    // `providedIn: 'root'`, and `provideIonicAngular()` only registers the
    // *standalone* token. The app imports ModalController from legacy
    // '@ionic/angular' (a different DI token), so register it here explicitly.
    // This covers every legacy consumer (alert-modal, form-date-picker,
    // searchable-select, users feature, etc.) at once.
    ModalController,
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptorsFromDi())
  ],
});
