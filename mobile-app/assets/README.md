# Mobile App Assets

This folder should contain the following assets for the Expo app:

## Required Assets

1. **icon.png** (1024x1024px)
   - App icon for iOS and Android
   - Should be square with no transparency
   - Used as the main app icon

2. **splash.png** (2048x2048px recommended)
   - Splash screen image
   - Shown when app is launching
   - Should match your app's branding

3. **adaptive-icon.png** (1024x1024px)
   - Android adaptive icon foreground
   - Should be centered with safe area (about 66% of canvas)
   - Background color defined in app.json

4. **favicon.png** (48x48px or larger)
   - Web favicon
   - Used when running on web

## Quick Setup

You can use the DiceLogo.svg from the root directory as a base:
1. Convert DiceLogo.svg to PNG at required sizes
2. Use an online tool like https://www.favicon-generator.org/ or https://realfavicongenerator.net/
3. Or use ImageMagick/Photoshop to create the assets

## Temporary Solution

For development, you can create simple colored squares as placeholders:
- Use any image editor to create 1024x1024px colored squares
- Name them according to the requirements above
- Replace with proper assets before production builds
