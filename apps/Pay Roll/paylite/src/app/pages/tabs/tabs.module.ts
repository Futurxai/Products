import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { TabsPage } from './tabs.page';
import { managerGuard } from '../../guards/manager.guard';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      { path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomePageModule) },
      { path: 'attendance', loadChildren: () => import('./attendance/attendance.module').then(m => m.AttendancePageModule) },
      { path: 'leave', loadChildren: () => import('./leave/leave.module').then(m => m.LeavePageModule) },
      { path: 'review', canActivate: [managerGuard], loadChildren: () => import('./review/review.module').then(m => m.ReviewPageModule) },
      { path: 'payroll', canActivate: [managerGuard], loadChildren: () => import('./payroll/payroll.module').then(m => m.PayrollPageModule) },
      { path: 'budget', canActivate: [managerGuard], loadChildren: () => import('./budget/budget.module').then(m => m.BudgetPageModule) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes), IonicModule],
  declarations: [TabsPage],
})
export class TabsPageModule {}
