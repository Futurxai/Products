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

import { ExperienceCardComponent } from './ui/experience-card.component';

/**
 * The real Creator Dashboard, replacing the temporary placeholder from
 * Feature 1. "Create New Puzzle" now opens the Wizard (Feature 3) at
 * the `new` sentinel route, which mints a real draft and replaces the
 * URL. Draft cards are clickable to resume; published/completed cards
 * stay inert — there's no Preview/detail destination for them yet
 * (Features 4-5).
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

  ngOnInit(): void {
    void this.dashboardFacade.load();
  }

  protected async createNewPuzzle(): Promise<void> {
    await this.router.navigate(['/creator/wizard', 'new']);
  }

  protected async retry(): Promise<void> {
    await this.dashboardFacade.refresh();
  }

  protected async logOut(): Promise<void> {
    await this.authFacade.logOut();
    await this.router.navigateByUrl('/auth/login');
  }
}
