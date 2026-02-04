# 🚀 Quick Start: Run App on Android Emulator

## Current Status
✅ Android Emulator is running (`emulator-5554`)  
⚠️ Servers need to be started manually due to Windows permission restrictions

## Step-by-Step Instructions

### 1. Open Two PowerShell Windows

You'll need **two separate PowerShell windows** - one for each server.

### 2. Start Next.js Server (Main App - API)

**In PowerShell Window #1:**
```powershell
cd "E:\King Dice"
npm run dev
```

Wait until you see:
```
✓ Ready in X seconds
○ Local:        http://localhost:3000
```

**Keep this window open!**

### 3. Start Expo Server (Mobile App)

**In PowerShell Window #2:**
```powershell
# Set Android environment variables
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

# Navigate to mobile app
cd "E:\King Dice\mobile-app"

# Start Expo with Android
npx expo start --android
```

**What will happen:**
1. Expo will start Metro Bundler
2. It will automatically detect your running emulator
3. It will install Expo Go on the emulator (first time only)
4. Your app will launch automatically!

### Alternative: Manual Launch

If automatic launch doesn't work:
1. Wait for Expo to show the QR code and menu
2. Press `a` in the terminal to launch on Android
3. Or run: `npm run android` in a new terminal

## Expected Output

**Next.js Server:**
```
✓ Ready in 2.5s
○ Local:        http://localhost:3000
```

**Expo Server:**
```
Starting Metro Bundler
Metro waiting on exp://192.168.x.x:8081
Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
```

## Troubleshooting

### "EPERM" Errors
This is usually antivirus blocking. Solutions:
1. **Temporarily disable real-time scanning** for `E:\King Dice` folder
2. **Add exclusion** in Windows Defender:
   - Settings → Virus & threat protection → Manage settings
   - Exclusions → Add or remove exclusions
   - Add folder: `E:\King Dice`
3. **Run PowerShell as Administrator** (right-click → Run as Administrator)

### "Cannot connect to localhost:3000"
- Make sure Next.js server is running on port 3000
- The mobile app is configured to use `10.0.2.2:3000` for Android emulator (this maps to localhost)

### **"App isn't responding" / "Close or wait"** (ANR)
- **Always start Next.js first** (Step 2), then Expo. If the API isn't running, auth verification can hang and the app may freeze or ANR.
- Ensure you're on the **Login** screen (or have logged in). The app shows "Not authenticated" in the terminal when not logged in — that's normal.
- If it still happens: restart the emulator, run `adb kill-server` then `adb start-server`, and try again.

### "No devices found"
- Verify emulator is running: `adb devices`
- Should show: `emulator-5554   device`
- If not, restart ADB: `adb kill-server && adb start-server`

### Expo Go Not Installing
- Make sure emulator has internet connection
- Check Play Store is accessible on emulator
- Manually install Expo Go from Play Store if needed

## What You Should See

Once everything is running:
1. ✅ Next.js server on `http://localhost:3000`
2. ✅ Expo Metro Bundler running
3. ✅ App automatically opens on Android emulator
4. ✅ You can interact with the app!

## Next Steps After Launch

- Test login/registration
- Browse games
- Test API connections
- Check if data loads correctly

---

**Need help?** Check the terminal outputs for specific error messages!
