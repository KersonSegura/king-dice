# 🔧 Fix: "Emulator failed to connect within 5 minutes"

## The Problem
- You start the emulator from Android Studio (e.g. **Medium Phone API 36.1**).
- It stays on **"Starting up"** for ~5 minutes, then shows: **"Emulator failed to connect within 5 minutes"**.
- The emulator never reaches a booted state, so you can't use it with Expo or ADB.

## What’s Going On
The emulator process starts but doesn’t finish booting or become connectable. Common causes: **hypervisor/virtualization conflicts**, **anti‑cheat (e.g. Vanguard)**, **corrupted AVD**, or **resource/GPU issues**.

---

## Fixes (Try in Order)

### 1. **Vanguard / Riot Anti-Cheat (Very Common)**

Vanguard runs at the kernel level and often **blocks or breaks** Android emulator virtualization. If you have Valorant/League etc. installed, do this first:

1. **Open Services:** `Win + R` → `services.msc` → Enter  
2. Find **"vgc"** or **"Vanguard"**  
3. **Right‑click → Properties**  
4. **Stop** the service  
5. Set **Startup type** to **Manual**  
6. **Restart your PC**  
7. Try starting the emulator again (don’t start Vanguard).

**Check if Vanguard is running:**
```powershell
Get-Service | Where-Object { $_.Name -like "*vgc*" }
```
If you see a service and it’s **Running**, that’s a strong suspect.

**Full details:** see **`VANGUARD_FIX.md`**.

---

### 2. **Cold Boot the AVD**

Sometimes a normal start is stuck; a cold boot can help:

1. In Android Studio, open **Device Manager** (Virtual Device Manager).
2. Click the **⋮** (three dots) next to **Medium Phone API 36.1**.
3. Choose **Cold Boot Now**.
4. Wait several minutes. If it still doesn’t connect, continue below.

---

### 3. **Wipe Emulator Data**

Corrupted AVD data can cause endless “Starting up”:

1. **Device Manager** → **⋮** next to your AVD → **Wipe Data**.
2. Confirm.
3. Start the emulator again (normal Play button).  
   First boot after wipe can take 2–3 minutes.

---

### 4. **Check Hypervisor / Virtualization**

The emulator uses **Windows Hypervisor Platform (WHPX)** or **Hyper‑V** for acceleration. If these are missing or conflicting, the emulator may hang on “Starting up”.

**Enable Windows features:**
1. `Win + R` → **`optionalfeatures`** → Enter.  
2. **Scroll the full list** — the feature can be easy to miss.  
3. Look for **"Windows Hypervisor Platform"** (English) or **"Plataforma de hipervisor de Windows"** (Spanish). Ensure it is **checked**.  
4. If you use **Hyper‑V**, leave it enabled; both can be on.  
5. **Restart** the PC after changes.

**"Windows Hypervisor Platform" is not in the list:**  
- It is **not available on Windows 10 Home**. Only **Pro, Enterprise, and Education** include it.  
- Check your edition: `Win + R` → **`winver`** → Enter.  
- If you're on **Home**: you can't enable WHPX. Skip this step and try **Cold Boot**, **Wipe Data**, or a **new AVD** (steps 2, 3, 7). The **physical device** option (step 8) always works and doesn't need any hypervisor.

**Verify virtualization in BIOS:**
- **Intel:** VT‑x enabled.  
- **AMD:** AMD‑V enabled.  
- Reboot into BIOS/UEFI and check CPU configuration.

---

### 5. **Run Emulator from Command Line (See Real Errors)**

CLI output often shows why it’s failing (e.g. WHPX, GPU):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

# List AVDs
emulator -list-avds

# Start with verbose logging (replace with your AVD name)
emulator -avd "Medium_Phone_API_36.1" -no-snapshot-load -verbose
```

Watch the terminal for errors (e.g. **WHPX not configured**, GPU, or permission issues). Search the exact message online or in Android docs.

---

### 6. **Other Checks**

| Issue | What to do |
|-------|------------|
| **Low disk space** | Free at least **5 GB** on the drive where the AVD lives. |
| **Antivirus** | Temporarily exclude `%LOCALAPPDATA%\Android` and `emulator.exe`, or disable real‑time scan to test. |
| **GPU drivers** | Update to latest from NVIDIA/AMD/Intel. |
| **RAM** | Close heavy apps; give the emulator **≥ 2 GB** in AVD settings (Edit → Show Advanced → Memory). |
| **Port 5554/5555** | Ensure nothing else (e.g. another emulator, Docker) is using them. |

---

### 7. **Create a New AVD**

If only this AVD misbehaves:

1. **Device Manager** → **Create Device**.
2. Pick a **Phone** (e.g. Pixel 5) → **Next**.
3. Choose a **system image** (e.g. API 33 or 34, **x86_64**); download if needed → **Next** → **Finish**.
4. Start the **new** AVD. If it connects, the old one was likely corrupted.

---

### 8. **Use a Physical Android Device (Bypass Emulator)**

You can run the Expo app on a **real phone** and skip the emulator:

1. Enable **Developer options** and **USB debugging** on the phone.
2. Connect via USB.
3. Run `adb devices` and confirm the device.
4. `cd mobile-app` → `npx expo start` → press **`a`** (or scan QR with Expo Go).

---

## Quick Checklist

- [ ] **Vanguard** stopped + Startup **Manual**; PC restarted.  
- [ ] **Cold Boot Now** tried.  
- [ ] **Wipe Data** tried.  
- [ ] **Windows Hypervisor Platform** enabled; PC restarted.  
- [ ] **Virtualization** (VT‑x / AMD‑V) enabled in BIOS.  
- [ ] Emulator run from **CLI** with `-verbose`; errors checked.  
- [ ] **New AVD** or **physical device** as fallback.

---

## See Also

- **`VANGUARD_FIX.md`** — Disable Vanguard for emulator.  
- **`EMULATOR_OFFLINE_FIX.md`** — When emulator shows **"device offline"** in `adb devices` (emulator boots but ADB can’t use it).  
- **`ANDROID_SETUP.md`** — General Android + Expo setup.
