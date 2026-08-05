import { ChangeDetectionStrategy, Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonTextarea } from '@ionic/angular/standalone';

let nextTextareaId = 0;

/**
 * The app's one multi-line field — a `ControlValueAccessor` wrapping
 * `ion-textarea`, mirroring `InputComponent`'s shape exactly (label/
 * error/hint handled once). Separate component rather than an
 * `InputComponent` mode switch: `ion-input` and `ion-textarea` are
 * different Ionic elements with different event/attribute surfaces,
 * so sharing one wrapper would mean branching most of the template
 * anyway.
 */
@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [IonTextarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
})
export class TextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() errorMessage: string | null = null;
  @Input() hint: string | null = null;
  @Input() required = false;
  @Input() rows = 4;
  @Input() maxlength: number | undefined = undefined;

  protected readonly textareaId = `app-textarea-${nextTextareaId++}`;
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
