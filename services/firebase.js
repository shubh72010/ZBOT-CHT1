// services/firebase.js
const admin = require('firebase-admin');

// Ensure FIREBASE_SERVICE_ACCOUNT_KEY_JSON is set
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY_JSON environment variable is not set. Firebase Admin SDK cannot be initialized.');
    process.exit(1); // Exit if the critical key is missing
}

// Parse the service account key JSON string
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON);
} catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY_JSON:', error);
    process.exit(1); // Exit if JSON is malformed
}

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
}

const db = admin.firestore();

/**
 * Stores an encrypted Groq API key for a specific Discord guild.
 * @param {string} guildId The ID of the Discord guild.
 * @param {string} encryptedGroqApiKey The encrypted Groq API key.
 */
const storeGroqApiKey = async (guildId, encryptedGroqApiKey) => {
    try {
        // Store the key in a 'config' subcollection within the 'guild' document
        await db.collection('guilds').doc(guildId).collection('config').doc('groq').set({ encryptedGroqApiKey });
        console.log(`Groq API key stored for guild ${guildId}`);
    } catch (error) {
        console.error(`Error storing Groq API key for guild ${guildId}:`, error);
        throw error; // Re-throw to be handled by the caller
    }
};

/**
 * Retrieves the encrypted Groq API key for a specific Discord guild.
 * @param {string} guildId The ID of the Discord guild.
 * @returns {Promise<string|null>} The encrypted Groq API key or null if not found.
 */
const getEncryptedGroqApiKey = async (guildId) => {
    try {
        const docRef = db.collection('guilds').doc(guildId).collection('config').doc('groq');
        const doc = await docRef.get();
        if (doc.exists) {
            console.log(`Groq API key retrieved for guild ${guildId}`);
            return doc.data().encryptedGroqApiKey;
        } else {
            console.log(`No Groq API key found for guild ${guildId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error retrieving Groq API key for guild ${guildId}:`, error);
        throw error;
    }
};

/**
 * Deletes the encrypted Groq API key for a specific Discord guild.
 * @param {string} guildId The ID of the Discord guild.
 * @returns {Promise<boolean>} True if the key was deleted, false otherwise.
 */
const deleteGroqApiKey = async (guildId) => {
    try {
        const docRef = db.collection('guilds').doc(guildId).collection('config').doc('groq');
        const doc = await docRef.get();
        if (doc.exists) {
            await docRef.delete();
            console.log(`Groq API key deleted for guild ${guildId}`);
            return true;
        } else {
            console.log(`No Groq API key found to delete for guild ${guildId}`);
            return false;
        }
    } catch (error) {
        console.error(`Error deleting Groq API key for guild ${guildId}:`, error);
        throw error;
    }
};

module.exports = {
    storeGroqApiKey,
    getEncryptedGroqApiKey,
    deleteGroqApiKey
};
