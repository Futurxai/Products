import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  employees: Employee[] = [
    { code: '310566', firstName: 'Upmanyu', lastName: 'Khajuria', name: 'Upmanyu Khajuria', gender: 'Male', dob: '2001-11-02', doj: '2026-01-05', pan: 'OAWPK4958R', aadhaar: '679954013310', bank: 'State Bank of India', acc: '39529509928', ifsc: 'SBIN0018531', personalEmail: 'upmanyukhajuria2@gmail.com', fatherName: 'Pardeep Kumar', entity: 'Empyrean', dept: 'F&B Production', desig: 'Commi III - Bakery', location: 'Patnitop-Site', district: 'Udhampur', state: 'JAMMU & KASHMIR', ctc: 210000, basic: 8750, hra: 4375, special: 4375, status: 'Active', pfTag: 'N', esiApply: true, ptApply: true, incomeTax: 0 },
    { code: '310569', firstName: 'Rampy', lastName: 'Sharma', name: 'Rampy Sharma', gender: 'Male', dob: '1986-10-29', doj: '2026-01-20', pan: 'DWDPS5406L', aadhaar: '697759452978', bank: 'HDFC Bank', acc: '23441050001138', ifsc: 'HDFC0002344', personalEmail: 'rampysharma@gmail.com', fatherName: 'Subhash Chander Sharma', entity: 'Empyrean', dept: 'Accounts', desig: 'Finance Controller', location: 'Patnitop-Site', district: 'Udhampur', state: 'JAMMU & KASHMIR', ctc: 1147200, basic: 47800, hra: 23900, special: 23900, status: 'Active', pfTag: 'FN', esiApply: false, ptApply: true, incomeTax: 5200, phone: '+91 98765 43210' },
    { code: '310567', firstName: 'Mohd', lastName: 'Shehryar', name: 'Mohd Shehryar', dept: 'Information Technology', desig: 'IT Executive', ctc: 264000, basic: 11000, hra: 5500, special: 5500, status: 'Active', pfTag: 'F', esiApply: false, ptApply: true, location: 'Patnitop-Site', district: 'Udhampur', state: 'JAMMU & KASHMIR', pan: 'PZUPS8457M', aadhaar: '510004975994', bank: 'State Bank of India', acc: '42256245823', ifsc: 'SBIN0014642', personalEmail: 'mohdshehryaar@gmail.com', fatherName: 'Islah ud Din' },
    { code: '310570', firstName: 'Gopal', lastName: 'Thakur', name: 'Gopal Thakur', dept: 'Adventure', desig: 'Adventure Instructor', ctc: 264000, basic: 11000, hra: 5500, special: 5500, status: 'Active', pfTag: 'M', esiApply: true, ptApply: true, location: 'Patnitop-Site', bank: 'Punjab National Bank', acc: '0274000107184561', ifsc: 'PUNB0027400' },
    { code: '50230', firstName: 'Vishal', lastName: '', name: 'Vishal', dept: 'Quality Control', desig: 'Chemist', ctc: 210216, basic: 8759, hra: 4380, special: 4379, status: 'Active', pfTag: 'N', esiApply: true, ptApply: true, pf: 'Active', uan: '101730904792', esi: '1901980176', location: 'Jammu Factory', bank: 'State Bank of India', acc: '40148915897', ifsc: 'SBIN0011889' },
  ];

  users: SystemUser[] = [
    { id: 'USR-001', name: 'Ananya Singh', email: 'ananya@empyrean.in', empId: 'ADM-001', role: 'admin', status: 'Active', lastLogin: 'Today 09:32', initials: 'AS' },
    { id: 'USR-002', name: 'Vikram Patel', email: 'vikram@empyrean.in', empId: 'PR-001', role: 'payroll', status: 'Active', lastLogin: 'Today 08:15', initials: 'VP' },
    { id: 'USR-004', name: 'Rampy Sharma', email: 'rampysharma@gmail.com', empId: '310569', role: 'employee', status: 'Active', lastLogin: 'Today 07:45', initials: 'RS' },
  ];

  holidays: Holiday[] = [
    { name: 'Republic Day', date: '2026-01-26', type: 'National Holiday' },
    { name: 'Holi', date: '2026-03-03', type: 'National Holiday' },
    { name: 'Independence Day', date: '2026-08-15', type: 'National Holiday' },
    { name: 'Gandhi Jayanti', date: '2026-10-02', type: 'National Holiday' },
    { name: 'Diwali', date: '2026-10-20', type: 'National Holiday' },
    { name: 'Christmas', date: '2026-12-25', type: 'National Holiday' },
  ];

  pendingApprovals: Approval[] = [
    { id: 'REG-047', empCode: '310568', empName: 'Ravi Bharti', type: 'New Registration', subType: 'register', date: 'Today 09:15', status: 'Pending', docs: true, data: { firstName: 'Ravi', lastName: 'Bharti', dept: 'Engineering', desig: 'Trainee Junior Engineer' } },
    { id: 'EDIT-031', empCode: '310566', empName: 'Upmanyu Khajuria', type: 'Profile Edit', subType: 'profile_edit', date: 'Today 08:40', status: 'Pending', docs: false, changes: { phone: '+91 9876543211', personalEmail: 'new_email@gmail.com' } },
  ];

  role$ = this.currentRole$.asObservable();
  user$ = this.currentUser$.asObservable();
  locked$ = this.payrollLocked$.asObservable();

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
