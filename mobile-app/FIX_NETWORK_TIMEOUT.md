# 🔧 Fixed: Network Timeout Error

## What Was Wrong
The API config was checking `window.location` which doesn't exist in React Native, so it defaulted to `localhost:3000` instead of `10.0.2.2:3000` for Android emulator.

## What I Fixed
✅ Updated `mobile-app/config/api.ts` to use React Native's `Platform.OS` to detect Android
✅ Now correctly uses `http://10.0.2.2:3000` for Android emulator
✅ Next.js server is confirmed running on port 3000

## What You Need to Do

### Option 1: Reload in Expo (Easiest)
1. In the Expo terminal, press `r` to reload the app
2. Or shake the emulator device (press `Ctrl+M` or `Cmd+M`)
3. Select "Reload" from the menu

### Option 2: Restart Expo
1. In the Expo terminal, press `Ctrl+C` to stop
2. Run `npx expo start --android` again
3. The app will reload automatically

## Verify It's Working

After reloading, the app should:
- ✅ Connect to the API successfully
- ✅ Load data from your Next.js backend
- ✅ No more "Network response timed out" error

## Test the Connection

You can test if the emulator can reach your server:
```powershell
# From your computer, test if emulator can access the server
adb shell "curl http://10.0.2.2:3000/api/games/hotness?limit=1"
```

If this works, the app should work too after reloading!
