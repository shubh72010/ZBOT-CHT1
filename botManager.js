// botManager.js
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { getEncryptedDiscordBotToken, getEncryptedGroqApiKey } = require('./services/firebase');
const { decrypt } = require('./utils/encryption');

// Store active Discord clients mapped by userId
const activeDiscordClients = new Map();

/**
 * Initializes and logs in a Discord bot for a given user.
 * If a client for this user already exists, it will be restarted.
 * @param {string} userId - The unique ID of the user.
 */
const initializeUserBot = async (userId) => {
    console.log(`Attempting to initialize bot for user: ${userId}`);

    // If a client already exists, destroy it before re-initializing
    if (activeDiscordClients.has(userId)) {
        console.log(`Destroying existing client for user: ${userId}`);
        activeDiscordClients.get(userId).destroy();
        activeDiscordClients.delete(userId);
    }

    try {
        const encryptedToken = await getEncryptedDiscordBotToken(userId);
        if (!encryptedToken) {
            console.warn(`No Discord Bot Token found for user: ${userId}. Cannot initialize bot.`);
            return false;
        }

        const discordBotToken = decrypt(encryptedToken);

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                // Add any other intents your bot features require
            ],
            partials: [
                Partials.Channel, // Required for DMs
                Partials.Message,
                Partials.Reaction,
                Partials.User, // Required for fetching a user's DM channel
                Partials.GuildMember // Required for events like guildMemberAdd, guildMemberRemove
            ],
        });

        client.on('ready', () => {
            console.log(`ZBOT CHT1 bot logged in for user ${userId} as ${client.user.tag}!`);
            client.user.setActivity('ZBØTS Online!', { type: 3 }); // Set playing status
        });

        client.on('messageCreate', async (message) => {
            // Ignore messages from other bots and self
            if (message.author.bot || message.channel.type === 1) return; // type 1 is DM

            console.log(`Message from ${message.author.tag} in ${message.guild ? message.guild.name : 'DM'}: ${message.content}`);

            // Example: Basic AI Chatbot functionality (Placeholder)
            // You would retrieve user's Groq API key and AI personality here
            // and use it to make a call to the Groq API.
            if (message.content.startsWith('!ai')) {
                const query = message.content.substring(3).trim();
                if (!query) {
                    return message.reply("Please provide a query for the AI. Example: `!ai What is the capital of France?`");
                }

                message.channel.send('Thinking with Groq...'); // Immediate feedback

                try {
                    const encryptedGroqKey = await getEncryptedGroqApiKey(userId);
                    if (!encryptedGroqKey) {
                        return message.reply("AI features are not enabled for your bot. Please provide your Groq API key in the ZBØTS dashboard.");
                    }
                    const groqApiKey = decrypt(encryptedGroqKey);

                    // --- This is where you would integrate with Groq ---
                    // For now, this is a placeholder. You'll need to use a Groq client library.
                    // Example (simplified, assuming a Groq API client is set up elsewhere):
                    // const groqResponse = await callGroqAPI(groqApiKey, query, userId, 'your-personality-prompt');
                    const groqResponse = `(AI response from ZBOT CHT1): You asked: "${query}". (Using your Groq API key: ${groqApiKey ? 'Yes' : 'No'})`;

                    message.reply(groqResponse);

                } catch (groqError) {
                    console.error(`Error calling Groq API for user ${userId}:`, groqError);
                    message.reply("There was an error communicating with the AI. Please check your Groq API key or try again later.");
                }
            }

            // More bot logic (moderation, welcome, custom commands etc.) would go here
            // based on the modules enabled for this specific userId
        });

        // Add error handling for the client
        client.on('error', error => {
            console.error(`Discord client error for user ${userId}:`, error);
            // Optionally, attempt to reconnect or notify the user
        });

        client.on('shardError', error => {
            console.error(`A shard encountered an error for user ${userId}:`, error);
        });

        client.on('disconnect', (event) => {
            console.warn(`Discord client for user ${userId} disconnected. Code: ${event.code}, Reason: ${event.reason}`);
            // You might want to implement a reconnection strategy here
        });

        // Attempt to log in
        await client.login(discordBotToken);
        activeDiscordClients.set(userId, client);
        return true; // Successfully initialized
    } catch (error) {
        console.error(`Failed to initialize bot for user ${userId}:`, error);
        if (error.message.includes('Incorrect login details were provided')) {
            console.error(`Invalid Discord Bot Token for user: ${userId}`);
            // You might want to update Firebase to flag this user's token as invalid
        }
        return false; // Failed to initialize
    }
};

/**
 * Stops and destroys a Discord bot client for a given user.
 * @param {string} userId - The unique ID of the user.
 * @returns {boolean} True if the client was found and destroyed, false otherwise.
 */
const stopUserBot = (userId) => {
    if (activeDiscordClients.has(userId)) {
        console.log(`Stopping client for user: ${userId}`);
        activeDiscordClients.get(userId).destroy();
        activeDiscordClients.delete(userId);
        return true;
    }
    console.log(`No active client found for user: ${userId} to stop.`);
    return false;
};

/**
 * Retrieves a list of currently active bot user IDs.
 * @returns {string[]} An array of user IDs for whom bots are currently running.
 */
const getActiveBotUserIds = () => {
    return Array.from(activeDiscordClients.keys());
};


// Function to re-initialize all active bots on startup (or after an update)
const startAllUserBots = async () => {
    console.log("Starting all user bots from Firestore...");
    const usersSnapshot = await require('./services/firebase').db.collection('users').get();
    for (const doc of usersSnapshot.docs) {
        const userId = doc.id;
        const data = doc.data();
        if (data.discordBotToken) { // Only try to start if a token exists
            await initializeUserBot(userId);
        }
    }
    console(`Finished attempting to start ${usersSnapshot.size} user bots.`);
};

module.exports = {
    initializeUserBot,
    stopUserBot,
    getActiveBotUserIds,
    startAllUserBots
};
