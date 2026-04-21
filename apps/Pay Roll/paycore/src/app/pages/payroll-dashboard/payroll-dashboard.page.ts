import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { AppStateService, Employee, Holiday, PAYSLIP_MONTHS } from '../../services/app-state';
import { PayrollCalcService } from '../../services/payroll-calc';

type PayrollTab = 'home' | 'employees' | 'salary' | 'taxpay' | 'disbursed' | 'payslips';

@Component({
  selector: 'app-payroll-dashboard',
  templateUrl: './payroll-dashboard.page.html',
  styleUrls: ['../employee-dashboard/employee-dashboard.page.scss', './payroll-dashboard.page.scss'],
  standalone: false,
})
export class PayrollDashboardPage {

  tab: PayrollTab = 'home';
  sidebarOpen = false;
  user: any;

  navItems = [
    { id: 'home', icon: '🏠', label: 'Dashboard' },
    { id: 'employees', icon: '👥', label: 'Employees' },
    { id: 'salary', icon: '💰', label: 'Salary Calculation' },
    { id: 'taxpay', icon: '🧾', label: 'TaxPay' },
    { id: 'disbursed', icon: '✅', label: 'Disbursed History' },
    { id: 'payslips', icon: '📄', label: 'Payslips' }
  ];

  get pageTitle(): string {
    const m: any = {
      home: 'Dashboard',
      employees: 'Employee Management',
      salary: 'Salary Calculation',
      taxpay: 'TaxPay Calculation',
      disbursed: 'Disbursed History',
      payslips: 'Payslip Management'
    };
    return m[this.tab] || 'Dashboard';
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  // Salary month selector
  selMonth = 'March 2026';
  months = ['March 2026', 'February 2026', 'January 2026'];

  // Employee edit state
  editingEmp: Employee | null = null;
  editForm: any = {};

  // Add new employee
  addingEmp = false;
  newEmp: any = this.blankEmp();

  // Holiday editing
  addingHoliday = false;
  holidayForm: any = { name: '', date: '', type: 'National Holiday' };
  editingHolidayIdx: number | null = null;

  // Filters
  empSearch = '';
  empDeptFilter = '';
  empStatusFilter = '';

  constructor(
    public state: AppStateService,
    public calc: PayrollCalcService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    this.user = state.getUser();
    if (!state.salaryMonths[this.selMonth]) state.salaryMonths[this.selMonth] = { excluded: [] };
  }

  setTab(t: PayrollTab) {
    this.tab = t;
    if (window.innerWidth < 900) this.closeSidebar();
  }

  // ============ COMPUTED ============
  get totalEmployees(): number { return this.state.employees.length; }
  get activeEmployees(): number { return this.state.employees.filter(e => e.status === 'Active').length; }
  get totalCTC(): number { return this.state.employees.filter(e => e.status === 'Active').reduce((s, e) => s + (e.ctc || 0), 0); }
  get pendingCount(): number { return this.state.getPendingCount(); }

  get filteredEmployees(): Employee[] {
    return this.state.employees.filter(e => {
      if (this.empStatusFilter && e.status !== this.empStatusFilter) return false;
      if (this.empDeptFilter && e.dept !== this.empDeptFilter) return false;
      if (this.empSearch) {
        const q = this.empSearch.toLowerCase();
        return (e.name + e.code + e.dept).toLowerCase().includes(q);
      }
      return true;
    });
  }

  get sortedHolidays(): Holiday[] {
    return [...this.state.holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // ============ SALARY ============
  get includedEmps(): Employee[] {
    const active = this.state.employees.filter(e => e.status === 'Active');
    const disbRec = this.state.disbursedHistory.find(d => d.month === this.selMonth);
    const disbCodes = disbRec ? disbRec.employees.map(e => e.code) : [];
    const excluded = this.state.salaryMonths[this.selMonth]?.excluded || [];
    return active.filter(e => !excluded.includes(e.code) && !disbCodes.includes(e.code));
  }

  get heldEmps(): Employee[] {
    const active = this.state.employees.filter(e => e.status === 'Active');
    const disbRec = this.state.disbursedHistory.find(d => d.month === this.selMonth);
    const disbCodes = disbRec ? disbRec.employees.map(e => e.code) : [];
    const excluded = this.state.salaryMonths[this.selMonth]?.excluded || [];
    return active.filter(e => excluded.includes(e.code) && !disbCodes.includes(e.code));
  }

  isExcluded(code: string): boolean {
    return (this.state.salaryMonths[this.selMonth]?.excluded || []).includes(code);
  }

  toggleExclude(code: string, event: any) {
    if (!this.state.salaryMonths[this.selMonth]) this.state.salaryMonths[this.selMonth] = { excluded: [] };
    const excl = this.state.salaryMonths[this.selMonth].excluded;
    const emp = this.state.employees.find(e => e.code === code);
    const checked = event.target.checked;
    if (!checked) {
      if (!excl.includes(code)) excl.push(code);
      this.showToast(`${emp?.name} put on hold`, 'warning');
    } else {
      const i = excl.indexOf(code);
      if (i > -1) excl.splice(i, 1);
      this.showToast(`${emp?.name} released and included`, 'success');
    }
  }

  releaseHold(code: string) {
    if (!this.state.salaryMonths[this.selMonth]) return;
    const excl = this.state.salaryMonths[this.selMonth].excluded;
    const idx = excl.indexOf(code);
    if (idx > -1) excl.splice(idx, 1);
    const emp = this.state.employees.find(e => e.code === code);
    this.showToast(`${emp?.name} released and included`, 'success');
  }

  releaseAllHold() {
    if (!this.state.salaryMonths[this.selMonth]) return;
    const count = this.state.salaryMonths[this.selMonth].excluded.length;
    this.state.salaryMonths[this.selMonth].excluded = [];
    this.showToast(`All ${count} held employees released`, 'success');
  }

  updatePFTag(code: string, tag: any) {
    const emp = this.state.employees.find(e => e.code === code);
    if (emp) {
      emp.pfTag = tag;
      this.showToast(`PF tag for ${emp.name} updated to ${tag}`, 'success');
    }
  }

  async confirmDisbursement() {
    const toDisburse = this.includedEmps;
    if (toDisburse.length === 0) {
      this.showToast('No employees to disburse', 'warning');
      return;
    }
    const a = await this.alertCtrl.create({
      header: 'Confirm Disbursement',
      message: `Salary will be disbursed immediately for ${toDisburse.length} employee(s). This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Disburse Now', handler: () => this.doDisburse(toDisburse) }
      ]
    });
    await a.present();
  }

  private async doDisburse(employees: Employee[]) {
    await this.state.addDisbursement({
      month: this.selMonth,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      employees: [...employees]
    });
    if (!this.state.salaryMonths[this.selMonth]) this.state.salaryMonths[this.selMonth] = { excluded: [] };
    this.state.salaryMonths[this.selMonth].disbursed = true;
    await this.state.saveSalaryMonth(this.selMonth);
    this.showToast(`Salary disbursed for ${employees.length} employees`, 'success');
  }

  async confirmLockPayroll() {
    const a = await this.alertCtrl.create({
      header: 'Lock Payroll?',
      message: `Lock payroll for ${this.selMonth}? Calculations will be frozen until Admin unlocks.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Lock', handler: () => {
          this.state.lockPayroll();
          this.state.payrollPeriod = this.selMonth;
          this.showToast(`Payroll for ${this.selMonth} is locked`, 'success');
        }}
      ]
    });
    await a.present();
  }

