import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { AuthFacade } from '@application/creator/auth.facade';
import { ButtonComponent } from '@shared/button/button.component';

/**
 * Temporary landing page for a signed-in Creator, guarded by
 * `creatorAuthGuard`. Its only job is to prove the auth flow works
 * end-to-end — sign up/log in, land here, sign out, get redirected back
 * to Login. Replaced by the real Creator Dashboard (Feature 2 of M3),
 * not meant to survive past that point.
 */
@Component({
  selector: 'app-dashboard-placeholder-page',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, ButtonComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Puzzle Module</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>Signed in as <strong>{{ authFacade.currentCreator()?.displayName }}</strong> ({{ authFacade.currentCreator()?.email }}).</p>
      <p>The real Creator Dashboard arrives in Feature 2.</p>
      <app-button variant="secondary" (click)="logOut()">Sign out</app-button>
    </ion-content>
  `,
})
export class DashboardPlaceholderPage {
  protected readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected async logOut(): Promise<void> {
    await this.authFacade.logOut();
    await this.router.navigateByUrl('/auth/login');
  }
}
