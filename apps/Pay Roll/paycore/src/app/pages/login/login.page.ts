import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AppStateService, UserRole } from '../../services/app-state';
import { SupabaseService } from '../../services/supabase.service';

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

  // Upload state: tracks uploaded file URLs (real Supabase Storage)
  uploads: { pan: string | null; aadhaar: string | null; bank: string | null } =
    { pan: null, aadhaar: null, bank: null };
  uploading: { pan: boolean; aadhaar: boolean; bank: boolean } =
    { pan: false, aadhaar: false, bank: false };

  constructor(
    private state: AppStateService,
    private supabase: SupabaseService,
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

  async uploadFile(event: Event, type: 'pan' | 'aadhaar' | 'bank') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const t = await this.toastCtrl.create({
        message: 'File too large (max 5MB)',
        duration: 2000, color: 'danger', position: 'top'
      });
      await t.present();
      input.value = '';
      return;
    }

    const empCode = this.regForm.code || 'pending-' + Date.now();
    this.uploading[type] = true;
    const url = await this.supabase.uploadDoc(empCode, type, file);
    this.uploading[type] = false;

    if (url) {
      this.uploads[type] = url;
      const labels: any = { pan: 'PAN Card', aadhaar: 'Aadhaar Card', bank: 'Bank Passbook' };
      const t = await this.toastCtrl.create({
        message: `${labels[type]} uploaded successfully`,
        duration: 1500, color: 'success', position: 'top'
      });
      await t.present();
    } else {
      const t = await this.toastCtrl.create({
        message: 'Upload failed. Please try again.',
        duration: 2500, color: 'danger', position: 'top'
      });
      await t.present();
      input.value = '';
    }
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

    await this.state.addApproval({
      id: this.referenceId,
      empCode: f.code,
      empName: `${f.firstName} ${f.lastName}`.trim(),
      type: 'New Registration',
      subType: 'register',
      date: 'Just now',
      status: 'Pending',
      docs: true,
      data: {
        ...f,
        docUrls: {
          pan: this.uploads.pan,
          aadhaar: this.uploads.aadhaar,
          bank: this.uploads.bank
        }
      }
    });

    this.registrationPending = true;
  }

  resetToLogin(): void {
    this.registrationPending = false;
    this.empOption = 'existing';
    this.regForm = this.blankForm();
    this.uploads = { pan: null, aadhaar: null, bank: null };
  }
}
