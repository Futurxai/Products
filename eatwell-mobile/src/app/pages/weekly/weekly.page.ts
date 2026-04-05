import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { StateService } from '../../services/state';
import { MealDataService, Meal, WeekDay } from '../../services/meal-data';

@Component({
  selector: 'app-weekly',
  standalone: false,
  templateUrl: './weekly.page.html',
  styleUrls: ['./weekly.page.scss'],
})
export class WeeklyPage implements OnInit {
  weeklyPlan: WeekDay[] = [];
  currentDay = 0;
  dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  showRecipe = false;
  activeMeal: Meal | null = null;

  constructor(
    private state: StateService,
    private mealData: MealDataService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const st = this.state.getState();
    const cuisine = this.mealData.getPrimaryCuisine(st.profileCuisines, st.cuisines);
    this.weeklyPlan = this.mealData.buildWeeklyPlan(cuisine);
  }

  get today() { return this.weeklyPlan[this.currentDay]; }
  get dailyTotal() { return this.today?.meals.reduce((s, m) => s + (m.cal || 0), 0) || 0; }
  get weeklyAvg() {
    const total = this.weeklyPlan.reduce((s, d) => s + d.meals.reduce((ss, m) => ss + (m.cal || 0), 0), 0);
    return Math.round(total / 7);
  }
  get weeklyTotal() {
    return this.weeklyPlan.reduce((s, d) => s + d.meals.reduce((ss, m) => ss + (m.cal || 0), 0), 0);
  }

  setDay(d: number) { this.currentDay = d; }
  changeDay(delta: number) { this.currentDay = (this.currentDay + delta + 7) % 7; }

  openRecipe(m: Meal) { this.activeMeal = m; this.showRecipe = true; }
  closeRecipe() { this.showRecipe = false; }

  async exportPDF() {
    let html = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial;max-width:800px;margin:0 auto;padding:20px}h1{color:#1DB954}.day{margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.dh{background:#1DB954;color:white;padding:10px 16px;font-weight:600}.meal{padding:10px 16px;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between}</style></head><body><h1>EatWell Weekly Plan</h1>`;
    this.weeklyPlan.forEach(day => {
      html += `<div class="day"><div class="dh">${day.label}, ${day.date}</div>`;
      day.meals.forEach(m => html += `<div class="meal"><div><strong>${m.emoji} ${m.name}</strong><br><small>${m.type} · P:${m.p}g C:${m.c}g F:${m.f}g</small></div><div style="color:#1DB954;font-weight:600">${m.cal} cal</div></div>`);
      html += '</div>';
    });
    html += '</body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'EatWell_WeeklyPlan.html';
    a.click();
    const toast = await this.toastCtrl.create({ message: '📄 Weekly plan exported!', duration: 2000, color: 'dark' });
    await toast.present();
  }
}
