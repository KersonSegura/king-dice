# Registration Flow Changes - Email Verification Required

## Summary
Users must verify their email before being created in the database. Registration data is stored temporarily until verification is complete.

## Changes Made

### 1. Database Migration
- Created `pending_registrations` table to store temporary registration data
- Migration file: `supabase/migrations/create_pending_registrations_table.sql`

### 2. Registration Flow (`lib/auth.ts`)
- **Before**: User created immediately in database, then verification code sent
- **After**: Registration data stored in `pending_registrations`, user created only after verification

### 3. Email Verification (`app/api/auth/verify-email/route.ts`)
- **Before**: Just sets `isVerified: true` on existing user
- **After**: Creates user from pending registration data, then marks as verified

### 4. UI Components
- TwoFactorModal: Uses email + code (no userId needed for new registrations)
- LoginModal: Passes email instead of userId for new registrations

## Flow Diagram

```
Registration Request
  ↓
Validate input & check existing users/pending registrations
  ↓
Store in pending_registrations table
  ↓
Generate & send verification code
  ↓
Return email + code ID to client
  ↓
[User enters code]
  ↓
Verify code → Find pending registration
  ↓
Create user in database
  ↓
Delete pending registration
  ↓
Return user + token
```

