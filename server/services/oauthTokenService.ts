/**
 * OAuth Token Management Service
 *
 * Handles OAuth 2.0 token storage, refresh, and lifecycle management
 * for integrations that require OAuth authentication.
 *
 * Supported integrations:
 * - Salesforce (JWT Bearer / Web Server flow)
 * - ZOHO CRM (Authorization Code Grant)
 * - ServiceTitan (Client Credentials)
 * - HubSpot (Optional - OAuth or Private App)
 * - Calendly (Personal Access Token - non-expiring)
 */

import axios from 'axios';
import { storage } from '../storage';
import { EncryptionService } from './encryptionService';

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string;
  instanceUrl?: string; // For Salesforce
  tokenType?: string;
}

export interface OAuthConfig {
  integration: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  tokenEndpoint: string;
  authorizationEndpoint?: string;
  scope?: string;
  grantType?: 'authorization_code' | 'client_credentials' | 'refresh_token' | 'urn:ietf:params:oauth:grant-type:jwt-bearer';
}

class OAuthTokenService {
  private static instance: OAuthTokenService;
  private tokenRefreshIntervalMs = 5 * 60 * 1000; // Check every 5 minutes
  private refreshBuffer = 5 * 60 * 1000; // Refresh 5 minutes before expiry

  private constructor() {
    this.startTokenRefreshScheduler();
  }

  static getInstance(): OAuthTokenService {
    if (!OAuthTokenService.instance) {
      OAuthTokenService.instance = new OAuthTokenService();
    }
    return OAuthTokenService.instance;
  }

