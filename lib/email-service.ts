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

// Email service for sending verification codes and other emails
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private isDevelopment: boolean;

  constructor() {
    // Get SMTP configuration from environment variables
    // Default to Google Workspace settings for verify@kingdice.com
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'; // Google Workspace uses Gmail SMTP
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER || 'verify@kingdice.com';
    // Remove spaces from app password (Google displays them with spaces but they should be entered without)
    const rawPassword = process.env.SMTP_PASS || '';
    const smtpPass = rawPassword ? rawPassword.replace(/\s+/g, '') : undefined;
    
    // Business email address for sending verification emails
    this.fromEmail = process.env.FROM_EMAIL || 'verify@kingdice.com';
    
    // Check if we're in development (no password configured)
    this.isDevelopment = !smtpPass;

    if (this.isDevelopment) {
      // Development mode: log emails and save to file
      console.log('📧 Email Service: Running in development mode');
      console.log('📧 To enable email sending, set SMTP_PASS environment variable');
      console.log('📧 For Google Workspace, use an App Password (not your regular password)');
      console.log('📧 Emails will be saved to data/emails/ directory');
    } else {
      // Log password info for debugging (without exposing the actual password)
      const passwordLength = smtpPass ? smtpPass.length : 0;
      const hadSpaces = rawPassword !== smtpPass;
      console.log('📧 Email Service: SMTP Password Info:', {
        originalLength: rawPassword.length,
        processedLength: passwordLength,
        hadSpaces: hadSpaces,
        firstChar: smtpPass ? smtpPass[0] : 'N/A',
        lastChar: smtpPass ? smtpPass[passwordLength - 1] : 'N/A'
      });

      // Production mode: configure real SMTP transporter
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false, // Gmail uses STARTTLS on port 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        // Gmail/Google Workspace specific settings
        tls: {
          rejectUnauthorized: true // Gmail has valid certificates
        }
      });
      
      console.log('✅ Email Service: Configured with Google Workspace', {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        from: this.fromEmail,
        passwordLength: passwordLength
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.isDevelopment) {
        // Development mode: save to file
        console.log('📧 Email would be sent:', {
          from: this.fromEmail,
          to: options.to,
          subject: options.subject
        });

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
            <p><strong>From:</strong> ${this.fromEmail}</p>
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
      } else {
        // Production mode: send real email
        if (!this.transporter) {
          console.error('❌ Email transporter not initialized');
          return false;
        }

        const mailOptions = {
          from: `King Dice <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject, // Fallback text version
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', {
          messageId: info.messageId,
          to: options.to,
          subject: options.subject
        });
        return true;
      }
    } catch (error: any) {
      console.error('❌ Error sending email:', error);
      
      // Provide more helpful error messages
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.error('❌ SMTP Authentication Failed!');
        console.error('❌ This usually means:');
        console.error('   1. The app password is incorrect or has spaces');
        console.error('   2. The app password was generated for a different app');
        console.error('   3. 2-Step Verification is not enabled on the Google account');
        console.error('   4. The app password needs to be regenerated');
        console.error('❌ To fix:');
        console.error('   1. Go to https://myaccount.google.com/apppasswords');
        console.error('   2. Generate a new app password for "Mail"');
        console.error('   3. Copy the 16-character password (without spaces)');
        console.error('   4. Update SMTP_PASS in Vercel environment variables');
        console.error('   5. Redeploy the application');
      }
      
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

  async sendRegistrationVerificationCode(email: string, code: string, username: string): Promise<boolean> {
    const subject = 'King Dice - Verify Your Email Address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbae17; margin: 0;">🎲 King Dice</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Email Verification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333; margin-top: 0;">Welcome to King Dice!</h2>
          <p style="color: #666; margin-bottom: 25px;">Hello ${username},</p>
          <p style="color: #666; margin-bottom: 25px;">Thank you for creating an account with King Dice. To complete your registration and verify your email address, please use this verification code:</p>
          
          <div style="background: #fff; border: 2px solid #fbae17; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; color: #fbae17; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #666; margin-top: 25px; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account with King Dice, please ignore this email.</p>
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
