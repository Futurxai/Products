import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AppStateService, UserRole } from '../../services/app-state';

type EmpOption = 'existing' | 'register';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {

  selectedRole: UserRole = 'employee';
  empOption: EmpOption = 'existing';
  registrationPending = false;
  referenceId = '';

  // Existing login
  empCode = '310569';
  password = 'password';

  // Registration form
  regForm: any = this.blankForm();

  // Upload state
  uploads: any = { pan: false, aadhaar: false, bank: false };

  constructor(
    private state: AppStateService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  selectRole(role: UserRole): void {
    this.selectedRole = role;
    if (role !== 'employee') this.empOption = 'existing';
  }

  setEmpOption(option: EmpOption): void {
    this.empOption = option;
  }

  blankForm(): any {
    return {
      code: '', password: '', firstName: '', lastName: '',
      gender: 'Male', dob: '', email: '', phone: '',
      address: '', fatherName: '',
      pan: '', aadhaar: '', pf: '', uan: '',
      bank: '', acc: '', ifsc: '', payMode: 'Bank Transfer',
      dept: 'Accounts', desig: '', doj: '', location: ''
    };
  }

  async markUpload(type: string) {
    this.uploads[type] = true;
    const labels: any = { pan: 'PAN Card', aadhaar: 'Aadhaar Card', bank: 'Bank Passbook' };
    const t = await this.toastCtrl.create({
      message: `${labels[type]} uploaded`,
      duration: 1500,
      color: 'success',
      position: 'top'
    });
    await t.present();
  }

  async doLogin(): Promise<void> {
    if (!this.empCode.trim() || !this.password.trim()) {
      const t = await this.toastCtrl.create({
        message: 'Please enter Employee ID and Password',
        duration: 2000,
        color: 'danger',
        position: 'top'
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

  async submitRegistration() {
    const f = this.regForm;
    const required = ['code', 'password', 'firstName', 'lastName', 'dob', 'email', 'phone',
                      'address', 'fatherName', 'pan', 'aadhaar', 'bank', 'acc', 'ifsc',
                      'desig', 'doj'];
    const missing = required.filter(k => !f[k] || !String(f[k]).trim());

    if (missing.length > 0) {
      const t = await this.toastCtrl.create({
        message: `Please fill required fields: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`,
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await t.present();
      return;
    }

    if (!this.uploads.pan || !this.uploads.bank) {
      const t = await this.toastCtrl.create({
        message: 'Upload PAN Card and Bank Passbook (required)',
        duration: 2500,
        color: 'danger',
        position: 'top'
      });
      await t.present();
      return;
    }

    this.referenceId = 'REG-' + String(Math.floor(Math.random() * 9000 + 1000));

    this.state.pendingApprovals.unshift({
      id: this.referenceId,
      empCode: f.code,
      empName: `${f.firstName} ${f.lastName}`.trim(),
      type: 'New Registration',
      subType: 'register',
      date: 'Just now',
      status: 'Pending',
      docs: true,
      data: { ...f }
    });

    this.registrationPending = true;
  }

  resetToLogin(): void {
    this.registrationPending = false;
    this.empOption = 'existing';
    this.regForm = this.blankForm();
    this.uploads = { pan: false, aadhaar: false, bank: false };
  }
}
