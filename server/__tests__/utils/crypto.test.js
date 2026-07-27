const { encrypt, decrypt } = require('../../src/utils/crypto');

describe('Crypto Utils', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('getKey', () => {
    it('should throw if ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });

    it('should throw if ENCRYPTION_KEY is not 64 chars', () => {
      process.env.ENCRYPTION_KEY = 'short';
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'Hello, world!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+{}:"<>?';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON strings', () => {
      const plaintext = JSON.stringify({ foo: 'bar', num: 42 });
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(JSON.parse(decrypted)).toEqual({ foo: 'bar', num: 42 });
    });

    it('should handle numbers (converted to string)', () => {
      const plaintext = 12345;
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('12345');
    });
  });

  describe('decrypt', () => {
    it('should throw if payload is malformed', () => {
      expect(() => decrypt('invalid')).toThrow();
      expect(() => decrypt('only:two:parts')).toThrow();
    });

    it('should throw if authTag is invalid', () => {
      const encrypted = encrypt('test');
      const [iv, authTag, data] = encrypted.split(':');
      // Change one character in the authTag to make it invalid
      const invalidAuthTag = authTag.slice(0, -1) + (parseInt(authTag.slice(-1), 16) ^ 1).toString(16);
      const invalidPayload = `${iv}:${invalidAuthTag}:${data}`;
      expect(() => decrypt(invalidPayload)).toThrow();
    });

    it('should throw if encrypted data is tampered', () => {
      const encrypted = encrypt('test');
      const [iv, authTag, data] = encrypted.split(':');
      // Change one character in the data
      const tamperedData = data.slice(0, -1) + (parseInt(data.slice(-1), 16) ^ 1).toString(16);
      const invalidPayload = `${iv}:${authTag}:${tamperedData}`;
      expect(() => decrypt(invalidPayload)).toThrow();
    });
  });
});