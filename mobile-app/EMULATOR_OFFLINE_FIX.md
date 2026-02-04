# 🔧 Fix: "device offline" / "adb.exe: device offline"

## The Problem
- `adb devices` shows: `emulator-5554   offline` (should be `device`)
- Expo fails with: `[ADB] Couldn't reverse port 8081: adb.exe: device offline`
- Expo can't install/launch Expo Go on the emulator

## Root Cause
ADB lost sync with the emulator. Often happens when:
- Emulator was just started and isn’t fully booted yet
- ADB server is stuck or out of sync
- Emulator was started before ADB, or multiple ADB/emulator restarts

**If the emulator never boots** ("Starting up" → "Emulator failed to connect within 5 minutes"), see **`EMULATOR_WONT_CONNECT.md`** instead.

---

## Fix (Do in Order)

### Step 1: Restart ADB
In PowerShell:
```powershell
adb kill-server
adb start-server
```

### Step 2: Check Emulator Status
```powershell
adb devices
```

- If you see **`device`** (not `offline`) → go to **Step 5**.
- If still **`offline`** or no device → continue to Step 3.

### Step 3: Fully Reboot the Emulator
1. **Close the emulator** (X on the window, or long‑press Power → Power off).
2. **Wait 5–10 seconds** so it fully shuts down.
3. **Start it again**:
   - **Android Studio:** Virtual Device Manager → ▶️ next to your AVD.
   - **Or command line:**
     ```powershell
     $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
     $env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
     emulator -list-avds
     emulator -avd YOUR_AVD_NAME
     ```
4. **Wait 1–2 minutes** until the emulator home screen is fully visible and responsive.

### Step 4: Restart ADB Again, Then Check
```powershell
adb kill-server
adb start-server
adb devices
```

You want:
```
List of devices attached
emulator-5554   device
```

### Step 5: Start Expo (Only After "device")
```powershell
cd "E:\King Dice\mobile-app"
npx expo start --android --max-workers 1
```

---

## One-Liner Restart (After Emulator Is Running)
If the emulator is clearly up and you just need to reset ADB:
```powershell
adb kill-server; adb start-server; adb devices
```

---

## If It Still Shows Offline

1. **Cold boot the AVD**
   - Android Studio → Virtual Device Manager → ⋮ next to your AVD → **Cold Boot Now**.

2. **Vanguard / hypervisor conflicts**
   - See `VANGUARD_FIX.md`. Disable the Vanguard service, then restart emulator + ADB.

3. **Wipe emulator data (last resort)**
   - Virtual Device Manager → ⋮ → **Wipe Data**. Restart emulator, wait for full boot, then `adb kill-server` → `adb start-server` → `adb devices`.

4. **Try another AVD**
   - Create a new Virtual Device (e.g. Pixel 5, API 33) and use that.

---

## Quick Checklist
- [ ] `adb kill-server` then `adb start-server`
- [ ] Emulator fully booted (home screen visible, responsive)
- [ ] `adb devices` shows **`device`**, not `offline`
- [ ] Only then run `npx expo start --android`
