import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { StateService } from '../../services/state';
import { MealDataService } from '../../services/meal-data';

@Component({
  selector: 'app-profile-setup',
  standalone: false,
  templateUrl: './profile-setup.page.html',
  styleUrls: ['./profile-setup.page.scss'],
})
export class ProfileSetupPage {
  step = 1;
  height = ''; weight = ''; gender = ''; goal = '';
  targetWeight = ''; targetPeriod = '';  customPeriod = '';
  diet = ''; customDiet = '';
  cuisines = new Set<string>();
  likedCats = new Set<string>(); likedItems = new Set<string>();
  dislikedCats = new Set<string>(); dislikedItems = new Set<string>();

  errors: Record<string, boolean> = {};
  periods = ['1 Month','3 Months','6 Months','1 Year','2 Years','Custom'];
  diets = [
    { val:'Vegetarian', sub:'Plant-based with dairy and eggs' },
    { val:'Non-Vegetarian', sub:'Includes all food types' },
    { val:'Vegan', sub:'Strictly plant-based' },
    { val:'Keto', sub:'Low-carb, high-fat diet' },
    { val:'Paleo', sub:'Whole foods, no processed items' },
    { val:'Gluten-Free', sub:'No wheat or gluten products' },
    { val:'Other', sub:'Specify your custom diet preference' },
  ];
  expandedCats: Record<string, Set<string>> = { liked: new Set(), disliked: new Set() };

  constructor(
    private router: Router,
    public state: StateService,
    public mealData: MealDataService
  ) {}

  get foodData() { return this.mealData.foodData; }
  get allCuisines() { return this.mealData.allCuisines; }

  get progressWidth() { return (this.step / 6 * 100) + '%'; }

  get targetSummary(): string {
    const tw = parseFloat(this.targetWeight);
    const cw = parseFloat(this.weight);
    const p = this.targetPeriod === 'Custom' ? this.customPeriod : this.targetPeriod;
    if (!tw || !p) return '';
    if (cw) {
      const diff = Math.abs(cw - tw).toFixed(1);
      if (parseFloat(diff) > 0) return `${cw > tw ? 'Lose' : 'Gain'} ${diff} kg in ${p}`;
    }
    return `Goal: ${tw} kg in ${p}`;
  }

  back() {
    if (this.step === 1) this.router.navigateByUrl('/login');
    else this.step--;
  }

  next() {
    this.errors = {};
    if (this.step === 1) {
      if (!this.height) this.errors['height'] = true;
      if (!this.weight) this.errors['weight'] = true;
      if (!this.gender) this.errors['gender'] = true;
      if (!this.goal) this.errors['goal'] = true;
      const p = this.targetPeriod === 'Custom' ? this.customPeriod : this.targetPeriod;
      if (!this.targetWeight || !p) this.errors['target'] = true;
      if (Object.keys(this.errors).length) return;
    } else if (this.step === 2) {
      if (!this.diet) { this.errors['diet'] = true; return; }
    } else if (this.step === 3) {
      if (this.cuisines.size === 0) { this.errors['cuisine'] = true; return; }
    }
    if (this.step < 6) this.step++;
  }

  selectGender(g: string) { this.gender = g; }
  selectGoal(g: string) { this.goal = g; }
  selectPeriod(p: string) { this.targetPeriod = p; }
  selectDiet(d: string) { this.diet = d; }

  toggleCuisine(c: string) {
    if (this.cuisines.has(c)) this.cuisines.delete(c);
    else this.cuisines.add(c);
  }

  toggleCat(type: string, cat: string) {
    const set = type === 'liked' ? this.likedCats : this.dislikedCats;
    if (set.has(cat)) set.delete(cat); else set.add(cat);
  }

  toggleExpand(type: string, cat: string) {
    const set = this.expandedCats[type];
    if (set.has(cat)) set.delete(cat); else set.add(cat);
  }

  isExpanded(type: string, cat: string) { return this.expandedCats[type].has(cat); }

  toggleItem(type: string, cat: string, item: string) {
    const catSet = type === 'liked' ? this.likedCats : this.dislikedCats;
    if (catSet.has(cat)) return;
    const set = type === 'liked' ? this.likedItems : this.dislikedItems;
    const key = cat + '::' + item;
    if (set.has(key)) set.delete(key); else set.add(key);
  }

  isItemSelected(type: string, cat: string, item: string): boolean {
    const catSet = type === 'liked' ? this.likedCats : this.dislikedCats;
    if (catSet.has(cat)) return true;
    const set = type === 'liked' ? this.likedItems : this.dislikedItems;
    return set.has(cat + '::' + item);
  }

  get bmi() { return this.mealData.calcBMI(parseFloat(this.height), parseFloat(this.weight)); }
  get bmiInfo() { return this.mealData.getBMIInfo(this.bmi); }

  get likedSummary() {
    const cats = [...this.likedCats].length;
    return `${cats} categories, ${this.likedItems.size} items selected`;
  }

  get dislikedSummary() {
    const cats = [...this.dislikedCats].length;
    return `${cats} categories, ${this.dislikedItems.size} items to avoid`;
  }

  generatePlan() {
    const s = this.state;
    s.updateField('height', this.height);
    s.updateField('weight', this.weight);
    s.updateField('gender', this.gender);
    s.updateField('goal', this.goal);
    s.updateField('targetWeight', this.targetWeight);
    s.updateField('targetPeriod', this.targetPeriod === 'Custom' ? this.customPeriod : this.targetPeriod);
    s.updateField('diet', this.diet);
    s.updateField('customDiet', this.customDiet);
    s.updateField('cuisines', this.cuisines);
    s.updateField('likedCats', this.likedCats);
    s.updateField('likedItems', this.likedItems);
    s.updateField('dislikedCats', this.dislikedCats);
    s.updateField('dislikedItems', this.dislikedItems);
    s.updateField('profileDiet', this.diet);
    s.updateField('profileCuisines', this.cuisines);
    this.router.navigateByUrl('/tabs/dashboard');
  }
}
