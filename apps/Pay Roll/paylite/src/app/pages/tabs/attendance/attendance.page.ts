import { Component } from '@angular/core';
import { AttendanceRecord } from '../../../models/models';
import { AppStateService } from '../../../services/app-state.service';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false,
})
export class AttendancePage {
  todayRecord: AttendanceRecord | null = null;
  monthRecords: AttendanceRecord[] = [];

  constructor(public state: AppStateService) {
    this.refresh();
  }

  ionViewWillEnter(): void {
    this.refresh();
  }

  private refresh(): void {
    const u = this.state.currentUser;
    if (!u) return;
    this.todayRecord = this.state.getForDate(u.id, this.state.todayIso);
    this.monthRecords = this.state.getForMonth(u.id);
  }

  markPresent(): void {
    this.state.markPresentToday();
    this.refresh();
  }
}
