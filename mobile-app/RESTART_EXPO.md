# 🔄 How to Restart Expo

## Quick Steps

### Step 1: Stop Current Expo Server
In your **Expo terminal window** (where `npx expo start --android` is running):
1. Press `Ctrl + C` to stop the server
2. Wait for it to fully stop (you'll see the prompt return)

### Step 2: Restart Expo
In the **same terminal window**, run:
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
npx expo start --android
```

### Step 3: Wait for Reload
- Expo will rebuild with the new API config
- The app will automatically reload on your emulator
- You should see the app connect successfully!

## Alternative: Just Reload (Faster)

If Expo is still running, you can just reload:
1. In the Expo terminal, press `r` (lowercase)
2. Or press `Ctrl + M` in the emulator
3. Select "Reload" from the menu

This is faster but sometimes a full restart is needed for config changes.

## What to Expect

After restarting, you should see:
- ✅ Metro bundler starting
- ✅ App reloading on emulator
- ✅ No more "Network response timed out" error
- ✅ App successfully connecting to API

## If It Still Doesn't Work

1. **Check Next.js is running**: Make sure `npm run dev` is still running in the other terminal
2. **Check emulator is running**: `adb devices` should show `emulator-5554`
3. **Check the API URL**: The app should now use `http://10.0.2.2:3000` for Android