  async requestUnlock() {
    await this.state.addApproval({
      id: 'UNLK-' + Math.floor(Math.random() * 900 + 100),
      empCode: 'PR',
      empName: 'Payroll Team',
      type: 'Unlock Request',
      subType: 'unlock',
      date: 'Just now',
      status: 'Pending',
      docs: false,
      changes: { month: this.state.payrollPeriod }
    });
    this.showToast('Unlock request sent to Admin', 'primary');
  }

  // Totals
  get totalGross(): number { return this.includedEmps.reduce((s, e) => s + e.basic + e.hra + e.special, 0); }
  get totalPF(): number { return this.includedEmps.reduce((s, e) => s + this.calc.calcPF(e), 0); }
  get totalESI(): number { return this.includedEmps.reduce((s, e) => s + this.calc.calcESI(e), 0); }
  get totalPT(): number { return this.includedEmps.reduce((s, e) => s + this.calc.calcPT(e), 0); }
  get totalIT(): number { return this.includedEmps.reduce((s, e) => s + (e.incomeTax || 0), 0); }
  get totalDed(): number { return this.totalPF + this.totalESI + this.totalPT + this.totalIT; }
  get totalNet(): number { return this.totalGross - this.totalDed; }

  empNet(emp: Employee): number {
    const gross = emp.basic + emp.hra + emp.special;
    return gross - this.calc.calcPF(emp) - this.calc.calcESI(emp) - this.calc.calcPT(emp) - (emp.incomeTax || 0);
  }

