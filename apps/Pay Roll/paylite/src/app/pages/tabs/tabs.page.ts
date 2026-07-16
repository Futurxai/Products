import { Component } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  constructor(public state: AppStateService) {}
}
