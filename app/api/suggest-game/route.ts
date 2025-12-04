import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { gameName, suggestedBy, userEmail, additionalInfo } = await request.json();

    // Validate required fields
    if (!gameName || !suggestedBy) {
      return NextResponse.json(
        { error: 'Game name and suggested by are required' },
        { status: 400 }
      );
    }

    // Email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #fbae17, #f59e0b); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎲 King Dice</h1>
          <h2 style="color: white; margin: 10px 0 0 0; font-size: 18px;">New Game Suggestion</h2>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #374151; margin-top: 0;">Game Details</h3>
            
            <div style="margin-bottom: 20px;">
              <strong style="color: #6b7280;">Game Name:</strong>
              <p style="margin: 5px 0; font-size: 18px; color: #111827;">${gameName}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <strong style="color: #6b7280;">Suggested By:</strong>
              <p style="margin: 5px 0; color: #111827;">${suggestedBy}</p>
            </div>
            
            ${userEmail ? `
              <div style="margin-bottom: 20px;">
                <strong style="color: #6b7280;">User Email:</strong>
                <p style="margin: 5px 0; color: #111827;">${userEmail}</p>
              </div>
            ` : ''}
            
            ${additionalInfo ? `
              <div style="margin-bottom: 20px;">
                <strong style="color: #6b7280;">Additional Information:</strong>
                <p style="margin: 5px 0; color: #111827; white-space: pre-wrap;">${additionalInfo}</p>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This suggestion was submitted through the King Dice search bar when no results were found for "${gameName}".
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">
                Timestamp: ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>King Dice - Board Game Community Platform</p>
        </div>
      </div>
    `;

    // Send email using the centralized email service (uses same SMTP config as verification emails)
    const emailSent = await emailService.sendEmail({
      to: 'hello@kingdice.gg',
      subject: `🎲 New Game Suggestion: ${gameName}`,
      html: emailHtml,
    });

    if (!emailSent) {
      console.error(`❌ Failed to send game suggestion email for: ${gameName} by ${suggestedBy}`);
      return NextResponse.json(
        { 
          error: 'Failed to send suggestion. Please try again later.' 
        },
        { status: 500 }
      );
    }

    console.log(`✅ Game suggestion email sent for: ${gameName} by ${suggestedBy}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Game suggestion sent successfully!' 
    });

  } catch (error) {
    console.error('❌ Error sending game suggestion email:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send suggestion', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
