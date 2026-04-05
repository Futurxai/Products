import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { StateService } from '../../services/state';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  username = '';
  password = '';
  usernameErr = false;
  passwordErr = false;
  googleLoading = false;

  constructor(
    private router: Router,
    private state: StateService,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {}

  doLogin() {
    this.usernameErr = !this.username.trim();
    this.passwordErr = !this.password.trim();
    if (this.usernameErr || this.passwordErr) return;

    this.state.updateField('username', this.username.trim());
    this.router.navigateByUrl('/onboarding');
  }

  async doGoogleLogin() {
    this.googleLoading = true;
    try {
      const user = await this.authService.signInWithGoogle();
      const displayName = user.displayName || user.email || 'Google User';
      this.state.updateField('username', displayName);

      const toast = await this.toastCtrl.create({
        message: `✓ Welcome, ${displayName}!`,
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
      this.router.navigateByUrl('/onboarding');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const toast = await this.toastCtrl.create({
        message: err?.message || 'Google sign-in failed. Try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.googleLoading = false;
    }
  }
}
