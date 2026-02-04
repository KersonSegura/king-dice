# 🚀 Quick Start Guide - Launch Your App

## What You Need

1. ✅ **Android Emulator** - Running (you have this!)
2. ✅ **Next.js Server** - Should be running on port 3000
3. ⏳ **Expo Server** - Need to start this

## Step-by-Step: Launch Your App

### Step 1: Open a PowerShell Terminal

Open a **new PowerShell window** (keep it separate from your Next.js terminal).

### Step 2: Start Expo

Copy and paste these commands **one at a time**:

```powershell
# Set Android environment
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

# Navigate to mobile app
cd "E:\King Dice\mobile-app"

# Start Expo
npx expo start --android
```

### Step 3: Wait for Auto-Launch

**What will happen:**
1. Expo starts Metro Bundler (takes 10-30 seconds)
2. Detects your emulator automatically
3. Installs Expo Go (first time only - takes 1-2 minutes)
4. **App launches automatically!** 🎉

### Step 4: If It Doesn't Auto-Launch

**In the Expo terminal, press `a`** (lowercase) to launch on Android.

## What You Should See

**In Terminal:**
```
Starting Metro Bundler
Metro waiting on exp://192.168.x.x:8081

› Press a │ open Android
```

**On Emulator:**
- Expo Go opens (first time)
- Your King Dice app loads
- App interface appears

## Troubleshooting

### Port Already in Use?
If you see "Port 8081 is being used":
- Kill the old process: `Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force`
- Or use different port: `npx expo start --android --port 8082`

### App Not Launching?
1. Make sure emulator is running: `adb devices`
2. Press `a` in Expo terminal
3. Or manually open Expo Go on emulator and scan QR code

### Network Timeout?
- Make sure Next.js is running: Check `http://localhost:3000` in browser
- The API fix is already applied - just reload the app (press `r` in Expo terminal)

## Quick Reference

```powershell
# Check emulator
adb devices

# Start Expo
cd "E:\King Dice\mobile-app"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
npx expo start --android

# Reload app (when running)
# Press 'r' in Expo terminal
```

---

**You're ready!** Just run those commands in a PowerShell terminal and your app will launch! 🚀
