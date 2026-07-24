import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { ToastHostComponent } from './shared/toast/toast-host.component';
import { OfflineBannerComponent } from './shared/offline-banner/offline-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, ToastHostComponent, OfflineBannerComponent],
  template: `
    <ion-app>
      <app-offline-banner></app-offline-banner>
      <ion-router-outlet></ion-router-outlet>
      <app-toast-host></app-toast-host>
    </ion-app>
  `,
})
export class AppComponent {}
