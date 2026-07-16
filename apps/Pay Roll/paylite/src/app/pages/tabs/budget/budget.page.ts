import { Component } from '@angular/core';
import { AppStateService } from '../../../services/app-state.service';

@Component({
  selector: 'app-budget',
  templateUrl: './budget.page.html',
  styleUrls: ['./budget.page.scss'],
  standalone: false,
})
export class BudgetPage {
  monthLabel: string;
  allocatedAmount: number;
  totalPayout = 0;
  variance = 0;

  constructor(public state: AppStateService) {
    this.monthLabel = new Date(state.year, state.month - 1).toLocaleString('en-IN', { month: 'long' });
    this.allocatedAmount = state.budget.allocated_amount;
    this.refresh();
  }

  ionViewWillEnter(): void {
    this.allocatedAmount = this.state.budget.allocated_amount;
    this.refresh();
  }

  private refresh(): void {
    this.totalPayout = this.state.totalPayout();
    this.variance = this.state.variance();
  }

  save(): void {
    if (!isNaN(this.allocatedAmount)) {
      this.state.saveBudget(this.allocatedAmount);
    }
    this.refresh();
  }
}
