import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppState {
  username: string;
  isOTP: boolean;
  height: string;
  weight: string;
  gender: string;
  goal: string;
  targetWeight: string;
  targetPeriod: string;
  diet: string;
  customDiet: string;
  cuisines: Set<string>;
  likedCats: Set<string>;
  likedItems: Set<string>;
  dislikedCats: Set<string>;
  dislikedItems: Set<string>;
  profileGoal: string;
  profileDiet: string;
  profileCuisines: Set<string>;
}

const DEFAULT_STATE: AppState = {
  username: '',
  isOTP: false,
  height: '',
  weight: '',
  gender: '',
  goal: '',
  targetWeight: '',
  targetPeriod: '',
  diet: '',
  customDiet: '',
  cuisines: new Set<string>(),
  likedCats: new Set<string>(),
  likedItems: new Set<string>(),
  dislikedCats: new Set<string>(),
  dislikedItems: new Set<string>(),
  profileGoal: 'Weight-Loss',
  profileDiet: 'Non-Vegetarian',
  profileCuisines: new Set(['South Indian']),
};

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private stateSubject = new BehaviorSubject<AppState>({ ...DEFAULT_STATE });
  state$ = this.stateSubject.asObservable();

  getState(): AppState {
    return this.stateSubject.getValue();
  }

  updateField<K extends keyof AppState>(key: K, value: AppState[K]): void {
    const current = this.getState();
    this.stateSubject.next({ ...current, [key]: value });
  }

  resetState(): void {
    this.stateSubject.next({
      ...DEFAULT_STATE,
      cuisines: new Set<string>(),
      likedCats: new Set<string>(),
      likedItems: new Set<string>(),
      dislikedCats: new Set<string>(),
      dislikedItems: new Set<string>(),
      profileCuisines: new Set(['South Indian']),
    });
  }
}
