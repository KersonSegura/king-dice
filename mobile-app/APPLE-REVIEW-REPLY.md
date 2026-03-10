# Apple App Review – Reply and Fixes

Use this when replying in **App Store Connect** → your app → **Resolution Center** (reply to the latest message).

---

## 1. Camera purpose string (Guideline 5.1.1(ii))

**Done in the app:** The camera (and photo library) permission strings have been updated to clearly explain use and include a specific example. You need to **create a new build** and **resubmit** for this change to be in the binary Apple reviews.

- **Camera:**  
  *"King Dice uses the camera so you can take a photo of your board game setup to share in a post. For example, you can take a picture of your game night and add it to the community feed or gallery."*

- **Photos:**  
  *"King Dice uses your photo library so you can choose existing photos to share in posts—for example, a picture of your board game collection or game night to add to the community feed or gallery."*

**What to write in your reply:**  
*"We have updated the camera and photo library purpose strings to clearly describe how the app uses these capabilities and to include a specific example (taking or choosing a photo of a board game setup to share in the community feed or gallery). The updated strings are included in our latest build, which we are submitting for review."*

---

## 2. How do users logout? (Guideline 2.1)

**What to write in your reply:**

*"Users can log out as follows:*
1. *Tap the profile/avatar icon in the bottom navigation bar (bottom-right).*
2. *The account menu opens; at the bottom there is a 'Sign Out' option.*
3. *Tap 'Sign Out' to log out of the account. The user is then returned to the login screen."*

*"Sign Out is also available from the Profile tab (Logout button) and from the in-app menu."*

---

## 3. Demo account (Guideline 2.1(a))

**Where to add it:**  
**App Store Connect** → **My Apps** → **King Dice** → **App Store** tab → select the version (e.g. 1.1.3) → scroll to **App Review Information**.

- **Sign-in required:** Yes (or as appropriate).
- **Demo account:**  
  - **Username:** [your demo account email or username]  
  - **Password:** [your demo account password]

**Requirements from Apple:**
- The account must be able to access **all** app features (feed, gallery, chat, collection, profile, settings, create post, etc.).
- The account should have **pre-populated content** where relevant (e.g. some posts, collection items, or gallery content) so reviewers can see and test features without empty screens.

**What to write in your reply:**  
*"We have added a demo account in the App Review Information section for this version. The account has access to all app features and includes pre-populated content (e.g. posts, collection) so reviewers can verify functionality. The credentials are visible in the App Review Information section."*

---

## 4. Guideline 1.2 – User-Generated Content (blocking + reports)

**What we implemented:**

- **Block abusive users:** Users can block others from the forums (post author), gallery (image author), and chat. When a user is blocked: (1) the developer is notified by email (support@kingdice.gg or SUPPORT_EMAIL); (2) that user’s content is removed from the blocker’s feed immediately (posts, gallery, and feed API already filter by blocked users; the UI removes the content right after blocking).
- **Report content:** Reporting is available on posts, comments, and gallery images. Reports are stored and the developer is notified by email. Contact info is published (support@kingdice.gg, community guidelines).
- **24-hour commitment:** The developer commits to acting on objectionable content reports within 24 hours (remove content and take action against offending accounts as appropriate).

**What to write in your reply (Guideline 1.2):**

*"We have implemented the required precautions for user-generated content:*
- *Users can block abusive users from forums (block icon on each post), gallery (block in the image modal), and chat. When a user blocks someone, we notify the developer by email and the blocked user’s content is removed from the blocker’s feed immediately.*
- *Users can report offensive content (posts, comments, gallery images) via the report button; reports are stored and the developer is notified by email. We commit to acting on objectionable content reports within 24 hours by removing the content and taking action against offending accounts.*
- *Contact information (support@kingdice.gg) is available in the app and in our Community Guidelines."*

---

## Summary checklist

- [ ] Build a new iOS build (camera/photos strings are in code; new build required).
- [ ] In App Store Connect → App Review Information: add **demo account** username and password.
- [ ] In Resolution Center: **reply** with the three points above (camera strings updated + new build, how to logout, demo account added).
- [ ] Submit the **new build** for review (same version 1.1.3, higher build number) so Apple reviews the build with the updated permission strings.
