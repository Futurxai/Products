import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { AppStateService, SystemUser, Employee, Approval } from '../../services/app-state';
import { PayrollCalcService } from '../../services/payroll-calc';

type AdminTab = 'home' | 'approvals' | 'users' | 'records';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['../employee-dashboard/employee-dashboard.page.scss', '../payroll-dashboard/payroll-dashboard.page.scss', './admin-dashboard.page.scss'],
  standalone: false,
})
export class AdminDashboardPage {

  tab: AdminTab = 'home';
  sidebarOpen = false;
  user: any;

  navItems = [
    { id: 'home', icon: '🏠', label: 'Dashboard' },
    { id: 'approvals', icon: '✅', label: 'Approvals' },
    { id: 'users', icon: '👥', label: 'User Management' },
    { id: 'records', icon: '🧾', label: 'Employee Records' }
  ];

  get pageTitle(): string {
    const m: any = {
      home: 'Admin Dashboard',
      approvals: 'Approval Management',
      users: 'User Management',
      records: 'Employee Records'
    };
    return m[this.tab] || 'Dashboard';
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }

  // Approval review
  reviewingAppr: Approval | null = null;

  // User add
  addingUser = false;
  newUser: any = { name: '', email: '', empId: '', role: 'payroll', pw: '' };

  // Filters
  apprTypeFilter = '';
  apprStatusFilter = '';
  userSearch = '';
  recordSearch = '';

  constructor(
    public state: AppStateService,
    public calc: PayrollCalcService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    this.user = state.getUser();
  }

  setTab(t: AdminTab) {
    this.tab = t;
    if (window.innerWidth < 900) this.closeSidebar();
  }

  get totalEmp(): number { return this.state.employees.length; }
  get payrollUsers(): number { return this.state.users.filter(u => u.role === 'payroll').length; }
  get adminUsers(): number { return this.state.users.filter(u => u.role === 'admin').length; }
  get pendingApprovals(): number { return this.state.pendingApprovals.filter(a => a.status === 'Pending').length; }

  get filteredApprovals(): Approval[] {
    return this.state.pendingApprovals.filter(a => {
      if (this.apprTypeFilter && a.type !== this.apprTypeFilter) return false;
      if (this.apprStatusFilter && a.status !== this.apprStatusFilter) return false;
      return true;
    });
  }

  get filteredUsers(): SystemUser[] {
    if (!this.userSearch) return this.state.users;
    const q = this.userSearch.toLowerCase();
    return this.state.users.filter(u => (u.name + u.email + u.role).toLowerCase().includes(q));
  }

  get filteredRecords(): Employee[] {
    if (!this.recordSearch) return this.state.employees;
    const q = this.recordSearch.toLowerCase();
    return this.state.employees.filter(e => (e.name + e.code + e.dept).toLowerCase().includes(q));
  }

  get recentActivity(): Approval[] {
    return this.state.pendingApprovals.slice(0, 5);
  }

  reviewApproval(a: Approval) {
    this.reviewingAppr = a;
  }

  closeReview() {
    this.reviewingAppr = null;
  }

  approve(a: Approval) {
    a.status = 'Approved';
    // Apply changes if any
    if (a.changes) {
      const emp = this.state.employees.find(e => e.code === a.empCode);
      if (emp) Object.assign(emp, a.changes);
    }
    if (a.subType === 'unlock') {
      this.state.unlockPayroll();
    }
    this.showToast(`Approved: ${a.empName} — ${a.type}`, 'success');
    this.closeReview();
  }

  reject(a: Approval) {
    a.status = 'Rejected';
    this.showToast('Request rejected', 'danger');
    this.closeReview();
  }

  quickApprove(a: Approval, event: Event) {
    event.stopPropagation();
    this.approve(a);
  }

  quickReject(a: Approval, event: Event) {
    event.stopPropagation();
    this.reject(a);
  }

  startAddUser() {
    this.addingUser = true;
    this.newUser = { name: '', email: '', empId: '', role: 'payroll', pw: '' };
  }

  cancelAddUser() {
    this.addingUser = false;
  }

  async saveNewUser() {
    if (!this.newUser.name || !this.newUser.email) {
      this.showToast('Name and email are required', 'danger');
      return;
    }
    this.state.users.push({
      id: 'USR-' + Date.now(),
      name: this.newUser.name,
      email: this.newUser.email,
      empId: this.newUser.empId || '-',
      role: this.newUser.role,
      status: 'Active',
      lastLogin: 'Never',
      initials: this.newUser.name.split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) || 'U'
    });
    this.addingUser = false;
    this.showToast('User created', 'success');
  }

  toggleUserStatus(u: SystemUser) {
    u.status = u.status === 'Active' ? 'Inactive' : 'Active';
    this.showToast(`User ${u.status === 'Active' ? 'activated' : 'deactivated'}`, 'primary');
  }

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

  getChangesList(changes: any): string[] {
    if (!changes) return [];
    return Object.keys(changes).filter(k => changes[k]).map(k => `${k}: ${changes[k]}`);
  }
}
