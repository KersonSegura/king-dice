import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

export async function GET(request: NextRequest) {
  try {
    // Check if SMTP is configured
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = process.env.SMTP_PORT || '587';
    const smtpUser = process.env.SMTP_USER || 'verify@kingdice.com';
    const fromEmail = process.env.FROM_EMAIL || 'verify@kingdice.com';

    const isDevelopment = !smtpPass;

    return NextResponse.json({
      status: isDevelopment ? 'development' : 'production',
      configured: !isDevelopment,
      smtp: {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        from: fromEmail,
        passwordSet: !!smtpPass,
      },
      message: isDevelopment
        ? 'Email service is in development mode. Emails are saved to data/emails/ directory (local) or logged (Vercel). Configure SMTP_PASS in Vercel to enable real email sending.'
        : 'Email service is configured for production. Emails should be sent via SMTP.',
    });
  } catch (error: any) {
    console.error('❌ Error checking email status:', error);
    return NextResponse.json(
      { error: 'Failed to check email status', message: error.message },
      { status: 500 }
    );
  }
}

