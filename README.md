# Futurx Products

All Futurx product builds, APKs, and test automation — organized by product.

## Products

| Product | Description | Status |
|---------|-------------|--------|
| [eatwell-mobile](eatwell-mobile/) | EatWell4U Ionic/Angular mobile app source | Active |
| [eatwell-apk](eatwell-apk/) | Signed Android APK builds & release notes | Active |
| [eatwell-testing](eatwell-testing/) | E2E & automation test suites for EatWell | Active |

## Apps (New Structure)

| App | Folder | Description |
|-----|--------|-------------|
| EatWell | [apps/eatwell](apps/eatwell/) | Nutrition & meal planning for Indian users |
| Paydll | [apps/paydll](apps/paydll/) | Payment & billing for small businesses |
| LoveDigitally | [apps/lovedigitally](apps/lovedigitally/) | Digital relationship & social connections |
| PGSeat | [apps/priseat](apps/priseat/) | Event seat booking & reservations |

## Tech Stack
- **Mobile:** Ionic + Angular + Capacitor
- **Auth:** Firebase Authentication + Supabase Auth (OTP)
- **Database:** Supabase (PostgreSQL)
- **Payments:** Razorpay
- **Analytics:** Firebase Analytics + Crashlytics
- **Hosting:** Firebase Hosting
- **Testing:** Jasmine + Karma + Cypress (E2E)
- **CI/CD:** GitHub Actions

## Quick Start
```bash
# Mobile app
cd eatwell-mobile && npm install && ionic serve

# Run tests
cd eatwell-testing && npm test

# Build APK
cd eatwell-mobile && ionic cap build android
```

## Links
- **Live App:** https://eatwell-5eaf0.web.app
- **Source Repo:** https://github.com/Futurxai/EatWell4U
- **Agent Config:** https://github.com/Futurxai/futurx-agent
- **Marketing:** https://github.com/Futurxai/Marketing
