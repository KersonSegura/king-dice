# App Icon & Splash Setup

The app uses **AppIcon.svg** for:
- **App icon** (Play Store, App Store)
- **Splash screen** (first loading screen)

Expo requires a **PNG** (1024×1024) for native app icons. Export `public/AppIcon.svg` to PNG and save as:

```
mobile-app/assets/AppIcon.png
```

**Options to export:**

1. **Figma / Illustrator / Inkscape**: Export as PNG at 1024×1024
2. **Command line** (run from project root):
   ```
   npx svgexport "public/AppIcon.svg" "mobile-app/assets/AppIcon.png" 1024:1024
   ```
3. **Online**: Use svgtopng.com or similar to convert, then save as `mobile-app/assets/AppIcon.png`

Until you add `AppIcon.png`, Expo may use a default icon. The splash and app icon will appear after the PNG is in place and you rebuild.
