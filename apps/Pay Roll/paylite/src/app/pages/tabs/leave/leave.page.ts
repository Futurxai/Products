import { Component } from '@angular/core';
import { LeaveRequest } from '../../../models/models';
import { AppStateService } from '../../../services/app-state.service';

@Component({
  selector: 'app-leave',
  templateUrl: './leave.page.html',
  styleUrls: ['./leave.page.scss'],
  standalone: false,
})
export class LeavePage {
  myRequests: LeaveRequest[] = [];

  modalOpen = false;
  start = '';
  end = '';
  reason = '';
  error: string | null = null;

  constructor(public state: AppStateService) {
    this.refresh();
  }

  ionViewWillEnter(): void {
    this.refresh();
  }

  private refresh(): void {
    this.myRequests = this.state.myLeaveRequests();
  }

  openModal(): void {
    this.start = '';
    this.end = '';
    this.reason = '';
    this.error = null;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  submit(): void {
    const result = this.state.submitLeave(this.start, this.end, this.reason);
    if (!result.ok) {
      this.error = result.error;
      return;
    }
    this.modalOpen = false;
    this.refresh();
  }
}
