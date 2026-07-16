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
    this.state.markAttendanceToday('present');
    this.refresh();
  }

  markAbsent(): void {
    this.state.markAttendanceToday('absent');
    this.refresh();
  }

  checkOut(): void {
    this.state.checkOutToday();
    this.refresh();
  }

  formatTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
}
