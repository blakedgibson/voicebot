import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  private static getEncryptionKey(): Buffer {
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is required');
    }
    
    // In production, this should be a proper 32-byte key from KMS or secure storage
    return crypto.scryptSync(key, 'vb-credential-salt', this.KEY_LENGTH);
  }

  static encrypt(plaintext: string): { 
    encryptedData: string; 
    iv: string; 
    tag: string;
    algorithm: string;
    version: string;
  } {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty plaintext');
    }

    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: this.ALGORITHM,
      version: '1'
    };
  }

  static decrypt(encryptedData: string, iv: string, tag: string): string {
    if (!encryptedData || !iv || !tag) {
      throw new Error('Missing required decryption parameters');
    }

    const key = this.getEncryptionKey();
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');

    // Validate authentication tag length to prevent forgery attacks
    if (tagBuffer.length !== this.TAG_LENGTH) {
      throw new Error(`Invalid authentication tag length. Expected ${this.TAG_LENGTH} bytes, got ${tagBuffer.length} bytes`);
    }

    // Specify authTagLength to prevent shorter-than-expected tag attacks
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      key,
      ivBuffer,
      { authTagLength: this.TAG_LENGTH }
    );
    decipher.setAuthTag(tagBuffer);

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  static isValidCredential(encryptedData: string, iv: string, tag: string): boolean {
    try {
      this.decrypt(encryptedData, iv, tag);
      return true;
    } catch {
      return false;
    }
  }
}