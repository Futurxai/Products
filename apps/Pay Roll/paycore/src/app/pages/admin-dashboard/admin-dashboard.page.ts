import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['../employee-dashboard/employee-dashboard.page.scss'],
  standalone: false,
})
export class AdminDashboardPage {

  user: any;
  totalEmp = 0;
  payrollUsers = 0;
  adminUsers = 0;
  pendingCount = 0;

  constructor(public state: AppStateService, private router: Router) {
    this.user = state.getUser();
    this.totalEmp = state.employees.length;
    this.payrollUsers = state.users.filter(u => u.role === 'payroll').length;
    this.adminUsers = state.users.filter(u => u.role === 'admin').length;
    this.pendingCount = state.pendingApprovals.filter(a => a.status === 'Pending').length;
  }

  logout(): void {
    this.state.logout();
    this.router.navigate(['/login']);
  }
}
