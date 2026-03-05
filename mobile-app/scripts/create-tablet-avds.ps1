# Create 7" and 10" tablet AVDs for Play Store screenshots.
# From mobile-app folder:  .\scripts\create-tablet-avds.ps1
# From repo root:            .\mobile-app\scripts\create-tablet-avds.ps1
# Requires: Android Studio / Android SDK with at least one system image installed.

$ErrorActionPreference = "Stop"

# SDK tools need Java; use Android Studio's bundled JRE if JAVA_HOME not set
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $jbrCandidates = @(
        "E:\Android Studio\jbr",
        "C:\Program Files\Android\Android Studio\jbr",
        "C:\Program Files (x86)\Android\Android Studio\jbr",
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr",
        "$env:ProgramFiles\Android\Android Studio\jbr"
    )
    foreach ($jbr in $jbrCandidates) {
        if (Test-Path "$jbr\bin\java.exe") {
            $env:JAVA_HOME = $jbr
            $env:PATH = "$jbr\bin;$env:PATH"
            Write-Host "Using Java: $jbr" -ForegroundColor Gray
            break
        }
    }
    if (-not $env:JAVA_HOME) {
        # Try to find Android Studio by looking for studio64.exe in Program Files
        $studioExe = Get-ChildItem -Path "C:\Program Files","C:\Program Files (x86)","$env:LOCALAPPDATA" -Filter "studio64.exe" -Recurse -ErrorAction SilentlyContinue -Depth 5 | Select-Object -First 1
        if ($studioExe) {
            $jbr = Join-Path (Split-Path (Split-Path $studioExe.FullName -Parent) -Parent) "jbr"
            if (Test-Path "$jbr\bin\java.exe") {
                $env:JAVA_HOME = $jbr
                $env:PATH = "$jbr\bin;$env:PATH"
                Write-Host "Using Java: $jbr" -ForegroundColor Gray
            }
        }
    }
    if (-not $env:JAVA_HOME) {
        Write-Host "JAVA_HOME not set and Android Studio JBR not found. Set JAVA_HOME to a JDK (e.g. Android Studio\jbr) or install Android Studio." -ForegroundColor Red
        exit 1
    }
}

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = "$env:LOCALAPPDATA\Android\Sdk" }
if (-not (Test-Path $sdk)) {
    Write-Host "Android SDK not found. Set ANDROID_HOME or install Android Studio." -ForegroundColor Red
    exit 1
}

# Prefer cmdline-tools (new) then tools (legacy)
$avdmanager = $null
$cmds = @(
    "$sdk\cmdline-tools\latest\bin\avdmanager.bat",
    "$sdk\cmdline-tools\*\bin\avdmanager.bat",
    "$sdk\tools\bin\avdmanager.bat"
)
foreach ($p in $cmds) {
    $resolved = $null
    if ($p -match '\*') {
        $resolved = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
    } else {
        if (Test-Path $p) { $resolved = Get-Item $p }
    }
    if ($resolved) { $avdmanager = $resolved.FullName; break }
}
if (-not $avdmanager) {
    Write-Host "avdmanager not found under $sdk" -ForegroundColor Red
    Write-Host "Open Android Studio -> SDK Manager -> SDK Tools -> install 'Android SDK Command-line Tools'." -ForegroundColor Yellow
    exit 1
}

# Find sdkmanager (same folder as avdmanager)
$sdkmanager = $avdmanager -replace 'avdmanager\.bat$', 'sdkmanager.bat'
if (-not (Test-Path $sdkmanager)) {
    Write-Host "sdkmanager not found next to avdmanager." -ForegroundColor Red
    exit 1
}
# List installed packages and find a system image (google_apis or google_apis_playstore, x86_64)
$installed = & "$sdkmanager" --list_installed 2>&1 | Out-String
$sysImg = $null
foreach ($api in 34, 33, 35, 32, 31) {
    if ($installed -match "system-images;android-$api;google_apis;x86_64") {
        $sysImg = "system-images;android-$api;google_apis;x86_64"
        break
    }
    if ($installed -match "system-images;android-$api;google_apis_playstore;x86_64") {
        $sysImg = "system-images;android-$api;google_apis_playstore;x86_64"
        break
    }
}
if (-not $sysImg) {
    Write-Host "No system image found. In Android Studio: SDK Platforms -> check 'Show Package Details' -> install 'Google APIs Intel x86_64 Atom System Image' for API 34 (or 33)." -ForegroundColor Yellow
    exit 1
}
Write-Host "Using system image: $sysImg" -ForegroundColor Gray

