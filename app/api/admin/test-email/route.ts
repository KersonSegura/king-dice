import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json(
        { error: 'testEmail is required' },
        { status: 400 }
      );
    }

    // Try to send a test email
    const testSubject = 'King Dice - SMTP Test Email';
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #fbae17;">🎲 King Dice</h1>
        <p>This is a test email to verify SMTP configuration.</p>
        <p>If you received this email, your SMTP settings are working correctly!</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    `;

    const emailSent = await emailService.sendEmail({
      to: testEmail,
      subject: testSubject,
      html: testHtml
    });

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully! Check your inbox (and spam folder).'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to send test email. Check Vercel logs for details.'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error in test-email endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}

