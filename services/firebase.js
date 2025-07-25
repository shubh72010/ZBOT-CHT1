// services/firebase.js
const admin = require('firebase-admin');

/**
 * Initializes Firebase Admin SDK.
 * It's crucial that `FIREBASE_SERVICE_ACCOUNT_KEY_JSON` is correctly set
 * as an environment variable in production.
 */
const initializeFirebase = () => {
    if (admin.apps.length === 0) {
        try {
            const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;
            if (!serviceAccountJson) {
                throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_JSON environment variable is not set.');
            }
            const serviceAccount = JSON.parse(serviceAccountJson);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Firebase Admin SDK initialized successfully.');
        } catch (error) {
            console.error('Error initializing Firebase Admin SDK:', error.message);
            process.exit(1); // Exit if Firebase init fails, as it's critical
        }
    }
};

// Call initialization immediately
initializeFirebase();

const db = admin.firestore();

/**
 * Stores an encrypted Groq API key for a specific user.
 * @param {string} userId - The unique identifier for the user.
 * @param {string} encryptedGroqApiKey - The encrypted Groq API key.
 * @returns {Promise<void>}
 */
const storeGroqApiKey = async (userId, encryptedGroqApiKey) => {
    try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
            groqApiKey: encryptedGroqApiKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`Groq API key stored for user: ${userId}`);
    } catch (error) {
        console.error(`Error storing Groq API key for user ${userId}:`, error);
        throw new Error('Failed to store Groq API key.');
    }
};

/**
 * Retrieves the encrypted Groq API key for a specific user.
 * @param {string} userId - The unique identifier for the user.
 * @returns {Promise<string|null>} The encrypted Groq API key or null if not found.
 */
const getEncryptedGroqApiKey = async (userId) => {
    try {
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (!doc.exists) {
            console.log(`No Groq API key found for user: ${userId}`);
            return null;
        }
        const data = doc.data();
        return data.groqApiKey || null;
    } catch (error) {
        console.error(`Error retrieving Groq API key for user ${userId}:`, error);
        throw new Error('Failed to retrieve Groq API key.');
    }
};

/**
 * Stores an encrypted Discord Bot Token for a specific user.
 * @param {string} userId - The unique identifier for the user.
 * @param {string} encryptedDiscordBotToken - The encrypted Discord Bot Token.
 * @returns {Promise<void>}
 */
const storeDiscordBotToken = async (userId, encryptedDiscordBotToken) => {
    try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
            discordBotToken: encryptedDiscordBotToken,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`Discord Bot Token stored for user: ${userId}`);
    } catch (error) {
        console.error(`Error storing Discord Bot Token for user ${userId}:`, error);
        throw new Error('Failed to store Discord Bot Token.');
    }
};

/**
 * Retrieves the encrypted Discord Bot Token for a specific user.
 * @param {string} userId - The unique identifier for the user.
 * @returns {Promise<string|null>} The encrypted Discord Bot Token or null if not found.
 */
const getEncryptedDiscordBotToken = async (userId) => {
    try {
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (!doc.exists) {
            console.log(`No Discord Bot Token found for user: ${userId}`);
            return null;
        }
        const data = doc.data();
        return data.discordBotToken || null;
    } catch (error) {
        console.error(`Error retrieving Discord Bot Token for user ${userId}:`, error);
        throw new Error('Failed to retrieve Discord Bot Token.');
    }
};

module.exports = {
    db,
    storeGroqApiKey,
    getEncryptedGroqApiKey,
    storeDiscordBotToken,
    getEncryptedDiscordBotToken
};
