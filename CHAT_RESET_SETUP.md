# Digital Corner Chat Daily Reset Setup

This system automatically resets the Digital Corner chat messages every day at midnight to save database space.

## How It Works

1. **Server-side Reset**: API endpoint at `/api/digital-corner/chat/reset` deletes all messages from the Digital Corner chat
2. **Cron Job Trigger**: API endpoint at `/api/cron/daily-chat-reset` can be called by external cron services
3. **Client-side Refresh**: Users' chat interfaces automatically refresh when midnight is detected

## Setup Options

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-chat-reset",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Option 2: External Cron Service

Use any external cron service (like cron-job.org, EasyCron, etc.) to call:

**URL**: `https://your-domain.com/api/cron/daily-chat-reset`
**Method**: GET or POST
**Schedule**: Daily at 00:00 (midnight)
**Headers**: 
- `Authorization: Bearer YOUR_CRON_SECRET`

### Option 3: GitHub Actions (Free option)

Create `.github/workflows/daily-chat-reset.yml`:

```yaml
name: Daily Chat Reset
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual triggering

jobs:
  reset-chat:
    runs-on: ubuntu-latest
    steps:
      - name: Reset Digital Corner Chat
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/daily-chat-reset
```

## Environment Variables

Add these to your environment variables:

```env
CRON_SECRET=your-secure-random-string-here
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Security

- The reset endpoints require authentication tokens
- Only authorized requests can trigger the reset
- All reset actions are logged with timestamps

## Manual Reset

For testing or manual reset, you can call:

```bash
curl -X POST \
  -H "Authorization: Bearer your-cron-secret" \
  https://your-domain.com/api/cron/daily-chat-reset
```

## Monitoring

- Check server logs for reset confirmations
- The chat header shows "Resets at midnight" indicator
- Reset status can be checked at `/api/digital-corner/chat/reset` (GET)

## Benefits

- **Space Saving**: Prevents database bloat from accumulating chat messages
- **Fresh Start**: Users get a clean chat experience each day
- **Performance**: Keeps chat queries fast by limiting message history
- **Privacy**: Old messages are automatically removed
