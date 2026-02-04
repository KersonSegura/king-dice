# 🚫 Skip Expo Login - Quick Fix

## The Problem
Expo is asking for login credentials, but you **don't need to log in** for development!

## Quick Solution

### In Your Expo Terminal:

1. **Press `Ctrl + C`** to stop Expo
2. **Restart without EAS** (Expo Application Services):

```powershell
cd "E:\King Dice\mobile-app"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
npx expo start --android --no-dev-client
```

The `--no-dev-client` flag tells Expo to use Expo Go instead of requiring EAS login.

## Alternative: Just Press Enter

If Expo is still asking for password:
- Just **press Enter** (leave password blank)
- It will skip login and continue
- You can use Expo Go without an account

## About Missing Assets

The warning about `icon.png` is just a warning - the app will still run! We'll create placeholder assets next.

## What You Should See After Restart

```
Starting Metro Bundler
Metro waiting on exp://192.168.x.x:8081

› Press a │ open Android
```

Then press `a` to launch on Android!
