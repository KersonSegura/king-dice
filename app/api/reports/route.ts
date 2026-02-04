import { NextRequest, NextResponse } from 'next/server';
import { Report } from '@/lib/moderation';
import { getUserFromToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication first
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get authenticated user
    const authResult = await getUserFromToken(token);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user;
    const reportData = await request.json();
    
    // Handle both old Report interface and new extended interface
    const report: any = {
      ...reportData,
      contentType: reportData.contentType || reportData.targetType || 'other',
      contentId: reportData.contentId || reportData.targetId || '',
      reporterId: authenticatedUser.id, // SECURITY: Use authenticated user's ID, not from request
      reason: reportData.reason || 'other',
      description: reportData.description || '',
    };
    
    // Generate a unique ID for the report (CUID format)
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const reportId = `c${timestamp}${random}`.substring(0, 25);
    
    // Save to database using Supabase
    const { supabaseAdmin } = await import('@/lib/supabase');
    
    const now = new Date().toISOString();
    const { error: insertError } = await supabaseAdmin
      .from('reports')
      .insert({
        id: reportId,
        reason: report.reason,
        description: report.description || null,
        reporterId: report.reporterId,
        targetType: report.contentType,
        targetId: report.contentId,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      });

    if (insertError) {
      console.error('Error saving report to database:', insertError);
      // Continue to send email even if DB save fails
    }

    // Create the full report object for email
    const fullReport = {
      ...report,
      id: reportId,
      createdAt: new Date(),
      status: 'pending'
    };

    // Send email notification
    await sendReportEmail(fullReport);

    return NextResponse.json({ 
      success: true, 
      message: 'Report submitted successfully',
      reportId 
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit report' },
      { status: 500 }
    );
  }
}

async function sendReportEmail(report: Report) {
  const emailContent = `
New Content Report Submitted

Report ID: ${report.id}
Content Type: ${report.contentType}
Content ID: ${report.contentId}
Reporter ID: ${report.reporterId}
Reason: ${report.reason}
Status: ${report.status}
Created At: ${report.createdAt.toISOString()}

Description:
${report.description}

Please review this report and take appropriate action.

Best regards,
King Dice Community System
  `;

  // In a real application, you would use a proper email service like:
  // - SendGrid
  // - AWS SES
  // - Nodemailer with SMTP
  // - Resend
  // - Mailgun
  
  // For now, we'll simulate sending an email
  console.log('📧 EMAIL SENT TO: kingdice.community@gmail.com');
  console.log('📧 SUBJECT: New Content Report - ' + report.id);
  console.log('📧 CONTENT:', emailContent);
  
  // In production, replace this with actual email sending:
  /*
  const emailService = new EmailService();
  await emailService.sendEmail({
    to: 'kingdice.community@gmail.com',
    subject: `New Content Report - ${report.id}`,
    text: emailContent,
    html: emailContent.replace(/\n/g, '<br>')
  });
  */
} 