  empTotalDed(emp: Employee): number {
    return this.calc.calcPF(emp) + this.calc.calcESI(emp) + this.calc.calcPT(emp) + (emp.incomeTax || 0);
  }

  // ============ TAX ============
  getTaxWorksheet(emp: Employee, actualMonths = 12) {
    const isNew = !emp.taxRegime || emp.taxRegime === 'new';
    const projMonths = 12 - actualMonths;
    const basic = emp.basic || 0, hra = emp.hra || 0, special = emp.special || 0;
    const conveyance = 1600;
    const total = (m: number) => m * 12;
    const totalGross = total(basic + hra + special + conveyance);
    const hraEx = isNew ? 0 : Math.min(hra * 12, basic * 12 * 0.5);
    const totalSec10 = hraEx;
    const pt = this.calc.calcPT(emp) * 12;
    const stdDed = isNew ? 75000 : 50000;
    const totalSec16 = pt + stdDed;
    const incomeAfter = totalGross - totalSec10 - totalSec16;
    const pfAnnual = this.calc.calcPF(emp) * 12;
    const sec80C = isNew ? 0 : Math.min(pfAnnual, 150000);
    const totalVIA = sec80C;
    const taxable = Math.max(0, incomeAfter - totalVIA);
    const rounded = Math.ceil(taxable / 10) * 10;
    const annualTax = isNew ? this.calc.calcNewRegimeTax(rounded) : this.calc.calcOldRegimeTax(rounded);
    const monthlyTDS = Math.round(annualTax / 12);
    return { isNew, totalGross, totalSec10, totalSec16, totalVIA, rounded, annualTax, monthlyTDS, stdDed, pfAnnual };
  }

  updateRegime(code: string, regime: 'new' | 'old') {
    const emp = this.state.employees.find(e => e.code === code);
    if (emp) {
      emp.taxRegime = regime;
      this.showToast(`${emp.name} → ${regime === 'new' ? 'New Regime' : 'Old Regime'}`, 'primary');
    }
  }

  applyTDSToSalary() {
    const active = this.state.employees.filter(e => e.status === 'Active');
    let updated = 0;
    active.forEach(emp => {
      const ws = this.getTaxWorksheet(emp);
      emp.incomeTax = ws.monthlyTDS;
      if (ws.monthlyTDS > 0) updated++;
    });
    this.showToast(`Monthly TDS applied to ${updated} employees`, 'success');
  }

  get taxActiveEmps(): Employee[] { return this.state.employees.filter(e => e.status === 'Active'); }
  get totalMonthlyTDS(): number { return this.taxActiveEmps.reduce((s, e) => s + this.getTaxWorksheet(e).monthlyTDS, 0); }
  get totalAnnualTax(): number { return this.taxActiveEmps.reduce((s, e) => s + this.getTaxWorksheet(e).annualTax, 0); }
  get taxLiableCount(): number { return this.taxActiveEmps.filter(e => this.getTaxWorksheet(e).annualTax > 0).length; }

  // ============ EMPLOYEE CRUD ============
  startAddEmp() {
    this.addingEmp = true;
    this.newEmp = this.blankEmp();
  }

  cancelAddEmp() {
    this.addingEmp = false;
    this.newEmp = this.blankEmp();
  }

  blankEmp(): any {
    return { code: '', name: '', dept: 'Accounts', desig: '', ctc: 0, location: '' };
  }

