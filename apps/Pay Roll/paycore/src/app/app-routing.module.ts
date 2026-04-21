import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'employee',
    loadChildren: () => import('./pages/employee-dashboard/employee-dashboard.module').then(m => m.EmployeeDashboardPageModule)
  },
  {
    path: 'payroll',
    loadChildren: () => import('./pages/payroll-dashboard/payroll-dashboard.module').then(m => m.PayrollDashboardPageModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin-dashboard/admin-dashboard.module').then(m => m.AdminDashboardPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
