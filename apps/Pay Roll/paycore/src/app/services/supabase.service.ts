import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Employee, SystemUser, Holiday, Approval, DisbursementRecord } from './app-state';

@Injectable({ providedIn: 'root' })
export class SupabaseService {

  private client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabase.url, environment.supabase.anonKey);
  }

  // ========== EMPLOYEES ==========
  async loadEmployees(): Promise<Employee[]> {
    const { data, error } = await this.client
      .from('employees')
      .select('*')
      .order('code', { ascending: true });
    if (error) { console.error('loadEmployees:', error); return []; }
    return (data || []).map(this.fromDbEmployee);
  }

  async insertEmployee(emp: Employee): Promise<void> {
    const row = this.toDbEmployee(emp);
    const { error } = await this.client.from('employees').insert(row);
    if (error) console.error('insertEmployee:', error);
  }

  async updateEmployee(code: string, updates: Partial<Employee>): Promise<void> {
    const row = this.toDbEmployee(updates as Employee);
    delete (row as any).code;
    const { error } = await this.client.from('employees').update(row).eq('code', code);
    if (error) console.error('updateEmployee:', error);
  }

  // ========== USERS ==========
  async loadUsers(): Promise<SystemUser[]> {
    const { data, error } = await this.client.from('system_users').select('*');
    if (error) { console.error('loadUsers:', error); return []; }
    return (data || []).map(r => ({
      id: r.user_code, name: r.name, email: r.email, empId: r.emp_id,
      role: r.role, status: r.status, lastLogin: r.last_login || 'Never',
      initials: r.initials || 'U'
    }));
  }

  async insertUser(user: SystemUser): Promise<void> {
    const { error } = await this.client.from('system_users').insert({
      user_code: user.id, name: user.name, email: user.email, emp_id: user.empId,
      role: user.role, status: user.status, last_login: user.lastLogin, initials: user.initials
    });
    if (error) console.error('insertUser:', error);
  }

  async updateUser(id: string, updates: Partial<SystemUser>): Promise<void> {
    const row: any = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.name !== undefined) row.name = updates.name;
    const { error } = await this.client.from('system_users').update(row).eq('user_code', id);
    if (error) console.error('updateUser:', error);
  }

  // ========== HOLIDAYS ==========
  async loadHolidays(): Promise<Holiday[]> {
    const { data, error } = await this.client.from('holidays').select('*').order('date');
    if (error) { console.error('loadHolidays:', error); return []; }
    return (data || []).map(r => ({ name: r.name, date: r.date, type: r.type }));
  }

  async insertHoliday(h: Holiday): Promise<void> {
    const { error } = await this.client.from('holidays').insert(h);
    if (error) console.error('insertHoliday:', error);
  }

  async updateHoliday(oldName: string, h: Holiday): Promise<void> {
    const { error } = await this.client.from('holidays').update(h).eq('name', oldName);
    if (error) console.error('updateHoliday:', error);
  }

  async deleteHoliday(name: string): Promise<void> {
    const { error } = await this.client.from('holidays').delete().eq('name', name);
    if (error) console.error('deleteHoliday:', error);
  }

  // ========== APPROVALS ==========
  async loadApprovals(): Promise<Approval[]> {
    const { data, error } = await this.client
      .from('approvals').select('*').order('created_at', { ascending: false });
    if (error) { console.error('loadApprovals:', error); return []; }
    return (data || []).map(r => ({
      id: r.ref_id, empCode: r.emp_code, empName: r.emp_name,
      type: r.type, subType: r.sub_type, date: r.submitted_at,
      status: r.status, docs: r.docs, data: r.data, changes: r.changes
    }));
  }

  async insertApproval(a: Approval): Promise<void> {
    const { error } = await this.client.from('approvals').insert({
      ref_id: a.id, emp_code: a.empCode, emp_name: a.empName,
      type: a.type, sub_type: a.subType, submitted_at: a.date,
      status: a.status, docs: a.docs, data: a.data, changes: a.changes
    });
    if (error) console.error('insertApproval:', error);
  }

  async updateApprovalStatus(refId: string, status: 'Approved' | 'Rejected'): Promise<void> {
    const { error } = await this.client.from('approvals')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('ref_id', refId);
    if (error) console.error('updateApprovalStatus:', error);
  }

  // ========== SALARY MONTHS ==========
  async loadSalaryMonths(): Promise<{ [k: string]: { excluded: string[]; disbursed?: boolean } }> {
    const { data, error } = await this.client.from('salary_months').select('*');
    if (error) { console.error('loadSalaryMonths:', error); return {}; }
    const result: any = {};
    (data || []).forEach(r => {
      result[r.month] = { excluded: r.excluded_codes || [], disbursed: r.disbursed };
    });
    return result;
  }

  async upsertSalaryMonth(month: string, data: { excluded: string[]; disbursed?: boolean }): Promise<void> {
    const { error } = await this.client.from('salary_months').upsert({
      month, excluded_codes: data.excluded, disbursed: data.disbursed || false
    }, { onConflict: 'month' });
    if (error) console.error('upsertSalaryMonth:', error);
  }

  // ========== DISBURSEMENTS ==========
  async loadDisbursements(): Promise<DisbursementRecord[]> {
    const { data, error } = await this.client
      .from('disbursements').select('*').order('created_at', { ascending: false });
    if (error) { console.error('loadDisbursements:', error); return []; }
    return (data || []).map(r => ({
      month: r.month, date: r.disbursed_date, employees: r.employees
    }));
  }

  async insertDisbursement(d: DisbursementRecord): Promise<void> {
    const { error } = await this.client.from('disbursements').insert({
      month: d.month, disbursed_date: d.date, employees: d.employees
    });
    if (error) console.error('insertDisbursement:', error);
  }

  // ========== MAPPERS ==========
  private fromDbEmployee(r: any): Employee {
    return {
      code: r.code, firstName: r.first_name, lastName: r.last_name, name: r.name,
      gender: r.gender, dob: r.dob, doj: r.doj, pan: r.pan, aadhaar: r.aadhaar,
      pf: r.pf, uan: r.uan, esi: r.esi, bank: r.bank, acc: r.acc, ifsc: r.ifsc,
      payMode: r.pay_mode, workEmail: r.work_email, personalEmail: r.personal_email,
      fatherName: r.father_name, entity: r.entity, dept: r.dept, desig: r.desig,
      category: r.category, branch: r.branch, division: r.division, location: r.location,
      district: r.district, state: r.state, costCenter: r.cost_center,
      ctc: Number(r.ctc), basic: Number(r.basic), hra: Number(r.hra), special: Number(r.special),
      status: r.status, phone: r.phone, pfTag: r.pf_tag,
      esiApply: r.esi_apply, ptApply: r.pt_apply,
      incomeTax: Number(r.income_tax || 0), taxRegime: r.tax_regime
    };
  }

  private toDbEmployee(e: Employee): any {
    const row: any = {
      code: e.code, first_name: e.firstName, last_name: e.lastName, name: e.name,
      gender: e.gender, dob: e.dob || null, doj: e.doj || null,
      pan: e.pan, aadhaar: e.aadhaar, pf: e.pf, uan: e.uan, esi: e.esi,
      bank: e.bank, acc: e.acc, ifsc: e.ifsc, pay_mode: e.payMode,
      work_email: e.workEmail, personal_email: e.personalEmail,
      father_name: e.fatherName, entity: e.entity, dept: e.dept, desig: e.desig,
      category: e.category, branch: e.branch, division: e.division, location: e.location,
      district: e.district, state: e.state, cost_center: e.costCenter,
      ctc: e.ctc, basic: e.basic, hra: e.hra, special: e.special,
      status: e.status, phone: e.phone, pf_tag: e.pfTag,
      esi_apply: e.esiApply, pt_apply: e.ptApply,
      income_tax: e.incomeTax || 0, tax_regime: e.taxRegime || 'new'
    };
    // Remove undefined/empty-string dates
    Object.keys(row).forEach(k => { if (row[k] === undefined) delete row[k]; });
    return row;
  }
}
