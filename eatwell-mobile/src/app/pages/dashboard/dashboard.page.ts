import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { StateService } from '../../services/state';
import { MealDataService, Meal } from '../../services/meal-data';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  dashMeals: Meal[] = [];
  username = 'User';
  today = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Modal state
  showRecipe = false;
  showSwap = false;
  showBrowser = false;
  activeMeal: Meal | null = null;
  activeSwapIdx = 0;
  swapOptions: Meal[] = [];
  selectedSwap = -1;
  allRecipes: Meal[] = [];
  swapFilter: 'all' | 'quick' = 'all';

  // Camera
  showCamera = false;
  capturedImage: string | null = null;
  detectedFood: any = null;
  scanning = false;

  constructor(
    private state: StateService,
    private mealData: MealDataService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const st = this.state.getState();
    this.username = st.username || 'User';
    const cuisine = this.mealData.getPrimaryCuisine(st.profileCuisines, st.cuisines);
    this.dashMeals = this.mealData.initDashMeals(cuisine);
  }

  get totalCal() { return this.dashMeals.reduce((s, m) => s + (m.cal || 0), 0); }
  get totalP() { return this.dashMeals.reduce((s, m) => s + (m.p || 0), 0); }
  get totalC() { return this.dashMeals.reduce((s, m) => s + (m.c || 0), 0); }
  get totalF() { return this.dashMeals.reduce((s, m) => s + (m.f || 0), 0); }

  openRecipe(idx: number) {
    this.activeMeal = this.dashMeals[idx];
    this.activeSwapIdx = idx;
    this.showRecipe = true;
  }

  closeRecipe() { this.showRecipe = false; }

  openSwap(idx: number) {
    this.activeSwapIdx = idx;
    this.selectedSwap = -1;
    this.swapFilter = 'all';
    const st = this.state.getState();
    const cuisine = this.mealData.getPrimaryCuisine(st.profileCuisines, st.cuisines);
    const m = this.dashMeals[idx];
    this.swapOptions = this.mealData.getSwapOptionsForMeal(m.type || 'Breakfast', cuisine);
    this.showSwap = true;
  }

  selectSwapOption(i: number) { this.selectedSwap = i; }

  async confirmSwap() {
    if (this.selectedSwap < 0) return;
    const opt = this.swapOptions[this.selectedSwap];
    const cur = this.dashMeals[this.activeSwapIdx];
    this.dashMeals[this.activeSwapIdx] = { ...opt, type: cur.type, icon: cur.icon, bg: cur.bg, mealTime: cur.mealTime };
    this.showSwap = false;
    const toast = await this.toastCtrl.create({ message: '✓ Meal swapped!', duration: 2000, color: 'dark' });
    await toast.present();
  }

  openRecipeBrowser() {
    const st = this.state.getState();
    const cuisine = this.mealData.getPrimaryCuisine(st.profileCuisines, st.cuisines);
    const meals = this.mealData.getMealsForCuisine(cuisine);
    this.allRecipes = [...meals.breakfast, ...meals.lunch, ...meals.dinner, ...meals.snacks];
    this.showBrowser = true;
  }

  openRecipeFromBrowser(m: Meal) {
    this.activeMeal = m;
    this.showBrowser = false;
    this.showRecipe = true;
  }

  openSwapFromRecipe() {
    this.showRecipe = false;
    this.openSwap(this.activeSwapIdx);
  }

  setSwapFilter(f: 'all' | 'quick') {
    this.swapFilter = f;
    if (f === 'quick') {
      const m = this.dashMeals[this.activeSwapIdx];
      const type = (m.type || 'breakfast').toLowerCase();
      this.swapOptions = (this.mealData.QUICK_RECIPES[type] || this.mealData.QUICK_RECIPES['breakfast']);
    } else {
      const st = this.state.getState();
      const cuisine = this.mealData.getPrimaryCuisine(st.profileCuisines, st.cuisines);
      const m = this.dashMeals[this.activeSwapIdx];
      this.swapOptions = this.mealData.getSwapOptionsForMeal(m.type || 'Breakfast', cuisine);
    }
    this.selectedSwap = -1;
  }

  // Camera food scanner
  async openCamera() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      this.capturedImage = image.dataUrl || null;
      this.scanning = true;
      this.showCamera = true;

      // Simulate food detection after 2s
      setTimeout(() => {
        this.scanning = false;
        const foods = this.mealData.detectedFoods;
        this.detectedFood = foods[Math.floor(Math.random() * foods.length)];
      }, 2000);
    } catch (err) {
      // User cancelled or camera unavailable - try gallery
      try {
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        this.capturedImage = image.dataUrl || null;
        this.scanning = true;
        this.showCamera = true;
        setTimeout(() => {
          this.scanning = false;
          const foods = this.mealData.detectedFoods;
          this.detectedFood = foods[Math.floor(Math.random() * foods.length)];
        }, 2000);
      } catch (e) {
        // Both cancelled
      }
    }
  }

  async acceptCameraSwap() {
    if (!this.detectedFood) return;
    const sug = this.detectedFood.suggest;
    this.dashMeals[0] = {
      ...this.dashMeals[0],
      name: sug.name,
      emoji: sug.emoji,
      cal: sug.cal,
      p: sug.p,
      c: sug.c,
      f: sug.f,
    };
    this.showCamera = false;
    this.detectedFood = null;
    this.capturedImage = null;
    const toast = await this.toastCtrl.create({ message: '📸 Meal swapped via food scan!', duration: 2000, color: 'success' });
    await toast.present();
  }

  rejectCameraSwap() {
    this.detectedFood = null;
    this.scanning = false;
  }

  closeCamera() {
    this.showCamera = false;
    this.detectedFood = null;
    this.capturedImage = null;
    this.scanning = false;
  }
}