  async saveNewEmp() {
    if (!this.newEmp.code || !this.newEmp.name) {
      this.showToast('Code and name are required', 'danger');
      return;
    }
    const ctc = parseInt(this.newEmp.ctc) || 0;
    const monthly = Math.round(ctc / 12);
    const basic = Math.round(monthly * 0.5);
    const hra = Math.round(basic * 0.5);
    const special = monthly - basic - hra;
    const emp: Employee = {
      code: this.newEmp.code,
      firstName: this.newEmp.name.split(' ')[0],
      lastName: this.newEmp.name.split(' ').slice(1).join(' '),
      name: this.newEmp.name,
      dept: this.newEmp.dept,
      desig: this.newEmp.desig,
      ctc,
      basic,
      hra,
      special,
      location: this.newEmp.location,
      status: 'Active',
      pfTag: 'F',
      esiApply: true,
      ptApply: true,
      incomeTax: 0
    };
    await this.state.addEmployee(emp);
    this.addingEmp = false;
    this.showToast('Employee added', 'success');
  }

  startEditEmp(emp: Employee) {
    this.editingEmp = emp;
    this.editForm = { ...emp };
  }

  cancelEdit() {
    this.editingEmp = null;
    this.editForm = {};
  }

  async saveEditEmp() {
    if (!this.editingEmp) return;
    const emp = this.editingEmp;
    // Statutory fields apply immediately (write-through)
    await this.state.updateEmployee(emp.code, {
      pfTag: this.editForm.pfTag,
      esiApply: this.editForm.esiApply,
      ptApply: this.editForm.ptApply
    });
    // Other changes go to admin
    const changes = {
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      desig: this.editForm.desig,
      dept: this.editForm.dept,
      ctc: this.editForm.ctc,
      phone: this.editForm.phone,
      personalEmail: this.editForm.personalEmail,
      bank: this.editForm.bank,
      acc: this.editForm.acc,
      ifsc: this.editForm.ifsc
    };
    await this.state.addApproval({
      id: 'EDIT-' + Math.floor(Math.random() * 900 + 100),
      empCode: emp.code,
      empName: emp.name,
      type: 'Profile Edit',
      subType: 'payroll_edit',
      date: 'Just now',
      status: 'Pending',
      docs: false,
      changes
    });
    this.cancelEdit();
    this.showToast('PF/ESI/PT updated. Other changes sent to Admin for approval.', 'success');
  }

  // ============ HOLIDAYS ============
  startAddHoliday() {
    this.addingHoliday = true;
    this.editingHolidayIdx = null;
    this.holidayForm = { name: '', date: '', type: 'National Holiday' };
  }

  editHoliday(i: number) {
    this.editingHolidayIdx = i;
    this.addingHoliday = true;
    this.holidayForm = { ...this.state.holidays[i] };
  }

  async saveHoliday() {
    if (!this.holidayForm.name || !this.holidayForm.date) {
      this.showToast('Name and date are required', 'danger');
      return;
    }
    if (this.editingHolidayIdx !== null) {
      const oldName = this.state.holidays[this.editingHolidayIdx].name;
      await this.state.updateHoliday(oldName, { ...this.holidayForm }, this.editingHolidayIdx);
      this.showToast('Holiday updated', 'success');
    } else {
      await this.state.addHoliday({ ...this.holidayForm });
      this.showToast('Holiday added', 'success');
    }
    this.cancelHoliday();
  }

  cancelHoliday() {
    this.addingHoliday = false;
    this.editingHolidayIdx = null;
  }

  async deleteHoliday(i: number) {
    await this.state.removeHoliday(i);
    this.showToast('Holiday removed', 'primary');
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ============ UTILITY ============
  async logout() {
    const a = await this.alertCtrl.create({
      header: 'Sign Out?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Sign Out', handler: () => { this.state.logout(); this.router.navigate(['/login']); } }
      ]
    });
    await a.present();
  }

  private async showToast(message: string, color: string = 'primary') {
    const t = await this.toastCtrl.create({ message, duration: 2000, color, position: 'top' });
    await t.present();
  }

  pfTagColor(tag?: string): string {
    const colors: any = { F: '#1a56db', FN: '#7c3aed', N: '#0891b2', M: '#059669', NIL: '#64748b' };
    return colors[tag || 'F'] || '#64748b';
  }
}
