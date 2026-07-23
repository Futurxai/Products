import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonItem, IonList, IonPopover, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { AuthFacade } from '@application/creator/auth.facade';
import { CreatorDashboardFacade } from '@application/creator/creator-dashboard.facade';
import { AvatarComponent } from '@shared/avatar/avatar.component';
import { ButtonComponent } from '@shared/button/button.component';
import { CardComponent } from '@shared/card/card.component';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { LoaderComponent } from '@shared/loader/loader.component';
import { ToastService } from '@shared/toast/toast.service';

import { ExperienceCardComponent } from './ui/experience-card.component';

/**
 * The real Creator Dashboard, replacing the temporary placeholder from
 * Feature 1. "Create New Puzzle" and the puzzle cards are deliberately
 * inert beyond a toast — the Puzzle Creation Wizard (Feature 3) is what
 * gives them somewhere to go; wiring navigation to a route that doesn't
 * exist yet would be worse than being honest that it's next.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonPopover,
    IonList,
    IonItem,
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoaderComponent,
    ExperienceCardComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage implements OnInit {
  protected readonly authFacade = inject(AuthFacade);
  protected readonly dashboardFacade = inject(CreatorDashboardFacade);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    void this.dashboardFacade.load();
  }

  protected createNewPuzzle(): void {
    this.toast.show('The Puzzle Creation Wizard arrives in the next feature.', 'info');
  }

  protected async retry(): Promise<void> {
    await this.dashboardFacade.refresh();
  }

  protected async logOut(): Promise<void> {
    await this.authFacade.logOut();
    await this.router.navigateByUrl('/auth/login');
  }
}
