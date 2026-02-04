# Fix "emulator offline" - run this from mobile-app folder
# Usage: .\fix-offline-emulator.ps1

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

Write-Host "`n--- Resetting ADB ---" -ForegroundColor Cyan
adb kill-server 2>$null
Start-Sleep -Seconds 2
adb start-server
Start-Sleep -Seconds 2

# Disconnect stale offline emulator so it can reconnect cleanly
adb disconnect emulator-5554 2>$null
Start-Sleep -Seconds 1
adb kill-server 2>$null
Start-Sleep -Seconds 1
adb start-server
Start-Sleep -Seconds 2

Write-Host "`n--- Device status ---" -ForegroundColor Cyan
$out = adb devices
Write-Host $out

if ($out -match "emulator-5554\s+device") {
    Write-Host "`nOK: Emulator is online. You can run:" -ForegroundColor Green
    Write-Host "  npx expo start --android --max-workers 1`n" -ForegroundColor White
    exit 0
}

Write-Host "`nEmulator is still offline or not listed." -ForegroundColor Yellow
Write-Host "Do this next:`n" -ForegroundColor Yellow
Write-Host "  1. CLOSE the emulator window (or Power off inside the emulator)."
Write-Host "  2. Wait 10 seconds."
Write-Host "  3. Start it again from Android Studio (Virtual Device Manager -> Play)."
Write-Host "  4. Wait 1-2 minutes until the home screen is fully loaded."
Write-Host "  5. Run this script again: .\fix-offline-emulator.ps1`n"
exit 1
