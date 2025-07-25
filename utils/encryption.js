// utils/encryption.js
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * Retrieves the encryption key from environment variables.
 * Throws an error if the key is not set or is not 32 bytes (64 hex characters).
 * @returns {Buffer} The encryption key.
 */
const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set.');
    }
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be a 32-byte (64 hex characters) string.');
    }
    return keyBuffer;
};

/**
 * Encrypts a text string.
 * @param {string} text - The text to encrypt.
 * @returns {string} The encrypted text (iv:encryptedContent).
 */
const encrypt = (text) => {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * Decrypts an encrypted text string.
 * @param {string} text - The encrypted text (iv:encryptedContent).
 * @returns {string} The decrypted text.
 */
const decrypt = (text) => {
    const key = getEncryptionKey();
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

module.exports = { encrypt, decrypt };
