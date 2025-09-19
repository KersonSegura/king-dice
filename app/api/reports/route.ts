import { NextRequest, NextResponse } from 'next/server';
import { Report } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    const report: Omit<Report, 'id' | 'createdAt' | 'status'> = await request.json();
    
    // Generate a unique ID for the report
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the full report object
    const fullReport: Report = {
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