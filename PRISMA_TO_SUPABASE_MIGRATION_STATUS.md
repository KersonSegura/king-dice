# Prisma to Supabase Migration Status

## ✅ Already Converted (17 routes)
- `/api/auth/login` - ✅ Converted
- `/api/auth/register` - ✅ Converted  
- `/api/auth/me` - ✅ Converted
- `/api/games` (list) - ✅ Converted
- `/api/game/[id]` - ✅ Converted
- `/api/games/hotness` - ✅ Converted
- `/api/games/most-played` - ✅ Converted
- `/api/rules` (GET/POST) - ✅ Converted
- `/api/rules/[id]` - Need to check
- `/api/gallery` - ✅ URL fixes done
- `/api/messages/unread` - ✅ Converted
- `/api/boardle/image-proxy` - ✅ Fixed (was fs import issue)
- `/api/boardle/card-image` - ✅ Fixed (was fs import issue)

## 🔴 Critical Routes Still Using Prisma (Priority Order)

### Authentication Routes (High Priority)
1. `/api/auth/reset-password` - ❌ Uses Prisma
2. `/api/auth/verify-2fa-code` - ❌ Uses Prisma
3. `/api/auth/send-verification-code` - ❌ Uses Prisma
4. `/api/auth/toggle-2fa` - ❌ Uses Prisma
5. `/api/auth/register-admin` - ✅ Uses lib/users (needs check)
6. `/api/auth/logout` - Need to check
7. `/api/auth/verify` - Need to check

### Messaging & Chat Routes (High Priority - Breaking)
8. `/api/messages` - ❌ GET & POST use Prisma
9. `/api/chats` - ❌ GET & POST use Prisma

### User Routes (Medium Priority)
10. `/api/users/profile` - ❌ Uses Prisma
11. `/api/users/profile-data` - ❌ Uses Prisma
12. `/api/users/profile-colors` - ❌ Uses Prisma
13. `/api/users/update-profile` - ❌ Uses Prisma
14. `/api/users/update-profile-colors` - ❌ Uses Prisma
15. `/api/users/stats` - ❌ Uses Prisma
16. `/api/users/games` - ❌ Uses Prisma
17. `/api/users/collection` - ❌ Uses Prisma
18. `/api/users/make-admin` - ❌ Uses Prisma
19. `/api/users/search` - ❌ Uses Prisma
20. `/api/users/online` - ❌ Uses Prisma
21. `/api/users/privacy` - ❌ Uses Prisma
22. `/api/users/social-stats` - ❌ Uses Prisma
23. `/api/users/level-progress` - Need to check
24. `/api/users/settings` - Need to check

### Social/Follow Routes (Medium Priority)
25. `/api/follow` - ❌ Uses Prisma
26. `/api/follow-requests` - ❌ Uses Prisma
27. `/api/friends` - ❌ Uses Prisma

### Game Routes (Medium Priority)
28. `/api/games/ranked` - ❌ Uses Prisma
29. `/api/games/popular` - ❌ Uses Prisma
30. `/api/games/mas-votados` - ❌ Uses Prisma
31. `/api/games/[id]/vote` - Need to check
32. `/api/games/[id]/pdf` - Need to check
33. `/api/games/[id]/fetch-pdf` - Need to check
34. `/api/boardgames` - ❌ Uses Prisma
35. `/api/boardgames/[id]` - ❌ Uses Prisma
36. `/api/search` - ❌ Uses Prisma

### Content Routes (Lower Priority)
37. `/api/posts` - Need to check
38. `/api/posts/[id]` - Need to check
39. `/api/posts/vote` - ❌ Uses Prisma
40. `/api/feed/vote` - ❌ Uses Prisma
41. `/api/feed` - Need to check
42. `/api/notifications` - Need to check
43. `/api/reports` - Need to check
44. `/api/reputation` - Need to check

### Admin Routes (Lower Priority)
45. `/api/admin/boardle-hints` - ❌ Uses Prisma
46. `/api/admin/boardle-hints/[id]` - ❌ Uses Prisma
47. `/api/admin/import-scraped-rule/[gameId]` - ❌ Uses Prisma

### Boardle Routes (Lower Priority)
48. `/api/boardle/hints` - ❌ Uses Prisma
49. `/api/boardle/stats` - Need to check
50. `/api/boardle/games` - Need to check (might use Prisma)

### Other Routes (Lower Priority)
51. `/api/catan-nominations` - ❌ Uses Prisma
52. `/api/catan-nominations/[id]/vote` - ❌ Uses Prisma
53. `/api/pixel-canvas/chat` - ❌ Uses Prisma
54. `/api/dice-assets/save` - ❌ Uses Prisma
55. `/api/gallery/[id]` - Need to check
56. `/api/gallery/comments` - Need to check
57. `/api/gallery/vote` - Need to check
58. `/api/gallery/upload` - Need to check
59. `/api/tags` - Need to check

### Test/Development Routes (Ignore for now)
- `/api/test-profile` - ❌ Uses Prisma
- `/api/test-descriptions` - ❌ Uses Prisma
- `/api/test-db` - Need to check

## Migration Strategy

### Phase 1: Critical Routes (Breaking Issues)
1. Authentication routes (reset-password, verify-2fa, send-verification, toggle-2fa)
2. Messages route (GET & POST)
3. Chats route (GET & POST)

### Phase 2: User-Facing Routes
4. User profile routes
5. Social/follow routes
6. Game voting/search routes

### Phase 3: Content Routes
7. Posts, feed, gallery comments
8. Admin routes
9. Other routes

## Notes
- All routes need to use `supabaseAdmin` from `@/lib/supabase`
- Table names in Supabase are lowercase with underscores (e.g., `chat_participants`, `messages`, `users`)
- Remove `prisma.$disconnect()` calls
- Update field names from camelCase to snake_case where needed

