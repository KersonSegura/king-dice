# 🛡️ Vanguard Anti-Cheat Compatibility Issue

## The Problem
Vanguard (Riot Games' anti-cheat) runs at the **kernel level** and can interfere with Android emulator virtualization. Simply closing the game may not be enough because the driver stays loaded.

## Quick Check: Is It Actually Causing Issues?

**If your emulator is running fine**, you can:
1. ✅ Click "OK" on the warning dialog
2. ✅ Check "Never show this again" if you want
3. ✅ Continue using the emulator

**If you're experiencing problems** (emulator crashes, slow performance, won't start), then you need to fully disable Vanguard.

## Option 1: Temporarily Disable Vanguard Service (Recommended)

1. **Open Services** (Press `Win + R`, type `services.msc`, press Enter)
2. **Find "vgc"** or "Vanguard" service
3. **Right-click** → **Properties**
4. **Stop** the service
5. **Set Startup type** to **Manual** (so it doesn't auto-start)
6. Click **OK**

**To re-enable later** (when you want to play the game):
- Set Startup type back to **Automatic**
- Start the service

## Option 2: Uninstall Vanguard (Most Thorough)

1. **Settings** → **Apps** → **Installed apps**
2. Search for "Riot Vanguard" or "Vanguard"
3. Click **Uninstall**
4. Restart your computer

**Note**: You'll need to reinstall it to play Riot games (Valorant, League of Legends, etc.)

## Option 3: Use a Different Emulator (Workaround)

If you can't disable Vanguard:
- Use **Bluestacks** or **Nox Player** (they may work better with Vanguard)
- Or use a **physical Android device** connected via USB

## Check If It's Actually Causing Problems

Run this to see if Vanguard processes are still active:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*vgc*" -or $_.ProcessName -like "*vanguard*"}
Get-Service | Where-Object {$_.Name -like "*vgc*"}
```

If these return nothing, Vanguard is fully stopped.

## My Recommendation

**For now**: 
- If the emulator is working, just click "OK" and continue
- The warning is just informational - it may not actually cause issues

**If you have problems**:
- Disable the Vanguard service (Option 1) - easiest and reversible
- Or uninstall it temporarily (Option 2) - most thorough

## After Disabling Vanguard

1. Restart your Android emulator
2. Restart Expo if needed
3. Your app should work normally

---

**Bottom line**: Closing the game might be enough if the emulator works fine. If you see crashes or performance issues, fully disable the Vanguard service.
