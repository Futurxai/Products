import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

export type UserRole = 'employee' | 'payroll' | 'admin';

export interface Employee {
  code: string;
  firstName: string;
  lastName: string;
  name: string;
  gender?: string;
  dob?: string;
  doj?: string;
  pan?: string;
  aadhaar?: string;
  pf?: string;
  uan?: string;
  esi?: string;
  bank?: string;
  acc?: string;
  ifsc?: string;
  payMode?: string;
  workEmail?: string;
  personalEmail?: string;
  fatherName?: string;
  entity?: string;
  dept: string;
  desig: string;
  category?: string;
  branch?: string;
  division?: string;
  location?: string;
  district?: string;
  state?: string;
  costCenter?: string;
  ctc: number;
  basic: number;
  hra: number;
  special: number;
  status: 'Active' | 'Terminated' | 'On Hold';
  phone?: string;
  pfTag?: 'F' | 'FN' | 'N' | 'M' | 'NIL';
  esiApply?: boolean;
  ptApply?: boolean;
  incomeTax?: number;
  taxRegime?: 'new' | 'old';
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  empId: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  initials: string;
}

export interface Holiday {
  name: string;
  date: string;
  type: 'National Holiday' | 'Regional Holiday' | 'Company Holiday' | 'Restricted Holiday';
}

export interface Approval {
  id: string;
  empCode: string;
  empName: string;
  type: string;
  subType: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  docs: boolean;
  data?: any;
  changes?: any;
}

export interface DisbursementRecord {
  month: string;
  date: string;
  employees: Employee[];
}

export interface PayslipMonth {
  label: string;
  short: string;
  year: string;
  creditDate: string;
}

export const PAYSLIP_MONTHS: PayslipMonth[] = [
  { label: 'March 2026',    short: 'Mar 26', year: '2025-26', creditDate: '08 Apr 2026' },
  { label: 'February 2026', short: 'Feb 26', year: '2025-26', creditDate: '07 Mar 2026' },
  { label: 'January 2026',  short: 'Jan 26', year: '2025-26', creditDate: '08 Feb 2026' },
  { label: 'December 2025', short: 'Dec 25', year: '2025-26', creditDate: '08 Jan 2026' },
  { label: 'November 2025', short: 'Nov 25', year: '2025-26', creditDate: '08 Dec 2025' },
  { label: 'October 2025',  short: 'Oct 25', year: '2025-26', creditDate: '08 Nov 2025' },
];

@Injectable({ providedIn: 'root' })
export class AppStateService {

  private currentRole$ = new BehaviorSubject<UserRole>('employee');
  private currentUser$ = new BehaviorSubject<any>(null);
  private payrollLocked$ = new BehaviorSubject<boolean>(false);

  payrollPeriod = 'March 2026';
  currentSalaryMonth = 'March 2026';
  currentPayslipMonth = 'March 2026';
  currentPayslipYear = '2025-26';
  currentTaxYear = '2025-26';

  salaryMonths: { [key: string]: { excluded: string[]; disbursed?: boolean } } = {};
  disbursedHistory: DisbursementRecord[] = [];

  employees: Employee[] = [];
  users: SystemUser[] = [];
  holidays: Holiday[] = [];
  pendingApprovals: Approval[] = [];

  loaded$ = new BehaviorSubject<boolean>(false);

  role$ = this.currentRole$.asObservable();
  user$ = this.currentUser$.asObservable();
  locked$ = this.payrollLocked$.asObservable();

  constructor(private supabase: SupabaseService) {
    this.loadAll();
  }

  async loadAll(): Promise<void> {
    const [employees, users, holidays, approvals, salaryMonths, disbursements] = await Promise.all([
      this.supabase.loadEmployees(),
      this.supabase.loadUsers(),
      this.supabase.loadHolidays(),
      this.supabase.loadApprovals(),
      this.supabase.loadSalaryMonths(),
      this.supabase.loadDisbursements()
    ]);
    this.employees = employees;
    this.users = users;
    this.holidays = holidays;
    this.pendingApprovals = approvals;
    this.salaryMonths = salaryMonths;
    this.disbursedHistory = disbursements;
    this.loaded$.next(true);
  }

