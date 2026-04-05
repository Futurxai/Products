import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { StateService } from '../../services/state';
import { MealDataService } from '../../services/meal-data';
import { GroceryService, GrocerySection, GROCERY_CATEGORIES, GROCERY_CAT_ICON } from '../../services/grocery';

@Component({
  selector: 'app-grocery',
  standalone: false,
  templateUrl: './grocery.page.html',
  styleUrls: ['./grocery.page.scss'],
})
export class GroceryPage implements OnInit {
  currentTab: 'today' | 'tomorrow' | 'weekly' = 'today';
  activeFilter = 'All';
  groceryChecked: Record<string, boolean> = {};
  weeklyPlan: any[] = [];

  categories = GROCERY_CATEGORIES;
  catIcons = GROCERY_CAT_ICON;

  groceryData: { today: GrocerySection[], tomorrow: GrocerySection[], weekly: GrocerySection[] } = { today: [], tomorrow: [], weekly: [] };
  allItems: { name: string, cat: string, icon: string, key: string }[] = [];
  filteredItems: { name: string, cat: string, icon: string, key: string }[] = [];

  constructor(
    private state: StateService,
    private mealData: MealDataService,
    private groceryService: GroceryService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const st = this.state.getState();
    const cuisine = this.mealData.getPrimaryCuisine(st.profileCuisines, st.cuisines);
    this.weeklyPlan = this.mealData.buildWeeklyPlan(cuisine);
    this.buildData();
  }

  buildData() {
    this.groceryData = this.groceryService.buildGroceryData(this.weeklyPlan, 0);
    this.buildItems();
  }

  buildItems() {
    const sections = this.groceryData[this.currentTab] || [];
    this.allItems = [];
    sections.forEach((sec, si) => {
      sec.items.forEach((name, ii) => {
        this.allItems.push({ name, cat: sec.cat, icon: sec.icon, key: `${this.currentTab}::${si}::${ii}` });
      });
    });
    this.applyFilter();
  }

  applyFilter() {
    this.filteredItems = this.activeFilter === 'All'
      ? this.allItems
      : this.allItems.filter(i => i.cat === this.activeFilter);
  }

  get checkedCount() { return this.allItems.filter(i => this.groceryChecked[i.key]).length; }
  get totalCount() { return this.allItems.length; }
  get pct() { return this.totalCount ? Math.round(this.checkedCount / this.totalCount * 100) : 0; }

  get presentCats(): string[] {
    const cats = new Set(this.allItems.map(i => i.cat));
    return ['All', ...this.categories.filter(c => cats.has(c))];
  }

  switchTab(tab: 'today' | 'tomorrow' | 'weekly') {
    this.currentTab = tab;
    this.activeFilter = 'All';
    this.buildItems();
  }

  setFilter(cat: string) {
    this.activeFilter = cat;
    this.applyFilter();
  }

  toggleItem(key: string) {
    this.groceryChecked[key] = !this.groceryChecked[key];
  }

  async exportGrocery() {
    const sections = this.groceryData[this.currentTab] || [];
    let html = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial;max-width:700px;margin:0 auto;padding:20px}h1{color:#1DB954}.sec{margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.sh{background:#f3f4f6;padding:10px 16px;font-weight:600}.item{padding:9px 16px;border-bottom:1px solid #f9f9f9;font-size:14px}</style></head><body><h1>🛒 EatWell Grocery List</h1><p style="color:#6b7280">${this.currentTab}</p>`;
    sections.forEach(sec => {
      html += `<div class="sec"><div class="sh">${sec.icon} ${sec.cat}</div>`;
      sec.items.forEach(name => html += `<div class="item">☐ ${name}</div>`);
      html += '</div>';
    });
    html += '</body></html>';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `EatWell_Grocery_${this.currentTab}.html`;
    a.click();
    const toast = await this.toastCtrl.create({ message: '🛒 Grocery list exported!', duration: 2000, color: 'dark' });
    await toast.present();
  }
}
