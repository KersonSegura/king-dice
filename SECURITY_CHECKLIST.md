# 🔒 Security Checklist - King Dice

## ✅ FIXED Issues

1. **CRITICAL: `/api/auth/me` endpoint** - Was returning mock data without authentication
   - ✅ FIXED: Now properly checks JWT token before returning user data

## ⚠️ MUST CHECK Before Publishing

### 1. Environment Variables (CRITICAL)
Check your `.env` file on Vercel/production:

- [ ] `JWT_SECRET` - Must be a long, random string (NOT the default value)
- [ ] `NEXTAUTH_SECRET` - Must be set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Keep this secret!
- [ ] `OPENAI_API_KEY` - Keep this secret!
- [ ] All database credentials are secure

**How to check:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Make sure `JWT_SECRET` is NOT "your-super-secret-jwt-key-change-in-production"
3. Generate a new secret: Run `openssl rand -base64 32` or use a password generator

### 2. API Route Security
- [x] `/api/auth/me` - Now requires authentication
- [ ] Check other routes that should require auth:
  - `/api/users/update-profile` - Should require auth
  - `/api/gallery/upload` - Should require auth
  - `/api/messages` - Should require auth
  - `/api/admin/*` - Should require admin auth

### 3. Database Security (Supabase)
- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] RLS policies are properly configured
- [ ] Service role key is NOT exposed to client-side code

### 4. Password Security
- [x] Passwords are hashed with bcrypt (12 rounds) ✅
- [x] Password requirements enforced (min 8 chars, uppercase, lowercase, number) ✅
- [ ] Check if old users without password hashes exist (they need to reset)

### 5. CORS & Headers
- [ ] CORS is properly configured
- [ ] Security headers are set (Content-Security-Policy, X-Frame-Options, etc.)

### 6. Rate Limiting
- [x] Chatbot has rate limiting ✅
- [ ] Consider adding rate limiting to:
  - Login attempts
  - Registration
  - API endpoints

### 7. Input Validation
- [ ] All user inputs are validated and sanitized
- [ ] SQL injection protection (using parameterized queries)
- [ ] XSS protection (React automatically escapes, but check user-generated content)

### 8. File Upload Security
- [ ] File type validation
- [ ] File size limits
- [ ] Virus scanning (if possible)

## 🔍 How to Test Security

1. **Test Authentication:**
   - Try accessing `/api/auth/me` without being logged in → Should return 401
   - Try accessing protected routes without token → Should fail

2. **Test Authorization:**
   - Try accessing admin routes as regular user → Should fail
   - Try accessing other users' data → Should fail

3. **Test Input Validation:**
   - Try SQL injection in search fields
   - Try XSS in text inputs
   - Try uploading malicious files

## 📝 Next Steps

1. Review all environment variables
2. Test authentication on all protected routes
3. Review Supabase RLS policies
4. Set up monitoring/alerts for suspicious activity
