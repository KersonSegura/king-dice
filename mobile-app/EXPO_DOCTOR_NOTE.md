# Expo Doctor: "Duplicate dependencies" (1 check)

When you run `npx expo-doctor`, you may see:

```
✖ Check that no duplicate dependencies are installed
Found duplicates for react:
  ├─ react@19.1.0 (at: node_modules\react)
  └─ react@18.2.0 (at: ..\node_modules\react)
```

**This is expected and safe.** This repo has two apps:

- **Root** (`e:\King Dice`) – Next.js web app, uses React 18 in `node_modules`
- **Mobile** (`mobile-app`) – Expo app, uses React 19 in `mobile-app\node_modules`

Expo Doctor sees both folders and reports a "duplicate." At runtime, Metro is configured (in `metro.config.js`) to use **only** `mobile-app/node_modules`, so the app uses React 19 and the web app is unaffected.

You can ignore this one failing check. 16/17 checks passed is fine for development and Expo Go.
