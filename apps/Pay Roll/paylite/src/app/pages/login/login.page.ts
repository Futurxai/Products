import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Employee, UserRole } from '../../models/models';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  role: UserRole = 'employee';
  isCreatingAccount = false;

  userId = '';
  password = '';
  fullName = '';
  managerId = '';

  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private state: AppStateService,
  ) {}

  ngOnInit(): void {
    this.role = this.route.snapshot.paramMap.get('role') === 'manager' ? 'manager' : 'employee';
    const prefill = this.route.snapshot.queryParamMap.get('userId');
    if (prefill) this.userId = prefill;
  }

  get roleLabel(): string {
    return this.role === 'manager' ? 'Manager' : 'Team member';
  }

  get managers(): Employee[] {
    return this.state.managersList();
  }

  toggleMode(): void {
    this.isCreatingAccount = !this.isCreatingAccount;
    this.error = null;
  }

  goBack(): void {
    this.router.navigate(['/role-select']);
  }

  goForgotPassword(): void {
    this.router.navigate(['/forgot-password', this.role]);
  }

  submit(): void {
    this.error = null;
    const result = this.isCreatingAccount
      ? this.state.createAccount({
          role: this.role,
          userId: this.userId,
          password: this.password,
          fullName: this.fullName,
          managerId: this.managerId || null,
        })
      : this.state.login(this.role, this.userId, this.password);

    if (!result.ok) {
      this.error = result.error;
      return;
    }
    this.router.navigate(['/tabs/home']);
  }
}
