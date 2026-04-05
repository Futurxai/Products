# EatWell4U — APK Builds

Signed Android APK releases for EatWell4U.

## Current Release

| Version | Size | Build | Date |
|---------|------|-------|------|
| v1.0.0 | 7.2 MB | Release (signed) | 2025-04-05 |

## APK Files
```
releases/
├── v1.0.0/
│   ├── app-release.apk          # Signed release APK
│   └── RELEASE-NOTES.md         # What's new
└── debug/
    └── app-debug.apk            # Debug build (for testing)
```

## Build Instructions
```bash
# From eatwell-mobile/
ionic cap build android

# Open in Android Studio
# Build > Generate Signed APK
# OR via CLI:
cd android && ./gradlew assembleRelease
```

## Signing
- Keystore stored securely (not in this repo)
- SHA-1 fingerprint registered in Firebase Console
- Google Services config in `backup` branch only

## Installation
```bash
# Install on connected device
adb install releases/v1.0.0/app-release.apk

# Install debug build
adb install releases/debug/app-debug.apk
```

## Requirements
- Android 8.0+ (API 26)
- ~15 MB storage after install
- Google Play Services (for Google Sign-In)
