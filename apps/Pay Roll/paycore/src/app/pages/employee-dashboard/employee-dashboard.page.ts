import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { AppStateService, Employee, PAYSLIP_MONTHS, PayslipMonth } from '../../services/app-state';
import { PayrollCalcService } from '../../services/payroll-calc';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-dashboard.page.html',
  styleUrls: ['./employee-dashboard.page.scss'],
  standalone: false,
})
export class EmployeeDashboardPage {

  tab: 'home' | 'payslip' | 'profile' = 'home';
  sidebarOpen = false;
  user: Employee;
  month = 'March 2026';

  navItems = [
    { id: 'home', icon: '🏠', label: 'Dashboard' },
    { id: 'payslip', icon: '📄', label: 'Payslip' },
    { id: 'profile', icon: '👤', label: 'My Profile' }
  ];

  get pageTitle(): string {
    const m: any = { home: 'Dashboard', payslip: 'My Payslips', profile: 'My Profile' };
    return m[this.tab] || 'Dashboard';
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  // Payslip state
  months = PAYSLIP_MONTHS;
  selMonth = 'March 2026';
  selYear = '2025-26';

  // Profile edit state
  editing = false;
  editModel: any = {};

  // Computed
  gross = 0;
  pfAmt = 0;
  esiAmt = 0;
  ptAmt = 0;
  totalDed = 0;
  net = 0;
  pendingCount = 0;

  constructor(
    public state: AppStateService,
    public calc: PayrollCalcService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    this.user = state.getUser() || state.employees[0];
    this.recalc();
    this.pendingCount = state.getPendingCount();
    this.resetEditModel();
  }

  setTab(t: 'home' | 'payslip' | 'profile') {
    this.tab = t;
    if (t === 'profile') { this.editing = false; this.resetEditModel(); }
    if (window.innerWidth < 900) this.closeSidebar();
  }

  selectMonth(label: string) {
    this.selMonth = label;
    const m = this.months.find(x => x.label === label);
    if (m) this.selYear = m.year;
  }

  changeYear(y: string) {
    this.selYear = y;
    const first = this.months.find(m => m.year === y);
    if (first) this.selMonth = first.label;
  }

  get currentMonthObj(): PayslipMonth {
    return this.months.find(m => m.label === this.selMonth) || this.months[0];
  }

  recalc() {
    this.gross = (this.user?.basic || 0) + (this.user?.hra || 0) + (this.user?.special || 0);
    this.pfAmt = this.calc.calcPF(this.user);
    this.esiAmt = this.calc.calcESI(this.user);
    this.ptAmt = this.calc.calcPT(this.user);
    this.totalDed = this.pfAmt + this.esiAmt + this.ptAmt;
    this.net = this.gross - this.totalDed;
  }

  fmt(n: number): string { return this.calc.fmt(n); }

  resetEditModel() {
    this.editModel = {
      phone: this.user?.phone || '',
      workEmail: this.user?.workEmail || '',
      personalEmail: this.user?.personalEmail || '',
      fatherName: this.user?.fatherName || '',
      bank: this.user?.bank || '',
      acc: this.user?.acc || '',
      ifsc: this.user?.ifsc || '',
      pan: this.user?.pan || '',
      aadhaar: this.user?.aadhaar || ''
    };
  }

  async submitEdit() {
    this.state.pendingApprovals.unshift({
      id: 'EDIT-' + Math.floor(Math.random() * 900 + 100),
      empCode: this.user.code,
      empName: this.user.name,
      type: 'Profile Edit',
      subType: 'profile_edit',
      date: 'Just now',
      status: 'Pending',
      docs: false,
      changes: { ...this.editModel }
    });
    this.editing = false;
    this.pendingCount = this.state.getPendingCount();
    const t = await this.toastCtrl.create({
      message: 'Profile changes sent to Admin for approval',
      duration: 2500,
      color: 'success'
    });
    await t.present();
  }

  async downloadPayslip(count = 1) {
    const t = await this.toastCtrl.create({
      message: count === 1 ? `Preparing payslip for ${this.selMonth}...` : `Preparing ${count}-month payslip bundle...`,
      duration: 2000,
      color: 'primary'
    });
    await t.present();
    setTimeout(() => this.openPayslipWindow(count), 300);
  }

  private openPayslipWindow(count: number) {
    const monthsToShow = count === 1 ? [this.currentMonthObj] : this.months.slice(0, count);
    const sections = monthsToShow.map(m => this.buildPayslipHtml(m)).join(
      '<div style="page-break-after:always;margin:30px 0;border-top:2px dashed #e2e8f0"></div>'
    );
    const title = count === 1 ? `Payslip ${this.selMonth}` : `Payslip Bundle - Last ${count} Months`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title>
      <style>
        body{font-family:'Inter',sans-serif;margin:24px;color:#0f172a}
        .psw{max-width:740px;margin-bottom:0}
        .psh{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #1a56db;margin-bottom:14px}
        .psc{font-size:18px;font-weight:800}
        .psm{background:#1a56db;color:#fff;padding:3px 10px;border-radius:5px;font-size:11px;font-weight:700}
        .psg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;background:#f8fafc;border-radius:7px;padding:12px}
        .pef label{font-size:10px;color:#94a3b8;font-weight:500;display:block;margin-bottom:2px}
        .pef p{font-size:12px;font-weight:600;margin:0}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px}
        th{padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;background:#f8fafc;border-bottom:1px solid #e2e8f0}
        td{padding:9px 12px;border-bottom:1px solid #e2e8f0}
        .psnet{background:linear-gradient(135deg,#1a56db,#0891b2);color:#fff;padding:14px 18px;border-radius:10px;display:flex;justify-content:space-between;align-items:center}
        .psnl{font-size:12px;font-weight:600;opacity:.8}
        .psnv{font-family:monospace;font-size:20px;font-weight:800}
        @media print{.no-print{display:none!important}}
      </style></head><body>
      <button class="no-print" onclick="window.print()" style="padding:8px 16px;background:#1a56db;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;margin-bottom:16px">Print / Save as PDF</button>
      ${sections}</body></html>`);
    w.document.close();
  }

  private buildPayslipHtml(m: PayslipMonth): string {
    const basic = this.user.basic || 0, hra = this.user.hra || 0, special = this.user.special || 0;
    const gross = basic + hra + special;
    const pf = this.calc.calcPF(this.user);
    const esi = this.calc.calcESI(this.user);
    const pt = this.calc.calcPT(this.user);
    const ded = pf + esi + pt;
    const net = gross - ded;
    const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
    return `<div class="psw">
      <div class="psh">
        <div><div class="psc">EMPYREAN HOSPITALITY PVT LTD</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">PF Reg: JKUDK0000000 · ESI Reg: 00000000000</div></div>
        <div><div class="psm">PAYSLIP - ${m.label.toUpperCase()}</div></div>
      </div>
      <div class="psg">
        <div class="pef"><label>Employee Code</label><p>${this.user.code}</p></div>
        <div class="pef"><label>Employee Name</label><p>${this.user.name}</p></div>
        <div class="pef"><label>Designation</label><p>${this.user.desig || '-'}</p></div>
        <div class="pef"><label>Department</label><p>${this.user.dept || '-'}</p></div>
        <div class="pef"><label>Date of Joining</label><p>${this.user.doj || '-'}</p></div>
        <div class="pef"><label>PAN</label><p>${this.user.pan || '-'}</p></div>
        <div class="pef"><label>PF UAN</label><p>${this.user.uan || '-'}</p></div>
        <div class="pef"><label>Bank A/C</label><p>${this.user.bank || '-'} ****${this.user.acc?.slice(-4) || ''}</p></div>
        <div class="pef"><label>Credit Date</label><p>${m.creditDate}</p></div>
      </div>
      <table>
        <thead><tr><th>Earnings</th><th style="text-align:right">Amount</th><th>Deductions</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr><td>Basic</td><td style="text-align:right;font-family:monospace">${fmt(basic)}</td><td>PF</td><td style="text-align:right;font-family:monospace;color:${pf?'#dc2626':'#94a3b8'}">${pf?fmt(pf):'NIL'}</td></tr>
          <tr><td>HRA</td><td style="text-align:right;font-family:monospace">${fmt(hra)}</td><td>ESI</td><td style="text-align:right;font-family:monospace;color:${esi?'#dc2626':'#94a3b8'}">${esi?fmt(esi):'NIL'}</td></tr>
          <tr><td>Special Allowance</td><td style="text-align:right;font-family:monospace">${fmt(special)}</td><td>Professional Tax</td><td style="text-align:right;font-family:monospace;color:${pt?'#dc2626':'#94a3b8'}">${pt?fmt(pt):'NIL'}</td></tr>
        </tbody>
        <tfoot><tr style="background:#f8fafc;font-weight:700"><td>Gross Earnings</td><td style="text-align:right;font-family:monospace">${fmt(gross)}</td><td>Total Deductions</td><td style="text-align:right;font-family:monospace;color:#dc2626">${fmt(ded)}</td></tr></tfoot>
      </table>
      <div class="psnet"><div><div class="psnl">NET PAY</div><div style="font-size:10px;opacity:.7;margin-top:2px">Credited ${m.creditDate}</div></div><div class="psnv">${fmt(net)}</div></div>
    </div>`;
  }

  async logout() {
    const a = await this.alertCtrl.create({
      header: 'Sign Out?',
      message: 'You will be returned to the login screen.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Sign Out', handler: () => { this.state.logout(); this.router.navigate(['/login']); } }
      ]
    });
    await a.present();
  }
}
