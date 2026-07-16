export type UserRole = 'manager' | 'employee';

export interface Employee {
  id: string;
  full_name: string;
  user_id: string;
  password: string;
  role: UserRole;
  manager_id: string | null;
  monthly_salary: number;
}

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  employee_id: string;
  date: string;
  status: AttendanceStatus;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  created_at: string;
}

export interface BudgetEntry {
  month: string;
  allocated_amount: number;
}

export interface PayrollItem extends Employee {
  working_days: number;
  days_present: number;
  computed_payroll: number;
}