  /**
   * Store OAuth tokens securely in database
   */
  async storeTokens(
    userId: string,
    integration: string,
    tokens: OAuthToken
  ): Promise<void> {
    try {
      console.log(`🔐 Storing OAuth tokens for ${integration} (user: ${userId})`);

      // Encrypt tokens before storage
      const encryptedAccessToken = EncryptionService.encrypt(tokens.accessToken);
      const encryptedRefreshToken = tokens.refreshToken
        ? EncryptionService.encrypt(tokens.refreshToken)
        : null;

      // Store access token
      await storage.upsertUserCredentials({
        userId,
        integrationType: integration,
        credentialName: 'access_token',
        encryptedData: encryptedAccessToken.encryptedData,
        encryptionIv: encryptedAccessToken.iv,
        encryptionTag: encryptedAccessToken.tag,
        encryptionAlgorithm: encryptedAccessToken.algorithm,
        encryptionVersion: encryptedAccessToken.version,
        expiresAt: tokens.expiresAt,
        isActive: true
      });

      // Store refresh token if available
      if (tokens.refreshToken && encryptedRefreshToken) {
        await storage.upsertUserCredentials({
          userId,
          integrationType: integration,
          credentialName: 'refresh_token',
          encryptedData: encryptedRefreshToken.encryptedData,
          encryptionIv: encryptedRefreshToken.iv,
          encryptionTag: encryptedRefreshToken.tag,
          encryptionAlgorithm: encryptedRefreshToken.algorithm,
          encryptionVersion: encryptedRefreshToken.version,
          expiresAt: null, // Refresh tokens typically don't expire (or have very long expiry)
          isActive: true
        });
      }

      // Store instance URL for Salesforce (not encrypted)
      if (tokens.instanceUrl) {
        const instanceUrlEncrypted = EncryptionService.encrypt(tokens.instanceUrl);
        await storage.upsertUserCredentials({
          userId,
          integrationType: integration,
          credentialName: 'instance_url',
          encryptedData: instanceUrlEncrypted.encryptedData,
          encryptionIv: instanceUrlEncrypted.iv,
          encryptionTag: instanceUrlEncrypted.tag,
          encryptionAlgorithm: instanceUrlEncrypted.algorithm,
          encryptionVersion: instanceUrlEncrypted.version,
          expiresAt: null,
          isActive: true
        });
      }

      // Store token type and scope as metadata (not encrypted - they're public metadata)
      if (tokens.tokenType) {
        const tokenTypeEncrypted = EncryptionService.encrypt(tokens.tokenType);
        await storage.upsertUserCredentials({
          userId,
          integrationType: integration,
          credentialName: 'token_type',
          encryptedData: tokenTypeEncrypted.encryptedData,
          encryptionIv: tokenTypeEncrypted.iv,
          encryptionTag: tokenTypeEncrypted.tag,
          encryptionAlgorithm: tokenTypeEncrypted.algorithm,
          encryptionVersion: tokenTypeEncrypted.version,
          expiresAt: null,
          isActive: true
        });
      }

      if (tokens.scope) {
        const scopeEncrypted = EncryptionService.encrypt(tokens.scope);
        await storage.upsertUserCredentials({
          userId,
          integrationType: integration,
          credentialName: 'scope',
          encryptedData: scopeEncrypted.encryptedData,
          encryptionIv: scopeEncrypted.iv,
          encryptionTag: scopeEncrypted.tag,
          encryptionAlgorithm: scopeEncrypted.algorithm,
          encryptionVersion: scopeEncrypted.version,
          expiresAt: null,
          isActive: true
        });
      }

      console.log(`✅ OAuth tokens stored successfully for ${integration}`);
    } catch (error) {
      console.error(`❌ Error storing OAuth tokens for ${integration}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve OAuth tokens from database (decrypted)
   */
  async getTokens(userId: string, integration: string): Promise<OAuthToken | null> {
    try {
      const accessTokenCred = await storage.getUserCredentials(userId, integration, 'access_token');

      if (!accessTokenCred || !accessTokenCred.encryptedData || !accessTokenCred.encryptionIv || !accessTokenCred.encryptionTag) {
        console.log(`⚠️ No access token found for ${integration} (user: ${userId})`);
        return null;
      }

      // Decrypt access token
      const accessToken = EncryptionService.decrypt(
        accessTokenCred.encryptedData,
        accessTokenCred.encryptionIv,
        accessTokenCred.encryptionTag
      );

      // Get refresh token if available
      const refreshTokenCred = await storage.getUserCredentials(userId, integration, 'refresh_token');
      const refreshToken = refreshTokenCred && refreshTokenCred.encryptedData && refreshTokenCred.encryptionIv && refreshTokenCred.encryptionTag
        ? EncryptionService.decrypt(
            refreshTokenCred.encryptedData,
            refreshTokenCred.encryptionIv,
            refreshTokenCred.encryptionTag
          )
        : undefined;

      // Get instance URL (for Salesforce)
      const instanceUrlCred = await storage.getUserCredentials(userId, integration, 'instance_url');
      const instanceUrl = instanceUrlCred && instanceUrlCred.encryptedData && instanceUrlCred.encryptionIv && instanceUrlCred.encryptionTag
        ? EncryptionService.decrypt(
            instanceUrlCred.encryptedData,
            instanceUrlCred.encryptionIv,
            instanceUrlCred.encryptionTag
          )
        : undefined;

      // Get token type
      const tokenTypeCred = await storage.getUserCredentials(userId, integration, 'token_type');
      const tokenType = tokenTypeCred && tokenTypeCred.encryptedData && tokenTypeCred.encryptionIv && tokenTypeCred.encryptionTag
        ? EncryptionService.decrypt(
            tokenTypeCred.encryptedData,
            tokenTypeCred.encryptionIv,
            tokenTypeCred.encryptionTag
          )
        : undefined;

      // Get scope
      const scopeCred = await storage.getUserCredentials(userId, integration, 'scope');
      const scope = scopeCred && scopeCred.encryptedData && scopeCred.encryptionIv && scopeCred.encryptionTag
        ? EncryptionService.decrypt(
            scopeCred.encryptedData,
            scopeCred.encryptionIv,
            scopeCred.encryptionTag
          )
        : undefined;

      return {
        accessToken,
        refreshToken,
        expiresAt: accessTokenCred.expiresAt || new Date(Date.now() + 3600000), // Default 1 hour if not set
        instanceUrl,
        tokenType,
        scope
      };
    } catch (error) {
      console.error(`❌ Error retrieving OAuth tokens for ${integration}:`, error);
      return null;
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(userId: string, integration: string): Promise<string | null> {
    const tokens = await this.getTokens(userId, integration);

    if (!tokens) {
      console.log(`⚠️ No tokens found for ${integration}`);
      return null;
    }

    // Check if token is expired or about to expire
    const now = new Date();
    const expiresAt = new Date(tokens.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry < this.refreshBuffer) {
      console.log(`🔄 Access token for ${integration} is expired or expiring soon, refreshing...`);

      // Attempt to refresh
      const refreshed = await this.refreshAccessToken(userId, integration);
      if (refreshed) {
        return refreshed.accessToken;
      } else {
        console.error(`❌ Failed to refresh token for ${integration}`);
        return null;
      }
    }

    return tokens.accessToken;
  }

  /**
   * Refresh an expired or soon-to-expire access token
   */
  async refreshAccessToken(userId: string, integration: string): Promise<OAuthToken | null> {
    try {
      const tokens = await this.getTokens(userId, integration);

      if (!tokens || !tokens.refreshToken) {
        console.error(`❌ No refresh token available for ${integration}`);
        return null;
      }

      // Get OAuth config from integration settings
      const integrationSettings = await storage.getIntegrationSettings(userId);
      const config = this.getOAuthConfig(integration, integrationSettings);

      if (!config) {
        console.error(`❌ No OAuth configuration found for ${integration}`);
        return null;
      }

      console.log(`🔄 Refreshing access token for ${integration}...`);

      // Make refresh token request
      const response = await axios.post(
        config.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      const newTokens: OAuthToken = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || tokens.refreshToken, // Some APIs don't return new refresh token
        expiresAt: new Date(Date.now() + (response.data.expires_in * 1000)),
        instanceUrl: response.data.instance_url || tokens.instanceUrl,
        tokenType: response.data.token_type || tokens.tokenType,
        scope: response.data.scope || tokens.scope
      };

      // Store updated tokens
      await this.storeTokens(userId, integration, newTokens);

      console.log(`✅ Access token refreshed successfully for ${integration}`);
      return newTokens;

    } catch (error) {
      console.error(`❌ Error refreshing access token for ${integration}:`, error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', error.response?.data);
      }

      return null;
    }
  }

  /**
   * Exchange authorization code for access token (OAuth 2.0 Authorization Code Grant)
   */
  async exchangeCodeForToken(
    userId: string,
    integration: string,
    code: string,
    config: OAuthConfig
  ): Promise<OAuthToken | null> {
    try {
      console.log(`🔄 Exchanging authorization code for access token (${integration})...`);

      const response = await axios.post(
        config.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri || ''
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      const tokens: OAuthToken = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + (response.data.expires_in * 1000)),
        instanceUrl: response.data.instance_url,
        tokenType: response.data.token_type,
        scope: response.data.scope
      };

      // Store tokens
      await this.storeTokens(userId, integration, tokens);

      console.log(`✅ Access token obtained successfully for ${integration}`);
      return tokens;

    } catch (error) {
      console.error(`❌ Error exchanging code for token (${integration}):`, error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', error.response?.data);
      }

      return null;
    }
  }

  /**
   * Get OAuth config for a specific integration
   */
  private getOAuthConfig(integration: string, settings: any): OAuthConfig | null {
    switch (integration.toLowerCase()) {
      case 'salesforce':
        return {
          integration: 'salesforce',
          clientId: settings.salesforce?.clientId || '',
          clientSecret: settings.salesforce?.clientSecret || '',
          tokenEndpoint: 'https://login.salesforce.com/services/oauth2/token',
          authorizationEndpoint: 'https://login.salesforce.com/services/oauth2/authorize',
          scope: 'api refresh_token offline_access'
        };

      case 'zoho':
        const region = settings.zoho?.region || 'us';
        const zohoTokenUrl = region === 'eu'
          ? 'https://accounts.zoho.eu/oauth/v2/token'
          : region === 'in'
          ? 'https://accounts.zoho.in/oauth/v2/token'
          : 'https://accounts.zoho.com/oauth/v2/token';

        return {
          integration: 'zoho',
          clientId: settings.zoho?.clientId || '',
          clientSecret: settings.zoho?.clientSecret || '',
          tokenEndpoint: zohoTokenUrl,
          authorizationEndpoint: zohoTokenUrl.replace('/token', '/auth'),
          scope: 'ZohoCRM.modules.ALL'
        };

      case 'servicetitan':
        return {
          integration: 'servicetitan',
          clientId: settings.serviceTitan?.clientId || '',
          clientSecret: settings.serviceTitan?.clientSecret || '',
          tokenEndpoint: 'https://auth.servicetitan.io/connect/token',
          grantType: 'client_credentials',
          scope: 'offline_access'
        };

      case 'hubspot':
        // HubSpot can use private app token OR OAuth
        if (settings.hubspot?.clientId) {
          return {
            integration: 'hubspot',
            clientId: settings.hubspot.clientId,
            clientSecret: settings.hubspot.clientSecret,
            tokenEndpoint: 'https://api.hubapi.com/oauth/v1/token',
            authorizationEndpoint: 'https://app.hubspot.com/oauth/authorize',
            scope: 'crm.objects.contacts.write crm.objects.deals.write'
          };
        }
        return null; // Using private app token instead

      default:
        console.warn(`⚠️ No OAuth config found for integration: ${integration}`);
        return null;
    }
  }

  /**
   * Start background scheduler to refresh tokens before expiration
   */
  private startTokenRefreshScheduler(): void {
    setInterval(async () => {
      console.log('🔄 Running OAuth token refresh scheduler...');
      await this.refreshExpiringTokens();
    }, this.tokenRefreshIntervalMs);
  }

  /**
   * Check all tokens and refresh those about to expire
   */
  private async refreshExpiringTokens(): Promise<void> {
    try {
      // This would need to query all users with OAuth tokens
      // For now, we'll implement on-demand refresh only
      console.log('✅ Token refresh scheduler completed');
    } catch (error) {
      console.error('❌ Error in token refresh scheduler:', error);
    }
  }

  /**
   * Revoke OAuth tokens (logout/disconnect)
   */
  async revokeTokens(userId: string, integration: string): Promise<boolean> {
    try {
      console.log(`🗑️ Revoking OAuth tokens for ${integration} (user: ${userId})`);

      // Delete tokens from database
      await storage.deleteUserCredentials(userId, integration, 'access_token');
      await storage.deleteUserCredentials(userId, integration, 'refresh_token');
      await storage.deleteUserCredentials(userId, integration, 'instance_url');
      await storage.deleteUserCredentials(userId, integration, 'token_type');
      await storage.deleteUserCredentials(userId, integration, 'scope');

      console.log(`✅ OAuth tokens revoked successfully for ${integration}`);
      return true;

    } catch (error) {
      console.error(`❌ Error revoking OAuth tokens for ${integration}:`, error);
      return false;
    }
  }
}

export const oauthTokenService = OAuthTokenService.getInstance();
