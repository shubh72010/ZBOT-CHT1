// app.js
require('dotenv').config();
const express = require('express');
const { encrypt, decrypt } = require('./utils/encryption');
const {
    storeGroqApiKey,
    getEncryptedGroqApiKey,
    storeDiscordBotToken,
    getEncryptedDiscordBotToken
} = require('./services/firebase');
const { startAllUserBots, stopUserBot } = require('./botManager'); // Import bot management functions

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/healthcheck', (req, res) => {
    res.status(200).send('ZBØTS Backend is healthy!');
});

// Endpoint to store Groq API Key
app.post('/api/groq-key', async (req, res) => {
    const { userId, groqApiKey } = req.body;

    if (!userId || !groqApiKey) {
        return res.status(400).json({ error: 'userId and groqApiKey are required.' });
    }

    try {
        const encryptedKey = encrypt(groqApiKey);
        await storeGroqApiKey(userId, encryptedKey);
        res.status(200).json({ message: 'Groq API key stored successfully.' });
    } catch (error) {
        console.error('Failed to store Groq API key:', error);
        res.status(500).json({ error: 'Failed to store Groq API key.' });
    }
});

// Endpoint to retrieve/decrypt Groq API Key (for internal backend use, e.g., botManager)
app.get('/api/groq-key/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
    }
    try {
        const encryptedKey = await getEncryptedGroqApiKey(userId);
        if (!encryptedKey) {
            return res.status(404).json({ error: 'Groq API key not found for this user.' });
        }
        const decryptedKey = decrypt(encryptedKey);
        res.status(200).json({ message: 'Groq API key retrieved and decrypted.', decryptedKey });
    } catch (error) {
        console.error('Failed to retrieve or decrypt Groq API key:', error);
        res.status(500).json({ error: 'Failed to retrieve or decrypt Groq API key.' });
    }
});

// Endpoint to store Discord Bot Token
app.post('/api/discord-bot-token', async (req, res) => {
    const { userId, discordBotToken } = req.body;

    if (!userId || !discordBotToken) {
        return res.status(400).json({ error: 'userId and discordBotToken are required.' });
    }

    try {
        const encryptedToken = encrypt(discordBotToken);
        await storeDiscordBotToken(userId, encryptedToken);
        res.status(200).json({ message: 'Discord Bot Token stored successfully.' });
    } catch (error) {
        console.error('Failed to store Discord Bot Token:', error);
        res.status(500).json({ error: 'Failed to store Discord Bot Token.' });
    }
});

// Endpoint to retrieve/decrypt Discord Bot Token (for internal backend use by botManager)
app.get('/api/discord-bot-token/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
    }
    try {
        const encryptedToken = await getEncryptedDiscordBotToken(userId);
        if (!encryptedToken) {
            return res.status(404).json({ error: 'Discord Bot Token not found for this user.' });
        }
        const decryptedToken = decrypt(encryptedToken);
        res.status(200).json({ message: 'Discord Bot Token retrieved and decrypted.', decryptedToken });
    } catch (error) {
        console.error('Failed to retrieve or decrypt Discord Bot Token:', error);
        res.status(500).json({ error: 'Failed to retrieve or decrypt Discord Bot Token.' });
    }
});


// NEW: Endpoint to trigger bot restart for a user (e.g., after config change)
app.post('/api/bot/restart/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
    }
    try {
        const success = await initializeUserBot(userId); // Re-initialize (which also handles stopping if exists)
        if (success) {
            res.status(200).json({ message: `Bot for user ${userId} restarted successfully.` });
        } else {
            res.status(404).json({ error: `Could not restart bot for user ${userId}. Token might be missing or invalid.` });
        }
    } catch (error) {
        console.error(`Error restarting bot for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to restart bot.' });
    }
});

// NEW: Endpoint to stop a user's bot
app.post('/api/bot/stop/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
    }
    const success = stopUserBot(userId);
    if (success) {
        res.status(200).json({ message: `Bot for user ${userId} stopped successfully.` });
    } else {
        res.status(404).json({ error: `No active bot found for user ${userId} to stop.` });
    }
});


// Start the Express server
app.listen(PORT, async () => {
    console.log(`ZBØTS Backend listening on port ${PORT}`);
    console.log(`Healthcheck available at http://localhost:${PORT}/healthcheck`);

    // IMPORTANT: Start all user bots when the server initializes
    // In a production environment with multiple instances or restarts,
    // you might need a more robust bot management strategy (e.g., using Redis for state).
    await startAllUserBots();
});
