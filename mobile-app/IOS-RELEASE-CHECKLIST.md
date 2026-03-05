# iOS App Store – where to start

Same idea as Android: build with EAS, then submit. You need an **Apple Developer account** and an app in **App Store Connect** first.

---

## 1. Apple Developer account

- Go to [developer.apple.com](https://developer.apple.com) and **enroll** (paid program, $99/year).
- Finish identity verification and payment.
- You’ll use this account for App Store Connect and for EAS (credentials).

---

## 2. Create the app in App Store Connect

- Open [App Store Connect](https://appstoreconnect.apple.com) and sign in with your Apple Developer account.
- Go to **My Apps** → **+** → **New App**.
- Fill in:
  - **Platform:** iOS
  - **Name:** King Dice
  - **Primary language:** e.g. English (U.S.)
  - **Bundle ID:** choose the one that matches your app: **com.kingdice.app** (must already exist under your Apple Developer account).
  - **SKU:** e.g. `king-dice-ios`
- Create the app. You’ll get an **App Store Connect App ID** (a number, e.g. `1234567890`). You’ll use this later for EAS submit.

If the bundle ID `com.kingdice.app` doesn’t exist yet:

- Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → **Identifiers** → **+** → **App IDs** → register **com.kingdice.app** (e.g. “Explicit” with the capabilities you need, or “Wildcard” if you prefer). Then create the app in App Store Connect with that bundle ID.

---

## 3. (Optional) Configure EAS Submit for iOS

When you have the **App Store Connect App ID** (from step 2):

- Open **mobile-app/eas.json**.
- In `submit.production`, set the `ios` object, for example:
  ```json
  "ios": {
    "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
  }
  ```
- Replace `YOUR_APP_STORE_CONNECT_APP_ID` with the numeric ID (e.g. `1234567890`).

You can do this after your first build; EAS can also prompt you for it when you run submit.

---

## 4. Build for iOS

In a terminal, from the **mobile-app** folder:

```bash
npx eas-cli build --platform ios --profile production
```

- EAS will build an **.ipa** in the cloud (works from Windows/Mac/Linux).
- First time: EAS will ask you to log in with your **Apple ID** (the one tied to your Apple Developer account) so it can create/manage certificates and provisioning profiles. Accept and let it manage credentials.
- Wait for the build to finish in the [Expo dashboard](https://expo.dev) or in the terminal.

---

## 5. Submit to Apple (TestFlight first)

**Option A – Submit with EAS (recommended)**

After the build succeeds:

```bash
npx eas-cli submit --platform ios --profile production
```

- EAS will use the **latest** production iOS build.
- You’ll be prompted for Apple ID / app-specific password or use an **App Store Connect API key** if you set one up. EAS docs: [Submit to the Apple App Store](https://docs.expo.dev/submit/ios/).
- The build is uploaded to **TestFlight** (Apple’s beta). It does **not** go straight to the public App Store.

**Option B – Upload manually**

- Download the .ipa from the Expo dashboard.
- Use the **Transporter** app (Mac) or [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight** → upload the build.

---

## 6. In App Store Connect – finish the release

- In App Store Connect, open your app → **TestFlight** to see the build and run internal/beta testing.
- When you’re ready for the **App Store**:
  - Go to the **App Store** tab (not TestFlight).
  - Fill in **metadata**: description, keywords, screenshots (iPhone/iPad), privacy policy URL, etc.
  - Complete any **App Privacy**, **Content Rights**, and **Age Rating** questionnaires.
  - Select the build you uploaded (from TestFlight).
  - Submit for **App Review**.

Apple reviews the app; once approved, you can release it to the store.

---

## Quick reference

| Step | What to do |
|------|------------|
| 1 | Enroll at [developer.apple.com](https://developer.apple.com) ($99/year). |
| 2 | Create app in [App Store Connect](https://appstoreconnect.apple.com) with bundle ID **com.kingdice.app**. Note the **App Store Connect App ID**. |
| 3 | (Optional) Add `ascAppId` to **eas.json** under `submit.production.ios`. |
| 4 | Build: `npx eas-cli build --platform ios --profile production` |
| 5 | Submit: `npx eas-cli submit --platform ios --profile production` (uploads to TestFlight). |
| 6 | In App Store Connect: add metadata/screenshots, select build, submit for App Review. |

---

## Version in app.json

Your **app.json** already has:

- **version:** "1.0.1"
- **ios.buildNumber:** "2"

For each new App Store upload you must increase **buildNumber** (e.g. to "3", "4"). You can bump **version** when you want to show a new version to users (e.g. 1.0.2).

---

## If the bundle ID is not registered

1. [developer.apple.com](https://developer.apple.com) → **Account** → **Certificates, Identifiers & Profiles**.
2. **Identifiers** → **+** → **App IDs** → **App** → Next.
3. Description: e.g. `King Dice`, Bundle ID: **Explicit** → `com.kingdice.app`.
4. Enable any capabilities you need (e.g. Sign in with Apple if you use it), register.
5. Then create the app in App Store Connect with this bundle ID.

Once the Apple Developer account and App Store Connect app exist, the next concrete step is: run the iOS build (step 4). If you tell me whether you already have the Apple Developer account and the app in App Store Connect, I can give you the exact next command and what to click.
