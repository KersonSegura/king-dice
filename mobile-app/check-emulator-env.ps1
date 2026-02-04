# Quick checks for "Emulator failed to connect within 5 minutes"
# Run from mobile-app: .\check-emulator-env.ps1

Write-Host "`n--- Emulator environment check ---`n" -ForegroundColor Cyan

# 1. Vanguard (Riot anti-cheat) - very often blocks emulator
$vgc = Get-Service -Name "vgc" -ErrorAction SilentlyContinue
if ($vgc) {
    Write-Host "Vanguard (vgc): FOUND" -ForegroundColor Yellow
    Write-Host "  Status: $($vgc.Status)" -ForegroundColor $(if ($vgc.Status -eq 'Running') { 'Red' } else { 'Green' })
    if ($vgc.Status -eq 'Running') {
        Write-Host "  -> This often causes 'failed to connect within 5 minutes'." -ForegroundColor Red
        Write-Host "  -> Stop it: services.msc -> vgc -> Stop, Startup = Manual. Then RESTART PC." -ForegroundColor White
        Write-Host "  -> See VANGUARD_FIX.md for full steps.`n" -ForegroundColor White
    }
} else {
    Write-Host "Vanguard (vgc): not found (OK)`n" -ForegroundColor Green
}

# 2. Android SDK / emulator
$ah = $env:ANDROID_HOME
if (-not $ah) { $ah = "$env:LOCALAPPDATA\Android\Sdk" }
$emu = "$ah\emulator\emulator.exe"
if (Test-Path $emu) {
    Write-Host "Android emulator: $emu" -ForegroundColor Green
} else {
    Write-Host "Android emulator: NOT FOUND at $emu" -ForegroundColor Red
}

# 3. AVDs
$env:ANDROID_HOME = $ah
$env:PATH = "$ah\platform-tools;$ah\emulator;$env:PATH"
Write-Host "`nAVDs:"
& "$ah\emulator\emulator.exe" -list-avds 2>$null | ForEach-Object { Write-Host "  - $_" }

Write-Host "`n--- Next steps ---" -ForegroundColor Cyan
Write-Host "If emulator fails to connect: see EMULATOR_WONT_CONNECT.md" -ForegroundColor White
Write-Host "If emulator shows 'offline' in adb: see EMULATOR_OFFLINE_FIX.md`n" -ForegroundColor White
