# EatWell4U — Test Automation

Comprehensive test suite for EatWell4U: unit tests, integration tests, and E2E automation.

## Test Structure
```
eatwell-testing/
├── unit/                    # Unit tests (Jasmine + Karma)
│   ├── services/
│   │   ├── state.service.spec.ts
│   │   ├── meal-data.service.spec.ts
│   │   ├── grocery.service.spec.ts
│   │   ├── auth.service.spec.ts
│   │   └── notification.service.spec.ts
│   └── pages/
│       ├── login.spec.ts
│       ├── dashboard.spec.ts
│       ├── weekly.spec.ts
│       └── grocery.spec.ts
├── e2e/                     # End-to-end tests (Cypress)
│   ├── auth.cy.ts           # Login/logout flows
│   ├── onboarding.cy.ts     # Onboarding + profile setup
│   ├── dashboard.cy.ts      # Daily meals, swap, camera
│   ├── weekly.cy.ts         # Weekly planner, PDF export
│   ├── grocery.cy.ts        # Grocery list, filters
│   └── dark-mode.cy.ts      # Theme toggle persistence
├── fixtures/                # Test data
│   ├── user-profiles.json
│   ├── meal-plans.json
│   └── grocery-lists.json
├── cypress.config.ts        # Cypress configuration
├── karma.conf.js            # Karma configuration
├── package.json
└── tsconfig.json
```

## Commands
```bash
npm install                  # Install test dependencies
npm test                     # Run unit tests (Karma)
npm run e2e                  # Run E2E tests (Cypress)
npm run e2e:open             # Open Cypress interactive mode
npm run test:ci              # Run all tests in CI mode
npm run test:coverage        # Generate coverage report
```

## Test Coverage Targets

| Area | Target | Priority |
|------|--------|----------|
| Services (state, meals, grocery) | 90%+ | High |
| Auth flows (login, logout, token) | 85%+ | High |
| Page components | 70%+ | Medium |
| E2E critical paths | 100% of happy paths | High |

## E2E Test Scenarios

### Auth Flow
- Google Sign-In success → redirects to onboarding
- Sign-In failure → shows error toast
- Sign-Out → clears state, redirects to login
- Token refresh → seamless re-auth

### Onboarding
- Complete 3 slides → navigates to profile setup
- Skip → navigates to profile setup
- Back navigation → returns to previous slide

### Dashboard
- Displays meals for selected date
- Swap meal → shows alternatives
- Camera scan → detects food → suggests healthier swap
- Calorie counter updates in real-time

### Weekly Planner
- Displays 7-day meal plan
- Tap day → shows meals for that day
- Export PDF → generates downloadable file

### Grocery List
- Shows ingredients grouped by category
- Check item → marks as purchased
- Filter by category → shows filtered list
- Progress bar updates with checked items

## CI/CD Integration
```yaml
# GitHub Actions example
- name: Run Unit Tests
  run: cd eatwell-testing && npm test -- --watch=false --browsers=ChromeHeadless

- name: Run E2E Tests
  run: cd eatwell-testing && npm run e2e
```
