import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AppStateService, UserRole } from '../../services/app-state';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {

  selectedRole: UserRole = 'employee';
  empCode = '310569';
  password = 'password';

  constructor(
    private state: AppStateService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  selectRole(role: UserRole): void {
    this.selectedRole = role;
  }

  async doLogin(): Promise<void> {
    if (!this.empCode.trim() || !this.password.trim()) {
      const t = await this.toastCtrl.create({
        message: 'Please enter Employee ID and Password',
        duration: 2000,
        color: 'danger'
      });
      await t.present();
      return;
    }

    this.state.login(this.selectedRole, this.empCode);

    if (this.selectedRole === 'employee') {
      this.router.navigate(['/employee']);
    } else if (this.selectedRole === 'payroll') {
      this.router.navigate(['/payroll']);
    } else {
      this.router.navigate(['/admin']);
    }
  }
}
