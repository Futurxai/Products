import { Component } from '@angular/core';
import { BudgetCategory } from '../../../models/models';
import { AppStateService } from '../../../services/app-state.service';

@Component({
  selector: 'app-budget',
  templateUrl: './budget.page.html',
  styleUrls: ['./budget.page.scss'],
  standalone: false,
})
export class BudgetPage {
  monthLabel: string;

  categories: BudgetCategory[] = [];
  allocatedTotal = 0;
  topCategory: BudgetCategory | undefined;
  totalPayout = 0;
  variance = 0;

  newName = '';
  newAmount: number | null = null;
  error: string | null = null;

  constructor(public state: AppStateService) {
    this.monthLabel = new Date(state.year, state.month - 1).toLocaleString('en-IN', { month: 'long' });
    this.refresh();
  }

  ionViewWillEnter(): void {
    this.refresh();
  }

  private refresh(): void {
    this.categories = this.state.budget.categories;
    this.allocatedTotal = this.state.allocatedTotal();
    this.topCategory = this.state.topCategory();
    this.totalPayout = this.state.totalPayout();
    this.variance = this.state.variance();
  }

  addCategory(): void {
    const result = this.state.addBudgetCategory(this.newName, Number(this.newAmount));
    if (!result.ok) {
      this.error = result.error;
      return;
    }
    this.error = null;
    this.newName = '';
    this.newAmount = null;
    this.refresh();
  }

  removeCategory(id: string): void {
    this.state.removeBudgetCategory(id);
    this.refresh();
  }
}
