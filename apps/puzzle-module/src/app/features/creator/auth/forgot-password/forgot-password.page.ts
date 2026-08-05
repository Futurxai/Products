import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { emailFormatValidator } from '@core/forms/auth-form-validators';
import { AuthFacade } from '@application/creator/auth.facade';
import { ButtonComponent } from '@shared/button/button.component';
import { InputComponent } from '@shared/input/input.component';

import { AuthShellComponent } from '../ui/auth-shell.component';

/**
 * Deliberately does not navigate away on success — it swaps to a "check
 * your email" state instead. Firebase's `sendPasswordResetEmail`
 * succeeds the same way whether or not the address has an account
 * (Email Enumeration Protection); showing one consistent message either
 * way, rather than routing to a different page per outcome, avoids
 * accidentally revealing which emails are registered.
 */
@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IonContent, AuthShellComponent, InputComponent, ButtonComponent],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.scss',
})
export class ForgotPasswordPage {
  private readonly authFacade = inject(AuthFacade);

  protected readonly loading = this.authFacade.actionLoading;
  protected readonly errorMessage = this.authFacade.actionError;
  protected readonly submitted = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, emailFormatValidator()] }),
  });

  protected get emailError(): string | null {
    const control = this.form.controls.email;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Email is required.';
    }
    return 'Enter a valid email address.';
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.authFacade.clearError();
    const { email } = this.form.getRawValue();
    const success = await this.authFacade.sendPasswordReset(email);
    if (success) {
      this.submitted.set(true);
    }
  }
}
