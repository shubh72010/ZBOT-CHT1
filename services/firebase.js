// services/firebase.js
const admin = require('firebase-admin');

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
            process.exit(1);
        }
    }
};

initializeFirebase();

const db = admin.firestore();

/**
 * Stores an encrypted Groq API key for a specific user.
 * @param {string} userId - The unique identifier for the user (Discord User ID).
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
 * @param {string} userId - The unique identifier for the user (Discord User ID).
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
 * Deletes the Groq API key for a specific user.
 * @param {string} userId - The unique identifier for the user (Discord User ID).
 * @returns {Promise<boolean>} True if key was present and deleted, false otherwise.
 */
const deleteGroqApiKey = async (userId) => { // NEW FUNCTION
    try {
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (!doc.exists || !doc.data().groqApiKey) {
            console.log(`No Groq API key found for user ${userId} to delete.`);
            return false;
        }

        await userRef.update({
            groqApiKey: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp() // Update timestamp
        });
        console.log(`Groq API key deleted for user: ${userId}`);
        return true;
    } catch (error) {
        console.error(`Error deleting Groq API key for user ${userId}:`, error);
        throw new Error('Failed to delete Groq API key.');
    }
};


module.exports = {
    db,
    storeGroqApiKey,
    getEncryptedGroqApiKey,
    deleteGroqApiKey // Export the new function
};
