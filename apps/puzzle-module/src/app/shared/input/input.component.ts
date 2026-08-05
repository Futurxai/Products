import { ChangeDetectionStrategy, Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonInput, IonInputPasswordToggle } from '@ionic/angular/standalone';

export type InputFieldType = 'text' | 'email' | 'password';

let nextInputId = 0;

/**
 * The app's one text field — a `ControlValueAccessor` wrapping
 * `ion-input` so it drops straight into Reactive Forms
 * (`formControlName="email"`) like a native control. Label, error
 * message, and hint are handled here once instead of duplicated in
 * every form template; `type="password"` gets Ionic 8's built-in
 * `<ion-input-password-toggle>` for free — no hand-rolled
 * show/hide-icon state needed.
 */
@Component({
  selector: 'app-input',
  standalone: true,
  imports: [IonInput, IonInputPasswordToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type: InputFieldType = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = 'off';
  @Input() errorMessage: string | null = null;
  @Input() hint: string | null = null;
  @Input() required = false;

  protected readonly inputId = `app-input-${nextInputId++}`;
  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected handleInput(event: CustomEvent<{ value?: string | null }>): void {
    const next = event.detail.value ?? '';
    this.value.set(next);
    this.onChange(next);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
