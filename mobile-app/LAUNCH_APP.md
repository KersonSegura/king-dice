# 🚀 How to Launch Your App on Android Emulator

## Quick Steps

### 1. Make Sure Both Servers Are Running

**Terminal 1 - Next.js (API Server):**
```powershell
cd "E:\King Dice"
npm run dev
```
Should show: `✓ Ready in X seconds` and `http://localhost:3000`

**Terminal 2 - Expo (Mobile App):**
```powershell
cd "E:\King Dice\mobile-app"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
npx expo start --android
```

### 2. What Happens Automatically

When you run `npx expo start --android`:
1. ✅ Expo starts Metro Bundler
2. ✅ Detects your running emulator
3. ✅ Installs Expo Go (first time only - takes 1-2 minutes)
4. ✅ Automatically launches your app!

### 3. If It Doesn't Auto-Launch

**Option A: Press 'a' in Expo Terminal**
- In the Expo terminal, press `a` (lowercase)
- This will launch on Android

**Option B: Manual Launch**
- Open Expo Go app on the emulator (if installed)
- Scan the QR code shown in terminal
- Or tap the project name in Expo Go

### 4. What You Should See

**In Expo Terminal:**
```
Starting Metro Bundler
Metro waiting on exp://192.168.x.x:8081

› Press a │ open Android
› Press i │ open iOS simulator
```

**On Emulator:**
- Expo Go opens (first time)
- Your app loads
- App interface appears

## Troubleshooting

### "No devices found"
- Make sure emulator is running: `adb devices`
- Should show: `emulator-5554   device`
- If not, restart emulator from Android Studio

### "Expo Go not installing"
- Wait 1-2 minutes (first install takes time)
- Check emulator has internet (open Chrome, test)
- Manually install from Play Store if needed

### "App shows network timeout"
- Make sure Next.js server is running on port 3000
- Check API config uses `10.0.2.2:3000` for Android
- Reload app: Press `r` in Expo terminal

### "App is blank/white screen"
- Check Expo terminal for errors
- Press `r` to reload
- Check Next.js server logs for API errors

## Quick Commands Reference

```powershell
# Start Next.js
cd "E:\King Dice"
npm run dev

# Start Expo
cd "E:\King Dice\mobile-app"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
npx expo start --android

# Reload app (when Expo is running)
# Press 'r' in Expo terminal

# Check emulator connection
adb devices
```

## Next Steps After App Launches

1. ✅ Test login/registration
2. ✅ Browse games
3. ✅ Test API connections
4. ✅ Check if data loads correctly

---

**You're almost there!** Once Expo starts, your app should automatically launch on the emulator! 🎉
