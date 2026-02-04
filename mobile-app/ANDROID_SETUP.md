# 🤖 Android Emulator Setup Guide

## Quick Start

### 1. Set Environment Variables (One-time setup)

**Option A: Temporary (Current Session Only)**
```powershell
# Run this in your PowerShell session
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
```

**Option B: Permanent (Recommended)**
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Click "Environment Variables"
3. Under "User variables", click "New"
4. Variable name: `ANDROID_HOME`
5. Variable value: `C:\Users\Kerson\AppData\Local\Android\Sdk`
6. Find "Path" in User variables, click "Edit"
7. Click "New" and add: `%ANDROID_HOME%\platform-tools`
8. Click "New" and add: `%ANDROID_HOME%\emulator`
9. Click OK on all dialogs
10. **Restart PowerShell** for changes to take effect

### 2. Start Android Emulator

**From Android Studio:**
1. Open Android Studio
2. Click "More Actions" → "Virtual Device Manager"
3. Click the ▶️ Play button next to your emulator
4. Wait for emulator to boot (takes 30-60 seconds)

**Or from Command Line:**
```powershell
# List available emulators
emulator -list-avds

# Start an emulator (replace with your AVD name)
emulator -avd Pixel_5_API_33
```

### 3. Verify Emulator is Running

```powershell
adb devices
```

You should see something like:
```
List of devices attached
emulator-5554   device
```

### 4. Start Expo Dev Server

```powershell
cd "E:\King Dice\mobile-app"
npm start
```

### 5. Launch on Android Emulator

Once Expo starts:
- Press `a` in the terminal to launch on Android
- Or run: `npm run android`

The app will automatically:
- Detect the running emulator
- Install Expo Go (if needed)
- Launch your app

## Troubleshooting

### "SDK location not found"
- Make sure `ANDROID_HOME` is set correctly
- Restart your terminal/PowerShell after setting environment variables

### "No devices found"
- Make sure emulator is running (check Android Studio)
- Run `adb devices` to verify connection
- Try restarting ADB: `adb kill-server && adb start-server`

### **"device offline"** / `adb.exe: device offline`
- `adb devices` shows `emulator-5554   offline` instead of `device`
- **Fix:** Restart ADB, then fully close and reboot the emulator. Wait until it’s fully booted, then `adb devices` again.
- **Full steps:** See **`EMULATOR_OFFLINE_FIX.md`**

### **"Emulator failed to connect within 5 minutes"**
- Emulator stays on "Starting up" then times out; it never boots.
- **Fix:** Often hypervisor (WHPX), Vanguard, or corrupted AVD. Cold boot, wipe data, or new AVD.
- **Full steps:** See **`EMULATOR_WONT_CONNECT.md`**. Run **`.\check-emulator-env.ps1`** for quick checks.

### "Cannot connect to localhost:3000"
- The API config is set to use `10.0.2.2` for Android emulator
- Make sure your Next.js dev server is running on port 3000
- For physical devices, update `API_BASE_URL` to your computer's IP

### Emulator is Slow
- Enable Hardware Acceleration in Android Studio
- Allocate more RAM: AVD Manager → Edit → Show Advanced Settings → RAM: 4096MB
- Use x86_64 system images (faster than ARM)

## API Configuration

The mobile app is configured to connect to:
- **Android Emulator**: `http://10.0.2.2:3000` (maps to localhost)
- **iOS Simulator**: `http://localhost:3000`
- **Physical Device**: Update to your computer's IP (e.g., `http://192.168.1.100:3000`)
- **Production**: `https://kingdice.gg`

## Next Steps

1. ✅ Set ANDROID_HOME environment variable
2. ✅ Start Android emulator
3. ✅ Start Next.js dev server: `cd "E:\King Dice" && npm run dev`
4. ✅ Start Expo: `cd mobile-app && npm start`
5. ✅ Press `a` to launch on Android
