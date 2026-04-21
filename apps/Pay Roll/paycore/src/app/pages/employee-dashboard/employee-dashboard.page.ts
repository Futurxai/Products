import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state';
import { PayrollCalcService } from '../../services/payroll-calc';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-dashboard.page.html',
  styleUrls: ['./employee-dashboard.page.scss'],
  standalone: false,
})
export class EmployeeDashboardPage {

  user: any;
  month = 'March 2026';
  gross = 0;
  net = 0;
  totalDed = 0;
  pendingCount = 0;

  constructor(
    public state: AppStateService,
    private calc: PayrollCalcService,
    private router: Router
  ) {
    this.user = state.getUser();
    if (this.user) {
      this.gross = (this.user.basic || 0) + (this.user.hra || 0) + (this.user.special || 0);
      this.totalDed = this.calc.calcPF(this.user) + this.calc.calcESI(this.user) + this.calc.calcPT(this.user);
      this.net = this.gross - this.totalDed;
    }
    this.pendingCount = state.getPendingCount();
  }

  fmt(n: number): string { return this.calc.fmt(n); }

  logout(): void {
    this.state.logout();
    this.router.navigate(['/login']);
  }
}
