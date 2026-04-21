import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardPage } from './admin-dashboard.page';

const routes: Routes = [{ path: '', component: AdminDashboardPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [AdminDashboardPage],
})
export class AdminDashboardPageModule {}
