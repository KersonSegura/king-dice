# Chat page – what was found and what was changed

## 1. "Sign in to use chat" message

### Where it exists in the repo
- **Translation only**: `messages/en.json` and `messages/es.json` have the key `chat.signInToChat` → "Sign in to use chat". No React component uses `t('signInToChat')` to render this text.
- **ChatBot.tsx**: Previously showed a long sign-in paragraph when `!currentUser?.id` (initial message and on send/401). The **API** (`app/api/chatbot/route.ts`) returns `message: 'Please sign in to use the chatbot.'` on 401; if that ever reached the UI (e.g. via `error.message` in catch), it could show as "sign in to use chat".

### What was changed (latest)
- **ChatBot.tsx**: (1) When not signed in, both app and web now see the same **welcome** message only (no sign-in paragraph). (2) When user sends without being signed in, bot reply is a short line: "Sign in to send messages. I'm here when you're ready!" (3) On 401, always show a short generic message: "Something went wrong. Please try again or check your connection." (never the long sign-in text or API message). (4) In the catch block, if `error.message` contains "sign in" or "authentication required", we show the generic message instead.
- **app/api/chatbot/route.ts**: 401 responses now use `message: 'Authentication required'` instead of "Please sign in to use the chatbot."
- **mobile-app/app/(tabs)/chat.tsx**: Chat tab now explicitly passes **embed** to WebViewScreen so the app always loads `/chat` with `embed=1` and `x-kd-embed: 1`, ensuring ChatPage and layout get embed mode.

---

## 2. Third header (avatar + name + "Online")

### Where it was in the repo
- **Chat.tsx**: A redundant subheader block had been **added** in a previous edit: a div with avatar, chat name, and "Online" (or "X members") with class `chat-conversation-subheader`. It was first hidden with CSS in `app/globals.css`, then that block was **removed** from `Chat.tsx` and the CSS rule was removed. So in the current source, that third header is **not** rendered by Chat.
- **ChatPage.tsx** and **FloatingChat.tsx**: Only one header bar each (back + avatar + name + menu). No second/third bar there.

### What was changed
- The redundant subheader block was **deleted** from `components/Chat.tsx` (the div and the `getOtherParticipant` helper used only by it).
- The `.chat-conversation-subheader` rule was **removed** from `app/globals.css`.

If you still see the third header after a refresh, the app may be loading a cached bundle (try a full rebuild and/or clear the WebView cache).
