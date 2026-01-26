# 🪟 Windows Quick Start Guide - King Dice Mobile App

## ✅ What You Need to Download (Windows)

### 1. Node.js
- **Download**: https://nodejs.org/ (Get the LTS version)
- **Verify**: Open PowerShell and type: `node --version`
- Should show: `v18.x.x` or higher

### 2. Android Studio (This is your "app simulation program")
- **Download**: https://developer.android.com/studio
- **Size**: ~1GB download, ~3GB installed
- **What it includes**:
  - Android SDK (Software Development Kit)
  - Android Emulator (virtual phone on your computer)
  - Android Virtual Device Manager (AVD Manager)

### 3. Git (if you don't have it)
- **Download**: https://git-scm.com/download/win
- Usually already installed if you've been using GitHub

## 🚀 Installation Steps

### Step 1: Install Node.js
1. Download the installer from nodejs.org
2. Run the installer
3. Check "Add to PATH" if prompted
4. Click "Install"
5. **Verify**: Open PowerShell, type `node --version`

### Step 2: Install Android Studio
1. Download Android Studio
2. Run the installer
3. Choose "Standard" installation
4. Let it download SDK components (this takes 10-20 minutes)
5. **Important**: Make sure these are checked:
   - ✅ Android SDK
   - ✅ Android SDK Platform
   - ✅ Android Virtual Device

### Step 3: Set Up Android Emulator
1. Open Android Studio
2. Click "More Actions" → "Virtual Device Manager"
3. Click "Create Device"
4. Choose a phone (e.g., "Pixel 5")
5. Click "Next"
6. Download a system image (e.g., "Tiramisu" API 33)
7. Click "Finish"
8. Click the ▶️ Play button to start the emulator

### Step 4: Install Expo CLI
Open PowerShell and run:
```powershell
npm install -g expo-cli eas-cli
```

### Step 5: Navigate to Mobile App Folder
```powershell
cd "E:\King Dice\mobile-app"
```

### Step 6: Install Dependencies
```powershell
npm install
```

### Step 7: Start the App
```powershell
npm start
```

This will:
- Start the development server
- Show a QR code
- Open Expo DevTools in your browser

### Step 8: Run on Android Emulator
1. Make sure your Android emulator is running (from Step 3)
2. In the terminal where `npm start` is running, press `a` (for Android)
3. Or run in a new terminal: `npm run android`

## 📱 Testing on Your Phone (Optional)

### Android Phone:
1. Install "Expo Go" from Google Play Store
2. Scan the QR code shown in terminal
3. App will load on your phone!

### iPhone (if you have one):
1. Install "Expo Go" from App Store
2. Open Camera app
3. Scan the QR code
4. App will load!

## ⚠️ Common Issues & Fixes

### Issue: "SDK location not found"
**Fix**: Set environment variable
1. Search "Environment Variables" in Windows
2. Click "Environment Variables"
3. Under "User variables", click "New"
4. Variable name: `ANDROID_HOME`
5. Variable value: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
6. Click OK, restart PowerShell

### Issue: Emulator is slow
**Fix**: 
- Enable "Hardware acceleration" in Android Studio
- Allocate more RAM to emulator (Settings → AVD Manager → Edit → Show Advanced Settings)

### Issue: Can't connect to API
**Fix**: Update `mobile-app/config/api.ts`:
```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:3000'  // Use this for Android emulator
  : 'https://kingdice.gg';
```

## 🎯 What's Next?

1. ✅ Get everything installed
2. ✅ Run the app on emulator
3. ⏳ Test all features
4. ⏳ Create developer accounts (when ready)
5. ⏳ Build production app
6. ⏳ Submit to stores

## 💡 About the Mac Requirement

**Short answer**: You need a Mac **only** for:
- Building the iOS app
- Testing on iPhone simulator
- Submitting to App Store

**You can**:
- ✅ Develop the entire app on Windows
- ✅ Test on Android emulator
- ✅ Build Android version
- ✅ Submit to Google Play Store

**When you're ready for iOS**:
- Borrow a Mac
- Build the iOS version
- Submit to App Store
- You only need the Mac for a few hours!

## 📞 Need Help?

If you get stuck:
1. Check the error message
2. Google the error (someone else had it!)
3. Check Expo docs: https://docs.expo.dev/
4. Ask me!
