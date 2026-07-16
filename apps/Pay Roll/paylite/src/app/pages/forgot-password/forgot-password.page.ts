import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserRole } from '../../models/models';
import { AppStateService } from '../../services/app-state.service';

type Step = 'find' | 'reset';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false,
})
export class ForgotPasswordPage implements OnInit {
  role: UserRole = 'employee';
  step: Step = 'find';

  userId = '';
  newPassword = '';
  confirmPassword = '';
  foundName = '';
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private state: AppStateService,
  ) {}

  ngOnInit(): void {
    this.role = this.route.snapshot.paramMap.get('role') === 'manager' ? 'manager' : 'employee';
  }

  get roleLabel(): string {
    return this.role === 'manager' ? 'Manager' : 'Team member';
  }

  findAccount(): void {
    const match = this.state.findByUserId(this.userId);
    if (!match) {
      this.error = 'No account found with that User ID.';
      return;
    }
    if (match.role !== this.role) {
      const correctTab = match.role === 'manager' ? 'Manager' : 'Team member';
      this.error = `That account is registered as ${correctTab}. Go back and use the ${correctTab} tab.`;
      return;
    }
    this.foundName = match.full_name;
    this.error = null;
    this.step = 'reset';
  }

  resetPassword(): void {
    if (this.newPassword.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    this.state.resetPassword(this.userId, this.newPassword);
    this.router.navigate(['/login', this.role], { queryParams: { userId: this.userId } });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login', this.role]);
  }
}
