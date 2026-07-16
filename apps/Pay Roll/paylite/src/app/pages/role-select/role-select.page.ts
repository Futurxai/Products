import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-role-select',
  templateUrl: './role-select.page.html',
  styleUrls: ['./role-select.page.scss'],
  standalone: false,
})
export class RoleSelectPage {
  constructor(
    private router: Router,
    private state: AppStateService,
    private alertCtrl: AlertController,
  ) {}

  pickRole(role: 'manager' | 'employee'): void {
    this.router.navigate(['/login', role]);
  }

  async resetDemoData(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Reset demo data',
      message: 'This clears every account and record created in this demo. Continue?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => this.state.resetDemoData(),
        },
      ],
    });
    await alert.present();
  }
}
