# 🔐 Login not working – Mobile app

The mobile app **uses the same auth as the website**: it calls the **Next.js API** (`/api/auth/login`, `/api/auth/verify`), which uses **Supabase** (and JWT) for users and passwords.

## Checklist

### 1. **Next.js server is running**
- The app talks to `http://10.0.2.2:3000` (Android emulator) or `http://localhost:3000` (iOS).
- If Next.js isn’t running, login requests fail (network error / "Login failed").
- **Fix:** Start the backend first:
  ```powershell
  cd "E:\King Dice"
  npm run dev
  ```
  Wait for `Ready` and `http://localhost:3000`, then start Expo.

### 2. **Same credentials as the website**
- Login is **username** + **password** (or email + password), same as the site.
- **Check:** Log in on **https://kingdice.gg** (or your local app) with the same username/password. If it fails there too, the issue is with the account or backend, not the app.

### 3. **Supabase and env**
- The API uses Supabase for users and `JWT_SECRET` for tokens.
- **Fix:** Ensure `.env` (or your env setup) has `JWT_SECRET`, Supabase `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, etc. Same as when the website works.

### 4. **"Invalid username/email or password"**
- Wrong password, or user doesn’t exist.
- **Fix:** Try resetting the password on the website, or register a new user and use that in the app.

### 5. **Verify / staying logged in**
- The app stores the token and calls `/api/auth/verify` on startup. The API now accepts the token from the **cookie** (web) or **`Authorization: Bearer`** header (mobile).
- If you successfully log in but get kicked back to the login screen after restart, ensure you’ve pulled the latest backend changes (verify route fix) and restarted Next.js.

### 6. **"Unexpected end of JSON input" / "Request body is empty"** (Next.js terminal)
- The login API was receiving an empty or invalid JSON body. This is now handled:
  - **API:** Login route parses the body safely and returns 400 with a clear message if empty/invalid.
  - **App:** Login uses a dedicated `fetch` with an explicit `Request` and JSON body (no generic api-client for this call).
- Restart Next.js and the app, then try again. If you still see "Request body is empty" in the terminal, the app may not be reaching the correct API URL (check `API_BASE_URL` / emulator vs device).

---

**TL;DR:** Start Next.js first, use the same credentials as the website, and ensure Supabase + env are configured. If login works on the site but not in the app, check that the app can reach the API (emulator vs `10.0.2.2`, etc.).
