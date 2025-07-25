// app.js
require('dotenv').config(); // Load environment variables from .env file (for local development)
const express = require('express');
const { startBot } = require('./bot'); // Import the function to start the single Discord bot client

const app = express();
// The PORT environment variable is automatically set by Render.
// For local development, it will default to 3000 if not set in your .env file.
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// --- API Endpoints ---

// Healthcheck endpoint for Render (and general monitoring)
// This endpoint checks if the Express server is running and responsive.
app.get('/healthcheck', (req, res) => {
    // Respond with a 200 OK status and a simple message
    res.status(200).send('ZBØTS Backend is healthy!');
});

// IMPORTANT:
// - There are NO API endpoints here for users to provide Discord Bot Tokens.
//   ZBØTS uses a single, developer-provided Discord Bot Token.
// - There are NO API endpoints here for users to provide Groq API Keys.
//   Users will provide their Groq API keys directly via the Discord bot's /setkey command.
// - All sensitive key storage and retrieval is handled internally by the bot.js
//   and services/firebase.js, using encryption.

// If you decide to build a separate web dashboard in the future,
// and it needs to interact with user data in Firebase, you would add
// authenticated API endpoints here, ensuring they are properly secured.

// --- Server and Bot Initialization ---

// Start the Express server and the Discord bot
app.listen(PORT, async () => {
    // Log that the Express server has started and is listening on the specified port
    console.log(`ZBØTS Backend listening on port ${PORT}`);
    console.log(`Healthcheck available at http://localhost:${PORT}/healthcheck`);

    // Asynchronously start the Discord bot client.
    // This will attempt to log in your ZBOT CHT1 bot to Discord.
    await startBot();
});
