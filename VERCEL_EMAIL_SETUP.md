# Vercel Production Email Setup

For production (Vercel), you need to add the email configuration as environment variables.

## Quick Setup

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project** (King Dice)
3. **Go to Settings** → **Environment Variables**
4. **Add these 5 variables**:

   | Variable Name | Value |
   |--------------|-------|
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `verify@kingdice.com` |
   | `SMTP_PASS` | `syeugjkjzcsuaqls` |
   | `FROM_EMAIL` | `verify@kingdice.com` |

5. **Select Environment**: Make sure to add to **Production**, **Preview**, and **Development** (or at least Production)
6. **Save** - Vercel will automatically redeploy

## After Adding Variables

- Vercel will automatically trigger a new deployment
- Wait for the deployment to complete
- Test by registering a new account
- Check `verify@kingdice.com` inbox for verification code

## Security Note

The App Password (`syeugjkjzcsuaqls`) is already configured locally. Make sure to add it to Vercel environment variables for production to work.

