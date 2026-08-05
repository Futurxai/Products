import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { displayNameFormatValidator, emailFormatValidator, passwordStrengthValidator, passwordsMatchValidator } from '@core/forms/auth-form-validators';
import { AuthFacade } from '@application/creator/auth.facade';
import { ButtonComponent } from '@shared/button/button.component';
import { InputComponent } from '@shared/input/input.component';
import { ToastService } from '@shared/toast/toast.service';

import { AuthShellComponent } from '../ui/auth-shell.component';

/** Email/password + Google sign-up. Both paths land a fresh Creator on `/creator` (there is nowhere else a first-time signup could have been redirected from). */
@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IonContent, AuthShellComponent, InputComponent, ButtonComponent],
  templateUrl: './signup.page.html',
  styleUrl: './signup.page.scss',
})
export class SignupPage {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = this.authFacade.actionLoading;
  protected readonly errorMessage = this.authFacade.actionError;

  protected readonly form = new FormGroup(
    {
      displayName: new FormControl('', { nonNullable: true, validators: [Validators.required, displayNameFormatValidator()] }),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, emailFormatValidator()] }),
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordStrengthValidator()] }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [passwordsMatchValidator('password', 'confirmPassword')] },
  );

  protected get displayNameError(): string | null {
    const control = this.form.controls.displayName;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Name is required.';
    }
    return 'Enter a name between 2 and 60 characters.';
  }

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

  protected get passwordError(): string | null {
    const control = this.form.controls.password;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Password is required.';
    }
    return 'Use at least 8 characters, with a letter and a number.';
  }

  protected get confirmPasswordError(): string | null {
    const control = this.form.controls.confirmPassword;
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Please confirm your password.';
    }
    if (this.form.hasError('passwordsMismatch')) {
      return 'Passwords do not match.';
    }
    return null;
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.authFacade.clearError();
    const { displayName, email, password } = this.form.getRawValue();
    const success = await this.authFacade.signUp(email, password, displayName);
    if (success) {
      await this.afterSignUpSuccess();
    }
  }

  protected async continueWithGoogle(): Promise<void> {
    this.authFacade.clearError();
    const success = await this.authFacade.logInWithGoogle();
    if (success) {
      await this.afterSignUpSuccess();
    }
  }

  private async afterSignUpSuccess(): Promise<void> {
    this.toast.success('Welcome to Love Digitally!');
    await this.router.navigateByUrl('/creator');
  }
}
