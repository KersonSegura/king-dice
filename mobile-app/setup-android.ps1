# Android Setup Script for King Dice Mobile App
# Run this script to configure Android development environment

Write-Host "🔧 Setting up Android development environment..." -ForegroundColor Cyan

$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$adbPath = "$sdkPath\platform-tools\adb.exe"

# Check if Android SDK exists
if (-not (Test-Path $sdkPath)) {
    Write-Host "❌ Android SDK not found at: $sdkPath" -ForegroundColor Red
    Write-Host "Please install Android Studio first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Android SDK found at: $sdkPath" -ForegroundColor Green

# Set ANDROID_HOME for current session
$env:ANDROID_HOME = $sdkPath
Write-Host "✅ ANDROID_HOME set to: $env:ANDROID_HOME" -ForegroundColor Green

# Add to PATH for current session
$platformToolsPath = "$sdkPath\platform-tools"
$emulatorPath = "$sdkPath\emulator"
$toolsPath = "$sdkPath\tools"
$toolsBinPath = "$sdkPath\tools\bin"

if ($env:PATH -notlike "*$platformToolsPath*") {
    $env:PATH = "$platformToolsPath;$emulatorPath;$toolsPath;$toolsBinPath;$env:PATH"
    Write-Host "✅ Added Android tools to PATH for this session" -ForegroundColor Green
}

# Check ADB
if (Test-Path $adbPath) {
    Write-Host "✅ ADB found" -ForegroundColor Green
    Write-Host "`n📱 Checking for connected devices/emulators..." -ForegroundColor Cyan
    & $adbPath devices
} else {
    Write-Host "⚠️  ADB not found. Platform tools may need to be installed." -ForegroundColor Yellow
    Write-Host "   Install via Android Studio: Tools → SDK Manager → SDK Tools → Android SDK Platform-Tools" -ForegroundColor Yellow
}

Write-Host "`n✅ Setup complete for this PowerShell session!" -ForegroundColor Green
Write-Host "`n📝 To make this permanent:" -ForegroundColor Cyan
Write-Host "   1. Open System Properties → Environment Variables" -ForegroundColor White
Write-Host "   2. Add User Variable: ANDROID_HOME = $sdkPath" -ForegroundColor White
Write-Host "   3. Add to PATH: $platformToolsPath;$emulatorPath" -ForegroundColor White
Write-Host "`n🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start Android Emulator from Android Studio" -ForegroundColor White
Write-Host "   2. Run: cd mobile-app && npm start" -ForegroundColor White
Write-Host "   3. Press 'a' in Expo terminal to launch on Android" -ForegroundColor White
