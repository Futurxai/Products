# EatWell4U — Mobile App

Personalized meal planning mobile app built with Ionic + Angular + Capacitor.

## Features
- Google Sign-In (Firebase Auth)
- 6-step profile setup (physical stats, diet, cuisine, food preferences)
- Dashboard with daily meals & calorie tracking
- Meal swap & recipe browser (50+ recipes, 5 cuisines)
- Weekly 7-day meal planner with PDF export
- Grocery list with category filters & progress tracking
- Dark mode toggle
- Meal reminder push notifications
- Camera food scanner with swap suggestions

## Tech Stack
```
Framework:    Ionic 8 + Angular 20
Mobile:       Capacitor 8 (Android)
Auth:         Firebase Authentication (Google Sign-In)
Hosting:      Firebase Hosting
Language:     TypeScript, SCSS
```

## Architecture
```
src/app/
├── pages/
│   ├── login/              # Firebase Google Auth
│   ├── onboarding/         # 3-slide intro
│   ├── profile-setup/      # 6-step wizard
│   ├── dashboard/          # Daily meals + camera + swap
│   ├── weekly/             # 7-day planner + PDF export
│   ├── grocery/            # Shopping list + filters
│   └── profile/            # Settings + dark mode + notifications
├── services/
│   ├── state.ts            # BehaviorSubject global state
│   ├── meal-data.ts        # 50+ recipes, 5 cuisines, BMI calc
│   ├── grocery.ts          # Ingredient categorization
│   ├── auth.ts             # Firebase + Capacitor Google Auth
│   └── notification.ts     # Local push notifications
└── tabs/                   # Bottom navigation
```

## Commands
```bash
npm install                  # Install dependencies
ionic serve                  # Run in browser
ionic cap build android      # Build Android
ionic cap run android        # Run on device
ng test                      # Run unit tests
ng lint                      # Lint code
firebase deploy              # Deploy to hosting
```

## Cuisines Supported
South Indian | North Indian | Continental | Chinese | Healthy/Default

## Live
- **Web:** https://eatwell-5eaf0.web.app
- **Repo:** https://github.com/Futurxai/EatWell4U
