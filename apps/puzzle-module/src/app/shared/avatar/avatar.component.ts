import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * A profile picture with an initials fallback — generic on purpose
 * (`name`/`imageUrl` inputs, not a `Creator`). Computing initials from
 * a display name is presentational logic, not a business rule, so it's
 * fine to live here rather than in `domain/`.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (imageUrl()) {
      <img class="app-avatar" [src]="imageUrl()" [alt]="name()" [style.width.px]="pixelSize()" [style.height.px]="pixelSize()" loading="lazy" decoding="async" />
    } @else {
      <span
        class="app-avatar app-avatar--initials"
        [style.width.px]="pixelSize()"
        [style.height.px]="pixelSize()"
        [style.fontSize.px]="pixelSize() * 0.4"
        role="img"
        [attr.aria-label]="name()"
      >
        {{ initials() }}
      </span>
    }
  `,
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly imageUrl = input<string | null>(null);
  readonly size = input<AvatarSize>('md');

  protected readonly pixelSize = computed(() => (this.size() === 'sm' ? 28 : this.size() === 'lg' ? 56 : 40));
  protected readonly initials = computed(() => initialsFor(this.name()));
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
