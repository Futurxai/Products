import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { PublishExperienceFacade } from '@application/creator/publish-experience.facade';
import { ButtonComponent } from '@shared/button/button.component';
import { LoaderComponent } from '@shared/loader/loader.component';

import { describeMissingFields } from './publish-validation.util';
import { SharePanelComponent } from './ui/share-panel.component';

/**
 * Publish & Share (M3 Feature 5) — routed at `/creator/publish/:experienceId`,
 * reached from the Wizard Review step. Runs the whole "click Publish"
 * sequence through `PublishExperienceFacade`: fetch → validate → (if
 * valid) call the real Cloud Function → render either the validation
 * list, an error with a fitting recovery action, or the Share screen.
 */
@Component({
  selector: 'app-publish-page',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, LoaderComponent, ButtonComponent, SharePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publish.page.html',
  styleUrl: './publish.page.scss',
})
export class PublishPage implements OnInit {
  protected readonly publishFacade = inject(PublishExperienceFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly missingFieldMessages = computed(() => describeMissingFields(this.publishFacade.validation()?.missingFields ?? []));

  async ngOnInit(): Promise<void> {
    const experienceId = this.route.snapshot.paramMap.get('experienceId');
    if (!experienceId) {
      await this.router.navigateByUrl('/creator');
      return;
    }
    await this.publishFacade.start(experienceId);
  }

  protected async backToWizard(): Promise<void> {
    const experienceId = this.publishFacade.experience()?.experienceId;
    await this.router.navigate(experienceId ? ['/creator/wizard', experienceId] : ['/creator']);
  }

  protected async goToDashboard(): Promise<void> {
    await this.router.navigateByUrl('/creator');
  }

  protected async retry(): Promise<void> {
    await this.publishFacade.publish();
  }
}
