import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { BadgeComponent } from '@shared/badge/badge.component';
import { ButtonComponent } from '@shared/button/button.component';
import { CardComponent } from '@shared/card/card.component';
import { QrCodeComponent } from '@shared/qr-code/qr-code.component';
import { ToastService } from '@shared/toast/toast.service';

/**
 * The post-publish Share screen. Takes just what it needs to render
 * (`shareUrl`/`experienceId`), not the whole `PublishExperienceSuccess`
 * result — this stays a dumb presentation piece, not another place
 * that has to know the shape of a Cloud Function response.
 *
 * "Share statistics" is an honestly-labeled placeholder, not fabricated
 * numbers — there's no analytics pipeline behind it yet, matching this
 * session's established pattern for features that aren't built (M3
 * Feature 3/4's inert Preview/Publish buttons, for instance).
 */
@Component({
  selector: 'app-share-panel',
  standalone: true,
  imports: [CardComponent, ButtonComponent, BadgeComponent, QrCodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-panel.component.html',
  styleUrl: './share-panel.component.scss',
})
export class SharePanelComponent {
  readonly shareUrl = input.required<string>();
  readonly experienceId = input.required<string>();

  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  protected readonly whatsappShareUrl = computed(
    () => `https://wa.me/?text=${encodeURIComponent(`I made something special for you! ${this.shareUrl()}`)}`,
  );

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.toast.success('Link copied!');
    } catch {
      this.toast.error('Could not copy automatically — please copy the link above manually.');
    }
  }

  protected async nativeShare(): Promise<void> {
    try {
      await navigator.share({ title: 'A puzzle made just for you', url: this.shareUrl() });
    } catch {
      // The Web Share API rejects on user cancellation too — nothing to report either way.
    }
  }

  protected async previewAsRecipient(): Promise<void> {
    await this.router.navigate(['/creator/preview', this.experienceId()]);
  }

  protected async goToDashboard(): Promise<void> {
    await this.router.navigateByUrl('/creator');
  }
}
