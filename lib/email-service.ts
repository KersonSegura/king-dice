import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { google } from 'googleapis';
import { oauth2Service } from './oauth-service';

// Email service for sending verification codes
// For development, we'll use a simple file-based approach
// In production, you'd use a real email service like SendGrid, AWS SES, etc.

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

// Email service for sending verification codes and other emails
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private replyToEmail: string;
  private isDevelopment: boolean;
  private useOAuth2: boolean;

  constructor() {
    // Get SMTP configuration from environment variables
    // Supports: Gmail (OAuth 2.0 or App Passwords), SendGrid, Mailgun, AWS SES, and other SMTP servers
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    // Production: set SMTP_USER, FROM_EMAIL (e.g. verify@kingdice.gg), and SMTP_PASS or OAuth in Vercel env
    const smtpUser = process.env.SMTP_USER || 'verify@kingdice.gg';
    
    // Remove spaces from password (Google displays app passwords with spaces)
    const rawPassword = process.env.SMTP_PASS || '';
    const smtpPass = rawPassword ? rawPassword.replace(/\s+/g, '') : undefined;
    const hasSmtpPass = !!smtpPass;
    
    // Prefer SMTP password when present; OAuth is fallback when no SMTP_PASS exists.
    // This avoids registration emails silently failing when OAuth refresh tokens expire.
    this.useOAuth2 = oauth2Service.isConfigured() && !hasSmtpPass;
    
    // Business email address for sending verification emails
    this.fromEmail = process.env.FROM_EMAIL || 'verify@kingdice.gg';
    this.replyToEmail = process.env.REPLY_TO_EMAIL || 'support@kingdice.gg';
    
    // Check if we're in development (no password or OAuth configured)
    this.isDevelopment = !this.useOAuth2 && !smtpPass;

    if (this.isDevelopment) {
      // Development mode: log emails and save to file
      console.log('📧 Email Service: Running in development mode');
      console.log('📧 To enable email sending:');
      console.log('   - For OAuth 2.0: Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN');
      console.log('   - For App Passwords: Set SMTP_PASS environment variable');
      console.log('   - For SendGrid: Set SMTP_HOST=smtp.sendgrid.net and SMTP_PASS=your-api-key');
      console.log('📧 Emails will be saved to data/emails/ directory');
    } else {
      // Log configuration info
      const passwordLength = smtpPass ? smtpPass.length : 0;
      const hadSpaces = rawPassword !== smtpPass;
      const isSendGrid = smtpHost.includes('sendgrid');
      const isGmail = smtpHost.includes('gmail.com');
      
      console.log('📧 Email Service: SMTP Configuration:', {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        from: this.fromEmail,
        provider: isSendGrid ? 'SendGrid' : isGmail ? (this.useOAuth2 ? 'Gmail (OAuth 2.0)' : 'Gmail (App Password)') : 'Custom SMTP',
        authentication: this.useOAuth2 ? 'OAuth 2.0' : 'Password',
        passwordLength: this.useOAuth2 ? 'N/A' : passwordLength,
        hadSpaces: this.useOAuth2 ? 'N/A' : hadSpaces
      });

      // Production mode: configure real SMTP transporter
      const transporterConfig: any = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // Use secure connection for port 465 (SSL)
      };

      // Configure authentication
      if (this.useOAuth2 && isGmail) {
        // OAuth 2.0 for Gmail - configure with client credentials
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
        
        if (!clientId || !clientSecret || !refreshToken) {
          console.error('❌ OAuth 2.0 credentials incomplete. Falling back to password auth.');
          transporterConfig.auth = {
            user: smtpUser,
            pass: smtpPass,
          };
        } else {
          // Configure OAuth 2.0 for nodemailer
          // nodemailer will automatically get accessToken from refreshToken using googleapis
          transporterConfig.auth = {
            type: 'OAuth2',
            user: smtpUser,
            clientId: clientId,
            clientSecret: clientSecret,
            refreshToken: refreshToken,
            accessUrl: 'https://oauth2.googleapis.com/token',
          };
        }
        transporterConfig.secure = false; // Gmail uses STARTTLS on port 587
        transporterConfig.tls = {
          rejectUnauthorized: true
        };
      } else {
        // Traditional password-based authentication
        transporterConfig.auth = {
          user: smtpUser,
          pass: smtpPass,
        };
      }

      // Gmail/Google Workspace specific settings
      if (isGmail && !this.useOAuth2) {
        transporterConfig.secure = false; // Gmail uses STARTTLS on port 587
        transporterConfig.tls = {
          rejectUnauthorized: true // Gmail has valid certificates
        };
      }

      // SendGrid uses STARTTLS
      if (isSendGrid) {
        transporterConfig.secure = false;
        transporterConfig.tls = {
          rejectUnauthorized: true
        };
      }

      this.transporter = nodemailer.createTransport(transporterConfig);
      
      console.log('✅ Email Service: Configured successfully', {
        provider: isSendGrid ? 'SendGrid' : isGmail ? (this.useOAuth2 ? 'Gmail (OAuth 2.0)' : 'Gmail (App Password)') : 'Custom SMTP',
        host: smtpHost,
        port: smtpPort,
        from: this.fromEmail
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
        // Use Gmail API directly for OAuth 2.0 (more reliable than SMTP)
        if (this.useOAuth2) {
          const oauthSent = await this.sendEmailViaGmailAPI(options);
          if (oauthSent) {
            return true;
          }
          console.warn('⚠️ Gmail API send failed. Trying SMTP transporter fallback.');
        }

        // Use SMTP for non-OAuth methods (app passwords, SendGrid, etc.)
        if (!this.transporter) {
          console.error('❌ Email transporter not initialized');
          return false;
        }

        const mailOptions: any = {
          from: `King Dice <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject, // Fallback text version
          replyTo: options.replyTo || this.replyToEmail,
          headers: {
            'Auto-Submitted': 'auto-generated',
            'X-Auto-Response-Suppress': 'All',
            ...options.headers,
          },
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', {
          messageId: info.messageId,
          to: options.to,
          subject: options.subject,
          method: 'SMTP Password'
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

  /**
   * Send email using Gmail API directly (for OAuth 2.0)
   */
  private async sendEmailViaGmailAPI(options: EmailOptions): Promise<boolean> {
    try {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://kingdice.gg/api/auth/google/callback';

      if (!clientId || !clientSecret || !refreshToken) {
        console.error('❌ OAuth 2.0 credentials incomplete');
        return false;
      }

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      // Get Gmail API client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Encode subject line properly for non-ASCII characters (emojis, etc.)
      // Use RFC 2047 encoding for email headers
      const encodeSubject = (subject: string): string => {
        // Check if subject contains non-ASCII characters
        const hasNonAscii = /[^\x00-\x7F]/.test(subject);
        if (!hasNonAscii) {
          return subject;
        }
        // Encode using RFC 2047 format: =?charset?encoding?encoded-text?=
        // For UTF-8: =?UTF-8?B?base64-encoded-text?=
        const encoded = Buffer.from(subject, 'utf-8').toString('base64');
        // Split into chunks of 75 characters (RFC 2047 limit)
        const chunks: string[] = [];
        for (let i = 0; i < encoded.length; i += 75) {
          chunks.push(encoded.substring(i, i + 75));
        }
        return chunks.map(chunk => `=?UTF-8?B?${chunk}?=`).join('\n ');
      };

      // Create email message in RFC 2822 format
      const emailMessage = [
        `From: King Dice <${this.fromEmail}>`,
        `To: ${options.to}`,
        `Subject: ${encodeSubject(options.subject)}`,
        `Reply-To: ${options.replyTo || this.replyToEmail}`,
        'Auto-Submitted: auto-generated',
        'X-Auto-Response-Suppress: All',
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="kd_boundary"',
        '',
        '--kd_boundary',
        'Content-Type: text/plain; charset=utf-8',
        '',
        options.text || options.subject,
        '',
        '--kd_boundary',
        'Content-Type: text/html; charset=utf-8',
        '',
        options.html,
        '',
        '--kd_boundary--',
      ].join('\n');

      // Encode message in base64url format
      const encodedMessage = Buffer.from(emailMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email via Gmail API
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log('✅ Email sent successfully via Gmail API:', {
        messageId: response.data.id,
        to: options.to,
        subject: options.subject,
        method: 'Gmail API (OAuth 2.0)'
      });

      return true;
    } catch (error: any) {
      console.error('❌ Error sending email via Gmail API:', error);
      if (error.response) {
        console.error('❌ Gmail API error response:', error.response.data);
      }
      return false;
    }
  }

  async sendVerificationCode(email: string, code: string, username: string): Promise<boolean> {
    const subject = 'Your King Dice sign-in code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbae17; margin: 0;">King Dice</h1>
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
    const text = [
      'King Dice',
      '',
      `Hello ${username},`,
      '',
      'Use this code to complete your sign in:',
      code,
      '',
      'This code expires in 10 minutes.',
      "If you didn't request this code, you can ignore this email.",
    ].join('\n');

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': `kd-login-${Date.now()}`,
      },
    });
  }

  async sendRegistrationVerificationCode(email: string, code: string, username: string): Promise<boolean> {
    const subject = 'Verify your King Dice email address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fbae17; margin: 0;">King Dice</h1>
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
    const text = [
      'King Dice',
      '',
      `Hello ${username},`,
      '',
      'Use this code to verify your email address:',
      code,
      '',
      'This code expires in 10 minutes.',
      "If you didn't create an account with King Dice, you can ignore this email.",
    ].join('\n');

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': `kd-register-${Date.now()}`,
      },
    });
  }
}

// Generate a 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create email service instance
export const emailService = new EmailService();
