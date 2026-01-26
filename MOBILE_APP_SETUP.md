# King Dice Mobile App Setup Guide

## 📱 Overview

This guide will help you set up the King Dice mobile app for both Android and iOS platforms using React Native and Expo.

## ✅ Prerequisites

### For Windows (Android Development)

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version` in terminal

2. **Android Studio**
   - Download: https://developer.android.com/studio
   - Install Android SDK (API 33 or higher)
   - Install Android Emulator
   - Set up Android Virtual Device (AVD)

3. **Expo CLI**
   - Install globally: `npm install -g expo-cli eas-cli`

4. **Git** (if not already installed)
   - Download: https://git-scm.com/

### For Mac (iOS Development - Required Later)

1. **Xcode** (from Mac App Store)
2. **CocoaPods**: `sudo gem install cocoapods`
3. **iOS Simulator** (comes with Xcode)

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd mobile-app
npm install
```

### Step 2: Configure API URL

Edit `mobile-app/config/api.ts` and update the `API_BASE_URL`:

```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000'  // Your local dev server
  : 'https://kingdice.gg';   // Production
```

**Important for Android Emulator:**
- Use `http://10.0.2.2:3000` instead of `localhost:3000` for Android emulator
- Or use your computer's local IP: `http://192.168.x.x:3000`

### Step 3: Start Development Server

```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code in the terminal
- Open Expo DevTools in your browser

### Step 4: Run on Android Emulator

1. **Start Android Studio**
2. **Open AVD Manager** (Tools → Device Manager)
3. **Start an emulator** (click Play button)
4. **In terminal**, run: `npm run android`

Or scan the QR code with:
- **Android**: Expo Go app from Play Store
- **iOS**: Camera app (requires Expo Go from App Store)

### Step 5: Test on Physical Device

**Android:**
1. Enable Developer Options on your phone
2. Enable USB Debugging
3. Connect via USB
4. Run: `npm run android`

**iOS:**
1. Connect iPhone via USB
2. Trust computer on iPhone
3. Run: `npm run ios` (Mac only)

## 📦 Building for Production

### Android Build

1. **Install EAS CLI** (if not already):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS**:
   ```bash
   eas build:configure
   ```

4. **Build Android APK/AAB**:
   ```bash
   eas build --platform android
   ```

5. **Submit to Play Store**:
   ```bash
   eas submit --platform android
   ```

### iOS Build (Requires Mac)

1. **Build iOS app**:
   ```bash
   eas build --platform ios
   ```

2. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

## 🔐 Developer Accounts

### Google Play Console

1. **Sign up**: https://play.google.com/console
2. **One-time fee**: $25 (lifetime)
3. **Required info**:
   - Developer name
   - Email address
   - Payment method

### Apple Developer Program

1. **Sign up**: https://developer.apple.com/programs/
2. **Annual fee**: $99/year
3. **Required info**:
   - Apple ID
   - Payment method
   - Legal entity info

## 📝 App Configuration

### Update App Info

Edit `mobile-app/app.json`:

```json
{
  "expo": {
    "name": "King Dice",
    "slug": "king-dice",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.kingdice.app"
    },
    "android": {
      "package": "com.kingdice.app"
    }
  }
}
```

### Add App Icons

Place these files in `mobile-app/assets/`:
- `icon.png` (1024x1024)
- `splash.png` (1242x2436)
- `adaptive-icon.png` (1024x1024, Android)
- `favicon.png` (48x48, Web)

## 🐛 Troubleshooting

### Android Emulator Issues

**Problem**: "SDK location not found"
- **Solution**: Set `ANDROID_HOME` environment variable:
  - Windows: `set ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk`
  - Add to PATH: `%ANDROID_HOME%\platform-tools`

**Problem**: Emulator won't start
- **Solution**: Enable Virtualization in BIOS (Intel VT-x or AMD-V)

### Network Issues

**Problem**: Can't connect to API from emulator
- **Solution**: Use `10.0.2.2` instead of `localhost` for Android emulator
- Or use your computer's local IP address

### Build Errors

**Problem**: "EAS project ID not found"
- **Solution**: Run `eas build:configure` first

## 📚 Next Steps

1. ✅ Complete basic setup
2. ✅ Test on Android emulator
3. ⏳ Add all features from web app
4. ⏳ Create app icons and splash screens
5. ⏳ Set up developer accounts
6. ⏳ Build production versions
7. ⏳ Submit to stores

## 🆘 Need Help?

- Expo Docs: https://docs.expo.dev/
- React Native Docs: https://reactnative.dev/
- EAS Build Docs: https://docs.expo.dev/build/introduction/
