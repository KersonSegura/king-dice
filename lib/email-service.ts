import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email service for sending verification codes
// For development, we'll use a simple file-based approach
// In production, you'd use a real email service like SendGrid, AWS SES, etc.

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Simple email service that logs to console and saves to file for development
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // For development, we'll just log emails
    // In production, configure with real SMTP settings
    this.transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: {
        user: 'test',
        pass: 'test'
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For development, log the email and save to file
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        html: options.html
      });

      // Save email to file for development testing
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const emailDir = path.join(process.cwd(), 'data', 'emails');
      await fs.mkdir(emailDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `email-${timestamp}.html`;
      const filepath = path.join(emailDir, filename);
      
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${options.subject}</title>
        </head>
        <body>
          <h2>Email Details:</h2>
          <p><strong>To:</strong> ${options.to}</p>
          <p><strong>Subject:</strong> ${options.subject}</p>
          <p><strong>Sent:</strong> ${new Date().toISOString()}</p>
          <hr>
          ${options.html}
        </body>
        </html>
      `;
      
      await fs.writeFile(filepath, emailContent);
      console.log(`📁 Email saved to: ${filepath}`);

      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  async sendVerificationCode(email: string, code: string, username: string): Promise<boolean> {
    const subject = 'King Dice - Two-Factor Authentication Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbae17; margin: 0;">🎲 King Dice</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Two-Factor Authentication</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333; margin-top: 0;">Verification Code</h2>
          <p style="color: #666; margin-bottom: 25px;">Hello ${username},</p>
          <p style="color: #666; margin-bottom: 25px;">You're signing in to King Dice. Use this verification code to complete your login:</p>
          
          <div style="background: #fff; border: 2px solid #fbae17; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; color: #fbae17; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #666; margin-top: 25px; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated message from King Dice. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html
    });
  }
}

// Generate a 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create email service instance
export const emailService = new EmailService();
