import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MealDataService } from '../../services/meal-data';

@Component({
  selector: 'app-onboarding',
  standalone: false,
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
})
export class OnboardingPage {
  currentSlide = 0;
  slides: any[];

  constructor(private router: Router, private mealData: MealDataService) {
    this.slides = this.mealData.onboardingSlides;
  }

  get slide() { return this.slides[this.currentSlide]; }

  next() {
    if (this.currentSlide < 2) {
      this.currentSlide++;
    } else {
      this.router.navigateByUrl('/profile-setup');
    }
  }

  skip() {
    this.router.navigateByUrl('/profile-setup');
  }
}
