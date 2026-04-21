import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { PayrollDashboardPage } from './payroll-dashboard.page';

const routes: Routes = [{ path: '', component: PayrollDashboardPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [PayrollDashboardPage],
})
export class PayrollDashboardPageModule {}
