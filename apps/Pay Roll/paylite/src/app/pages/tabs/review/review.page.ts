import { Component } from '@angular/core';
import { Employee, LeaveRequest } from '../../../models/models';
import { AppStateService } from '../../../services/app-state.service';

@Component({
  selector: 'app-review',
  templateUrl: './review.page.html',
  styleUrls: ['./review.page.scss'],
  standalone: false,
})
export class ReviewPage {
  requests: LeaveRequest[] = [];

  constructor(public state: AppStateService) {
    this.refresh();
  }

  ionViewWillEnter(): void {
    this.refresh();
  }

  private refresh(): void {
    this.requests = this.state.pendingReviewRequests();
  }

  employeeFor(r: LeaveRequest): Employee | undefined {
    return this.state.employeeFor(r);
  }

  approve(id: string): void {
    this.state.approveLeave(id);
    this.refresh();
  }

  reject(id: string): void {
    this.state.rejectLeave(id);
    this.refresh();
  }
}
