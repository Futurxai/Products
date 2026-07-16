import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { RoleSelectPage } from './role-select.page';

const routes: Routes = [{ path: '', component: RoleSelectPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [RoleSelectPage],
})
export class RoleSelectPageModule {}
