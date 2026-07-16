import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { ForgotPasswordPage } from './forgot-password.page';

const routes: Routes = [{ path: '', component: ForgotPasswordPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [ForgotPasswordPage],
})
export class ForgotPasswordPageModule {}
