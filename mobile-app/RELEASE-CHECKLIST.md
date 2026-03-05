# Release checklist – Google Play

## Version updated
- **Version:** 1.0.1 (user-facing)
- **Android versionCode:** 2 (required to increase for each Play Store upload)
- **iOS buildNumber:** 2 (for future App Store builds)

## 1. Build the Android App Bundle

Open a terminal **in the `mobile-app` folder** (no need to `cd` again if you're already there). Then run:

```bash
npx eas-cli build --platform android --profile production
```

- EAS will build an **AAB** (Android App Bundle) in the cloud.
- Your `eas.json` has `"autoIncrement": true` for production, so EAS may bump `versionCode` automatically if configured.
- Wait for the build to finish in the [Expo dashboard](https://expo.dev) (or in the terminal).

## 2. Submit to Google Play

**Option A – Submit the last production build**

```bash
npx eas-cli submit --platform android --profile production
```

- Uses the **latest** production build.
- Your `eas.json` submit profile points to `google-play-service-account.json` and track `internal`.

**Option B – Submit a specific build**

```bash
npx eas-cli submit --platform android --profile production --id <BUILD_ID>
```

- Use the build ID from the Expo dashboard after the build completes.

## 3. Prerequisites

- **EAS CLI:** Either install globally (`npm install -g eas-cli`) and run `eas login`, or use `npx eas-cli login` and then `npx eas-cli build` / `npx eas-cli submit` (no global install needed).
- **Google Play:** App created in Play Console, and a service account key saved as `mobile-app/google-play-service-account.json` (path in `eas.json`).
- **First upload:** You must upload the first AAB manually in Play Console (or with EAS) before EAS can submit to the same app.

## 4. After submit

- In **Google Play Console** → your app → **Release** → **Testing** (or **Production**), you’ll see the new version.
- For **Internal testing**, the track is `internal` as in your submit profile.
- Add **Release notes** (what’s new in 1.0.1) in the Play Console for the release.

## Quick reference

| Step              | Command |
|-------------------|--------|
| Build Android AAB | `npx eas-cli build --platform android --profile production` |
| Submit to Play   | `npx eas-cli submit --platform android --profile production` |
