import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { EmployeeDashboardPage } from './employee-dashboard.page';

const routes: Routes = [{ path: '', component: EmployeeDashboardPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [EmployeeDashboardPage],
})
export class EmployeeDashboardPageModule {}
