import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WeeklyPage } from './weekly.page';

const routes: Routes = [
  {
    path: '',
    component: WeeklyPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WeeklyPageRoutingModule {}
