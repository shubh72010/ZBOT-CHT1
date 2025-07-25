// app.js
// This file is the main entry point for your ZBØTS backend server.

// Load environment variables from a .env file if running locally.
// On Render, environment variables are set in the dashboard.
require('dotenv').config();

// Import the Express.js framework for building the web server.
const express = require('express');

// Import the startBot function from bot.js.
// This function is responsible for logging in and managing your single Discord bot client.
const { startBot } = require('./bot');

// Create an Express application instance.
const app = express();

// Define the port the server will listen on.
// Render automatically sets a PORT environment variable (e.g., 10000).
// If running locally and PORT is not set in .env, it defaults to 3000.
const PORT = process.env.PORT || 3000;

// --- Express Middleware ---

// Use express.json() middleware to parse incoming request bodies with JSON payloads.
// This is necessary for handling JSON data sent in POST requests.
app.use(express.json());

// --- API Endpoints ---

// Define a simple health check endpoint.
// This is useful for monitoring your service on platforms like Render
// to ensure it's running and responsive.
app.get('/healthcheck', (req, res) => {
    // Respond with a 200 OK status and a success message.
    res.status(200).send('ZBØTS Backend is healthy!');
});

// IMPORTANT CONSIDERATIONS FOR API ENDPOINTS:
// ----------------------------------------------------------------------------------
// - User Discord Bot Tokens: ZBØTS operates with a single, developer-provided
//   Discord Bot Token (DISCORD_BOT_TOKEN in environment variables). Users DO NOT
//   provide their own bot tokens to this backend. Therefore, there are no API
//   endpoints for storing or managing individual user Discord bot tokens.
//
// - User Groq API Keys: Users provide their Groq API keys directly via
//   Discord slash commands (`/setkey`). The bot (`bot.js`) then handles the
//   encryption and storage of these keys in Firebase using the `services/firebase.js`
//   module. There are no direct API endpoints here for frontend submission of Groq keys.
//
// - Future Dashboard Integration: If you develop a separate web dashboard
//   for users, any interactions requiring secure user data (e.g., viewing settings,
//   managing subscriptions) should be handled via properly authenticated and authorized
//   API endpoints. These would typically use a user authentication system (like
//   Firebase Authentication) to ensure data privacy and security.
// ----------------------------------------------------------------------------------


// --- Server and Bot Initialization ---

// Start the Express server.
// The server will begin listening for incoming HTTP requests on the specified port.
app.listen(PORT, async () => {
    // Log a message indicating the server has started and its port.
    console.log(`ZBØTS Backend listening on port ${PORT}`);
    // Provide the local URL for the healthcheck endpoint for testing.
    console.log(`Healthcheck available at http://localhost:${PORT}/healthcheck`);

    // Asynchronously start the Discord bot client.
    // This function will handle logging your ZBOT CHT1 bot into Discord.
    // It's crucial for your bot's functionality.
    await startBot();
});
