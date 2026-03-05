# OTA updates (no new AAB needed)

After you ship **one** build that includes EAS Update (the next AAB you create), you can push **JavaScript/UI changes** to users **without** uploading a new build to the Play Store.

## One-time setup

1. **Install dependency** (already added): `expo-updates`
2. **Next AAB**: Build and ship one production build. That build will check for OTA updates on launch.
3. From then on, use the **update** command for JS-only fixes.

## Push an update (after the next AAB is in the store)

From the `mobile-app` folder:

```bash
npx eas-cli update --branch production --message "Short description of the fix"
```

Or use the script:

```bash
npm run update "Short description of the fix"
```

Users who already have the app will get the new JS bundle the **next time they open the app** (or on next cold start).

## What can be updated OTA

- **Yes:** Login/register screens, auth flow logic, API URL, UI, text, styles, new screens, most React/JS code.
- **Yes:** Sign-in with Google **flow** (the in-app browser and redirect handling are JS). Server-side fixes (e.g. on kingdice.gg) need only a Vercel deploy.
- **No:** Native changes (new permissions, `app.json` scheme, new native modules). Those require a new AAB.

## After a new native build (new AAB/IPA)

When you ship a **new** build to the store, the app still checks the **production** channel for OTA updates. If an older OTA was published before, the app can load that and you may see old behavior even with the new build. **Always publish an OTA right after (or before) releasing a new build** so the channel has the latest JS:

```bash
npx eas-cli update --branch production --message "Release 1.1.2"
```

Then users get the correct bundle on next app open.

## Summary

- **First time:** Build a new AAB (includes expo-updates and config), upload to Play Store. Users install this once.
- **Later fixes:** Change JS/React code → run `eas update --branch production --message "..."` → no new AAB. Users get the fix on next app open.
- **After each new native build:** Run the update command above so the production channel serves the latest code; otherwise the app may load an older OTA.
