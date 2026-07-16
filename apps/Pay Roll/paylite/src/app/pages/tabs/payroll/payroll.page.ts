import { Component } from '@angular/core';
import { PayrollItem } from '../../../models/models';
import { AppStateService } from '../../../services/app-state.service';

@Component({
  selector: 'app-payroll',
  templateUrl: './payroll.page.html',
  styleUrls: ['./payroll.page.scss'],
  standalone: false,
})
export class PayrollPage {
  items: PayrollItem[] = [];
  monthLabel: string;

  constructor(public state: AppStateService) {
    this.monthLabel = new Date(state.year, state.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    this.refresh();
  }

  ionViewWillEnter(): void {
    this.refresh();
  }

  private refresh(): void {
    this.items = this.state.computePayroll();
  }
}
