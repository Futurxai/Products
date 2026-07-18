import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

/**
 * Temporary root page for Milestone M0 only.
 *
 * Its one job is to prove the scaffold actually boots end-to-end —
 * Angular bootstrap, Ionic providers, routing, and the theme tokens all
 * wired together. It is replaced by the real Creator/Recipient entry
 * routes as soon as M3/M5 land; nothing here is meant to survive past
 * that point, which is why it lives in `features/` rather than
 * `shared/` — it is not a reusable piece, it is scaffolding.
 */
@Component({
  selector: 'app-scaffold-placeholder',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Love Digitally — Puzzle Module</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h1>Scaffold is live.</h1>
      <p>Milestone M0 (Environment &amp; Infrastructure) complete.</p>
      <p>Creator and Recipient routes arrive in M3–M6.</p>
    </ion-content>
  `,
})
export class ScaffoldPlaceholderPage {}
