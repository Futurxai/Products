import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state';
import { PayrollCalcService } from '../../services/payroll-calc';

@Component({
  selector: 'app-payroll-dashboard',
  templateUrl: './payroll-dashboard.page.html',
  styleUrls: ['../employee-dashboard/employee-dashboard.page.scss'],
  standalone: false,
})
export class PayrollDashboardPage {

  user: any;
  activeCount = 0;
  totalEmp = 0;
  totalCTC = 0;
  pendingCount = 0;

  constructor(
    public state: AppStateService,
    public calc: PayrollCalcService,
    private router: Router
  ) {
    this.user = state.getUser();
    this.totalEmp = state.employees.length;
    this.activeCount = state.employees.filter(e => e.status === 'Active').length;
    this.totalCTC = state.employees
      .filter(e => e.status === 'Active')
      .reduce((s, e) => s + (e.ctc || 0), 0);
    this.pendingCount = state.getPendingCount();
  }

  logout(): void {
    this.state.logout();
    this.router.navigate(['/login']);
  }
}
