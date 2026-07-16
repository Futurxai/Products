import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../../services/app-state.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  constructor(public state: AppStateService, private router: Router) {}

  goto(tab: string): void {
    this.router.navigate(['/tabs', tab]);
  }

  signOut(): void {
    this.state.signOut();
    this.router.navigate(['/role-select']);
  }
}
