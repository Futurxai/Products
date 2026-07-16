import { Injectable } from '@angular/core';
import {
  AttendanceRecord,
  BudgetEntry,
  Employee,
  LeaveRequest,
  PayrollItem,
  UserRole,
} from '../models/models';

const STORAGE_KEY = 'futurx_paylite_state_v1';

interface PersistedState {
  employees: Record<string, Employee>;
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  budgetEntry: BudgetEntry;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function countWorkingDays(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let c = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) c++;
  }
  return c;
}

function expandDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private employees: Record<string, Employee> = {};
  private attendance: AttendanceRecord[] = [];
  private leaveRequests: LeaveRequest[] = [];
  private budgetEntry: BudgetEntry;

  currentUserId: string | null = null;

  private readonly today = new Date();
  readonly year = this.today.getFullYear();
  readonly month = this.today.getMonth() + 1;
  readonly todayIso = iso(this.today);

  constructor() {
    this.budgetEntry = { month: `${this.year}-${String(this.month).padStart(2, '0')}-01`, allocated_amount: 0 };
    this.loadState();
  }

  private loadState(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: Partial<PersistedState> = JSON.parse(raw);
      if (saved.employees) this.employees = saved.employees;
      if (Array.isArray(saved.attendance)) this.attendance = saved.attendance;
      if (Array.isArray(saved.leaveRequests)) this.leaveRequests = saved.leaveRequests;
      if (saved.budgetEntry) this.budgetEntry = saved.budgetEntry;
    } catch {
      // localStorage unavailable or corrupted — start fresh.
    }
  }

  private saveState(): void {
    try {
      const payload: PersistedState = {
        employees: this.employees,
        attendance: this.attendance,
        leaveRequests: this.leaveRequests,
        budgetEntry: this.budgetEntry,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore — demo still works in-memory for this session.
    }
  }

  resetDemoData(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    this.employees = {};
    this.attendance = [];
    this.leaveRequests = [];
    this.budgetEntry = { month: `${this.year}-${String(this.month).padStart(2, '0')}-01`, allocated_amount: 0 };
    this.currentUserId = null;
  }

  // ---------- Accounts ----------
  get currentUser(): Employee | undefined {
    return this.currentUserId ? this.employees[this.currentUserId] : undefined;
  }

  get isManager(): boolean {
    return this.currentUser?.role === 'manager';
  }

  findByUserId(userId: string): Employee | undefined {
    const needle = userId.trim().toLowerCase();
    return Object.values(this.employees).find(e => e.user_id === needle);
  }

  managersList(): Employee[] {
    return Object.values(this.employees).filter(e => e.role === 'manager');
  }

  directReports(managerId: string): Employee[] {
    return Object.values(this.employees).filter(e => e.manager_id === managerId);
  }

  login(role: UserRole, userId: string, password: string): { ok: true } | { ok: false; error: string } {
    if (!userId.trim() || !password) {
      return { ok: false, error: 'Enter a User ID and password.' };
    }
    const match = this.findByUserId(userId);
    if (!match || match.password !== password) {
      return { ok: false, error: 'Incorrect User ID or password.' };
    }
    if (match.role !== role) {
      const correctTab = match.role === 'manager' ? 'Manager' : 'Team member';
      return { ok: false, error: `This account is registered as ${correctTab}. Please use the ${correctTab} tab to log in.` };
    }
    this.currentUserId = match.id;
    return { ok: true };
  }

  createAccount(params: {
    role: UserRole;
    userId: string;
    password: string;
    fullName: string;
    managerId: string | null;
  }): { ok: true } | { ok: false; error: string } {
    const userId = params.userId.trim().toLowerCase();
    const fullName = params.fullName.trim();

    if (!userId || !params.password) {
      return { ok: false, error: 'Enter a User ID and password.' };
    }
    if (this.findByUserId(userId)) {
      return { ok: false, error: 'That User ID is already taken. Try logging in instead.' };
    }
    if (!fullName) {
      return { ok: false, error: 'Enter your full name.' };
    }
    if (params.role === 'employee' && !params.managerId) {
      return { ok: false, error: 'Select your manager.' };
    }
    if (params.password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const defaultSalary = params.role === 'manager' ? 60000 : 45000;
    this.employees[userId] = {
      id: userId,
      full_name: fullName,
      user_id: userId,
      password: params.password,
      role: params.role,
      manager_id: params.role === 'employee' ? params.managerId : null,
      monthly_salary: defaultSalary,
    };
    this.saveState();
    this.currentUserId = userId;
    return { ok: true };
  }

  resetPassword(userId: string, newPassword: string): void {
    const match = this.findByUserId(userId);
    if (!match) return;
    match.password = newPassword;
    this.saveState();
  }

  signOut(): void {
    this.currentUserId = null;
  }

  // ---------- Attendance ----------
  getForDate(employeeId: string, date: string): AttendanceRecord | null {
    return this.attendance.find(a => a.employee_id === employeeId && a.date === date) || null;
  }

  getForMonth(employeeId: string): AttendanceRecord[] {
    return this.attendance
      .filter(a => a.employee_id === employeeId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  markPresentToday(): void {
    const u = this.currentUser;
    if (!u) return;
    if (this.getForDate(u.id, this.todayIso)) return;
    this.attendance.push({ employee_id: u.id, date: this.todayIso, status: 'present' });
    this.saveState();
  }

  // ---------- Leave ----------
  myLeaveRequests(): LeaveRequest[] {
    const u = this.currentUser;
    if (!u) return [];
    return this.leaveRequests.filter(r => r.employee_id === u.id);
  }

  submitLeave(start: string, end: string, reason: string): { ok: true } | { ok: false; error: string } {
    const u = this.currentUser;
    if (!u) return { ok: false, error: 'Not signed in.' };
    if (!start || !end || !reason.trim()) {
      return { ok: false, error: 'Please provide dates and a reason.' };
    }
    const dates = expandDateRange(start, end);
    for (const d of dates) {
      const existing = this.getForDate(u.id, d);
      if (existing && existing.status === 'present') {
        return { ok: false, error: `Cannot request leave for ${d}: already marked present.` };
      }
    }
    this.leaveRequests.unshift({
      id: 'lr' + Math.random().toString(36).slice(2, 7),
      employee_id: u.id,
      start_date: start,
      end_date: end,
      reason: reason.trim(),
      status: 'pending',
      created_at: 'now',
    });
    this.saveState();
    return { ok: true };
  }

  pendingReviewRequests(): LeaveRequest[] {
    const u = this.currentUser;
    if (!u) return [];
    const reportIds = this.directReports(u.id).map(e => e.id);
    return this.leaveRequests
      .filter(r => reportIds.includes(r.employee_id))
      .sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));
  }

  employeeFor(leaveRequest: LeaveRequest): Employee | undefined {
    return this.employees[leaveRequest.employee_id];
  }

  approveLeave(id: string): void {
    const r = this.leaveRequests.find(x => x.id === id);
    if (!r) return;
    r.status = 'approved';
    const dates = expandDateRange(r.start_date, r.end_date);
    dates.forEach(d => {
      const existing = this.attendance.find(a => a.employee_id === r.employee_id && a.date === d);
      if (existing) existing.status = 'absent';
      else this.attendance.push({ employee_id: r.employee_id, date: d, status: 'absent' });
    });
    this.saveState();
  }

  rejectLeave(id: string): void {
    const r = this.leaveRequests.find(x => x.id === id);
    if (!r) return;
    r.status = 'rejected';
    this.saveState();
  }

  // ---------- Payroll ----------
  computePayroll(): PayrollItem[] {
    const workingDays = countWorkingDays(this.year, this.month);
    return Object.values(this.employees).map(emp => {
      const daysPresent = this.attendance.filter(a => a.employee_id === emp.id && a.status === 'present').length;
      const raw = workingDays > 0 ? (emp.monthly_salary / workingDays) * daysPresent : 0;
      return { ...emp, working_days: workingDays, days_present: daysPresent, computed_payroll: Math.round(raw * 100) / 100 };
    });
  }

  // ---------- Budget ----------
  get budget(): BudgetEntry {
    return this.budgetEntry;
  }

  saveBudget(allocatedAmount: number): void {
    this.budgetEntry.allocated_amount = allocatedAmount;
    this.saveState();
  }

  totalPayout(): number {
    return Math.round(this.computePayroll().reduce((s, i) => s + i.computed_payroll, 0) * 100) / 100;
  }

  variance(): number {
    return Math.round((this.budgetEntry.allocated_amount - this.totalPayout()) * 100) / 100;
  }
}