  // ========== WRITE HELPERS (write-through to Supabase) ==========
  async addEmployee(emp: Employee): Promise<void> {
    this.employees.unshift(emp);
    await this.supabase.insertEmployee(emp);
  }

  async updateEmployee(code: string, updates: Partial<Employee>): Promise<void> {
    const emp = this.employees.find(e => e.code === code);
    if (emp) Object.assign(emp, updates);
    await this.supabase.updateEmployee(code, updates);
  }

  async addUser(user: SystemUser): Promise<void> {
    this.users.push(user);
    await this.supabase.insertUser(user);
  }

  async toggleUserStatus(id: string): Promise<void> {
    const user = this.users.find(u => u.id === id);
    if (!user) return;
    user.status = user.status === 'Active' ? 'Inactive' : 'Active';
    await this.supabase.updateUser(id, { status: user.status });
  }

  async addHoliday(h: Holiday): Promise<void> {
    this.holidays.push(h);
    await this.supabase.insertHoliday(h);
  }

  async updateHoliday(oldName: string, h: Holiday, idx: number): Promise<void> {
    this.holidays[idx] = h;
    await this.supabase.updateHoliday(oldName, h);
  }

  async removeHoliday(idx: number): Promise<void> {
    const h = this.holidays[idx];
    this.holidays.splice(idx, 1);
    await this.supabase.deleteHoliday(h.name);
  }

  async addApproval(a: Approval): Promise<void> {
    this.pendingApprovals.unshift(a);
    await this.supabase.insertApproval(a);
  }

  async setApprovalStatus(refId: string, status: 'Approved' | 'Rejected'): Promise<void> {
    const a = this.pendingApprovals.find(x => x.id === refId);
    if (a) a.status = status;
    await this.supabase.updateApprovalStatus(refId, status);
  }

  async saveSalaryMonth(month: string): Promise<void> {
    if (!this.salaryMonths[month]) this.salaryMonths[month] = { excluded: [] };
    await this.supabase.upsertSalaryMonth(month, this.salaryMonths[month]);
  }

  async addDisbursement(d: DisbursementRecord): Promise<void> {
    this.disbursedHistory.unshift(d);
    await this.supabase.insertDisbursement(d);
  }

  getRole(): UserRole { return this.currentRole$.value; }
  getUser(): any { return this.currentUser$.value; }
  isPayrollLocked(): boolean { return this.payrollLocked$.value; }

  login(role: UserRole, userId: string): void {
    this.currentRole$.next(role);
    let user: any;
    if (role === 'employee') {
      user = this.employees.find(e => e.code === userId) ||
        { name: 'Employee User', code: userId, initials: 'EU' };
      user.initials = (user.firstName?.[0] || 'E') + (user.lastName?.[0] || 'U');
    } else if (role === 'payroll') {
      user = { name: 'Vikram Patel', code: 'PR-001', initials: 'VP', role: 'payroll' };
    } else {
      user = { name: 'Ananya Singh', code: 'ADM-001', initials: 'AS', role: 'admin' };
    }
    this.currentUser$.next(user);
  }

  logout(): void {
    this.currentUser$.next(null);
    this.currentRole$.next('employee');
  }

  lockPayroll(): void { this.payrollLocked$.next(true); }
  unlockPayroll(): void { this.payrollLocked$.next(false); }

  getPendingCount(): number {
    const role = this.getRole();
    const all = this.pendingApprovals.filter(a => a.status === 'Pending');
    if (role === 'admin') return all.length;
    if (role === 'payroll') return all.filter(a => ['payroll_edit', 'unlock'].includes(a.subType)).length;
    const user = this.getUser();
    return all.filter(a => a.empCode === user?.code).length;
  }
}
