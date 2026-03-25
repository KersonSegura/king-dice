# Email deliverability (King Dice)

The app sends **transactional** mail (verification codes, reports, block notifications). Code applies these practices:

- **Plain text + HTML** (`multipart/alternative`) where both are provided  
- **Stable `From`**: `King Dice <FROM_EMAIL>` — set `FROM_EMAIL` to an address on your domain  
- **`Reply-To`**: `REPLY_TO_EMAIL` (default `support@kingdice.gg`)  
- **Transactional headers**: `Auto-Submitted`, `X-Auto-Response-Suppress`, `X-Transaction-Type: transactional`, plus per-message ids when set (`X-Entity-Ref-ID`, etc.)

## What you must configure outside the app (biggest impact on inbox vs spam)

1. **SPF** — Authorize your mail server (Google Workspace, SendGrid, SES, etc.) to send for your domain.  
2. **DKIM** — Sign outgoing mail with your provider’s keys.  
3. **DMARC** — Publish a policy (start with `p=none` for monitoring, then tighten).  
4. **Align `FROM_EMAIL`** — The domain in `From` should match the domain that passes SPF/DKIM (or use a subdomain with correct DNS).  
5. **Warm reputation** — New domains/IPs need time; avoid sudden volume spikes.

## Environment variables (Vercel)

| Variable | Role |
|----------|------|
| `FROM_EMAIL` | Envelope-friendly sender on your domain |
| `REPLY_TO_EMAIL` | Where users reply (support) |
| `SMTP_*` / Gmail OAuth | Actual sending path |

Using a dedicated transactional provider (Resend, Postmark, SES, SendGrid) with verified domain + their DNS records often improves deliverability versus generic SMTP alone.
