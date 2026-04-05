import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { StateService, AppState } from '../../services/state';
import { MealDataService } from '../../services/meal-data';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  st!: AppState;
  editing: Record<string, boolean> = {};
  editUsername = '';
  editHeight = '';
  editWeight = '';
  editGoal = '';
  editTargetWeight = '';
  editDiet = '';

  allCuisines: string[] = [];
  editCuisines = new Set<string>();

  goals = ['Weight-Loss', 'Muscle-Gain', 'Maintain-Weight'];
  diets = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Keto', 'Paleo'];

  // Dark mode & notifications
  darkMode = false;
  remindersEnabled = false;

  constructor(
    private router: Router,
    private state: StateService,
    private mealData: MealDataService,
    private authService: AuthService,
    private notifService: NotificationService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    this.allCuisines = this.mealData.allCuisines;
    this.darkMode = document.body.classList.contains('dark');
    this.remindersEnabled = this.notifService.isEnabled();
  }

  ngOnInit() { this.refresh(); }

  ionViewWillEnter() { this.refresh(); }

  refresh() {
    this.st = this.state.getState();
  }

  get cuisineList() { return [...this.st.profileCuisines]; }

  toggleEdit(section: string) {
    this.editing[section] = !this.editing[section];
    if (this.editing[section]) {
      if (section === 'username') this.editUsername = this.st.username;
      if (section === 'physical') { this.editHeight = this.st.height || ''; this.editWeight = this.st.weight || ''; }
      if (section === 'goal') { this.editGoal = this.st.profileGoal; this.editTargetWeight = this.st.targetWeight || ''; }
      if (section === 'diet') this.editDiet = this.st.profileDiet;
      if (section === 'cuisine') this.editCuisines = new Set(this.st.profileCuisines);
    }
  }

  saveUsername() {
    this.state.updateField('username', this.editUsername);
    this.editing['username'] = false;
    this.refresh();
  }

  savePhysical() {
    this.state.updateField('height', this.editHeight);
    this.state.updateField('weight', this.editWeight);
    this.editing['physical'] = false;
    this.refresh();
    this.regenerate('Physical profile updated');
  }

  saveGoal() {
    this.state.updateField('profileGoal', this.editGoal);
    this.state.updateField('goal', this.editGoal.replace('-', ' '));
    this.state.updateField('targetWeight', this.editTargetWeight);
    this.editing['goal'] = false;
    this.refresh();
    this.regenerate('Goal updated');
  }

  saveDiet() {
    this.state.updateField('profileDiet', this.editDiet);
    this.state.updateField('diet', this.editDiet);
    this.editing['diet'] = false;
    this.refresh();
    this.regenerate('Diet updated');
  }

  toggleEditCuisine(c: string) {
    if (this.editCuisines.has(c)) this.editCuisines.delete(c);
    else this.editCuisines.add(c);
  }

  saveCuisine() {
    this.state.updateField('profileCuisines', new Set(this.editCuisines));
    this.editing['cuisine'] = false;
    this.refresh();
    this.regenerate('Cuisine updated');
  }

  async regenerate(msg: string) {
    const toast = await this.toastCtrl.create({ message: '✨ ' + msg + ' - Plan regenerated!', duration: 2000, color: 'dark' });
    await toast.present();
  }

  async confirmLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Log Out?',
      message: 'You\'ll be signed out of EatWell. Your preferences will be saved.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Log Out', cssClass: 'danger', handler: () => this.doLogout() }
      ]
    });
    await alert.present();
  }

  async doLogout() {
    await this.authService.signOutUser().catch(() => {});
    this.state.resetState();
    const toast = await this.toastCtrl.create({ message: '👋 Logged out successfully', duration: 2000, color: 'dark' });
    await toast.present();
    this.router.navigateByUrl('/login');
  }

  saveAll() {
    Object.keys(this.editing).forEach(k => this.editing[k] = false);
    this.regenerate('All preferences saved');
  }

  // Dark mode
  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    document.body.classList.toggle('dark', this.darkMode);
    localStorage.setItem('darkMode', this.darkMode ? 'true' : 'false');
  }

  // Notifications
  async toggleReminders() {
    this.remindersEnabled = !this.remindersEnabled;
    await this.notifService.toggleReminders(this.remindersEnabled);
    const msg = this.remindersEnabled ? '🔔 Meal reminders enabled!' : '🔕 Meal reminders disabled';
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'dark' });
    await toast.present();
  }
}
