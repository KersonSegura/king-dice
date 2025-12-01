import { google } from 'googleapis';

/**
 * OAuth 2.0 Service for Gmail/Google Workspace email sending
 * This service handles OAuth authentication and token refresh for Gmail SMTP
 */
export class OAuth2Service {
  private oauth2Client: any;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    if (!clientId || !clientSecret || !refreshToken) {
      console.warn('⚠️ OAuth 2.0 credentials not fully configured. Email sending will use SMTP fallback.');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Set the refresh token
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    console.log('✅ OAuth 2.0 Service initialized');
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.oauth2Client) {
      return null;
    }

    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Refresh the token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      this.accessToken = credentials.access_token;
      // Tokens typically expire in 1 hour, refresh 5 minutes early
      this.tokenExpiry = Date.now() + ((credentials.expiry_date || 3600000) - 300000);
      
      console.log('✅ OAuth 2.0 access token refreshed');
      return this.accessToken;
    } catch (error: any) {
      console.error('❌ Error refreshing OAuth 2.0 token:', error);
      return null;
    }
  }

  /**
   * Get OAuth 2.0 credentials for nodemailer
   */
  async getOAuth2Credentials(): Promise<{ user: string; accessToken: string } | null> {
    const accessToken = await this.getAccessToken();
    const userEmail = process.env.SMTP_USER || process.env.FROM_EMAIL || 'verify@kingdice.com';

    if (!accessToken) {
      return null;
    }

    return {
      user: userEmail,
      accessToken: accessToken
    };
  }

  /**
   * Check if OAuth 2.0 is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    );
  }
}

// Export singleton instance
export const oauth2Service = new OAuth2Service();