# Get numeric device IDs from avdmanager (avoids cmd quoting issues with names like "7in WSVGA (Tablet)")
# Format: "id: N or \"...\"" on one line, sometimes " Name: ..." on next line
$deviceList = & "$avdmanager" list device 2>&1 | Out-String
$id7 = $null
$id10 = $null
$lines = $deviceList -split "`r?`n"
$currentId = $null
foreach ($i in 0..($lines.Count - 1)) {
    $line = $lines[$i]
    if ($line -match 'id:\s*(\d+)') { $currentId = $Matches[1] }
    # Match device name on same line (id: 15 or "7in WSVGA (Tablet)") or next line ( Name: ...)
    $nameLine = $line
    if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -match '^\s+Name:\s') { $nameLine = $nameLine + " " + $lines[$i + 1] }
    if (-not $currentId) { continue }
    if (-not $id7 -and $nameLine -match '7in' -and $nameLine -match 'WSVGA') { $id7 = $currentId }
    if (-not $id10 -and $nameLine -match 'Pixel\s+Tablet') { $id10 = $currentId }
    if (-not $id10 -and $nameLine -match '10\.1in' -and $nameLine -match 'WXGA') { $id10 = $currentId }
}
# Fallback: try compact list (one line per device: id,name)
if (-not $id7 -or -not $id10) {
    $compact = & "$avdmanager" list device -c 2>&1 | Out-String
    foreach ($cline in ($compact -split "`r?`n")) {
        if ($cline -match '^(\d+)\s*[,\t]\s*(.+)$') {
            $num = $Matches[1]; $label = $Matches[2]
            if (-not $id7 -and $label -match '7in' -and $label -match 'WSVGA') { $id7 = $num }
            if (-not $id10 -and $label -match 'Pixel\s*Tablet') { $id10 = $num }
            if (-not $id10 -and $label -match '10\.1in' -and $label -match 'WXGA') { $id10 = $num }
        }
    }
}
if (-not $id7 -and -not $id10) {
    Write-Host "Could not parse device list. First 25 lines:" -ForegroundColor Gray
    ($deviceList -split "`r?`n" | Select-Object -First 25) -join "`n" | Write-Host -ForegroundColor DarkGray
}
$devices = @(
    @{ Name = "KingDice_7in_Tablet";  DeviceNum = $id7;  DisplayName = "7in WSVGA (Tablet)" },
    @{ Name = "KingDice_10in_Tablet"; DeviceNum = $id10; DisplayName = "Pixel Tablet / 10.1in" }
)

foreach ($d in $devices) {
    $existing = & "$avdmanager" list avd 2>&1 | Out-String
    if ($existing -match $d.Name) {
        Write-Host "AVD '$($d.Name)' already exists. Skip or delete it in Device Manager to recreate." -ForegroundColor Yellow
        continue
    }
    $devId = $d.DeviceNum
    if (-not $devId) {
        Write-Host "Device not found for $($d.Name) ($($d.DisplayName)). Create it manually in Device Manager." -ForegroundColor Yellow
        continue
    }
    Write-Host "Creating AVD: $($d.Name) (device id: $devId) ..." -ForegroundColor Cyan
    # Use numeric device id so cmd doesn't split on spaces; escape semicolons in -k for cmd
    $sysImgEscaped = $sysImg -replace ';', '^;'
    $fullCmd = "`"$avdmanager`" create avd -n $($d.Name) -k $sysImgEscaped -d $devId -f"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $fullCmd -PassThru -NoNewWindow -Wait
    if ($proc.ExitCode -ne 0) {
        Write-Host "Failed to create $($d.Name). Try creating manually: Device Manager -> Create Device -> pick $($d.DeviceId)." -ForegroundColor Red
    } else {
        Write-Host "Created: $($d.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Done. In Android Studio: Device Manager -> run 'KingDice_7in_Tablet' or 'KingDice_10in_Tablet', then start your app and take screenshots." -ForegroundColor Green
