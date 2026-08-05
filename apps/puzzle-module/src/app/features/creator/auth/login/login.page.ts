import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { emailFormatValidator } from '@core/forms/auth-form-validators';
import { AuthFacade } from '@application/creator/auth.facade';
import { ButtonComponent } from '@shared/button/button.component';
import { InputComponent } from '@shared/input/input.component';
import { ToastService } from '@shared/toast/toast.service';

import { AuthShellComponent } from '../ui/auth-shell.component';

/**
 * Email/password + Google sign-in. On success, navigates to
 * `returnUrl` (set by `creatorAuthGuard` when it redirected here) or
 * `/creator` if there wasn't one — landing directly on Login with no
 * prior guard redirect (e.g. a bookmarked `/auth/login`) has nothing to
 * return to, so `/creator` is the sensible default either way.
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IonContent, AuthShellComponent, InputComponent, ButtonComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly loading = this.authFacade.actionLoading;
  protected readonly errorMessage = this.authFacade.actionError;

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, emailFormatValidator()] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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

  protected get passwordError(): string | null {
    const control = this.form.controls.password;
    if (!control.touched || control.valid) {
      return null;
    }
    return 'Password is required.';
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.authFacade.clearError();
    const { email, password } = this.form.getRawValue();
    const success = await this.authFacade.logIn(email, password);
    if (success) {
      await this.afterSignInSuccess('Welcome back!');
    }
  }

  protected async continueWithGoogle(): Promise<void> {
    this.authFacade.clearError();
    const success = await this.authFacade.logInWithGoogle();
    if (success) {
      await this.afterSignInSuccess('Welcome!');
    }
  }

  private async afterSignInSuccess(message: string): Promise<void> {
    this.toast.success(message);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/creator';
    await this.router.navigateByUrl(returnUrl);
  }
}
